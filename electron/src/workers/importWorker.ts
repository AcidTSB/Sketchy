import { PrismaClient } from '../generated/client'
import fs from 'fs-extra'
import path from 'path'
import crypto from 'crypto'
import * as mm from 'music-metadata'

interface ImportJob {
  importId: string
  projectId: number
  folderId?: number
  files: { path: string; name: string }[]
  storageMode: 'copy' | 'reference'
  userDataPath: string //
}

interface ImportProgress {
  importId: string
  file: string
  progress: number
  status: 'pending' | 'processing' | 'done' | 'error'
  error?: string
}

// 2. KHÔNG KHỞI TẠO PRISMA NGAY LẬP TỨC
let prisma: PrismaClient
let isCancelled = false

// Listen for messages from parent
process.on('message', async (job: ImportJob) => {
  try {
    // 3. KHỞI TẠO PRISMA VỚI ĐƯỜNG DẪN CHÍNH XÁC
    if (!prisma) {
      // Đảm bảo tên file 'dev.db' hoặc 'sketchy.db' khớp với file trong máy bạn
      // Kiểm tra file schema.prisma xem datasource db provider là "sqlite" url là gì
      const dbPath = path.join(job.userDataPath, 'dev.db')

      console.log(`[worker] Connecting to DB at: ${dbPath}`)

      prisma = new PrismaClient({
        datasources: {
          db: {
            url: `file:${dbPath}`,
          },
        },
      })
    }

    await processImport(job)
  } catch (err: any) {
    console.error('[worker] Critical error:', err)
    if (process.send) {
      process.send({
        importId: job.importId,
        status: 'error',
        error: `Worker init failed: ${err.message}`,
      })
    }
  } finally {
    // Ngắt kết nối và thoát
    if (prisma) await prisma.$disconnect()
    process.exit(0)
  }
})

process.on('SIGTERM', () => {
  isCancelled = true
  // Không exit ngay để code có cơ hội dọn dẹp nếu cần,
  // nhưng thường worker import thì exit luôn cũng được
  process.exit(1)
})

async function processImport(job: ImportJob) {
  const { importId, projectId, folderId, files, storageMode, userDataPath } = job

  // Sử dụng userDataPath chuẩn từ Main gửi xuống thay vì đoán process.env
  const storageBaseDir = path.join(userDataPath, 'projects', String(projectId), 'files')
  await fs.ensureDir(storageBaseDir)

  for (let i = 0; i < files.length; i++) {
    if (isCancelled) {
      sendProgress(importId, files[i].name, 0, 'error', 'Import cancelled')
      break
    }

    const file = files[i]
    sendProgress(importId, file.name, 0, 'processing')

    try {
      // Step 1: Check if file exists
      const exists = await fs.pathExists(file.path)
      if (!exists) {
        throw new Error('File not found')
      }

      sendProgress(importId, file.name, 10, 'processing')

      // Step 2: Compute checksum
      const checksum = await computeChecksum(file.path)
      sendProgress(importId, file.name, 30, 'processing')

      // Step 3: Check for duplicate by checksum
      const existingVersion = await prisma.fileVersion.findFirst({
        where: { checksum },
      })

      let storedPath: string | null = null
      let needsCopy = false

      if (existingVersion && existingVersion.storedPath && storageMode === 'copy') {
        // Reuse existing stored file
        storedPath = existingVersion.storedPath
      } else if (storageMode === 'copy') {
        needsCopy = true
      }

      sendProgress(importId, file.name, 50, 'processing')

      // Step 4: Copy file if needed
      if (needsCopy) {
        const ext = path.extname(file.name)
        const tempFileName = `temp-${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`
        const tempPath = path.join(storageBaseDir, tempFileName)

        // Copy to temp location
        await copyFileWithProgress(file.path, tempPath, (progress) => {
          sendProgress(importId, file.name, 50 + progress * 0.3, 'processing')
        })

        storedPath = tempPath
      }

      sendProgress(importId, file.name, 80, 'processing')

      // Step 5: Extract metadata
      const metadata = await extractMetadata(file.path)
      sendProgress(importId, file.name, 90, 'processing')

      // Step 6: Create track and file version
      const track = await prisma.track.create({
        data: {
          projectId,
          folderId: folderId ?? null,
          title: path.basename(file.name, path.extname(file.name)),
        },
      })

      const fileVersion = await prisma.fileVersion.create({
        data: {
          trackId: track.id,
          originalPath: file.path,
          storedPath,
          storageMode,
          checksum,
          mimeType: metadata.mimeType,
          sizeBytes: metadata.sizeBytes,
          durationMs: metadata.durationMs,
          metadataJson: JSON.stringify(metadata),
        },
      })

      // Update track with latest version
      await prisma.track.update({
        where: { id: track.id },
        data: { latestVersionId: fileVersion.id },
      })

      // Emit file imported event for notifications
      const project = await prisma.project.findUnique({ where: { id: projectId } })
      if (project) {
        sendAppEvent('file:imported', {
          userId: project.userId,
          entityType: 'file',
          entityId: fileVersion.id,
          action: 'import',
          metadata: {
            fileName: file.name,
            trackId: track.id,
            trackName: track.title,
          },
        })
      }

      // Rename temp file to final name with fileVersionId
      if (needsCopy && storedPath) {
        const ext = path.extname(file.name)
        const finalPath = path.join(storageBaseDir, `${fileVersion.id}${ext}`)
        await fs.rename(storedPath, finalPath)

        // Update stored path in database
        await prisma.fileVersion.update({
          where: { id: fileVersion.id },
          data: { storedPath: finalPath },
        })
      }

      sendProgress(importId, file.name, 100, 'done')
    } catch (error) {
      console.error(`[worker] Error processing file ${file.name}:`, error) // Log chi tiết ra stderr
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      sendProgress(importId, file.name, 0, 'error', errorMessage)
    }
  }
}

// ... (Giữ nguyên các hàm helper computeChecksum, copyFileWithProgress, extractMetadata, sendAppEvent, sendProgress bên dưới)
// Nhớ copy lại các hàm đó vào đây nhé, tôi không paste lại để tiết kiệm chỗ
async function computeChecksum(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256')
    const stream = fs.createReadStream(filePath)

    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('end', () => resolve(hash.digest('hex')))
    stream.on('error', reject)
  })
}

async function copyFileWithProgress(
  src: string,
  dest: string,
  onProgress: (progress: number) => void
): Promise<void> {
  const stat = await fs.stat(src)
  const totalSize = stat.size
  let copiedSize = 0

  return new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(src)
    const writeStream = fs.createWriteStream(dest)

    readStream.on('data', (chunk: Buffer | string) => {
      const chunkSize = typeof chunk === 'string' ? Buffer.byteLength(chunk) : chunk.length
      copiedSize += chunkSize
      onProgress(copiedSize / totalSize)
    })

    readStream.on('error', reject)
    writeStream.on('error', reject)
    writeStream.on('finish', resolve)

    readStream.pipe(writeStream)
  })
}

async function extractMetadata(filePath: string) {
  const stat = await fs.stat(filePath)

  try {
    // music-metadata v7 is CommonJS compatible
    const metadata = await mm.parseFile(filePath)

    return {
      durationMs: metadata.format.duration
        ? Math.round(metadata.format.duration * 1000)
        : undefined,
      sampleRate: metadata.format.sampleRate,
      bitrate: metadata.format.bitrate,
      codec: metadata.format.codec,
      mimeType: metadata.format.container ? `audio/${metadata.format.container}` : undefined,
      sizeBytes: stat.size,
      channels: metadata.format.numberOfChannels,
      title: metadata.common.title,
      artist: metadata.common.artist,
      album: metadata.common.album,
    }
  } catch (error) {
    console.error('[worker] Failed to extract metadata, using fallback:', error)
    // Fallback to basic metadata if music-metadata fails
    return {
      sizeBytes: stat.size,
      mimeType: getMimeTypeFromExtension(filePath),
    }
  }
}

function getMimeTypeFromExtension(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  const mimeTypes: Record<string, string> = {
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.flac': 'audio/flac',
    '.m4a': 'audio/mp4',
    '.ogg': 'audio/ogg',
    '.aac': 'audio/aac',
  }
  return mimeTypes[ext] || 'audio/unknown'
}

function sendAppEvent(channel: string, data: any) {
  if (process.send) {
    process.send({
      type: 'app-event',
      channel,
      data,
    })
  }
}

function sendProgress(
  importId: string,
  file: string,
  progress: number,
  status: ImportProgress['status'],
  error?: string
) {
  const message = {
    importId,
    file,
    progress: Math.round(progress),
    status,
    error,
  } as ImportProgress

  if (process.send) {
    process.send(message)
  } else {
    console.error('[worker] process.send is not available!')
  }
}

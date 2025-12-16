import { ipcMain, BrowserWindow, app } from 'electron'
import path from 'path'
import fs from 'fs/promises'
import { existsSync } from 'fs'
import { spawn, ChildProcess } from 'child_process'
import { v4 as uuidv4 } from 'uuid'
import { prisma } from '../db/client'

export interface StemExtractionOptions {
  trackId: number
  stems: ('vocals' | 'drums' | 'bass' | 'other')[] // Stems to save PERMANENTLY (only these go to DB)
  outputFormat?: 'wav' | 'mp3'
}

export interface StemExtractionResult {
  extractionId: string
  permanentStems: { stem: string; trackId: number; path: string }[] // Saved in DB
  temporaryStems: { stem: string; path: string }[] // Saved to temp folder (auto-cleanup on quit)
}

export interface StemProgress {
  extractionId: string
  trackId: number
  progress: number // 0-100
  currentStem: string
  status: 'processing' | 'complete' | 'error'
  message?: string
}

// Active extraction processes
const activeExtractions = new Map<string, { process: { kill: () => void }; cancelled: boolean }>()

/**
 * Extract stems from audio track
 * Returns permanent stems (saved to DB) and temporary stems (saved to temp folder)
 */
async function extractStems(
  mainWindow: BrowserWindow,
  options: StemExtractionOptions
): Promise<StemExtractionResult> {
  const extractionId = uuidv4()

  try {
    // 1. Get track info from database
    const track = await prisma.track.findUnique({
      where: { id: options.trackId },
      include: {
        latestVersion: true,
        project: true,
      },
    })

    if (!track) {
      throw new Error('Track not found')
    }

    if (!track.latestVersion) {
      throw new Error('Track has no audio file version. Please upload audio first.')
    }

    const inputFilePath = track.latestVersion.originalPath

    if (!existsSync(inputFilePath)) {
      throw new Error(`Audio file not found at: ${inputFilePath}`)
    }

    // 2. Create output directory
    const appDataRoot = app.getPath('appData') // Lấy đường dẫn C:\Users\ADMIN\AppData\Roaming
    const correctAppDir = 'AudioProjectManager' // Tên thư mục mà server của bạn cho phép

    const projectStemsPath = path.join(
      appDataRoot,
      correctAppDir,
      'projects',
      track.projectId.toString(),
      'stems'
    )
    const outputDir = path.join(projectStemsPath, `${track.id}_${Date.now()}`)
    await fs.mkdir(outputDir, { recursive: true })

    // 3. Send initial progress
    sendProgress(mainWindow, {
      extractionId,
      trackId: options.trackId,
      progress: 0,
      currentStem: 'Initializing...',
      status: 'processing',
    })

    // 4. Start extraction process and WAIT for results
    const result = await processStems(mainWindow, {
      extractionId,
      trackId: options.trackId,
      inputFilePath,
      outputDir,
      stems: options.stems,
      track: track as {
        id: number
        title: string
        projectId: number
        latestVersion?: { durationMs?: number | null } | null
      },
      outputFormat: options.outputFormat,
    })

    return { extractionId, ...result } as StemExtractionResult
  } catch (error) {
    console.error('!!!!!!!! [MAIN] LỖI TRONG extractStems !!!!!!!!', error)
    sendProgress(mainWindow, {
      extractionId,
      trackId: options.trackId,
      progress: 0,
      currentStem: '',
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
    throw error
  }
}

/**
 * Process stems using Demucs (REAL implementation)
 * Returns permanent and temporary stems info
 */
async function processStems(
  mainWindow: BrowserWindow,
  options: {
    extractionId: string
    trackId: number
    inputFilePath: string
    outputDir: string
    stems: string[] // Stems to save PERMANENTLY to DB
    track: {
      id: number
      title: string
      projectId: number
      latestVersion?: { durationMs?: number | null } | null
    }
    outputFormat?: 'wav' | 'mp3'
  }
): Promise<{
  permanentStems: { stem: string; trackId: number; path: string }[]
  temporaryStems: { stem: string; path: string }[]
}> {
  const { extractionId, trackId, stems, track } = options // <-- 'track' sẽ được dùng
  let stderrData = '' // BIẾN MỚI: Để lưu trữ tất cả lỗi từ Python
  let processingError: Error | null = null // Biến để lưu lỗi từ stdout

  try {
    // Python path - use the correct Python with Demucs installed
    const pythonPath = 'python'
    // Use source path for script (not dist path)
    const scriptPath = path.join(__dirname, '../../scripts/demucs_separate.py')

    // Check if script exists
    const scriptExists = existsSync(scriptPath)

    if (!scriptExists) {
      throw new Error(`Python script not found at: ${scriptPath}`)
    }

    // Check if cancelled
    const extraction = activeExtractions.get(extractionId)
    if (extraction?.cancelled) {
      throw new Error('Extraction cancelled by user')
    }

    // Send initial progress
    sendProgress(mainWindow, {
      extractionId,
      trackId,
      progress: 10,
      currentStem: 'Initializing',
      status: 'processing',
      message: 'Starting stem separation...',
    })

    // Spawn Python process with retries (try 'python' then 'py')
    const args = [scriptPath, options.inputFilePath, options.outputDir, JSON.stringify(stems)]

    // Helper to attempt spawn and await immediate error (ENOENT) or success
    const trySpawn = (exe: string): { proc: ChildProcess | null; error: Error | null } => {
      try {
        const p = spawn(exe, args, {
          cwd: path.dirname(scriptPath),
          env: { ...process.env },
        })
        return { proc: p, error: null }
      } catch (err: unknown) {
        return { proc: null, error: err as Error }
      }
    }

    const candidates = [pythonPath, 'py']
    let demucsProcess: ChildProcess | null = null
    let lastSpawnError: Error | null = null

    for (const exe of candidates) {
      const res = trySpawn(exe)
      if (res.proc) {
        demucsProcess = res.proc
        break
      }
      lastSpawnError = res.error
      console.warn('!!!!!!!! [MAIN] Spawn attempt FAILED for !!!!!!!!', exe, lastSpawnError)
    }

    if (!demucsProcess) {
      // Could not spawn any Python executable
      console.error(
        '!!!!!!!! [MAIN] Failed to spawn Python process. Last error: !!!!!!!!',
        lastSpawnError
      )
      sendProgress(mainWindow, {
        extractionId,
        trackId,
        progress: 0,
        currentStem: '',
        status: 'error',
        message:
          'Could not start Python. Make sure Python is installed and available on PATH (try "python" or "py").',
      })
      throw new Error('Failed to spawn Python process')
    }

    // Store process for cancellation
    if (extraction) {
      extraction.process = demucsProcess
    }

    let outputBuffer = ''
    const createdStems: { stem: string; path: string }[] = []

    // Handle stdout (progress and results)
    demucsProcess.stdout?.on('data', (data: Buffer) => {
      const message = data.toString()
      outputBuffer += message
      const lines = outputBuffer.split('\n')
      outputBuffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.trim()) continue

        try {
          const parsed = JSON.parse(line)

          if (parsed.type === 'progress') {
            sendProgress(mainWindow, {
              extractionId,
              trackId,
              progress: parsed.progress,
              currentStem: parsed.stem || 'Processing',
              status: 'processing',
              message: `Separating stems... ${parsed.progress}%`,
            })
          } else if (parsed.type === 'status') {
            sendProgress(mainWindow, {
              extractionId,
              trackId,
              progress: 10,
              currentStem: parsed.stem || 'Processing',
              status: 'processing',
              message: parsed.message,
            })
          } else if (parsed.type === 'stem_complete') {
            createdStems.push({ stem: parsed.stem, path: parsed.path })
          } else if (parsed.success === false) {
            // Đừng throw, hãy gán lỗi và kill process
            processingError = new Error(parsed.error || 'Demucs separation failed')
            demucsProcess.kill() // Buộc process đóng lại
          }
        } catch (e) {
          console.warn('[MAIN] Failed to parse Demucs output line as JSON:', line, e)
        }
      }
    })

    // Handle stderr
    demucsProcess.stderr?.on('data', (data: Buffer) => {
      const message = data.toString()
      console.error('!!!!!!!! [MAIN] LỖI TỪ PYTHON (stderr) !!!!!!!!:', message)
      stderrData += message // QUAN TRỌNG: Lưu lại lỗi
    })

    // Wait for process to complete
    await new Promise<void>((resolve, reject) => {
      demucsProcess.on('close', (code: number | null) => {
        // Ưu tiên lỗi processingError
        if (processingError) {
          reject(processingError)
        } else if (code === 0) {
          resolve()
        } else {
          // Map common error codes to user-friendly messages
          let errorMessage = stderrData.trim()

          if (code === 3221225477 || code === -1073741819) {
            // 0xC0000005 = Access Violation (Windows)
            errorMessage =
              'Demucs crashed with Access Violation (0xC0000005). This usually means:\n' +
              '1. Missing Visual C++ Redistributables\n' +
              '2. Incorrect Python/torch installation\n' +
              '3. Insufficient memory\n\n' +
              'See STEM_SEPARATION_SETUP.md for installation instructions.'
          } else if (code === 1) {
            errorMessage =
              errorMessage ||
              'Demucs process failed. Check if demucs is installed: pip install demucs'
          } else if (!errorMessage) {
            errorMessage = `Demucs process exited with code ${code}`
          }

          reject(new Error(errorMessage))
        }
      })

      demucsProcess.on('error', (error: Error & { code?: string }) => {
        console.error('!!!!!!!! [MAIN] Demucs process spawn error !!!!!!!!', error)

        // User-friendly error messages
        let errorMessage = error.message
        if (error.code === 'ENOENT') {
          errorMessage =
            'Python executable not found. Please install Python 3.8+ and add it to PATH.'
        }

        reject(new Error(errorMessage))
      })
    })

    // Create database entries for each stem
    const permanentStems: { stem: string; trackId: number; path: string }[] = []
    const temporaryStems: { stem: string; path: string }[] = []

    // Separate permanent vs temporary stems
    for (const { stem, path: stemPath } of createdStems) {
      const isPermanent = stems.includes(stem)

      if (isPermanent) {
        // Save to database (permanent)
        sendProgress(mainWindow, {
          extractionId,
          trackId,
          progress: 90,
          currentStem: stem,
          status: 'processing',
          message: `Saving ${stem} to database...`,
        })

        // Create track entry
        const newTrack = await prisma.track.create({
          data: {
            title: `${track.title} (${stem})`,
            projectId: track.projectId,
            parentTrackId: trackId,
            stemType: stem,
          },
        })

        // Create FileVersion entry
        const fileStats = await fs.stat(stemPath)
        const newFileVersion = await prisma.fileVersion.create({
          data: {
            trackId: newTrack.id,
            originalPath: stemPath,
            storedPath: stemPath,
            storageMode: 'copy',
            mimeType: 'audio/wav',
            sizeBytes: fileStats.size,
          },
        })

        // Update latestVersionId
        await prisma.track.update({
          where: { id: newTrack.id },
          data: { latestVersionId: newFileVersion.id },
        })

        permanentStems.push({ stem, trackId: newTrack.id, path: stemPath })
      } else {
        // Move to temporary folder (auto-cleanup on quit)
        const appDataRoot = app.getPath('appData')
        const tempStemsDir = path.join(
          appDataRoot,
          'AudioProjectManager',
          'projects',
          track.projectId.toString(),
          'temp-stems',
          trackId.toString()
        )
        await fs.mkdir(tempStemsDir, { recursive: true })

        const tempPath = path.join(tempStemsDir, `${stem}.wav`)
        await fs.rename(stemPath, tempPath)

        temporaryStems.push({ stem, path: tempPath })
      }
    }

    // Send completion
    sendProgress(mainWindow, {
      extractionId,
      trackId,
      progress: 100,
      currentStem: 'Complete',
      status: 'complete',
      message: `Extracted ${permanentStems.length} permanent + ${temporaryStems.length} temporary stems`,
    })

    // Clean up
    activeExtractions.delete(extractionId)

    return { permanentStems, temporaryStems }
  } catch (error) {
    console.error('!!!!!!!! [MAIN] LỖI LỚN TRONG processStems !!!!!!!!', error)
    sendProgress(mainWindow, {
      extractionId,
      trackId,
      progress: 0,
      currentStem: '',
      status: 'error',
      // QUAN TRỌNG: Gửi lỗi thực sự (từ stderr) về UI
      message: error instanceof Error ? error.message : 'Unknown error',
    })
    activeExtractions.delete(extractionId)
    throw error // Re-throw to propagate to extractStems
  }
}

/**
 * Cancel stem extraction
 */
async function cancelExtraction(extractionId: string): Promise<void> {
  const extraction = activeExtractions.get(extractionId)
  if (extraction) {
    extraction.cancelled = true
    if (extraction.process) {
      extraction.process.kill()
    }
    activeExtractions.delete(extractionId)
  }
}

/**
 * Send progress update to renderer
 */
function sendProgress(mainWindow: BrowserWindow, progress: StemProgress) {
  mainWindow.webContents.send('stem:progress', progress)
}

/**
 * Register IPC handlers
 */
export function registerStemHandlers(mainWindow: BrowserWindow) {
  // Remove old handlers if they exist
  try {
    ipcMain.removeHandler('stem:extract')
    ipcMain.removeHandler('stem:cancel')
  } catch (e) {
    // Ignore errors if handlers don't exist
  }

  ipcMain.handle('stem:extract', async (_event, options: StemExtractionOptions) => {
    try {
      const result = await extractStems(mainWindow, options)
      return result
    } catch (error) {
      console.error('❌ [MAIN] stem:extract failed:', error)
      throw error
    }
  })

  ipcMain.handle('stem:cancel', async (_event, extractionId: string) => {
    return cancelExtraction(extractionId)
  })
}

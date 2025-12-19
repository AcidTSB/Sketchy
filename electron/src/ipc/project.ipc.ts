import { ipcMain, dialog, app } from 'electron'
import { prisma } from '../db/client'
import { CreateProjectSchema, UpdateProjectSchema, CreateFolderSchema } from './schemas'
import { log } from '../utils/logger'
import { getCurrentUserId } from './auth-context'
import { eventBus } from '../services/eventBus'
import path from 'path'
import fs from 'fs'
import { pathToFileURL, fileURLToPath } from 'url' // Import thư viện xử lý URL

// --- HÀM HỖ TRỢ CHUYỂN ĐỔI (Path <-> URL) ---

// 1. Chuyển đường dẫn file thành URL chuẩn (vd: C:\Anh.jpg -> file:///C:/Anh.jpg)
// Giúp Frontend (thẻ <img>) hiển thị được ảnh trên mọi hệ điều hành
function toFileUrl(filePath: string): string {
  return pathToFileURL(filePath).href
}

// 2. Chuyển URL về đường dẫn file (vd: file:///C:/Anh.jpg -> C:\Anh.jpg)
// Để Backend (fs) có thể đọc/ghi/copy
function getRawPath(input: string): string {
  if (input.startsWith('file://')) {
    try {
      return fileURLToPath(input)
    } catch (e) {
      return input.replace('file:///', '').replace('file://', '')
    }
  }
  return input
}

// --- HÀM LƯU ẢNH THÔNG MINH (XỬ LÝ CẢ BASE64 VÀ FILE PATH) ---
function saveCoverArt(projectId: number, coverArtData: string): string | null {
  try {
    const userDataPath = app.getPath('userData')
    const projectDir = path.join(userDataPath, 'projects', projectId.toString())

    // Tạo thư mục nếu chưa có
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true })
    }

    const timestamp = Date.now()

    // TRƯỜNG HỢP A: Dữ liệu là Base64 (Từ tool cắt ảnh khi Tạo Project)
    if (coverArtData.startsWith('data:image')) {
      const matches = coverArtData.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/)
      if (!matches || matches.length !== 3) {
        log.error('Invalid base64 image data')
        return null
      }

      let ext = matches[1] === 'jpeg' ? 'jpg' : matches[1]
      const buffer = Buffer.from(matches[2], 'base64')
      const fileName = `cover_${timestamp}.${ext}`
      const destPath = path.join(projectDir, fileName)

      // Ghi file từ buffer
      fs.writeFileSync(destPath, buffer)

      // [QUAN TRỌNG] Trả về dạng file:// để Frontend hiển thị ok
      return toFileUrl(destPath)
    }

    // TRƯỜNG HỢP B: Dữ liệu là Đường dẫn file (Từ nút Change Cover / Select File)
    else {
      // Chuyển về đường dẫn gốc để kiểm tra và copy
      const srcPath = getRawPath(coverArtData)

      // Bỏ qua nếu là link online (http)
      if (srcPath.startsWith('http')) return null

      if (!fs.existsSync(srcPath)) {
        log.warn(`Source file not found: ${srcPath}`)
        return null
      }

      const ext = path.extname(srcPath) || '.jpg'
      const fileName = `cover_${timestamp}${ext}`
      const destPath = path.join(projectDir, fileName)

      // Copy file
      fs.copyFileSync(srcPath, destPath)

      // [QUAN TRỌNG] Trả về dạng file://
      return toFileUrl(destPath)
    }
  } catch (error) {
    log.error({ error }, 'Failed to save cover art')
    return null
  }
}

export function registerProjectHandlers() {
  // --- 1. Select audio files ---
  ipcMain.handle('select-audio-files', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections'],
        filters: [
          { name: 'Audio Files', extensions: ['mp3', 'wav', 'flac', 'm4a', 'ogg', 'aac'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      })

      if (result.canceled) return { success: false, error: 'Cancelled' }

      return {
        success: true,
        data: result.filePaths.map((filePath) => ({
          path: filePath,
          name: path.basename(filePath),
        })),
      }
    } catch (error) {
      log.error({ error }, 'Failed to select audio files')
      return { success: false, error: 'Failed to select audio files' }
    }
  })

  // --- 2. Select image file ---
  ipcMain.handle('select-image-file', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
          { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: true, data: null }
      }

      const filePath = result.filePaths[0]
      const imageBuffer = fs.readFileSync(filePath)
      const ext = path.extname(filePath).toLowerCase()
      const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg'
      const base64Image = `data:${mimeType};base64,${imageBuffer.toString('base64')}`

      return {
        success: true,
        data: {
          path: toFileUrl(filePath), // [FIX] Trả về file://
          name: path.basename(filePath),
          base64: base64Image,
        },
      }
    } catch (error) {
      log.error({ error }, 'Failed to select image file')
      return { success: false, error: 'Failed to select image file' }
    }
  })

  // --- 3. Get projects ---
  ipcMain.handle('get-projects', async () => {
    try {
      const userId = getCurrentUserId()
      const projects = await prisma.project.findMany({
        where: { userId },
        include: {
          folders: true,
          tracks: { include: { latestVersion: true } },
        },
        orderBy: { updatedAt: 'desc' },
      })
      return { success: true, data: projects }
    } catch (error) {
      log.error({ error }, 'Failed to get projects')
      return { success: false, error: 'Failed to get projects' }
    }
  })

  // --- 4. Get single project ---
  ipcMain.handle('get-project', async (_event, id: number) => {
    try {
      const userId = getCurrentUserId()
      const project = await prisma.project.findFirst({
        where: { id, userId },
        include: {
          folders: {
            include: {
              tracks: {
                include: {
                  latestVersion: true,
                  tags: { include: { tag: true } },
                  notes: true,
                },
              },
            },
          },
          tracks: {
            where: { folderId: null },
            include: {
              latestVersion: true,
              tags: { include: { tag: true } },
              notes: true,
            },
          },
        },
      })
      if (!project) return { success: false, error: 'Project not found' }
      return { success: true, data: project }
    } catch (error) {
      log.error({ error, id }, 'Failed to get project')
      return { success: false, error: 'Failed to get project' }
    }
  })

  // --- 5. Create project (FIXED: Xử lý cả Base64 và Path) ---
  ipcMain.handle('create-project', async (_event, payload: any) => {
    try {
      const userId = getCurrentUserId()
      const { coverArt, ...rest } = payload

      const validated = CreateProjectSchema.parse({ ...rest, coverArt: undefined })

      // 1. Tạo Project trong DB
      let project = await prisma.project.create({
        data: {
          ...validated,
          userId,
          coverArt: null,
        } as any,
        include: { folders: true, tracks: true },
      })

      // 2. Lưu ảnh (Dùng hàm saveCoverArt đa năng)
      if (coverArt && typeof coverArt === 'string') {
        const savedUrl = saveCoverArt(project.id, coverArt)

        if (savedUrl) {
          project = await prisma.project.update({
            where: { id: project.id },
            data: { coverArt: savedUrl } as any,
            include: { folders: true, tracks: true },
          })
        }
      }

      log.info({ projectId: project.id, userId }, 'Project created')
      eventBus.emitAppEvent('project:updated', {
        userId,
        entityType: 'project',
        entityId: project.id,
        action: 'create',
        metadata: { projectName: project.name },
      })

      return { success: true, data: project }
    } catch (error) {
      log.error({ error, payload }, 'Failed to create project')
      return { success: false, error: 'Failed to create project' }
    }
  })

  // --- 6. Update project (FIXED: Xử lý cả Base64 và Path) ---
  ipcMain.handle('update-project', async (_event, id: number, payload: any) => {
    try {
      const { coverArt, ...rest } = payload
      const validated = UpdateProjectSchema.parse(rest)

      let savedUrl = undefined
      // Nếu có ảnh mới (Path hoặc URL), gọi hàm saveCoverArt để copy và chuẩn hóa
      if (coverArt && typeof coverArt === 'string') {
        savedUrl = saveCoverArt(id, coverArt)
      }

      const project = await prisma.project.update({
        where: { id },
        data: {
          ...validated,
          ...(savedUrl ? { coverArt: savedUrl } : {}),
        } as any,
        include: { folders: true, tracks: true },
      })

      log.info({ projectId: id }, 'Project updated')
      eventBus.emitAppEvent('project:updated', {
        userId: project.userId,
        entityType: 'project',
        entityId: project.id,
        action: 'update',
        metadata: { projectName: project.name },
      })
      return { success: true, data: project }
    } catch (error) {
      log.error({ error, id, payload }, 'Failed to update project')
      return { success: false, error: 'Failed to update project' }
    }
  })

  // --- 7. Delete project ---
  ipcMain.handle('delete-project', async (_event, id: number) => {
    try {
      const userId = getCurrentUserId()
      const project = await prisma.project.findUnique({ where: { id } })

      try {
        const userDataPath = app.getPath('userData')
        const projectDir = path.join(userDataPath, 'projects', id.toString())
        if (fs.existsSync(projectDir)) {
          fs.rmSync(projectDir, { recursive: true, force: true })
        }
      } catch (e) {}

      await prisma.project.delete({ where: { id } })
      log.info({ projectId: id }, 'Project deleted')

      if (project) {
        eventBus.emitAppEvent('project:deleted', {
          userId,
          entityType: 'project',
          entityId: project.id,
          action: 'delete',
          metadata: { projectName: project.name },
        })
      }
      return { success: true }
    } catch (error) {
      log.error({ error, id }, 'Failed to delete project')
      return { success: false, error: 'Failed to delete project' }
    }
  })

  // --- 8. Folders (Giữ nguyên) ---
  ipcMain.handle('get-folders', async (_event, projectId: number) => {
    const folders = await prisma.folder.findMany({
      where: { projectId },
      include: { tracks: { include: { latestVersion: true } } },
    })
    return { success: true, data: folders }
  })

  ipcMain.handle('create-folder', async (_event, payload: any) => {
    const userId = getCurrentUserId()
    const validated = CreateFolderSchema.parse(payload)
    const folder = await prisma.folder.create({ data: validated, include: { tracks: true } })
    eventBus.emitAppEvent('project:updated', {
      userId,
      entityType: 'project',
      entityId: validated.projectId,
      action: 'create_folder',
      metadata: { folderName: folder.name },
    })
    return { success: true, data: folder }
  })

  ipcMain.handle('update-folder', async (_event, id: number, name: string) => {
    const folder = await prisma.folder.update({
      where: { id },
      data: { name },
      include: { tracks: true },
    })
    return { success: true, data: folder }
  })

  ipcMain.handle('delete-folder', async (_event, id: number) => {
    const userId = getCurrentUserId()
    const folder = await prisma.folder.findUnique({ where: { id } })
    await prisma.folder.delete({ where: { id } })
    if (folder)
      eventBus.emitAppEvent('project:updated', {
        userId,
        entityType: 'project',
        entityId: folder.projectId,
        action: 'delete_folder',
        metadata: { folderName: folder.name },
      })
    return { success: true }
  })
}

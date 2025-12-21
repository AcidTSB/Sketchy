import { ipcMain, app } from 'electron'
import { getCurrentUserId } from './auth-context' // <--- 1. THÊM IMPORT NÀY
import { v4 as uuidv4 } from 'uuid'
import { fork, ChildProcess } from 'child_process'
import path from 'path'
import { ImportFilesSchema } from './schemas'
import { log } from '../utils/logger'
import { eventBus } from '../services/eventBus'

// Đã xóa interface ImportProgress bị thừa

const activeImports = new Map<string, ChildProcess>()

export function registerImportHandlers() {
  // Start import
  ipcMain.handle('import-files', async (event, payload: unknown) => {
    try {
      const validated = ImportFilesSchema.parse(payload)
      const importId = uuidv4()

      // <--- 2. LẤY USER ID HIỆN TẠI --->
      const userId = getCurrentUserId()
      if (!userId) throw new Error('User not authenticated')

      log.info({ importId, fileCount: validated.files.length }, 'Starting import')

      // In development, the worker is a separate file.
      // In production, it's bundled into the app's resources.
      const workerPath = app.isPackaged
        ? path.join(process.resourcesPath, 'app.asar/electron/dist/workers/importWorker.js')
        : path.join(__dirname, '../workers/importWorker.js')
      log.info({ workerPath }, 'Spawning worker')

      const worker = fork(workerPath, [], {
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      })

      activeImports.set(importId, worker)

      // Log worker stdout/stderr
      worker.stdout?.on('data', (data) => {
        log.info({ importId, output: data.toString() }, 'Worker stdout')
      })

      worker.stderr?.on('data', (data) => {
        console.error('[import] Worker stderr:', data.toString())
        log.error({ importId, error: data.toString() }, 'Worker stderr')
      })

      // Listen to worker messages
      worker.on('message', (message: any) => {
        // 1. Nếu là App Event (do mình vừa định nghĩa ở worker)
        if (message.type === 'app-event') {
          log.info({ channel: message.channel }, 'Relaying worker event')
          // Main process có quyền truy cập eventBus, nên gọi ở đây là an toàn
          eventBus.emitAppEvent(message.channel, message.data)
          return
        }

        // 2. Logic cũ xử lý Progress
        log.info({ importId, message }, 'Worker progress message')
        event.sender.send('import-progress', message)

        if (message.status === 'done' || message.status === 'error') {
          log.info(
            { importId, file: message.file, status: message.status },
            'Import file completed'
          )
        }
      })

      worker.on('error', (error) => {
        console.error('[import] Worker error event:', error)
        log.error({ error, importId }, 'Worker error')
        event.sender.send('import-progress', {
          importId,
          file: 'worker',
          progress: 0,
          status: 'error',
          error: error.message,
        })
      })

      worker.on('exit', (code) => {
        activeImports.delete(importId)
        if (code !== 0) {
          log.error({ importId, code }, 'Worker exited with error')
        } else {
          log.info({ importId }, 'Import completed')
        }
      })

      // <--- 2. LẤY ĐƯỜNG DẪN USER DATA CHUẨN --->
      const userDataPath = app.getPath('userData')

      // Send import job to worker
      worker.send({
        importId,
        userDataPath,
        userId, // <--- 3. TRUYỀN USER ID XUỐNG WORKER
        ...validated,
      })
      return { success: true, data: { importId } }
    } catch (error) {
      log.error({ error, payload }, 'Failed to start import')
      return { success: false, error: 'Failed to start import' }
    }
  })

  // Cancel import
  ipcMain.handle('cancel-import', async (_event, importId: string) => {
    try {
      const worker = activeImports.get(importId)
      if (worker) {
        worker.kill('SIGTERM')
        activeImports.delete(importId)
        log.info({ importId }, 'Import cancelled')
        return { success: true }
      }
      return { success: false, error: 'Import not found' }
    } catch (error) {
      log.error({ error, importId }, 'Failed to cancel import')
      return { success: false, error: 'Failed to cancel import' }
    }
  })
}

import { ipcMain } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import { fork, ChildProcess } from 'child_process'
import path from 'path'
import { ImportFilesSchema } from './schemas'
import { log } from '../utils/logger'

interface ImportProgress {
  importId: string
  file: string
  progress: number
  status: 'pending' | 'processing' | 'done' | 'error'
  error?: string
}

const activeImports = new Map<string, ChildProcess>()

export function registerImportHandlers() {
  // Start import
  ipcMain.handle('import-files', async (event, payload: unknown) => {
    try {
      const validated = ImportFilesSchema.parse(payload)
      const importId = uuidv4()

      log.info({ importId, fileCount: validated.files.length }, 'Starting import')

      // Spawn import worker
      const workerPath = path.join(__dirname, '../workers/importWorker.js')
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
      worker.on('message', (message: ImportProgress) => {
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

      // Send import job to worker
      worker.send({
        importId,
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

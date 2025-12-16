import pino from 'pino'
import path from 'path'
import { app } from 'electron'
import fs from 'fs-extra'
import os from 'os'

// Handle case where app is not available (e.g., in worker processes)
let logsDir: string
try {
  logsDir = app ? path.join(app.getPath('userData'), 'logs') : path.join(os.tmpdir(), 'tttn-logs')
} catch {
  logsDir = path.join(os.tmpdir(), 'tttn-logs')
}
fs.ensureDirSync(logsDir)

const logFilePath = path.join(logsDir, `app-${new Date().toISOString().split('T')[0]}.log`)

export const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  pino.destination(logFilePath)
)

// Also create a pretty logger for development
export const devLogger = pino({
  level: 'debug',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      ignore: 'pid,hostname',
      translateTime: 'HH:MM:ss',
    },
  },
})

export const log = process.env.NODE_ENV === 'development' ? devLogger : logger

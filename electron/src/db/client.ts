import { app } from 'electron'
import path from 'path'
import { PrismaClient } from '../generated/client'

const DB_FILENAME = 'dev.db'
const qeName = 'query_engine-windows.dll.node'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

const createPrismaClient = () => {
  const isPackaged = app.isPackaged
  let dbPath: string

  if (!isPackaged) {
    dbPath = path.join(process.cwd(), 'prisma', 'prisma', DB_FILENAME)
  } else {
    dbPath = path.join(app.getPath('userData'), DB_FILENAME)
  }

  // Log ra để debug xem nó đang trỏ đi đâu
  console.log('[db-client] 🔌 Connecting to DB at:', dbPath)

  const prismaOptions: any = {
    datasources: {
      db: {
        url: `file:${dbPath}`,
      },
    },
    // Log lỗi để dễ debug
    log: !isPackaged ? ['query', 'info', 'warn', 'error'] : ['error'],
  }

  if (isPackaged) {
    // Cấu hình đường dẫn Engine cho bản .exe (trỏ vào resources)
    prismaOptions.__internal = {
      engine: {
        binaryPath: path.join(process.resourcesPath, qeName),
      },
    }
  }

  return new PrismaClient(prismaOptions)
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

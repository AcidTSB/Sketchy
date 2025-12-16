import { PrismaClient } from '@prisma/client'
import path from 'path'
import { app } from 'electron'
import fs from 'fs-extra'

// 1. Định nghĩa Global type để tránh tạo nhiều connection khi hot-reload
const globalForPrisma = global as unknown as { prisma: PrismaClient }

// 2. Hàm khởi tạo Client (Logic tính toán đường dẫn của bạn nằm ở đây)
const createPrismaClient = () => {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

  let dbPath: string
  if (isDev) {
    // Trong development, project root là parent của electron/
    // __dirname khi build sẽ là: D:\Coding\TTTN\electron\dist\db
    // Cần đi lên 3 cấp: dist -> electron -> TTTN
    const projectRoot = path.join(__dirname, '..', '..', '..')
    dbPath = path.join(projectRoot, 'prisma', 'dev.db')

    // Ensure prisma directory exists
    const prismaDir = path.dirname(dbPath)

    if (!fs.existsSync(prismaDir)) {
      console.error('[DB Client] ❌ Prisma directory NOT found!')
    }

    // Check if database file exists
    if (!fs.existsSync(dbPath)) {
      console.error('[DB Client] ❌ Database file NOT found!')
      console.error('[DB Client] Expected at:', dbPath)
      console.error('[DB Client] Run: pnpm prisma:migrate')
    }
  } else {
    // Production: use userData directory
    const userDataPath = path.join(app.getPath('userData'), 'database')
    fs.ensureDirSync(userDataPath)
    dbPath = path.join(userDataPath, 'app.db')
  }

  const dbUrl = `file:${dbPath}`

  return new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
    log: isDev ? ['error', 'warn'] : ['error'],
  })
}

// 3. EXPORT biến prisma trực tiếp
// Nếu đã có instance trong global (do hot-reload), dùng lại nó. Nếu chưa, tạo mới.
export const prisma = globalForPrisma.prisma ?? createPrismaClient()

// 4. Lưu instance vào global nếu không phải production
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

// Get database path from environment or use default
const dbDir = process.env.APPDATA || process.env.HOME || ''
const dbPath = path.join(dbDir, 'Sketchy', 'prisma')

// Ensure directory exists
if (!fs.existsSync(dbPath)) {
  fs.mkdirSync(dbPath, { recursive: true })
}

// Set DATABASE_URL environment variable
process.env.DATABASE_URL = `file:${path.join(dbPath, 'dev.db')}`

console.log(`Database path: ${process.env.DATABASE_URL}`)

// Run Prisma migration
try {
  console.log('Running Prisma migrations...')
  execSync('prisma migrate deploy', {
    stdio: 'inherit',
    env: process.env,
  })
  console.log('Migrations completed successfully!')
} catch (error) {
  console.error('Migration failed:', error.message)
  process.exit(1)
}

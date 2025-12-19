/**
 * Script to reset database to fresh state
 * Run with: pnpm db:reset
 */

const fs = require('fs')
const path = require('path')

const dbPath = path.join(__dirname, '../prisma/dev.db')
const dbJournalPath = path.join(__dirname, '../prisma/dev.db-journal')

console.log('🗑️  Resetting database to fresh state...\n')

// Delete database files
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath)
  console.log('✅ Deleted dev.db')
} else {
  console.log('ℹ️  dev.db does not exist (already clean)')
}

if (fs.existsSync(dbJournalPath)) {
  fs.unlinkSync(dbJournalPath)
  console.log('✅ Deleted dev.db-journal')
}

// Clear Electron app data (localStorage)
const appDataPath =
  process.env.APPDATA ||
  (process.platform === 'darwin'
    ? path.join(process.env.HOME, 'Library/Application Support')
    : process.env.HOME)
const appName = 'Sketchy'
const electronDataPath = path.join(appDataPath, appName)

if (fs.existsSync(electronDataPath)) {
  console.log('\n🗑️  Clearing Electron app data...')

  try {
    // Clear Local Storage
    const localStoragePath = path.join(electronDataPath, 'Local Storage')
    if (fs.existsSync(localStoragePath)) {
      fs.rmSync(localStoragePath, { recursive: true, force: true })
      console.log('✅ Cleared Local Storage')
    }

    // Clear IndexedDB
    const indexedDBPath = path.join(electronDataPath, 'IndexedDB')
    if (fs.existsSync(indexedDBPath)) {
      fs.rmSync(indexedDBPath, { recursive: true, force: true })
      console.log('✅ Cleared IndexedDB')
    }

    // Clear Session Storage
    const sessionStoragePath = path.join(electronDataPath, 'Session Storage')
    if (fs.existsSync(sessionStoragePath)) {
      fs.rmSync(sessionStoragePath, { recursive: true, force: true })
      console.log('✅ Cleared Session Storage')
    }

    // Clear Cache
    const cachePath = path.join(electronDataPath, 'Cache')
    if (fs.existsSync(cachePath)) {
      fs.rmSync(cachePath, { recursive: true, force: true })
      console.log('✅ Cleared Cache')
    }
  } catch (error) {
    console.error('⚠️  Error clearing app data:', error.message)
  }
} else {
  console.log('ℹ️  No app data found to clear')
}

console.log('\n🎉 Database and app data reset complete!')
console.log('\n📋 Next steps:')
console.log('   1. Run migrations: pnpm prisma migrate deploy')
console.log('   2. (Optional) Seed data: pnpm db:seed')
console.log('   3. Start app: pnpm dev')
console.log('\n💡 Or run all at once: pnpm prisma migrate deploy && pnpm dev')

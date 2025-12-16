#!/usr/bin/env node

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🚀 Audio Project Manager - First Time Setup\n')

// Check Node.js version
const nodeVersion = process.version
const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1))
if (majorVersion < 18) {
  console.error('❌ Node.js 18 or higher is required')
  console.error(`   Current version: ${nodeVersion}`)
  process.exit(1)
}
console.log('✓ Node.js version check passed')

// Check if pnpm is installed
try {
  execSync('pnpm --version', { stdio: 'ignore' })
  console.log('✓ pnpm is installed')
} catch {
  console.error('❌ pnpm is not installed')
  console.error('   Install with: npm install -g pnpm')
  process.exit(1)
}

// Install dependencies
console.log('\n📦 Installing dependencies...')
try {
  execSync('pnpm install', { stdio: 'inherit' })
  console.log('✓ Dependencies installed')
} catch (error) {
  console.error('❌ Failed to install dependencies')
  process.exit(1)
}

// Generate Prisma client
console.log('\n🔧 Generating Prisma client...')
try {
  execSync('pnpm prisma:generate', { stdio: 'inherit' })
  console.log('✓ Prisma client generated')
} catch (error) {
  console.error('❌ Failed to generate Prisma client')
  process.exit(1)
}

// Run migrations
console.log('\n💾 Setting up database...')
try {
  execSync('pnpm prisma:migrate', { stdio: 'inherit' })
  console.log('✓ Database migrations completed')
} catch (error) {
  console.error('❌ Failed to run migrations')
  process.exit(1)
}

// Create .env if not exists
const envPath = path.join(__dirname, '../.env')
const envExamplePath = path.join(__dirname, '../.env.example')
if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  fs.copyFileSync(envExamplePath, envPath)
  console.log('✓ Created .env file')
}

console.log('\n✅ Setup complete!\n')
console.log('Next steps:')
console.log('  1. Run: pnpm dev')
console.log('  2. Start building your audio projects!\n')
console.log('📚 Documentation:')
console.log('  - README.md for full documentation')
console.log('  - QUICKSTART.md for quick guide')
console.log('  - CONTRIBUTING.md to contribute\n')

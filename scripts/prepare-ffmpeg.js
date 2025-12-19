const fs = require('fs')
const path = require('path')

// Script to prepare FFmpeg for production build
// This copies ffmpeg.exe from ffmpeg-static to resources/bin folder

const ffmpegStatic = require('ffmpeg-static')

if (!ffmpegStatic) {
  console.error('❌ ffmpeg-static not found! Please run: pnpm install')
  process.exit(1)
}

console.log('📦 FFmpeg binary found at:', ffmpegStatic)

// Create resources/bin directory
const targetDir = path.join(__dirname, '..', 'resources', 'bin')
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true })
  console.log('✅ Created directory:', targetDir)
}

// Copy ffmpeg.exe to resources/bin
const targetPath = path.join(targetDir, 'ffmpeg.exe')
fs.copyFileSync(ffmpegStatic, targetPath)

console.log('✅ Copied ffmpeg.exe to:', targetPath)
console.log('🎉 FFmpeg preparation complete!')

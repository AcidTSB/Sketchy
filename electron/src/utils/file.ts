import path from 'path'

/**
 * Validate that a file path is safe and doesn't contain path traversal
 */
export function isPathSafe(filePath: string, baseDir: string): boolean {
  const normalizedPath = path.normalize(filePath)
  const normalizedBase = path.normalize(baseDir)
  return normalizedPath.startsWith(normalizedBase)
}

/**
 * Get audio file extensions
 */
export const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.flac', '.m4a', '.ogg', '.aac', '.wma']

/**
 * Check if file is audio
 */
export function isAudioFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase()
  return AUDIO_EXTENSIONS.includes(ext)
}

/**
 * Sanitize filename
 */
export function sanitizeFileName(filename: string): string {
  // Remove or replace unsafe characters
  return filename.replace(/[^a-z0-9._-]/gi, '_').replace(/_{2,}/g, '_')
}

/**
 * Get unique filename
 */
export function getUniqueFileName(baseName: string, extension: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `${baseName}-${timestamp}-${random}${extension}`
}

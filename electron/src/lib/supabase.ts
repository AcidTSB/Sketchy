import { createClient } from '@supabase/supabase-js'
import { app } from 'electron'
import path from 'path'
import dotenv from 'dotenv'
import { log } from '../utils/logger'

const isPackaged = app.isPackaged

const envPath = isPackaged
  ? path.join(process.resourcesPath, '.env') // Bản Prod: Đọc file .env nằm cạnh file .exe
  : path.join(__dirname, '../../.env') // Bản Dev: Đọc file .env ở thư mục gốc

dotenv.config({ path: envPath })
// ---------------------------------------------------

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || ''

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  log.warn('Supabase credentials not configured. Share feature will not work.')
  log.warn(`Looking for .env at: ${envPath}`) // Log thêm đường dẫn để dễ debug
}

// Create Supabase client with service role key
export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Storage bucket name for audio files
export const AUDIO_SHARES_BUCKET = 'sketchy-audio-shares'

/**
 * Upload a file to Supabase Storage
 */
export async function uploadAudioFile(
  fileBuffer: Buffer,
  fileName: string,
  contentType: string = 'audio/mpeg'
): Promise<string> {
  const { error } = await supabase.storage.from(AUDIO_SHARES_BUCKET).upload(fileName, fileBuffer, {
    contentType,
    upsert: false,
  })

  if (error) {
    log.error({ error }, 'Failed to upload file to Supabase Storage')
    throw new Error(`Upload failed: ${error.message}`)
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(AUDIO_SHARES_BUCKET).getPublicUrl(fileName)

  log.info({ fileName, publicUrl }, 'File uploaded successfully')
  return publicUrl
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteAudioFile(fileName: string): Promise<void> {
  const { error } = await supabase.storage.from(AUDIO_SHARES_BUCKET).remove([fileName])

  if (error) {
    log.error({ error, fileName }, 'Failed to delete file from Supabase Storage')
    throw new Error(`Delete failed: ${error.message}`)
  }

  log.info({ fileName }, 'File deleted successfully')
}

/**
 * Create a share link record in Supabase database
 */
export async function createShareLinkRecord(data: {
  token: string
  projectName?: string
  cloudFileUrl?: string
  passwordHash?: string
  expiresAt?: Date
}) {
  const { data: record, error } = await supabase
    .from('share_links')
    .insert({
      token: data.token,
      project_name: data.projectName,
      cloud_file_url: data.cloudFileUrl,
      password_hash: data.passwordHash,
      expires_at: data.expiresAt?.toISOString(),
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    log.error({ error }, 'Failed to create share link in Supabase')
    throw new Error(`Failed to create share link: ${error.message}`)
  }

  return record
}

/**
 * Get share link data from Supabase
 */
export async function getShareLinkRecord(token: string) {
  const { data, error } = await supabase.from('share_links').select('*').eq('token', token).single()

  if (error) {
    log.error({ error, token }, 'Failed to get share link from Supabase')
    return null
  }

  return data
}

/**
 * Revoke a share link
 */
export async function revokeShareLink(token: string) {
  const { error } = await supabase
    .from('share_links')
    .update({ is_active: false })
    .eq('token', token)

  if (error) {
    log.error({ error, token }, 'Failed to revoke share link')
    throw new Error(`Failed to revoke share link: ${error.message}`)
  }

  log.info({ token }, 'Share link revoked successfully')
}

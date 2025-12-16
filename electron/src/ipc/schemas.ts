import { z } from 'zod'

// Project schemas
export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  coverArt: z.string().optional(),
})

export const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  coverArt: z.string().optional(),
})

// Folder schemas
export const CreateFolderSchema = z.object({
  projectId: z.number().int().positive(),
  name: z.string().min(1).max(255),
})

// Import schemas
export const ImportFilesSchema = z.object({
  projectId: z.number().int().positive(),
  folderId: z.number().int().positive().optional(),
  files: z.array(
    z.object({
      path: z.string(),
      name: z.string(),
    })
  ),
  storageMode: z.enum(['copy', 'reference']),
})

// Track schemas
export const UpdateTrackSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  folderId: z.number().int().positive().optional().nullable(),
  status: z.enum(['draft', 'review', 'approved', 'final']).optional().nullable(),
})

// Tag schemas
export const CreateTagSchema = z.object({
  name: z.string().min(1).max(100),
})

export const AddTagToTrackSchema = z.object({
  trackId: z.number().int().positive(),
  tagId: z.number().int().positive(),
})

// Note schemas
export const CreateNoteSchema = z.object({
  trackId: z.number().int().positive(),
  content: z.string().min(1),
})

export const UpdateNoteSchema = z.object({
  content: z.string().min(1),
})

// Playback schemas
export const PlaybackControlSchema = z.object({
  fileVersionId: z.number().int().positive(),
})

export const SeekSchema = z.object({
  milliseconds: z.number().int().min(0),
})

// Trim/Export schemas
export const TrimExportSchema = z.object({
  fileVersionId: z.number().int().positive(),
  startMs: z.number().int().min(0),
  endMs: z.number().int().positive(),
  trackId: z.number().int().positive(),
})

// Share link schemas
export const CreateShareLinkSchema = z.object({
  trackId: z.number().int().positive().optional(),
  projectId: z.number().int().positive().optional(),
  password: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
})

// Recording schemas
export const SaveRecordingSchema = z.object({
  projectId: z.number().int().positive(),
  folderId: z.number().int().positive().optional(),
  name: z.string().min(1).max(255),
  durationMs: z.number().int().nonnegative(), // Allow 0 for unknown duration
  audioData: z.string(), // Base64 encoded audio data
  mimeType: z.string().default('audio/webm'),
})

// Types
export type CreateProjectDTO = z.infer<typeof CreateProjectSchema>
export type UpdateProjectDTO = z.infer<typeof UpdateProjectSchema>
export type CreateFolderDTO = z.infer<typeof CreateFolderSchema>
export type ImportFilesDTO = z.infer<typeof ImportFilesSchema>
export type UpdateTrackDTO = z.infer<typeof UpdateTrackSchema>
export type CreateTagDTO = z.infer<typeof CreateTagSchema>
export type AddTagToTrackDTO = z.infer<typeof AddTagToTrackSchema>
export type CreateNoteDTO = z.infer<typeof CreateNoteSchema>
export type UpdateNoteDTO = z.infer<typeof UpdateNoteSchema>
export type PlaybackControlDTO = z.infer<typeof PlaybackControlSchema>
export type SeekDTO = z.infer<typeof SeekSchema>
export type TrimExportDTO = z.infer<typeof TrimExportSchema>
export type CreateShareLinkDTO = z.infer<typeof CreateShareLinkSchema>
export type SaveRecordingDTO = z.infer<typeof SaveRecordingSchema>

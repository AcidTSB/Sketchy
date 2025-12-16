import { z } from 'zod'

// User schemas
export const UserProfileSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(255),
  email: z.string().email(),
  bio: z.string().optional(),
  location: z.string().optional(),
  website: z.string().url().optional(),
  avatar: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const UpdateUserProfileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  bio: z.string().optional(),
  location: z.string().optional(),
  website: z.string().url().optional(),
})

export const UserSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  defaultQuality: z.enum(['low', 'medium', 'high']).default('high'),
  audioQuality: z.enum(['low', 'medium', 'high']).optional(), // Alias for defaultQuality
  accentColor: z.string().optional(), // For theme customization
  crossfadeDuration: z.number().int().min(1).max(10).optional(), // Crossfade duration in seconds
  autoPlay: z.boolean().default(true),
  crossfade: z.boolean().default(false),
  autoSaveInterval: z.number().int().min(1).max(3600).default(5), // Auto-save interval in seconds (max 1 hour)
  maxOfflineStorage: z.number().int().min(100).max(10000).default(1000),
  emailNotifications: z.boolean().default(true),
  pushNotifications: z.boolean().default(true),
  collaborationNotifications: z.boolean().default(true),
  profileVisibility: z.enum(['public', 'private', 'friends']).default('public'),
  showActivity: z.boolean().default(true),
  showStats: z.boolean().default(true),
})

export type UserProfile = z.infer<typeof UserProfileSchema>
export type UpdateUserProfileDTO = z.infer<typeof UpdateUserProfileSchema>
export type UserSettings = z.infer<typeof UserSettingsSchema>

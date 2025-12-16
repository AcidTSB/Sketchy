import { ipcMain } from 'electron'
import { UpdateUserProfileSchema, UserSettingsSchema } from './user.schemas'
import { log } from '../utils/logger'
import { prisma } from '../db/client'
import bcrypt from 'bcryptjs'
import { setCurrentUserId, clearCurrentUserId } from './auth-context'
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/emailService'
import { initiateGoogleOAuth } from '../services/googleOAuthService'
import crypto from 'crypto'

// Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

interface UserData {
  id: number
  name: string
  email: string
  bio: string | null
  location: string | null
  website: string | null
  avatar: string | null
  totalProjects: number
  totalTracks: number
  totalPlays: number
  followers: number
  following: number
  createdAt: Date
  updatedAt: Date
}

interface AppSettings {
  theme: 'light' | 'dark' | 'system'
  accentColor?: string
  defaultQuality: 'low' | 'medium' | 'high'
  audioQuality?: 'low' | 'medium' | 'high' // Alias
  autoPlay: boolean
  crossfade: boolean
  crossfadeDuration?: number
  autoSaveInterval: number
  maxOfflineStorage: number
  emailNotifications: boolean
  pushNotifications: boolean
  collaborationNotifications: boolean
  profileVisibility: 'public' | 'private' | 'friends'
  showActivity: boolean
  showStats: boolean
}

// Load user from Prisma database with real-time stats
async function loadUserData(): Promise<UserData> {
  try {
    let user = await prisma.userProfile.findFirst()

    if (!user) {
      // Create default user with bcrypt hashed password
      const defaultPassword = await bcrypt.hash('password', 10)
      user = await prisma.userProfile.create({
        data: {
          name: 'Audio Producer',
          email: 'producer@example.com',
          password: defaultPassword,
          totalProjects: 0,
          totalTracks: 0,
          totalPlays: 0,
          followers: 0,
          following: 0,
        },
      })
      log.info({ userId: user.id }, 'Created default user profile')
    }

    // Get all track IDs owned by this user
    const [totalProjects, totalTracks, totalPlays] = await Promise.all([
      prisma.project.count({ where: { userId: user.id } }),
      prisma.track.count({ where: { project: { userId: user.id } } }),
      // Count plays BY this user (total plays from playHistory table)
      prisma.playHistory.count({
        where: {
          userId: user.id,
        },
      }),
    ])

    const userWithStats: UserData = {
      ...user,
      totalProjects,
      totalTracks,
      totalPlays,
    }

    return userWithStats
  } catch (error) {
    log.error({ error }, 'Failed to load user data from database')
    throw error
  }
}

// Save user data to Prisma
async function saveUserData(data: Partial<UserData> & { id: number }): Promise<UserData> {
  try {
    const updatedUser = await prisma.userProfile.update({
      where: { id: data.id },
      data: {
        name: data.name,
        email: data.email,
        bio: data.bio,
        location: data.location,
        website: data.website,
        avatar: data.avatar,
        totalProjects: data.totalProjects,
        totalTracks: data.totalTracks,
        totalPlays: data.totalPlays,
        followers: data.followers,
        following: data.following,
      },
    })
    return updatedUser
  } catch (error) {
    log.error({ error }, 'Failed to save user data to database')
    throw error
  }
}

// Load settings from Prisma
async function loadSettings(userId: number): Promise<AppSettings> {
  try {
    let settings = await prisma.userSettings.findUnique({
      where: { userId },
    })

    if (!settings) {
      settings = await prisma.userSettings.create({
        data: {
          userId,
          theme: 'dark',
          accentColor: '#a855f7',
          defaultQuality: 'high',
          autoPlay: true,
          crossfade: false,
          crossfadeDuration: 3,
          autoSaveInterval: 300,
          maxOfflineStorage: 5000,
          emailNotifications: true,
          pushNotifications: true,
          collaborationNotifications: true,
          profileVisibility: 'public',
          showActivity: true,
          showStats: true,
        },
      })
      log.info({ userId }, 'Created default user settings')
    }

    return {
      theme: settings.theme as 'light' | 'dark' | 'system',
      accentColor: settings.accentColor,
      defaultQuality: settings.defaultQuality as 'low' | 'medium' | 'high',
      audioQuality: settings.defaultQuality as 'low' | 'medium' | 'high', // Alias tạo ra ở đây
      autoPlay: settings.autoPlay,
      crossfade: settings.crossfade,
      crossfadeDuration: settings.crossfadeDuration,
      autoSaveInterval: settings.autoSaveInterval,
      maxOfflineStorage: settings.maxOfflineStorage,
      emailNotifications: settings.emailNotifications,
      pushNotifications: settings.pushNotifications,
      collaborationNotifications: settings.collaborationNotifications,
      profileVisibility: settings.profileVisibility as 'public' | 'private' | 'friends',
      showActivity: settings.showActivity,
      showStats: settings.showStats,
    }
  } catch (error) {
    log.error({ error }, 'Failed to load settings from database')
    throw error
  }
}

// Save settings to Prisma
async function saveSettings(userId: number, settingsData: AppSettings): Promise<AppSettings> {
  try {
    // Remove audioQuality (alias) before saving to DB - not using variable
    const { audioQuality, ...dbSettings } = settingsData
    void audioQuality // explicitly mark as intentionally unused

    await prisma.userSettings.upsert({
      where: { userId },
      update: dbSettings,
      create: {
        userId,
        ...dbSettings,
      },
    })
    return settingsData
  } catch (error) {
    log.error({ error }, 'Failed to save settings to database')
    throw error
  }
}

export function registerUserHandlers() {
  // Register - Create new user account with email verification
  ipcMain.handle(
    'auth-register',
    async (_event, payload: { name: string; email: string; password: string }) => {
      try {
        const { name, email, password } = payload

        // Validate input
        if (!name || !email || !password) {
          return { success: false, error: 'All fields are required' }
        }

        if (password.length < 6) {
          return { success: false, error: 'Password must be at least 6 characters' }
        }

        // Check if email already exists
        const existingUser = await prisma.userProfile.findUnique({
          where: { email },
        })

        if (existingUser) {
          return { success: false, error: 'Email already registered' }
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10)

        // Generate 6-digit OTP for verification
        const verificationToken = generateOTP()
        const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

        // Create user (inactive until verified)
        const user = await prisma.userProfile.create({
          data: {
            name,
            email,
            password: hashedPassword,
            authProvider: 'local',
            emailVerified: false,
            verificationToken,
            verificationTokenExpiry,
            totalProjects: 0,
            totalTracks: 0,
            totalPlays: 0,
            followers: 0,
            following: 0,
          },
        })

        // Create default settings for user
        await prisma.userSettings.create({
          data: {
            userId: user.id,
            theme: 'dark',
            accentColor: '#a855f7',
            defaultQuality: 'high',
            autoPlay: true,
            crossfade: false,
            crossfadeDuration: 3,
            autoSaveInterval: 300,
            maxOfflineStorage: 5000,
            emailNotifications: true,
            pushNotifications: true,
            collaborationNotifications: true,
            profileVisibility: 'public',
            showActivity: true,
            showStats: true,
          },
        })

        // Send verification email
        try {
          await sendVerificationEmail(email, name, verificationToken)
        } catch (emailError) {
          log.error({ emailError }, 'Failed to send verification email')
          // Don't fail registration if email fails
        }

        log.info({ userId: user.id, email }, 'New user registered (pending verification)')

        // Set current user (but they need to verify email)
        setCurrentUserId(user.id)

        return {
          success: true,
          data: {
            id: user.id,
            name: user.name,
            email: user.email,
            emailVerified: user.emailVerified,
          },
          message: 'Registration successful! Please check your email to verify your account.',
        }
      } catch (error) {
        log.error({ error }, 'Registration failed')
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Registration failed',
        }
      }
    }
  )

  // Login - Authenticate user
  ipcMain.handle('auth-login', async (_event, payload: { email: string; password: string }) => {
    try {
      const { email, password } = payload

      // Find user by email
      const user = await prisma.userProfile.findUnique({
        where: { email },
      })

      if (!user || !user.password) {
        return { success: false, error: 'Invalid email or password' }
      }

      // Check if user used OAuth
      if (user.authProvider !== 'local') {
        return {
          success: false,
          error: `This account uses ${user.authProvider} login. Please use "Sign in with ${user.authProvider}" instead.`,
        }
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password)

      if (!isPasswordValid) {
        return { success: false, error: 'Invalid email or password' }
      }

      // Note: We allow login even if email is not verified
      // The frontend VerificationGuard will handle blocking unverified users

      log.info({ userId: user.id, email, emailVerified: user.emailVerified }, 'User logged in')

      // Set current user
      setCurrentUserId(user.id)

      return {
        success: true,
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          emailVerified: user.emailVerified,
        },
      }
    } catch (error) {
      log.error({ error }, 'Login failed')
      return { success: false, error: error instanceof Error ? error.message : 'Login failed' }
    }
  })

  // Google OAuth Login
  ipcMain.handle('auth-google-login', async () => {
    try {
      log.info('Initiating Google OAuth login')

      // Open Google OAuth flow
      const googleUser = await initiateGoogleOAuth()

      if (!googleUser.email || !googleUser.id) {
        return { success: false, error: 'Failed to get user info from Google' }
      }

      // Check if user already exists
      let user = await prisma.userProfile.findUnique({
        where: { email: googleUser.email },
      })

      if (user) {
        // Existing user - update Google ID if not set
        if (!user.googleId) {
          user = await prisma.userProfile.update({
            where: { id: user.id },
            data: {
              googleId: googleUser.id,
              authProvider: 'google',
              emailVerified: true, // Google accounts are pre-verified
              avatar: googleUser.picture || user.avatar,
            },
          })
        }
      } else {
        // New user - create account
        user = await prisma.userProfile.create({
          data: {
            name: googleUser.name,
            email: googleUser.email,
            googleId: googleUser.id,
            authProvider: 'google',
            emailVerified: true,
            avatar: googleUser.picture,
            totalProjects: 0,
            totalTracks: 0,
            totalPlays: 0,
            followers: 0,
            following: 0,
          },
        })

        // Create default settings
        await prisma.userSettings.create({
          data: {
            userId: user.id,
            theme: 'dark',
            accentColor: '#a855f7',
            defaultQuality: 'high',
            autoPlay: true,
            crossfade: false,
            crossfadeDuration: 3,
            autoSaveInterval: 300,
            maxOfflineStorage: 5000,
            emailNotifications: true,
            pushNotifications: true,
            collaborationNotifications: true,
            profileVisibility: 'public',
            showActivity: true,
            showStats: true,
          },
        })

        log.info({ userId: user.id, email: user.email }, 'New user created via Google OAuth')
      }

      // Set current user
      setCurrentUserId(user.id)

      log.info({ userId: user.id, email: user.email }, 'User logged in via Google')

      return {
        success: true,
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          emailVerified: user.emailVerified,
        },
      }
    } catch (error) {
      log.error({ error }, 'Google OAuth login failed')
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Google login failed',
      }
    }
  })

  // Verify Email
  ipcMain.handle('auth-verify-email', async (_event, token: string) => {
    try {
      // Find user with this verification token
      const user = await prisma.userProfile.findUnique({
        where: { verificationToken: token },
      })

      if (!user) {
        return { success: false, error: 'Invalid verification token' }
      }

      // Check if token expired
      if (user.verificationTokenExpiry && user.verificationTokenExpiry < new Date()) {
        return { success: false, error: 'Verification token has expired' }
      }

      // Check if already verified
      if (user.emailVerified) {
        return { success: true, message: 'Email already verified' }
      }

      // Update user - mark as verified
      await prisma.userProfile.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          verificationToken: null,
          verificationTokenExpiry: null,
        },
      })

      log.info({ userId: user.id, email: user.email }, 'Email verified successfully')

      return {
        success: true,
        message: 'Email verified successfully! You can now log in.',
      }
    } catch (error) {
      log.error({ error }, 'Email verification failed')
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Verification failed',
      }
    }
  })

  // Resend Verification Email
  ipcMain.handle('auth-resend-verification', async (_event, email: string) => {
    try {
      const user = await prisma.userProfile.findUnique({
        where: { email },
      })

      if (!user) {
        return { success: false, error: 'User not found' }
      }

      if (user.emailVerified) {
        return { success: false, error: 'Email already verified' }
      }

      // Generate new 6-digit OTP
      const verificationToken = generateOTP()
      const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)

      await prisma.userProfile.update({
        where: { id: user.id },
        data: {
          verificationToken,
          verificationTokenExpiry,
        },
      })

      // Send email
      await sendVerificationEmail(email, user.name, verificationToken)

      log.info({ userId: user.id, email }, 'Verification email resent')

      return { success: true, message: 'Verification email sent! Check your inbox.' }
    } catch (error) {
      log.error({ error }, 'Failed to resend verification email')
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send email',
      }
    }
  })

  // Request Password Reset
  ipcMain.handle('auth-request-password-reset', async (_event, email: string) => {
    try {
      const user = await prisma.userProfile.findUnique({
        where: { email },
      })

      if (!user) {
        // Don't reveal if user exists
        return { success: true, message: 'If an account exists, a reset link has been sent.' }
      }

      if (user.authProvider !== 'local') {
        return {
          success: false,
          error: `This account uses ${user.authProvider} login. Password reset is not available.`,
        }
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex')
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

      await prisma.userProfile.update({
        where: { id: user.id },
        data: {
          resetToken,
          resetTokenExpiry,
        },
      })

      // Send email
      await sendPasswordResetEmail(email, user.name, resetToken)

      log.info({ userId: user.id, email }, 'Password reset email sent')

      return { success: true, message: 'Password reset link sent to your email.' }
    } catch (error) {
      log.error({ error }, 'Failed to send password reset email')
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send reset email',
      }
    }
  })

  // Reset Password
  ipcMain.handle(
    'auth-reset-password',
    async (_event, payload: { token: string; newPassword: string }) => {
      try {
        const { token, newPassword } = payload

        if (newPassword.length < 6) {
          return { success: false, error: 'Password must be at least 6 characters' }
        }

        // Find user with reset token
        const user = await prisma.userProfile.findUnique({
          where: { resetToken: token },
        })

        if (!user) {
          return { success: false, error: 'Invalid reset token' }
        }

        // Check if token expired
        if (user.resetTokenExpiry && user.resetTokenExpiry < new Date()) {
          return { success: false, error: 'Reset token has expired' }
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10)

        // Update password
        await prisma.userProfile.update({
          where: { id: user.id },
          data: {
            password: hashedPassword,
            resetToken: null,
            resetTokenExpiry: null,
          },
        })

        log.info({ userId: user.id }, 'Password reset successfully')

        return { success: true, message: 'Password reset successfully! You can now log in.' }
      } catch (error) {
        log.error({ error }, 'Password reset failed')
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Password reset failed',
        }
      }
    }
  )

  // Logout - Clear current user session
  ipcMain.handle('auth-logout', async () => {
    try {
      clearCurrentUserId()
      log.info('User logged out')
      return { success: true }
    } catch (error) {
      log.error({ error }, 'Failed to logout')
      return { success: false, error: 'Failed to logout' }
    }
  })

  // Get user by ID - For session restoration
  ipcMain.handle('auth-get-user-by-id', async (_event, userId: number) => {
    try {
      const user = await prisma.userProfile.findUnique({
        where: { id: userId },
      })

      if (!user) {
        return { success: false, error: 'User not found' }
      }

      // Get real-time stats for this specific user
      const [totalProjects, totalTracks, totalPlays] = await Promise.all([
        prisma.project.count({ where: { userId } }),
        prisma.track.count({ where: { project: { userId } } }),
        // Count plays BY this user (total plays from playHistory table)
        prisma.playHistory.count({
          where: {
            userId: userId,
          },
        }),
      ])

      const { password: _password, ...userWithoutPassword } = user
      void _password // explicitly mark as intentionally unused

      // Set current user session
      setCurrentUserId(user.id)

      return {
        success: true,
        data: {
          ...userWithoutPassword,
          totalProjects,
          totalTracks,
          totalPlays,
        },
      }
    } catch (error) {
      log.error({ error, userId }, 'Failed to get user by ID')
      return { success: false, error: 'Failed to get user' }
    }
  })

  // Get current user
  ipcMain.handle('get-current-user', async () => {
    try {
      const user = await loadUserData()
      return { success: true, data: user }
    } catch (error) {
      log.error({ error }, 'Failed to get current user')
      return { success: false, error: 'Failed to get current user' }
    }
  })

  // Update user profile
  ipcMain.handle('update-user-profile', async (_event, payload: unknown) => {
    try {
      const validated = UpdateUserProfileSchema.parse(payload)
      const currentUser = await loadUserData()

      const updatedUser = await saveUserData({
        id: currentUser.id,
        ...validated,
      })

      log.info({ userId: updatedUser.id }, 'User profile updated')
      return { success: true, data: updatedUser }
    } catch (error) {
      log.error({ error, payload }, 'Failed to update user profile')
      return { success: false, error: 'Failed to update user profile' }
    }
  })

  // Upload avatar
  ipcMain.handle('upload-avatar', async (_event, filename: string, buffer: number[]) => {
    try {
      const currentUser = await loadUserData()
      const fs = await import('fs/promises')
      const path = await import('path')
      const { app } = await import('electron')

      // Create avatars directory in user data
      const userDataPath = app.getPath('userData')
      const avatarsDir = path.join(userDataPath, 'avatars')

      try {
        await fs.access(avatarsDir)
      } catch {
        await fs.mkdir(avatarsDir, { recursive: true })
      }

      // Save file
      const avatarPath = path.join(avatarsDir, filename)
      await fs.writeFile(avatarPath, Buffer.from(buffer))

      // Update user with file path
      const updatedUser = await saveUserData({
        id: currentUser.id,
        avatar: avatarPath,
      })

      log.info({ userId: updatedUser.id, avatarPath }, 'Avatar uploaded')
      return { success: true, data: avatarPath }
    } catch (error) {
      log.error({ error, filename }, 'Failed to upload avatar')
      return { success: false, error: 'Failed to upload avatar' }
    }
  })

  // Get settings
  ipcMain.handle('get-settings', async () => {
    try {
      const user = await loadUserData()
      const settings = await loadSettings(user.id)
      return { success: true, data: settings }
    } catch (error) {
      log.error({ error }, 'Failed to get settings')
      return { success: false, error: 'Failed to get settings' }
    }
  })

  // Update settings - [QUAN TRỌNG: ĐÃ SỬA LỖI Ở ĐÂY]
  ipcMain.handle('update-settings', async (_event, payload: unknown) => {
    try {
      const user = await loadUserData()
      const currentSettings = await loadSettings(user.id)

      // Merge settings hiện tại với payload
      const mergedSettings = { ...currentSettings, ...(payload as Partial<AppSettings>) }

      // [FIX] Tách audioQuality ra khỏi object trước khi validate
      // Vì Zod Schema (UserSettingsSchema) không chấp nhận trường này nếu strict
      const { audioQuality: _audioQuality, ...settingsToValidate } = mergedSettings
      void _audioQuality // explicitly mark as intentionally unused

      // Validate dữ liệu sạch
      const validated = UserSettingsSchema.parse(settingsToValidate)

      // Lưu vào DB (ép kiểu về AppSettings vì logic saveSettings cần)
      await saveSettings(user.id, validated as AppSettings)

      log.info('Settings updated')
      return { success: true, data: validated }
    } catch (error) {
      log.error({ error, payload }, 'Failed to update settings')
      // Trả về lỗi chi tiết hơn
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update settings',
      }
    }
  })

  // Update user stats
  ipcMain.handle('update-user-stats', async (_event, stats: Partial<UserData>) => {
    try {
      const currentUser = await loadUserData()
      const updatedUser = await saveUserData({
        id: currentUser.id,
        ...stats,
      })

      return { success: true, data: updatedUser }
    } catch (error) {
      log.error({ error, stats }, 'Failed to update user stats')
      return { success: false, error: 'Failed to update user stats' }
    }
  })

  // Logout
  ipcMain.handle('logout', async () => {
    try {
      clearCurrentUserId()
      log.info('User logged out')
      return { success: true }
    } catch (error) {
      log.error({ error }, 'Failed to logout')
      return { success: false, error: 'Failed to logout' }
    }
  })

  // Delete Account
  ipcMain.handle('delete-account', async (_event, userId: number) => {
    try {
      // Parse userId to ensure it's a number (IPC can serialize it as string)
      const parsedUserId = typeof userId === 'string' ? parseInt(userId, 10) : userId

      // Verify user exists
      const user = await prisma.userProfile.findUnique({
        where: { id: parsedUserId },
      })

      if (!user) {
        return { success: false, error: 'User not found' }
      }

      // Delete all user data in order (respecting foreign key constraints)
      await prisma.$transaction(async (tx) => {
        // Delete user settings
        await tx.userSettings.deleteMany({ where: { userId: parsedUserId } })

        // Delete analytics and activity logs
        await tx.playHistory.deleteMany({ where: { userId: parsedUserId } })
        await tx.userSession.deleteMany({ where: { userId: parsedUserId } })
        await tx.activityLog.deleteMany({ where: { userId: parsedUserId } })
        await tx.dailyAnalytics.deleteMany({ where: { userId: parsedUserId } })

        // Get all projects
        const projects = await tx.project.findMany({ where: { userId: parsedUserId } })

        for (const project of projects) {
          // Delete project-related data
          await tx.checklistItem.deleteMany({ where: { projectId: project.id } })
          await tx.projectSnapshot.deleteMany({ where: { projectId: project.id } })
          await tx.projectBackup.deleteMany({ where: { projectId: project.id } })

          // Get all tracks in project
          const tracks = await tx.track.findMany({ where: { projectId: project.id } })

          for (const track of tracks) {
            // Delete track-related data
            await tx.note.deleteMany({ where: { trackId: track.id } })
            await tx.trackTag.deleteMany({ where: { trackId: track.id } })

            // Delete file versions
            await tx.fileVersion.deleteMany({ where: { trackId: track.id } })
          }

          // Delete tracks
          await tx.track.deleteMany({ where: { projectId: project.id } })

          // Delete folders
          await tx.folder.deleteMany({ where: { projectId: project.id } })
        }

        // Delete projects
        await tx.project.deleteMany({ where: { userId: parsedUserId } })

        // Delete share links (no userId field in ShareLink, need to find by user's projects)
        for (const project of projects) {
          await tx.shareLink.deleteMany({ where: { projectId: project.id } })
        }

        // Finally delete user profile
        await tx.userProfile.delete({ where: { id: parsedUserId } })
      })

      clearCurrentUserId()
      log.info({ userId: parsedUserId }, 'User account deleted successfully')
      return { success: true, message: 'Account deleted successfully' }
    } catch (error) {
      log.error({ error, userId }, 'Failed to delete account')
      return { success: false, error: 'Failed to delete account' }
    }
  })
}

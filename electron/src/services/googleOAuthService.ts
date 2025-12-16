import { BrowserWindow, shell } from 'electron'
import { google } from 'googleapis'
import { log } from '../utils/logger'

// OAuth2 configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'your-google-client-id'
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'your-google-client-secret'
const REDIRECT_URI = 'http://localhost:3000/oauth/callback'

// Create OAuth2 client
const oauth2Client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, REDIRECT_URI)

export interface GoogleUserInfo {
  id: string
  email: string
  name: string
  picture?: string
  verified_email: boolean
}

/**
 * Initiate Google OAuth flow
 * Opens a browser window for user to sign in with Google
 */
export async function initiateGoogleOAuth(): Promise<GoogleUserInfo> {
  return new Promise((resolve, reject) => {
    // Generate auth URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
      prompt: 'consent',
    })

    // Create OAuth window
    const authWindow = new BrowserWindow({
      width: 500,
      height: 600,
      show: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    })

    authWindow.loadURL(authUrl)

    // Handle navigation to capture the callback URL
    authWindow.webContents.on('will-redirect', async (_event, url) => {
      await handleCallback(url, authWindow, resolve, reject)
    })

    authWindow.webContents.on('did-navigate', async (_event, url) => {
      await handleCallback(url, authWindow, resolve, reject)
    })

    // Handle window close
    authWindow.on('closed', () => {
      reject(new Error('OAuth window closed by user'))
    })
  })
}

/**
 * Handle OAuth callback
 */
async function handleCallback(
  url: string,
  authWindow: BrowserWindow,
  resolve: (value: GoogleUserInfo) => void,
  reject: (reason: Error) => void
) {
  try {
    // Check if this is the callback URL
    if (url.startsWith(REDIRECT_URI)) {
      // Extract authorization code from URL
      const urlParams = new URL(url).searchParams
      const code = urlParams.get('code')
      const error = urlParams.get('error')

      if (error) {
        authWindow.close()
        reject(new Error(`OAuth error: ${error}`))
        return
      }

      if (!code) {
        authWindow.close()
        reject(new Error('No authorization code received'))
        return
      }

      // Exchange code for tokens
      const { tokens } = await oauth2Client.getToken(code)
      oauth2Client.setCredentials(tokens)

      // Get user info
      const oauth2 = google.oauth2({
        auth: oauth2Client,
        version: 'v2',
      })

      const { data } = await oauth2.userinfo.get()

      if (!data.email || !data.id) {
        authWindow.close()
        reject(new Error('Failed to get user info from Google'))
        return
      }

      const userInfo: GoogleUserInfo = {
        id: data.id,
        email: data.email,
        name: data.name || data.email.split('@')[0],
        picture: data.picture || undefined,
        verified_email: data.verified_email || false,
      }

      authWindow.close()
      resolve(userInfo)

      log.info({ email: userInfo.email }, 'Google OAuth successful')
    }
  } catch (error) {
    authWindow.close()
    log.error({ error }, 'OAuth callback error')
    reject(error instanceof Error ? error : new Error('Unknown OAuth error'))
  }
}

/**
 * Open Google OAuth in default browser (alternative method)
 */
export async function openGoogleOAuthInBrowser(): Promise<string> {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    prompt: 'consent',
  })

  await shell.openExternal(authUrl)
  return authUrl
}

/**
 * Exchange authorization code for user info (for browser-based flow)
 */
export async function exchangeCodeForUserInfo(code: string): Promise<GoogleUserInfo> {
  try {
    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)

    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: 'v2',
    })

    const { data } = await oauth2.userinfo.get()

    if (!data.email || !data.id) {
      throw new Error('Failed to get user info from Google')
    }

    const userInfo: GoogleUserInfo = {
      id: data.id,
      email: data.email,
      name: data.name || data.email.split('@')[0],
      picture: data.picture || undefined,
      verified_email: data.verified_email || false,
    }

    log.info({ email: userInfo.email }, 'Google OAuth code exchanged successfully')
    return userInfo
  } catch (error) {
    log.error({ error }, 'Failed to exchange code for user info')
    throw new Error('Failed to authenticate with Google')
  }
}

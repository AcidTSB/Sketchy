import { app, BrowserWindow, protocol, net, ipcMain } from 'electron'
import path from 'path'
import fs from 'fs'
import http from 'http'
import { prisma } from './db/client'
import { registerProjectHandlers } from './ipc/project.ipc'
import { registerImportHandlers } from './ipc/import.ipc'
import { registerPlaybackHandlers } from './ipc/playback.ipc'
import { registerTagsNotesHandlers } from './ipc/tags-notes.ipc'
import { registerTrackHandlers } from './ipc/track.ipc'
import { registerShareHandlers } from './ipc/share.ipc'
import { registerUserHandlers } from './ipc/user.ipc'
import { registerNotificationHandlers } from './ipc/notification.ipc'
import { registerStemHandlers } from './ipc/stem.ipc'
import { registerAudioAnalysisHandlers } from './ipc/audio-analysis.ipc'
import { registerVersionHandlers } from './ipc/version.ipc'
import { registerBackupHandlers } from './ipc/backup.ipc'
import { registerChecklistHandlers } from './ipc/checklist.ipc'
import { registerOrganizeHandlers } from './ipc/organize.ipc'
import { registerMetadataHandlers } from './ipc/metadata.ipc'
import { registerBatchHandlers } from './ipc/batch.ipc'
import { registerAnalyticsHandlers } from './ipc/analytics.ipc'
import { log } from './utils/logger'

let mainWindow: BrowserWindow | null = null
let mediaServer: http.Server | null = null
const MEDIA_SERVER_PORT = 45678

function getBrowserWindowOptions(): Electron.BrowserWindowConstructorOptions {
  const isMac = process.platform === 'darwin'
  const isWindows = process.platform === 'win32'

  const candidates = [
    path.join(__dirname, 'preload.js'),
    path.join(app.getAppPath(), 'electron', 'dist', 'preload.js'),
    path.resolve(process.cwd(), 'electron', 'dist', 'preload.js'),
  ]
  const preloadPath =
    candidates.find((p) => {
      try {
        return fs.existsSync(p)
      } catch {
        return false
      }
    }) || path.join(__dirname, 'preload.js')

  const baseOptions: Electron.BrowserWindowConstructorOptions = {
    width: 1200,
    height: 800,
    backgroundColor: '#000000',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  }

  if (isMac) {
    return {
      ...baseOptions,
      titleBarStyle: 'hidden',
      trafficLightPosition: { x: 15, y: 15 },
      vibrancy: 'sidebar',
      transparent: true,
    }
  } else if (isWindows) {
    return {
      ...baseOptions,
      frame: false,
      titleBarStyle: 'hidden',
      titleBarOverlay: false,
    }
  } else {
    return {
      ...baseOptions,
      frame: false,
    }
  }
}

function createWindow() {
  const options = getBrowserWindowOptions()

  mainWindow = new BrowserWindow(options)

  try {
    const preloadPathUsed = (options.webPreferences as { preload?: string })?.preload as string
    const session = mainWindow.webContents.session
    const existing = (session as { getPreloads?: () => string[] }).getPreloads
      ? (session as { getPreloads: () => string[] }).getPreloads()
      : []
    const updated = Array.from(new Set([...(existing || []), preloadPathUsed].filter(Boolean)))
    if ((session as { setPreloads?: (preloads: string[]) => void }).setPreloads) {
      ;(session as { setPreloads: (preloads: string[]) => void }).setPreloads(updated)
    }
  } catch {
    // Ignore preload setting errors
  }

  mainWindow.webContents.on('preload-error', (_event, preloadPath, error) => {
    try {
      console.error('[main] preload-error path=', preloadPath, 'error=', error)
    } catch {
      // Ignore console errors
    }
  })

  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173'
    mainWindow.loadURL(devServerUrl).catch((err) => {
      console.error('[main] ❌ loadURL failed:', err)
    })
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../renderer/dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  registerStemHandlers(mainWindow)
  registerAudioAnalysisHandlers(mainWindow)
}

function createMediaServer() {
  mediaServer = http.createServer(async (req, res) => {
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Range',
      'Content-Type': 'application/json',
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(200, headers)
      res.end()
      return
    }

    try {
      const url = new URL(req.url!, `http://localhost:${MEDIA_SERVER_PORT}`)

      // OTP Verification endpoint (POST)
      if (url.pathname === '/api/verify-otp' && req.method === 'POST') {
        let body = ''
        req.on('data', (chunk) => {
          body += chunk.toString()
        })

        req.on('end', async () => {
          try {
            const { email, code } = JSON.parse(body)

            if (!email || !code) {
              res.writeHead(400, headers)
              res.end(JSON.stringify({ success: false, error: 'Email and code are required' }))
              return
            }

            // Find user with matching email and verification code
            const user = await prisma.userProfile.findFirst({
              where: {
                email: email,
                verificationToken: code,
                verificationTokenExpiry: { gt: new Date() },
              },
            })

            if (!user) {
              res.writeHead(400, headers)
              res.end(
                JSON.stringify({ success: false, error: 'Invalid or expired verification code' })
              )
              return
            }

            // Mark as verified
            await prisma.userProfile.update({
              where: { id: user.id },
              data: {
                emailVerified: true,
                verificationToken: null,
                verificationTokenExpiry: null,
              },
            })

            res.writeHead(200, headers)
            res.end(JSON.stringify({ success: true, message: 'Email verified successfully!' }))
          } catch (e) {
            res.writeHead(400, headers)
            res.end(JSON.stringify({ success: false, error: 'Invalid request' }))
          }
        })
        return
      }

      // Email verification endpoint (GET - legacy link-based verification)
      if (url.pathname === '/api/verify-email') {
        const token = url.searchParams.get('token')

        if (!token) {
          res.writeHead(400, { 'Content-Type': 'text/html', 'Access-Control-Allow-Origin': '*' })
          res.end(`
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <title>Verification Failed</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
                       display: flex; align-items: center; justify-content: center; 
                       min-height: 100vh; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
                .card { background: white; padding: 2rem; border-radius: 1rem; text-align: center; max-width: 400px; }
                h1 { color: #e53e3e; margin-bottom: 1rem; }
                p { color: #4a5568; }
              </style>
            </head>
            <body>
              <div class="card">
                <h1>❌ Verification Failed</h1>
                <p>Invalid verification link. Token is missing.</p>
              </div>
            </body>
            </html>
          `)
          return
        }

        // Find user with matching token
        const user = await prisma.userProfile.findFirst({
          where: {
            verificationToken: token,
            verificationTokenExpiry: { gt: new Date() },
          },
        })

        if (!user) {
          res.writeHead(400, { 'Content-Type': 'text/html', 'Access-Control-Allow-Origin': '*' })
          res.end(`
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <title>Verification Failed</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
                       display: flex; align-items: center; justify-content: center; 
                       min-height: 100vh; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
                .card { background: white; padding: 2rem; border-radius: 1rem; text-align: center; max-width: 400px; }
                h1 { color: #e53e3e; margin-bottom: 1rem; }
                p { color: #4a5568; }
              </style>
            </head>
            <body>
              <div class="card">
                <h1>❌ Verification Failed</h1>
                <p>Invalid or expired verification link.</p>
              </div>
            </body>
            </html>
          `)
          return
        }

        // Update user: mark as verified and remove token
        await prisma.userProfile.update({
          where: { id: user.id },
          data: {
            emailVerified: true,
            verificationToken: null,
            verificationTokenExpiry: null,
          },
        })

        res.writeHead(200, { 'Content-Type': 'text/html', 'Access-Control-Allow-Origin': '*' })
        res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>Email Verified!</title>
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
                display: flex; align-items: center; justify-content: center; 
                min-height: 100vh; margin: 0; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
              }
              .card { 
                background: white; padding: 2rem; border-radius: 1rem; 
                text-align: center; max-width: 400px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              }
              h1 { color: #38a169; margin-bottom: 1rem; font-size: 1.5rem; }
              p { color: #4a5568; margin-bottom: 1.5rem; }
              .success-icon { font-size: 4rem; margin-bottom: 1rem; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="success-icon">✅</div>
              <h1>Email Verified Successfully!</h1>
              <p>Your email has been verified. You can now close this tab and return to the app.</p>
              <p style="font-size: 0.875rem; color: #718096;">This window will close automatically in <span id="countdown">3</span> seconds...</p>
            </div>
            <script>
              let seconds = 3;
              const countdownEl = document.getElementById('countdown');
              const interval = setInterval(() => {
                seconds--;
                if (countdownEl) countdownEl.textContent = seconds;
                if (seconds <= 0) {
                  clearInterval(interval);
                  window.close();
                  // If window.close() doesn't work (some browsers block it), show a message
                  setTimeout(() => {
                    document.body.innerHTML = \`
                      <div class="card">
                        <div class="success-icon">✅</div>
                        <h1>Email Verified!</h1>
                        <p>You can now close this tab and return to the app.</p>
                      </div>
                    \`;
                  }, 100);
                }
              }, 1000);
            </script>
          </body>
          </html>
        `)
        return
      }

      // Password reset endpoint
      if (url.pathname === '/api/reset-password' && req.method === 'POST') {
        let body = ''
        req.on('data', (chunk) => {
          body += chunk.toString()
        })
        req.on('end', async () => {
          try {
            const { token, newPassword } = JSON.parse(body)

            if (!token || !newPassword) {
              res.writeHead(400, { 'Content-Type': 'text/html' })
              res.end(`
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="UTF-8">
                  <title>Reset Failed</title>
                  <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
                           display: flex; align-items: center; justify-content: center; 
                           min-height: 100vh; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
                    .card { background: white; padding: 2rem; border-radius: 1rem; text-align: center; max-width: 400px; }
                    h1 { color: #e53e3e; margin-bottom: 1rem; }
                    p { color: #4a5568; }
                  </style>
                </head>
                <body>
                  <div class="card">
                    <h1>❌ Reset Failed</h1>
                    <p>Missing token or password.</p>
                  </div>
                </body>
                </html>
              `)
              return
            }

            const user = await prisma.userProfile.findFirst({
              where: {
                resetToken: token,
                resetTokenExpiry: { gt: new Date() },
              },
            })

            if (!user) {
              res.writeHead(400, { 'Content-Type': 'text/html' })
              res.end(`
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="UTF-8">
                  <title>Reset Failed</title>
                  <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
                           display: flex; align-items: center; justify-content: center; 
                           min-height: 100vh; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
                    .card { background: white; padding: 2rem; border-radius: 1rem; text-align: center; max-width: 400px; }
                    h1 { color: #e53e3e; margin-bottom: 1rem; }
                    p { color: #4a5568; }
                  </style>
                </head>
                <body>
                  <div class="card">
                    <h1>❌ Reset Failed</h1>
                    <p>Invalid or expired reset link.</p>
                  </div>
                </body>
                </html>
              `)
              return
            }

            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const bcrypt = require('bcrypt')
            const hashedPassword = await bcrypt.hash(newPassword, 10)

            await prisma.userProfile.update({
              where: { id: user.id },
              data: {
                password: hashedPassword,
                resetToken: null,
                resetTokenExpiry: null,
              },
            })

            res.writeHead(200, { 'Content-Type': 'text/html' })
            res.end(`
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="UTF-8">
                <title>Password Reset Successful!</title>
                <style>
                  body { 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
                    display: flex; align-items: center; justify-content: center; 
                    min-height: 100vh; margin: 0; 
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                  }
                  .card { 
                    background: white; padding: 2rem; border-radius: 1rem; 
                    text-align: center; max-width: 400px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                  }
                  h1 { color: #38a169; margin-bottom: 1rem; font-size: 1.5rem; }
                  p { color: #4a5568; margin-bottom: 1.5rem; }
                  .success-icon { font-size: 4rem; margin-bottom: 1rem; }
                </style>
              </head>
              <body>
                <div class="card">
                  <div class="success-icon">✅</div>
                  <h1>Password Reset Successfully!</h1>
                  <p>Your password has been changed. You can now close this tab and login with your new password.</p>
                  <p style="font-size: 0.875rem; color: #718096;">This window will close automatically in <span id="countdown">3</span> seconds...</p>
                </div>
                <script>
                  let seconds = 3;
                  const countdownEl = document.getElementById('countdown');
                  const interval = setInterval(() => {
                    seconds--;
                    if (countdownEl) countdownEl.textContent = seconds;
                    if (seconds <= 0) {
                      clearInterval(interval);
                      window.close();
                      setTimeout(() => {
                        document.body.innerHTML = \\\`
                          <div class="card">
                            <div class="success-icon">✅</div>
                            <h1>Password Reset!</h1>
                            <p>You can now close this tab and login with your new password.</p>
                          </div>
                        \\\`;
                      }, 100);
                    }
                  }, 1000);
                </script>
              </body>
              </html>
            `)
          } catch (error) {
            res.writeHead(500, { 'Content-Type': 'text/html' })
            res.end(`
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="UTF-8">
                <title>Server Error</title>
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
                         display: flex; align-items: center; justify-content: center; 
                         min-height: 100vh; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
                  .card { background: white; padding: 2rem; border-radius: 1rem; text-align: center; max-width: 400px; }
                  h1 { color: #e53e3e; margin-bottom: 1rem; }
                  p { color: #4a5568; }
                </style>
              </head>
              <body>
                <div class="card">
                  <h1>❌ Server Error</h1>
                  <p>An internal server error occurred. Please try again.</p>
                </div>
              </body>
              </html>
            `)
          }
        })
        return
      }

      // Avatar serving endpoint
      if (url.pathname === '/api/avatar') {
        const filename = url.searchParams.get('file')

        if (!filename) {
          res.writeHead(400, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' })
          res.end('Missing file parameter')
          return
        }

        const avatarsDir = path.join(app.getPath('userData'), 'avatars')
        const avatarPath = path.join(avatarsDir, filename)
        const normalizedPath = path.normalize(avatarPath)
        const normalizedAvatarsDir = path.normalize(avatarsDir)

        // Security check: ensure file is within avatars directory
        if (!normalizedPath.startsWith(normalizedAvatarsDir)) {
          res.writeHead(403, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' })
          res.end('Access Denied')
          return
        }

        if (!fs.existsSync(normalizedPath)) {
          res.writeHead(404, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' })
          res.end('File Not Found')
          return
        }

        const ext = path.extname(normalizedPath).toLowerCase()
        const mimeTypes: Record<string, string> = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.gif': 'image/gif',
          '.webp': 'image/webp',
        }
        const mimeType = mimeTypes[ext] || 'application/octet-stream'

        const fileStream = fs.createReadStream(normalizedPath)
        res.writeHead(200, {
          'Content-Type': mimeType,
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=86400',
        })
        fileStream.pipe(res)
        return
      }

      // Media file serving (original functionality)
      const filePath = url.searchParams.get('path')

      if (!filePath) {
        res.writeHead(400, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' })
        res.end('Missing path parameter')
        return
      }

      const normalizedPath = path.normalize(filePath)
      const appDataDir = process.env.APPDATA || process.env.HOME || app.getPath('userData')
      const audioProjectDir = path.join(appDataDir, 'AudioProjectManager')
      const normalizedAudioProjectDir = path.normalize(audioProjectDir)

      if (!normalizedPath.startsWith(normalizedAudioProjectDir)) {
        res.writeHead(403, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' })
        res.end('Access Denied')
        return
      }

      if (!fs.existsSync(normalizedPath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' })
        res.end('File Not Found')
        return
      }

      const stat = fs.statSync(normalizedPath)
      const fileSize = stat.size
      const ext = path.extname(normalizedPath).toLowerCase()
      const mimeTypes: Record<string, string> = {
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.ogg': 'audio/ogg',
        '.m4a': 'audio/mp4',
        '.flac': 'audio/flac',
        '.aac': 'audio/aac',
      }
      const mimeType = mimeTypes[ext] || 'application/octet-stream'

      const range = req.headers.range
      if (range) {
        const parts = range.replace(/bytes=/, '').split('-')
        const start = parseInt(parts[0], 10)
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
        const chunksize = end - start + 1
        const fileStream = fs.createReadStream(normalizedPath, { start, end })

        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': mimeType,
          'Access-Control-Allow-Origin': '*',
        })
        fileStream.pipe(res)
      } else {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': mimeType,
          'Accept-Ranges': 'bytes',
          'Access-Control-Allow-Origin': '*',
        })
        fs.createReadStream(normalizedPath).pipe(res)
      }
    } catch (error) {
      console.error('[media-server] ❌ Error:', error)
      res.writeHead(500, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' })
      res.end('Internal Server Error')
    }
  })

  mediaServer.listen(MEDIA_SERVER_PORT, 'localhost', () => {
    // Media server running on localhost
  })
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'local-file',
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true },
  },
  {
    scheme: 'media',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
])

app.whenReady().then(async () => {
  try {
    const appDataRoot = app.getPath('appData')
    const projectsDir = path.join(appDataRoot, 'AudioProjectManager', 'projects')
    if (fs.existsSync(projectsDir)) {
      const projects = fs.readdirSync(projectsDir)
      for (const projectId of projects) {
        const tempStemsDir = path.join(projectsDir, projectId, 'temp-stems')
        if (fs.existsSync(tempStemsDir)) {
          fs.rmSync(tempStemsDir, { recursive: true, force: true })
        }
      }
    }
  } catch (error) {
    console.error('[main] ⚠️ Failed to cleanup temp stems:', error)
  }

  createMediaServer()

  protocol.registerFileProtocol('local-file', (request, callback) => {
    const url = request.url.replace('local-file://', '')
    try {
      return callback(decodeURIComponent(url))
    } catch (error) {
      return callback({ error: -2 })
    }
  })

  protocol.handle('media', (request) => {
    try {
      const url = new URL(request.url)
      let filePath = decodeURIComponent(url.pathname)
      if (process.platform === 'win32' && filePath.startsWith('/')) {
        filePath = filePath.substring(1)
      }
      const normalizedPath = path.normalize(filePath)
      const appDataPath = app.getPath('userData')
      const normalizedAppDataPath = path.normalize(appDataPath)

      if (!normalizedPath.startsWith(normalizedAppDataPath)) {
        return new Response('Access Denied', { status: 403 })
      }
      if (!fs.existsSync(normalizedPath)) {
        return new Response('File Not Found', { status: 404 })
      }
      return net.fetch(`file://${normalizedPath}`)
    } catch (error) {
      return new Response('Internal Server Error', { status: 500 })
    }
  })

  setTimeout(async () => {
    try {
      await prisma.$connect()
    } catch (error) {
      console.error('[main] Database connection error:', error)
    }
  }, 100)

  try {
    registerProjectHandlers()
    registerImportHandlers()
    registerPlaybackHandlers()
    registerTagsNotesHandlers()
    registerTrackHandlers()
    registerShareHandlers()
    registerUserHandlers()
    registerNotificationHandlers()
    registerVersionHandlers()
    registerBackupHandlers()
    registerChecklistHandlers()
    registerOrganizeHandlers()
    registerMetadataHandlers()
    registerBatchHandlers(mainWindow!)
    registerAnalyticsHandlers()

    ipcMain.on('window-minimize', () => {
      mainWindow?.minimize()
    })

    ipcMain.on('window-maximize', () => {
      if (mainWindow?.isMaximized()) {
        mainWindow.unmaximize()
      } else {
        mainWindow?.maximize()
      }
    })

    ipcMain.on('window-close', () => {
      mainWindow?.close()
    })
  } catch (error) {
    console.error('[main] ❌ Error registering handlers:', error)
  }

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (mediaServer) {
      mediaServer.close()
    }
    app.quit()
  }
})

app.on('before-quit', async () => {
  try {
    const appDataRoot = app.getPath('appData')
    const projectsDir = path.join(appDataRoot, 'AudioProjectManager', 'projects')
    if (fs.existsSync(projectsDir)) {
      const projects = fs.readdirSync(projectsDir)
      for (const projectId of projects) {
        const tempStemsDir = path.join(projectsDir, projectId, 'temp-stems')
        if (fs.existsSync(tempStemsDir)) {
          fs.rmSync(tempStemsDir, { recursive: true, force: true })
        }
      }
    }
  } catch (error) {
    console.error('[main] ⚠️ Failed to cleanup temp stems on quit:', error)
  }

  if (mediaServer) {
    mediaServer.close()
  }
  await prisma.$disconnect()
})

process.on('uncaughtException', (error) => {
  log.error({ error }, 'Uncaught exception')
})

process.on('unhandledRejection', (reason) => {
  log.error({ reason }, 'Unhandled rejection')
})

process.on('uncaughtExceptionMonitor', (error) => {
  log.error({ error }, 'Uncaught exception (monitor)')
})

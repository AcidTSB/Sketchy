import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const prisma = new PrismaClient()
const PORT = 3000
const SECRET_KEY = process.env.JWT_SECRET || 'secret-mac-dinh-123'

// Cấu hình upload file (Avatar/Cover)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads'
    if (!fs.existsSync(dir)) fs.mkdirSync(dir)
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname)
  },
})
const upload = multer({ storage })

app.use(cors())
app.use(express.json())
app.use('/uploads', express.static('uploads')) // Serve file tĩnh

// --- MIDDLEWARE ---
const authenticateToken = (req: any, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  if (!token) return res.sendStatus(401)
  jwt.verify(token, SECRET_KEY, (err: any, user: any) => {
    if (err) return res.sendStatus(403)
    req.user = user
    next()
  })
}

// ==========================================
// 1. AUTH & USER
// ==========================================
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, name } = req.body
    const existing = await prisma.userProfile.findUnique({ where: { email } })
    if (existing) return res.status(400).json({ success: false, error: 'Email tồn tại' })
    const hashedPassword = await bcrypt.hash(password, 10)
    const user = await prisma.userProfile.create({
      data: { email, password: hashedPassword, name: name || 'User', emailVerified: false },
    })
    res.json({ success: true, userId: user.id })
  } catch (e) {
    res.status(500).json({ success: false, error: 'Lỗi server' })
  }
})

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await prisma.userProfile.findUnique({ where: { email } })
    if (!user || !user.password)
      return res.status(400).json({ success: false, error: 'Sai thông tin' })
    if (!(await bcrypt.compare(password, user.password)))
      return res.status(400).json({ success: false, error: 'Sai thông tin' })

    const token = jwt.sign({ userId: user.id, email: user.email }, SECRET_KEY, { expiresIn: '7d' })
    res.json({ success: true, token, user: { ...user, password: '' } })
  } catch (e) {
    res.status(500).json({ success: false, error: 'Lỗi server' })
  }
})

app.get('/api/me', authenticateToken, async (req: any, res) => {
  try {
    const user = await prisma.userProfile.findUnique({
      where: { id: req.user.userId },
      include: { settings: true },
    })
    if (!user) return res.status(404).json({ success: false })
    res.json({ success: true, user, settings: user.settings || {} })
  } catch (e) {
    res.status(500).json({ success: false })
  }
})

app.post('/api/users/avatar', authenticateToken, upload.single('avatar'), async (req: any, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No file' })
  const avatarUrl = `http://localhost:${PORT}/uploads/${req.file.filename}`
  await prisma.userProfile.update({ where: { id: req.user.userId }, data: { avatar: avatarUrl } })
  res.json({ success: true, avatarUrl })
})

// ==========================================
// 2. PROJECTS
// ==========================================
app.get('/api/projects', authenticateToken, async (req: any, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: { userId: req.user.userId },
      orderBy: { updatedAt: 'desc' },
      include: { tracks: { select: { id: true } } },
    })
    res.json({ success: true, data: projects.map((p) => ({ ...p, trackCount: p.tracks.length })) })
  } catch (e) {
    res.status(500).json({ success: false })
  }
})

app.get('/api/projects/:id', authenticateToken, async (req: any, res) => {
  try {
    const project = await prisma.project.findFirst({
      where: { id: parseInt(req.params.id), userId: req.user.userId },
      include: { tracks: true, folders: true },
    })
    if (!project) return res.status(404).json({ success: false })
    res.json({ success: true, data: { ...project, trackCount: project.tracks.length } })
  } catch (e) {
    res.status(500).json({ success: false })
  }
})

// --- SỬA LỖI Ở ĐÂY: Bỏ trường status ---
app.post('/api/projects', authenticateToken, async (req: any, res) => {
  try {
    const { name, description, bpm, key, genre } = req.body
    const project = await prisma.project.create({
      data: {
        name,
        description,
        userId: req.user.userId,
        bpm: bpm || 120,
        musicalKey: key || 'C Major',
        genre: genre || 'Unspecified',
        mood: 'Neutral',
        coverArt: null,
        // Đã xóa dòng "status: 'active'" gây lỗi
      },
    })
    res.json({ success: true, data: project })
  } catch (e) {
    console.error(e)
    res.status(500).json({ success: false })
  }
})

app.delete('/api/projects/:id', authenticateToken, async (req: any, res) => {
  try {
    await prisma.project.deleteMany({
      where: { id: parseInt(req.params.id), userId: req.user.userId },
    })
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ success: false })
  }
})

// ==========================================
// 3. TRACKS & FOLDERS
// ==========================================
app.get('/api/projects/:id/tracks', authenticateToken, async (req: any, res) => {
  try {
    const tracks = await prisma.track.findMany({ where: { projectId: parseInt(req.params.id) } })
    res.json({ success: true, data: tracks })
  } catch (e) {
    res.status(500).json({ success: false })
  }
})

app.get('/api/projects/:id/folders', authenticateToken, async (req: any, res) => {
  try {
    const folders = await prisma.folder.findMany({ where: { projectId: parseInt(req.params.id) } })
    res.json({ success: true, data: folders })
  } catch (e) {
    res.status(500).json({ success: false })
  }
})

// ==========================================
// 4. ANALYTICS
// ==========================================
app.post('/api/analytics/session/start', authenticateToken, async (req: any, res) => {
  try {
    const session = await prisma.userSession.create({ data: { userId: req.user.userId } })
    res.json({ success: true, data: { sessionId: session.id } })
  } catch (e) {
    res.status(500).json({ success: false })
  }
})

app.post('/api/analytics/session/end', authenticateToken, async (req: any, res) => {
  // Logic đóng session (update endedAt)
  res.json({ success: true })
})

app.post('/api/analytics/activity', authenticateToken, async (req: any, res) => {
  try {
    const { action, entityType, entityId, metadata } = req.body
    await prisma.activityLog.create({
      data: {
        userId: req.user.userId,
        action,
        entityType,
        entityId,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    })
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ success: false })
  }
})

app.get('/api/analytics/summary', authenticateToken, async (req: any, res) => {
  try {
    res.json({
      success: true,
      data: {
        projectsCreated: await prisma.project.count({ where: { userId: req.user.userId } }),
        tracksPlayed: 120, // Giả lập
        playTimeSeconds: 3600,
        sessionsCount: 5,
      },
    })
  } catch (e) {
    res.status(500).json({ success: false })
  }
})

// ==========================================
// 5. SHARING
// ==========================================
app.post('/api/share', authenticateToken, async (req: any, res) => {
  try {
    const { projectId, trackId, password } = req.body
    const token = Math.random().toString(36).substring(7)
    const link = await prisma.shareLink.create({
      data: { token, projectId, trackId, passwordHash: password },
    })
    res.json({ success: true, data: link })
  } catch (e) {
    res.status(500).json({ success: false })
  }
})

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
})

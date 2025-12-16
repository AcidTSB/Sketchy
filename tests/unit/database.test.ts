import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'

describe('Database Operations', () => {
  let prisma: PrismaClient

  beforeAll(() => {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: 'file:./test.db',
        },
      },
    })
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('should create a project', async () => {
    const project = await prisma.project.create({
      data: {
        name: 'Test Project',
        description: 'Test description',
      },
    })

    expect(project.id).toBeDefined()
    expect(project.name).toBe('Test Project')

    // Cleanup
    await prisma.project.delete({ where: { id: project.id } })
  })

  it('should create a folder in project', async () => {
    const project = await prisma.project.create({
      data: { name: 'Test Project' },
    })

    const folder = await prisma.folder.create({
      data: {
        name: 'Test Folder',
        projectId: project.id,
      },
    })

    expect(folder.id).toBeDefined()
    expect(folder.name).toBe('Test Folder')
    expect(folder.projectId).toBe(project.id)

    // Cleanup
    await prisma.project.delete({ where: { id: project.id } })
  })

  it('should create track with file version', async () => {
    const project = await prisma.project.create({
      data: { name: 'Test Project' },
    })

    const track = await prisma.track.create({
      data: {
        projectId: project.id,
        title: 'Test Track',
      },
    })

    const fileVersion = await prisma.fileVersion.create({
      data: {
        trackId: track.id,
        originalPath: '/path/to/file.mp3',
        storageMode: 'copy',
      },
    })

    await prisma.track.update({
      where: { id: track.id },
      data: { latestVersionId: fileVersion.id },
    })

    const updatedTrack = await prisma.track.findUnique({
      where: { id: track.id },
      include: { latestVersion: true },
    })

    expect(updatedTrack?.latestVersion?.id).toBe(fileVersion.id)

    // Cleanup
    await prisma.project.delete({ where: { id: project.id } })
  })
})

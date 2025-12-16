/**
 * Database & Backend Integration Test
 * Test các API endpoints và database connection
 */

import { prisma } from './electron/src/db/client'
import crypto from 'crypto'

async function testDatabaseConnection() {
  console.log('🔍 Testing Database Connection...')

  try {
    await prisma.$connect()
    console.log('✅ Database connected successfully')

    // Test query
    const projects = await prisma.project.findMany()
    console.log(`✅ Found ${projects.length} projects`)

    await prisma.$disconnect()
    return true
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    return false
  }
}

async function testCreateProject() {
  console.log('\n🔍 Testing Create Project...')

  try {
    const project = await prisma.project.create({
      data: {
        name: 'Test Project',
        description: 'Created by integration test',
        userId: 1, // Use default user ID for testing
      },
    })

    console.log('✅ Project created:', project.id, project.name)

    // Cleanup
    await prisma.project.delete({ where: { id: project.id } })
    console.log('✅ Cleanup completed')

    return true
  } catch (error) {
    console.error('❌ Create project failed:', error)
    return false
  }
}

async function testCreateTrack() {
  console.log('\n🔍 Testing Create Track with Version...')

  try {
    // Create project first
    const project = await prisma.project.create({
      data: {
        name: 'Test Project for Track',
        userId: 1, // Use default user ID for testing
      },
    })

    // Create track with version
    const track = await prisma.track.create({
      data: {
        projectId: project.id,
        title: 'Test Track',
        versions: {
          create: {
            originalPath: '/test/path/audio.mp3',
            storedPath: '/test/stored/audio.mp3',
            storageMode: 'copy',
            mimeType: 'audio/mpeg',
            sizeBytes: 1024000,
            durationMs: 180000,
          },
        },
      },
      include: {
        versions: true,
      },
    })

    console.log('✅ Track created:', track.id, track.title)
    console.log('✅ Version created:', track.versions[0]?.id)

    // Set latest version
    await prisma.track.update({
      where: { id: track.id },
      data: {
        latestVersionId: track.versions[0].id,
      },
    })

    console.log('✅ Latest version set')

    // Cleanup
    await prisma.project.delete({ where: { id: project.id } })
    console.log('✅ Cleanup completed')

    return true
  } catch (error) {
    console.error('❌ Create track failed:', error)
    return false
  }
}

async function testTagsAndNotes() {
  console.log('\n🔍 Testing Tags and Notes...')

  try {
    // Create project and track
    const project = await prisma.project.create({
      data: {
        name: 'Test Project',
        userId: 1, // Use default user ID for testing
        tracks: {
          create: {
            title: 'Test Track',
            versions: {
              create: {
                originalPath: '/test/audio.mp3',
                storageMode: 'copy',
              },
            },
          },
        },
      },
    })

    // Get tracks separately since include doesn't work with create
    const tracks = await prisma.track.findMany({
      where: { projectId: project.id },
    })

    const trackId = tracks[0].id

    // Create tag
    const tag = await prisma.tag.create({
      data: {
        name: 'test-tag',
        tracks: {
          create: {
            trackId,
          },
        },
      },
    })

    console.log('✅ Tag created and linked to track:', tag.name)

    // Create note
    const note = await prisma.note.create({
      data: {
        trackId,
        content: 'Test note content',
      },
    })

    console.log('✅ Note created:', note.id)

    // Verify
    const trackWithTagsAndNotes = await prisma.track.findUnique({
      where: { id: trackId },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
        notes: true,
      },
    })

    console.log('✅ Track has', trackWithTagsAndNotes?.tags.length, 'tags')
    console.log('✅ Track has', trackWithTagsAndNotes?.notes.length, 'notes')

    // Cleanup
    await prisma.project.delete({ where: { id: project.id } })
    await prisma.tag.delete({ where: { id: tag.id } })
    console.log('✅ Cleanup completed')

    return true
  } catch (error) {
    console.error('❌ Tags and notes test failed:', error)
    return false
  }
}

async function testShareLink() {
  console.log('\n🔍 Testing Share Link...')

  try {
    // Create project
    const project = await prisma.project.create({
      data: {
        name: 'Test Project',
        userId: 1, // Use default user ID for testing
      },
    })

    // Create share link
    const token = crypto.randomBytes(16).toString('hex')
    const shareLink = await prisma.shareLink.create({
      data: {
        token,
        projectId: project.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    console.log('✅ Share link created:', shareLink.token)

    // Verify
    const found = await prisma.shareLink.findUnique({
      where: { token },
    })

    console.log('✅ Share link found:', found?.id)

    // Test revoke
    await prisma.shareLink.update({
      where: { id: shareLink.id },
      data: { revoked: true },
    })

    console.log('✅ Share link revoked')

    // Cleanup
    await prisma.shareLink.delete({ where: { id: shareLink.id } })
    await prisma.project.delete({ where: { id: project.id } })
    console.log('✅ Cleanup completed')

    return true
  } catch (error) {
    console.error('❌ Share link test failed:', error)
    return false
  }
}

async function runAllTests() {
  console.log('🚀 Starting Database Integration Tests\n')
  console.log('='.repeat(50))

  const results = {
    connection: await testDatabaseConnection(),
    createProject: await testCreateProject(),
    createTrack: await testCreateTrack(),
    tagsNotes: await testTagsAndNotes(),
    shareLink: await testShareLink(),
  }

  console.log('\n' + '='.repeat(50))
  console.log('\n📊 Test Results:')
  console.log('Database Connection:', results.connection ? '✅' : '❌')
  console.log('Create Project:', results.createProject ? '✅' : '❌')
  console.log('Create Track:', results.createTrack ? '✅' : '❌')
  console.log('Tags & Notes:', results.tagsNotes ? '✅' : '❌')
  console.log('Share Link:', results.shareLink ? '✅' : '❌')

  const allPassed = Object.values(results).every((r) => r === true)

  console.log('\n' + '='.repeat(50))
  console.log(allPassed ? '✅ All tests passed!' : '❌ Some tests failed')
  console.log('='.repeat(50))

  process.exit(allPassed ? 0 : 1)
}

// Run tests
runAllTests().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})

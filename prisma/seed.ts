import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Bắt đầu seed database...')

  // Clear existing data (in reverse order of dependencies)
  console.log('🗑️  Xóa dữ liệu cũ...')
  try {
    await prisma.note.deleteMany({})
    await prisma.trackTag.deleteMany({})
    await prisma.shareLink.deleteMany({})
    await prisma.fileVersion.deleteMany({})
    await prisma.track.deleteMany({})
    await prisma.folder.deleteMany({})
    await prisma.tag.deleteMany({})
    await prisma.project.deleteMany({})
    await prisma.userSettings.deleteMany({})
    await prisma.userProfile.deleteMany({})
    console.log('✅ Đã xóa dữ liệu cũ')
  } catch (error) {
    console.log('⚠️  Không thể xóa dữ liệu cũ (có thể database trống):', error)
  }

  // Create user profile
  console.log('👤 Tạo user profile...')
  const user = await prisma.userProfile.create({
    data: {
      name: 'Nguyễn Văn A',
      email: 'nguyenvana@example.com',
      bio: 'Music producer and audio engineer',
      location: 'Ho Chi Minh City, Vietnam',
      website: 'https://example.com',
      avatar: null,
      totalProjects: 0,
      totalTracks: 0,
      totalPlays: 0,
      followers: 120,
      following: 85,
    },
  })

  // Create user settings
  await prisma.userSettings.create({
    data: {
      userId: user.id,
      theme: 'dark',
      defaultQuality: 'high',
      autoPlay: true,
      crossfade: false,
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

  console.log('✅ User profile đã tạo')

  // Create projects
  console.log('📁 Tạo projects...')

  const project1 = await prisma.project.create({
    data: {
      name: 'Album 2024',
      description: 'Album phòng thu chính thức 2024',
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-10-20'),
    },
  })

  const project2 = await prisma.project.create({
    data: {
      name: 'Podcast Series',
      description: 'Chuỗi podcast về âm nhạc và công nghệ',
      createdAt: new Date('2024-03-10'),
      updatedAt: new Date('2024-10-25'),
    },
  })

  const project3 = await prisma.project.create({
    data: {
      name: 'Sound Effects Library',
      description: 'Thư viện hiệu ứng âm thanh cho game và phim',
      createdAt: new Date('2024-05-01'),
      updatedAt: new Date('2024-10-28'),
    },
  })

  console.log('✅ Đã tạo 3 projects')

  // Create folders for project 1
  console.log('📂 Tạo folders...')

  const folder1 = await prisma.folder.create({
    data: {
      name: 'Vocals',
      projectId: project1.id,
    },
  })

  const folder2 = await prisma.folder.create({
    data: {
      name: 'Instruments',
      projectId: project1.id,
    },
  })

  const folder3 = await prisma.folder.create({
    data: {
      name: 'Mix Versions',
      projectId: project1.id,
    },
  })

  const folder4 = await prisma.folder.create({
    data: {
      name: 'Episodes',
      projectId: project2.id,
    },
  })

  console.log('✅ Đã tạo 4 folders')

  // Create tags
  console.log('🏷️  Tạo tags...')

  const tagVocal = await prisma.tag.create({ data: { name: 'Vocal' } })
  const tagInstrumental = await prisma.tag.create({ data: { name: 'Instrumental' } })
  const tagDemo = await prisma.tag.create({ data: { name: 'Demo' } })
  const tagFinal = await prisma.tag.create({ data: { name: 'Final' } })
  const tagMix = await prisma.tag.create({ data: { name: 'Mix' } })
  await prisma.tag.create({ data: { name: 'Master' } })
  const tagPodcast = await prisma.tag.create({ data: { name: 'Podcast' } })
  const tagSFX = await prisma.tag.create({ data: { name: 'SFX' } })

  console.log('✅ Đã tạo 8 tags')

  // Create tracks for project 1
  console.log('🎵 Tạo tracks...')

  // Track 1: Lead Vocal
  const track1 = await prisma.track.create({
    data: {
      title: 'Lead Vocal - Verse 1',
      projectId: project1.id,
      folderId: folder1.id,
      createdAt: new Date('2024-02-10'),
    },
  })

  await prisma.fileVersion.create({
    data: {
      trackId: track1.id,
      originalPath: 'C:\\Audio\\vocals\\lead_verse1_take1.wav',
      storedPath: null,
      storageMode: 'reference',
      mimeType: 'audio/wav',
      sizeBytes: 15728640, // 15 MB
      durationMs: 45000, // 45 seconds
      checksum: 'abc123',
      metadataJson: JSON.stringify({
        sampleRate: 48000,
        bitrate: 2304000,
        channels: 2,
        codec: 'pcm_s16le',
      }),
      createdAt: new Date('2024-02-10'),
    },
  })

  const track1Version2 = await prisma.fileVersion.create({
    data: {
      trackId: track1.id,
      originalPath: 'C:\\Audio\\vocals\\lead_verse1_take2.wav',
      storedPath: null,
      storageMode: 'reference',
      mimeType: 'audio/wav',
      sizeBytes: 16777216,
      durationMs: 46000,
      checksum: 'def456',
      metadataJson: JSON.stringify({
        sampleRate: 48000,
        bitrate: 2304000,
        channels: 2,
        codec: 'pcm_s16le',
      }),
      createdAt: new Date('2024-02-11'),
    },
  })

  await prisma.track.update({
    where: { id: track1.id },
    data: { latestVersionId: track1Version2.id },
  })

  // Track 2: Guitar
  const track2 = await prisma.track.create({
    data: {
      title: 'Acoustic Guitar - Main',
      projectId: project1.id,
      folderId: folder2.id,
      createdAt: new Date('2024-02-15'),
    },
  })

  const track2Version1 = await prisma.fileVersion.create({
    data: {
      trackId: track2.id,
      originalPath: 'C:\\Audio\\instruments\\guitar_main.wav',
      storedPath: null,
      storageMode: 'reference',
      mimeType: 'audio/wav',
      sizeBytes: 52428800,
      durationMs: 180000, // 3 minutes
      checksum: 'ghi789',
      metadataJson: JSON.stringify({
        sampleRate: 48000,
        bitrate: 2304000,
        channels: 2,
        codec: 'pcm_s16le',
      }),
      createdAt: new Date('2024-02-15'),
    },
  })

  await prisma.track.update({
    where: { id: track2.id },
    data: { latestVersionId: track2Version1.id },
  })

  // Track 3: Final Mix
  const track3 = await prisma.track.create({
    data: {
      title: 'Song Title - Final Mix v1',
      projectId: project1.id,
      folderId: folder3.id,
      createdAt: new Date('2024-03-01'),
    },
  })

  const track3Version1 = await prisma.fileVersion.create({
    data: {
      trackId: track3.id,
      originalPath: 'C:\\Audio\\mixes\\final_mix_v1.wav',
      storedPath: null,
      storageMode: 'reference',
      mimeType: 'audio/wav',
      sizeBytes: 104857600,
      durationMs: 210000, // 3.5 minutes
      checksum: 'jkl012',
      metadataJson: JSON.stringify({
        sampleRate: 48000,
        bitrate: 2304000,
        channels: 2,
        codec: 'pcm_s16le',
      }),
      createdAt: new Date('2024-03-01'),
    },
  })

  await prisma.track.update({
    where: { id: track3.id },
    data: { latestVersionId: track3Version1.id },
  })

  // Track 4: Podcast Episode 1
  const track4 = await prisma.track.create({
    data: {
      title: 'Episode 1 - Introduction',
      projectId: project2.id,
      folderId: folder4.id,
      createdAt: new Date('2024-03-15'),
    },
  })

  const track4Version1 = await prisma.fileVersion.create({
    data: {
      trackId: track4.id,
      originalPath: 'C:\\Audio\\podcast\\ep01_intro.mp3',
      storedPath: null,
      storageMode: 'reference',
      mimeType: 'audio/mpeg',
      sizeBytes: 25165824,
      durationMs: 1800000, // 30 minutes
      checksum: 'mno345',
      metadataJson: JSON.stringify({
        sampleRate: 44100,
        bitrate: 128000,
        channels: 2,
        codec: 'mp3',
        title: 'Episode 1',
        artist: 'Podcast Host',
      }),
      createdAt: new Date('2024-03-15'),
    },
  })

  await prisma.track.update({
    where: { id: track4.id },
    data: { latestVersionId: track4Version1.id },
  })

  // Track 5: Background Music
  const track5 = await prisma.track.create({
    data: {
      title: 'Piano Background - Soft',
      projectId: project1.id,
      folderId: folder2.id,
      createdAt: new Date('2024-02-20'),
    },
  })

  const track5Version1 = await prisma.fileVersion.create({
    data: {
      trackId: track5.id,
      originalPath: 'C:\\Audio\\instruments\\piano_bg.wav',
      storedPath: null,
      storageMode: 'reference',
      mimeType: 'audio/wav',
      sizeBytes: 41943040,
      durationMs: 120000, // 2 minutes
      checksum: 'pqr678',
      metadataJson: JSON.stringify({
        sampleRate: 48000,
        bitrate: 2304000,
        channels: 2,
        codec: 'pcm_s16le',
      }),
      createdAt: new Date('2024-02-20'),
    },
  })

  await prisma.track.update({
    where: { id: track5.id },
    data: { latestVersionId: track5Version1.id },
  })

  // Track 6: Sound Effect
  const track6 = await prisma.track.create({
    data: {
      title: 'Explosion - Heavy',
      projectId: project3.id,
      folderId: null, // No folder
      createdAt: new Date('2024-05-10'),
    },
  })

  const track6Version1 = await prisma.fileVersion.create({
    data: {
      trackId: track6.id,
      originalPath: 'C:\\Audio\\sfx\\explosion_heavy.wav',
      storedPath: null,
      storageMode: 'reference',
      mimeType: 'audio/wav',
      sizeBytes: 8388608,
      durationMs: 5000, // 5 seconds
      checksum: 'stu901',
      metadataJson: JSON.stringify({
        sampleRate: 96000,
        bitrate: 4608000,
        channels: 2,
        codec: 'pcm_s24le',
      }),
      createdAt: new Date('2024-05-10'),
    },
  })

  await prisma.track.update({
    where: { id: track6.id },
    data: { latestVersionId: track6Version1.id },
  })

  console.log('✅ Đã tạo 6 tracks với file versions')

  // Add tags to tracks
  console.log('🏷️  Gắn tags cho tracks...')

  await prisma.trackTag.createMany({
    data: [
      { trackId: track1.id, tagId: tagVocal.id },
      { trackId: track1.id, tagId: tagDemo.id },
      { trackId: track2.id, tagId: tagInstrumental.id },
      { trackId: track3.id, tagId: tagFinal.id },
      { trackId: track3.id, tagId: tagMix.id },
      { trackId: track4.id, tagId: tagPodcast.id },
      { trackId: track5.id, tagId: tagInstrumental.id },
      { trackId: track6.id, tagId: tagSFX.id },
    ],
  })

  console.log('✅ Đã gắn tags')

  // Create notes
  console.log('📝 Tạo notes...')

  await prisma.note.createMany({
    data: [
      {
        trackId: track1.id,
        content: 'Cần re-record phần chorus, hơi out of tune',
        createdAt: new Date('2024-02-11'),
      },
      {
        trackId: track1.id,
        content: 'Take 2 nghe hay hơn, có cảm xúc hơn',
        createdAt: new Date('2024-02-12'),
      },
      {
        trackId: track2.id,
        content: 'Guitar EQ: boost 2kHz để rõ hơn trong mix',
        createdAt: new Date('2024-02-16'),
      },
      {
        trackId: track3.id,
        content: 'Client approve mix này, ready for mastering',
        createdAt: new Date('2024-03-02'),
      },
      {
        trackId: track4.id,
        content: 'Cần thêm intro music 10 giây đầu',
        createdAt: new Date('2024-03-16'),
      },
    ],
  })

  console.log('✅ Đã tạo 5 notes')

  // Create share links
  console.log('🔗 Tạo share links...')

  await prisma.shareLink.createMany({
    data: [
      {
        token: 'abc123xyz',
        trackId: track3.id,
        projectId: null,
        passwordHash: null,
        expiresAt: new Date('2024-12-31'),
        revoked: false,
        createdAt: new Date('2024-03-05'),
      },
      {
        token: 'def456uvw',
        trackId: null,
        projectId: project1.id,
        passwordHash: null,
        expiresAt: new Date('2024-11-30'),
        revoked: false,
        createdAt: new Date('2024-03-10'),
      },
      {
        token: 'ghi789rst',
        trackId: track4.id,
        projectId: null,
        passwordHash: '$2a$10$abcdefghijklmnopqrstuv', // hashed password "podcast123"
        expiresAt: null,
        revoked: false,
        createdAt: new Date('2024-03-20'),
      },
    ],
  })

  console.log('✅ Đã tạo 3 share links')

  // Update user stats
  await prisma.userProfile.update({
    where: { id: user.id },
    data: {
      totalProjects: 3,
      totalTracks: 6,
      totalPlays: 450,
    },
  })

  console.log('✅ Đã cập nhật user stats')
  console.log('🎉 Seed database hoàn tất!')
  console.log('')
  console.log('📊 Tổng kết:')
  console.log('   - 1 user profile')
  console.log('   - 3 projects')
  console.log('   - 4 folders')
  console.log('   - 6 tracks')
  console.log('   - 8 file versions')
  console.log('   - 8 tags')
  console.log('   - 5 notes')
  console.log('   - 3 share links')
}

main()
  .catch((e) => {
    console.error('❌ Lỗi seed database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

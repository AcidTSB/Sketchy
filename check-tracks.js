const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const tracks = await prisma.track.findMany({
    where: { projectId: 9 },
    include: { latestVersion: true },
    orderBy: { createdAt: 'desc' },
  })

  console.log(`Found ${tracks.length} tracks:`)
  tracks.forEach((track) => {
    console.log(`- ID: ${track.id}, Title: ${track.title}, Version: ${track.latestVersionId}`)
  })

  await prisma.$disconnect()
}

main().catch(console.error)

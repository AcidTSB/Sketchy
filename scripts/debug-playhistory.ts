import { prisma } from '../electron/src/db/client'

async function main() {
  const total = await prisma.playHistory.count()
  const latest = await prisma.playHistory.findMany({
    orderBy: { playedAt: 'desc' },
    take: 10,
    select: {
      id: true,
      userId: true,
      trackId: true,
      projectId: true,
      duration: true,
      completed: true,
      playedAt: true,
    },
  })

  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ total, latest }, null, 2))
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

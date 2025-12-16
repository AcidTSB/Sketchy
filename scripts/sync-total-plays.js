#!/usr/bin/env node
/**
 * Script to sync totalPlays in UserProfile from actual PlayHistory count
 * Run this once to fix existing data after the totalPlays tracking update
 *
 * Usage: node scripts/sync-total-plays.js
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function syncTotalPlays() {
  console.log('🔄 Syncing totalPlays for all users...\n')

  try {
    // Get all users
    const users = await prisma.userProfile.findMany({
      select: { id: true, email: true, totalPlays: true },
    })

    console.log(`Found ${users.length} users\n`)

    for (const user of users) {
      // Count actual plays BY this user
      const actualPlays = await prisma.playHistory.count({
        where: { userId: user.id },
      })

      // Update if different
      if (actualPlays !== user.totalPlays) {
        await prisma.userProfile.update({
          where: { id: user.id },
          data: { totalPlays: actualPlays },
        })

        console.log(`✅ User ${user.email}:`)
        console.log(`   Old: ${user.totalPlays} plays`)
        console.log(`   New: ${actualPlays} plays`)
        console.log(`   Diff: ${actualPlays - user.totalPlays}\n`)
      } else {
        console.log(`✓ User ${user.email}: Already synced (${actualPlays} plays)\n`)
      }
    }

    console.log('✅ Sync completed!')
  } catch (error) {
    console.error('❌ Error syncing totalPlays:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run
syncTotalPlays()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

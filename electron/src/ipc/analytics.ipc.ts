import { ipcMain } from 'electron'
import { prisma } from '../db/client'
import { log } from '../utils/logger'
import { getCurrentUserId, isAuthenticated } from './auth-context'

interface TrackActivityPayload {
  action: 'play' | 'import' | 'export' | 'create' | 'delete' | 'edit'
  trackId?: number
  projectId?: number
  metadata?: Record<string, unknown>
}

interface AnalyticsQuery {
  period: 'daily' | 'weekly' | 'monthly'
  startDate?: Date
  endDate?: Date
}

let currentSessionId: number | null = null

export function registerAnalyticsHandlers() {
  // Start user session
  ipcMain.handle('analytics:start-session', async () => {
    try {
      if (!isAuthenticated()) {
        return { success: false, error: 'Not authenticated' }
      }

      const userId = getCurrentUserId()
      const session = await prisma.userSession.create({
        data: {
          userId,
          startedAt: new Date(),
        },
      })
      currentSessionId = session.id
      log.info({ sessionId: session.id }, 'User session started')
      return { success: true, data: { sessionId: session.id } }
    } catch (error) {
      log.error({ error }, 'Failed to start session')
      return { success: false, error: 'Failed to start session' }
    }
  })

  // End user session
  ipcMain.handle('analytics:end-session', async () => {
    try {
      if (!currentSessionId) {
        return { success: true, data: null }
      }

      const session = await prisma.userSession.findUnique({
        where: { id: currentSessionId },
      })

      if (session) {
        const durationMins = (Date.now() - session.startedAt.getTime()) / 60000
        await prisma.userSession.update({
          where: { id: currentSessionId },
          data: {
            endedAt: new Date(),
            durationMins,
          },
        })
        log.info({ sessionId: currentSessionId, durationMins }, 'User session ended')
      }

      currentSessionId = null
      return { success: true, data: { durationMins: session?.durationMins } }
    } catch (error) {
      log.error({ error }, 'Failed to end session')
      return { success: false, error: 'Failed to end session' }
    }
  })

  // Track activity
  ipcMain.handle('analytics:track-activity', async (_event, payload: TrackActivityPayload) => {
    try {
      if (!isAuthenticated()) {
        return { success: false, error: 'Not authenticated' }
      }
      const userId = getCurrentUserId()
      const { action, trackId, projectId, metadata } = payload

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId,
          action,
          entityType: trackId ? 'track' : projectId ? 'project' : null,
          entityId: trackId || projectId || null,
          metadata: metadata ? JSON.stringify(metadata) : null,
        },
      })

      // Update session action count
      if (currentSessionId) {
        await prisma.userSession.update({
          where: { id: currentSessionId },
          data: {
            actionsCount: {
              increment: 1,
            },
          },
        })
      }

      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.error({ error: message, payload }, 'Failed to track activity')
      return { success: false, error: message || 'Failed to track activity' }
    }
  })

  // Track playback
  ipcMain.handle(
    'analytics:track-play',
    async (_event, trackId: number, projectId: number, duration: number, completed: boolean) => {
      try {
        if (!isAuthenticated()) {
          return { success: false, error: 'Not authenticated' }
        }
        if (!Number.isFinite(trackId) || !Number.isFinite(projectId)) {
          return {
            success: false,
            error: `Invalid ids: trackId=${trackId}, projectId=${projectId}`,
          }
        }
        const userId = getCurrentUserId()
        // Create play history
        await prisma.playHistory.create({
          data: {
            userId,
            trackId,
            projectId,
            duration,
            completed,
          },
        })

        // Update popularity rank
        const rank = await prisma.popularityRank.findUnique({
          where: {
            entityType_entityId_period: {
              entityType: 'track',
              entityId: trackId,
              period: 'all_time',
            },
          },
        })

        if (rank) {
          await prisma.popularityRank.update({
            where: { id: rank.id },
            data: {
              playsCount: { increment: 1 },
              lastPlayedAt: new Date(),
              rankScore: { increment: completed ? 1.0 : 0.5 }, // Full play = higher score
            },
          })
        } else {
          await prisma.popularityRank.create({
            data: {
              entityType: 'track',
              entityId: trackId,
              period: 'all_time',
              playsCount: 1,
              lastPlayedAt: new Date(),
              rankScore: completed ? 1.0 : 0.5,
            },
          })
        }

        // Also update weekly rank
        const weeklyRank = await prisma.popularityRank.findUnique({
          where: {
            entityType_entityId_period: {
              entityType: 'track',
              entityId: trackId,
              period: 'week',
            },
          },
        })

        if (weeklyRank) {
          await prisma.popularityRank.update({
            where: { id: weeklyRank.id },
            data: {
              playsCount: { increment: 1 },
              lastPlayedAt: new Date(),
              rankScore: { increment: completed ? 1.0 : 0.5 },
            },
          })
        } else {
          await prisma.popularityRank.create({
            data: {
              entityType: 'track',
              entityId: trackId,
              period: 'week',
              playsCount: 1,
              lastPlayedAt: new Date(),
              rankScore: completed ? 1.0 : 0.5,
            },
          })
        }

        // Update user's totalPlays count
        await prisma.userProfile.update({
          where: { id: userId },
          data: {
            totalPlays: { increment: 1 },
          },
        })

        log.info({ trackId, duration, completed }, 'Play tracked')
        return { success: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        log.error(
          { error: message, trackId, projectId, duration, completed },
          'Failed to track play'
        )
        return { success: false, error: message || 'Failed to track play' }
      }
    }
  )

  // Get analytics summary
  ipcMain.handle('analytics:get-summary', async (_event, query: AnalyticsQuery) => {
    try {
      if (!isAuthenticated()) {
        return { success: false, error: 'Not authenticated' }
      }

      const userId = getCurrentUserId()
      log.info({ userId, query }, 'Getting analytics summary (v2)')

      const { period, startDate, endDate } = query

      // Get or create summary for period
      const now = new Date()
      let periodStart: Date

      switch (period) {
        case 'daily':
          periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case 'weekly': {
          const dayOfWeek = now.getDay()
          periodStart = new Date(now)
          periodStart.setDate(now.getDate() - dayOfWeek)
          periodStart.setHours(0, 0, 0, 0)
          break
        }
        case 'monthly':
          periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        default:
          periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      }

      let summary = await prisma.dailyAnalytics.findUnique({
        where: {
          userId_date_period: {
            userId,
            date: periodStart,
            period,
          },
        },
      })

      if (!summary) {
        // Create new summary using upsert to handle concurrent requests
        summary = await prisma.dailyAnalytics.upsert({
          where: {
            userId_date_period: {
              userId,
              date: periodStart,
              period,
            },
          },
          update: {},
          create: {
            userId,
            date: periodStart,
            period,
          },
        })
      }

      // Update summary with real-time data
      const queryStartDate = startDate || periodStart
      const queryEndDate = endDate || now

      // Count projects created in period
      const projectsCreated = await prisma.project.count({
        where: {
          userId,
          createdAt: {
            gte: queryStartDate,
            lte: queryEndDate,
          },
        },
      })
      log.info({ userId, projectsCreated }, 'Counted projects created')

      // Count tracks imported in period
      const tracksImported = await prisma.track.count({
        where: {
          project: { userId },
          createdAt: {
            gte: queryStartDate,
            lte: queryEndDate,
          },
        },
      })
      log.info({ userId, tracksImported }, 'Counted tracks imported')

      // Count play stats
      const playStats = await prisma.playHistory.aggregate({
        where: {
          userId,
          playedAt: {
            gte: queryStartDate,
            lte: queryEndDate,
          },
        },
        _count: true,
        _sum: {
          duration: true,
        },
      })

      // Count sessions
      const sessions = await prisma.userSession.aggregate({
        where: {
          userId,
          startedAt: {
            gte: queryStartDate,
            lte: queryEndDate,
          },
        },
        _count: true,
        _avg: {
          durationMins: true,
        },
      })

      // Count exports from activity log
      const exports = await prisma.activityLog.count({
        where: {
          userId,
          action: 'export',
          createdAt: {
            gte: queryStartDate,
            lte: queryEndDate,
          },
        },
      })

      // Update summary
      await prisma.dailyAnalytics.update({
        where: { id: summary.id },
        data: {
          projectsCreated,
          tracksImported,
          tracksPlayed: playStats._count || 0,
          playTimeSeconds: playStats._sum.duration || 0,
          exportsCount: exports,
          sessionsCount: sessions._count || 0,
          avgSessionMins: sessions._avg.durationMins || 0,
        },
      })

      // Fetch updated summary
      const updatedSummary = await prisma.dailyAnalytics.findUnique({
        where: { id: summary.id },
      })

      return { success: true, data: updatedSummary }
    } catch (error) {
      log.error({ error, query }, 'Failed to get analytics summary')
      return { success: false, error: 'Failed to get analytics summary' }
    }
  })

  // Get popular tracks
  ipcMain.handle(
    'analytics:get-popular-tracks',
    async (_event, period: string, limit: number = 10) => {
      try {
        if (!isAuthenticated()) {
          return { success: false, error: 'Not authenticated' }
        }
        const userId = getCurrentUserId()

        // Calculate date filter based on period
        const now = new Date()
        let dateFilter: { playedAt?: { gte: Date } } = {}

        if (period === 'week') {
          const lastWeek = new Date(now)
          lastWeek.setDate(now.getDate() - 7)
          dateFilter = { playedAt: { gte: lastWeek } }
        } else if (period === 'month') {
          const lastMonth = new Date(now)
          lastMonth.setMonth(now.getMonth() - 1)
          dateFilter = { playedAt: { gte: lastMonth } }
        }

        // Aggregate plays from history for THIS user only
        const plays = await prisma.playHistory.groupBy({
          by: ['trackId'],
          where: {
            userId,
            ...dateFilter,
          },
          _count: {
            trackId: true,
          },
          _max: {
            playedAt: true,
          },
          orderBy: {
            _count: {
              trackId: 'desc',
            },
          },
          take: limit,
        })

        // Fetch track details
        const trackIds = plays.map((p) => p.trackId)
        const tracks = await prisma.track.findMany({
          where: {
            id: { in: trackIds },
            project: { userId }, // Ensure ownership
          },
          include: {
            project: true,
            latestVersion: true,
          },
        })

        // Map ranks to tracks
        const tracksWithRank = plays
          .map((play) => {
            const track = tracks.find((t) => t.id === play.trackId)
            if (!track) return null

            return {
              ...track,
              playsCount: play._count.trackId,
              rankScore: play._count.trackId, // Use play count as score
              lastPlayedAt: play._max.playedAt,
            }
          })
          .filter(Boolean)

        return { success: true, data: tracksWithRank }
      } catch (error) {
        log.error({ error }, 'Failed to get popular tracks')
        return { success: false, error: 'Failed to get popular tracks' }
      }
    }
  )

  // Get activity timeline (excluding play actions)
  ipcMain.handle('analytics:get-timeline', async (_event, days: number = 30) => {
    try {
      if (!isAuthenticated()) {
        return { success: false, error: 'Not authenticated' }
      }
      const userId = getCurrentUserId()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const activities = await prisma.activityLog.findMany({
        where: {
          userId,
          createdAt: {
            gte: startDate,
          },
          // Exclude 'play' action - only show create, edit, delete, import, export
          action: {
            not: 'play',
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 100,
      })

      return { success: true, data: activities }
    } catch (error) {
      log.error({ error }, 'Failed to get timeline')
      return { success: false, error: 'Failed to get timeline' }
    }
  })

  // Get listening stats
  ipcMain.handle('analytics:get-listening-stats', async () => {
    try {
      if (!isAuthenticated()) {
        return { success: false, error: 'Not authenticated' }
      }
      const userId = getCurrentUserId()

      // Total play time
      const totalPlayTime = await prisma.playHistory.aggregate({
        where: { userId },
        _sum: { duration: true },
        _count: true,
      })

      // Most played track
      const mostPlayedTrack = await prisma.playHistory.groupBy({
        by: ['trackId'],
        where: { userId },
        _count: true,
        orderBy: {
          _count: {
            trackId: 'desc',
          },
        },
        take: 1,
      })

      // Play time by day (last 7 days)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const playsByDay = await prisma.$queryRaw<Array<{ date: string; totalSeconds: number }>>`
        SELECT 
          DATE(playedAt) as date,
          SUM(duration) as totalSeconds
        FROM PlayHistory
        WHERE userId = ${userId}
          AND playedAt >= ${sevenDaysAgo.toISOString()}
        GROUP BY DATE(playedAt)
        ORDER BY date DESC
      `

      return {
        success: true,
        data: {
          totalPlayTimeSeconds: totalPlayTime._sum.duration || 0,
          totalPlays: totalPlayTime._count,
          mostPlayedTrackId: mostPlayedTrack[0]?.trackId,
          playsByDay,
        },
      }
    } catch (error) {
      log.error({ error }, 'Failed to get listening stats')
      return { success: false, error: 'Failed to get listening stats' }
    }
  })

  // Get most active projects based on activity logs (not plays)
  ipcMain.handle(
    'analytics:get-most-active-projects',
    async (_event, days: number = 30, limit: number = 5) => {
      try {
        if (!isAuthenticated()) {
          return { success: false, error: 'Not authenticated' }
        }
        const userId = getCurrentUserId()
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)

        // Get project activities (create, edit, delete, import, export) from activity logs
        const projectActivities = await prisma.activityLog.groupBy({
          by: ['entityId'],
          where: {
            userId,
            entityType: 'project',
            action: {
              in: ['create', 'edit', 'delete', 'import', 'export'],
            },
            createdAt: {
              gte: startDate,
            },
          },
          _count: {
            id: true,
          },
          _max: {
            createdAt: true,
          },
          orderBy: {
            _count: {
              id: 'desc',
            },
          },
          take: limit,
        })

        // Get track activities for projects (including play)
        const trackActivities = await prisma.activityLog.findMany({
          where: {
            userId,
            entityType: 'track',
            action: {
              in: ['create', 'edit', 'delete', 'import', 'export', 'play'],
            },
            createdAt: {
              gte: startDate,
            },
          },
        }) // Get track IDs from activities
        const trackIds = trackActivities
          .map((activity) => activity.entityId)
          .filter((id): id is number => id !== null)

        // Fetch track-project mapping
        const tracks = await prisma.track.findMany({
          where: {
            id: {
              in: trackIds,
            },
          },
          select: {
            id: true,
            projectId: true,
          },
        })

        // Create a map of trackId -> projectId
        const trackProjectMap = new Map<number, number>()
        for (const track of tracks) {
          trackProjectMap.set(track.id, track.projectId)
        }

        // Aggregate track activities by project
        const projectActivityMap = new Map<number, { count: number; lastActivity: Date }>()

        // Add direct project activities
        for (const activity of projectActivities) {
          if (activity.entityId) {
            projectActivityMap.set(activity.entityId, {
              count: activity._count.id,
              lastActivity: activity._max.createdAt || new Date(),
            })
          }
        }

        // Add track activities grouped by project
        for (const activity of trackActivities) {
          if (activity.entityId) {
            const projectId = trackProjectMap.get(activity.entityId)
            if (projectId) {
              const existing = projectActivityMap.get(projectId)
              if (existing) {
                existing.count++
                if (new Date(activity.createdAt) > existing.lastActivity) {
                  existing.lastActivity = new Date(activity.createdAt)
                }
              } else {
                projectActivityMap.set(projectId, {
                  count: 1,
                  lastActivity: new Date(activity.createdAt),
                })
              }
            }
          }
        }

        // Sort by activity count and get top projects
        const sortedProjects = Array.from(projectActivityMap.entries())
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, limit)

        // Fetch project details
        const results = await Promise.all(
          sortedProjects.map(async ([projectId, stats]) => {
            const project = await prisma.project.findUnique({
              where: { id: projectId },
              select: {
                id: true,
                name: true,
                _count: {
                  select: {
                    tracks: true,
                  },
                },
              },
            })

            if (!project) return null

            return {
              id: project.id,
              name: project.name,
              tracksCount: project._count.tracks,
              activityCount: stats.count,
              lastActivity: stats.lastActivity,
            }
          })
        )

        return { success: true, data: results.filter(Boolean) }
      } catch (error) {
        log.error({ error }, 'Failed to get most active projects')
        return { success: false, error: 'Failed to get most active projects' }
      }
    }
  )

  log.info('Analytics handlers registered')
}

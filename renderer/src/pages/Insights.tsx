import { useEffect, useState } from 'react'
import {
  Activity,
  TrendingUp,
  Clock,
  Play,
  Music,
  FolderOpen,
  Calendar,
  ChevronDown,
} from 'lucide-react'
import { useAnalyticsStore } from '@/store/analyticsStore'
import { formatDuration } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export function Insights() {
  // Chỉ subscribe data, KHÔNG subscribe isLoading để tránh infinite loop
  const summary = useAnalyticsStore((state) => state.summary)
  const popularTracks = useAnalyticsStore((state) => state.popularTracks)
  const listeningStats = useAnalyticsStore((state) => state.listeningStats)
  const recentActivities = useAnalyticsStore((state) => state.recentActivities)
  const mostActiveProjects = useAnalyticsStore((state) => state.mostActiveProjects)

  // State for "Show More" functionality
  const [showAllActivities, setShowAllActivities] = useState(false)
  const INITIAL_ACTIVITY_LIMIT = 10
  const MAX_ACTIVITY_DISPLAY = 50 // Hard limit to prevent performance issues

  useEffect(() => {
    // Debounce to prevent multiple rapid calls
    let isMounted = true

    const fetchData = async () => {
      if (!isMounted) return

      const store = useAnalyticsStore.getState()
      await Promise.all([
        store.fetchSummary('weekly'),
        store.fetchPopularTracks('all_time', 20),
        store.fetchListeningStats(),
        store.fetchTimeline(30),
        store.fetchMostActiveProjects(30, 5),
      ])
    }

    fetchData()

    // Auto-refresh every 30 seconds
    const refreshInterval = setInterval(() => {
      if (!isMounted) return
      fetchData()
    }, 30000)

    return () => {
      isMounted = false
      clearInterval(refreshInterval)
    }
  }, [])

  // Loading overlay instead of replacing entire component
  const isInitialLoad = !summary && !popularTracks.length && !listeningStats

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Loading Overlay - don't unmount component */}
      {isInitialLoad && (
        <div
          className="absolute inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: 'var(--bg)' }}
        >
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p style={{ color: 'var(--text-secondary)' }}>Loading analytics...</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div
        className="flex-none p-6 border-b"
        style={{ borderColor: 'var(--surface)', backgroundColor: 'var(--bg-secondary)' }}
      >
        <div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text)' }}>
            Production Analytics
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Track your creative workflow, versions, and production activity
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Stats Cards - Producer Focused */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-elevated p-6 rounded-apple">
              <div className="flex items-center justify-between mb-4">
                <Music className="h-8 w-8" style={{ color: 'var(--primary)' }} />
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  This Week
                </span>
              </div>
              <div className="text-3xl font-bold mb-1" style={{ color: 'var(--text)' }}>
                {summary?.projectsCreated || 0}
              </div>
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Active Projects
              </div>
            </div>

            <div className="glass-elevated p-6 rounded-apple">
              <div className="flex items-center justify-between mb-4">
                <TrendingUp className="h-8 w-8" style={{ color: 'var(--success)' }} />
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  This Week
                </span>
              </div>
              <div className="text-3xl font-bold mb-1" style={{ color: 'var(--text)' }}>
                {summary?.tracksImported || 0}
              </div>
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Versions Added
              </div>
            </div>

            <div className="glass-elevated p-6 rounded-apple">
              <div className="flex items-center justify-between mb-4">
                <Clock className="h-8 w-8" style={{ color: 'var(--warning)' }} />
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  This Week
                </span>
              </div>
              <div className="text-3xl font-bold mb-1" style={{ color: 'var(--text)' }}>
                {summary?.sessionsCount || 0}
              </div>
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Work Sessions
              </div>
            </div>

            <div className="glass-elevated p-6 rounded-apple">
              <div className="flex items-center justify-between mb-4">
                <Play className="h-8 w-8" style={{ color: 'var(--accent)' }} />
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Average
                </span>
              </div>
              <div className="text-3xl font-bold mb-1" style={{ color: 'var(--text)' }}>
                {summary?.avgSessionMins ? `${Math.round(summary.avgSessionMins)}m` : '0m'}
              </div>
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Session Duration
              </div>
            </div>
          </div>

          {/* Most Active Projects */}
          <div className="glass-elevated p-6 rounded-apple">
            <div className="flex items-center gap-2 mb-4">
              <FolderOpen className="h-5 w-5" style={{ color: 'var(--primary)' }} />
              <h2 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
                Most Active Projects
              </h2>
            </div>

            {mostActiveProjects.length > 0 ? (
              <div className="space-y-3">
                {mostActiveProjects.map((project, index) => (
                  <div
                    key={project.id}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-surface/50 transition-colors"
                    style={{ backgroundColor: 'var(--surface)20' }}
                  >
                    <div
                      className="text-2xl font-bold w-8"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate" style={{ color: 'var(--text)' }}>
                        {project.name}
                      </div>
                      <div className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
                        {project.tracksCount} {project.tracksCount === 1 ? 'track' : 'tracks'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium" style={{ color: 'var(--text)' }}>
                        {project.activityCount}{' '}
                        {project.activityCount === 1 ? 'activity' : 'activities'}
                      </div>
                      {project.lastActivity && (
                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {new Date(project.lastActivity).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
                No project activity yet this week
              </div>
            )}
          </div>

          {/* Daily Work Sessions */}
          {listeningStats && listeningStats.playsByDay && listeningStats.playsByDay.length > 0 && (
            <div className="glass-elevated p-6 rounded-apple">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-5 w-5" style={{ color: 'var(--primary)' }} />
                <h2 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
                  Daily Work Sessions (Last 7 Days)
                </h2>
              </div>

              <div className="space-y-2">
                {listeningStats.playsByDay.map((day) => {
                  const hours = Math.floor(day.totalSeconds / 3600)
                  const minutes = Math.floor((day.totalSeconds % 3600) / 60)
                  const percentage = (day.totalSeconds / 3600) * 100

                  return (
                    <div key={day.date} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span style={{ color: 'var(--text)' }}>
                          {new Date(day.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {hours > 0 ? `${hours}h ` : ''}
                          {minutes}m work time
                        </span>
                      </div>
                      <div
                        className="h-2 rounded-full overflow-hidden"
                        style={{ backgroundColor: 'var(--surface)' }}
                      >
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(percentage, 100)}%`,
                            backgroundColor: 'var(--primary)',
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--surface)' }}>
                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Total production time:{' '}
                  <span className="font-medium" style={{ color: 'var(--text)' }}>
                    {formatDuration(listeningStats.totalPlayTimeSeconds)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Recent Activity */}
          {recentActivities && recentActivities.length > 0 && (
            <div className="glass-elevated p-6 rounded-apple">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5" style={{ color: 'var(--primary)' }} />
                  <h2 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
                    Recent Activity
                  </h2>
                </div>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {recentActivities.length}{' '}
                  {recentActivities.length === 1 ? 'activity' : 'activities'}
                </span>
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {recentActivities
                  .slice(0, showAllActivities ? MAX_ACTIVITY_DISPLAY : INITIAL_ACTIVITY_LIMIT)
                  .map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between p-2 rounded-lg"
                      style={{ backgroundColor: 'var(--surface)20' }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: getActivityColor(activity.action) }}
                        />
                        <div>
                          <div className="text-sm" style={{ color: 'var(--text)' }}>
                            {formatActivityAction(activity.action)}
                          </div>
                          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            {new Date(activity.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Show More/Less Button */}
              {recentActivities.length > INITIAL_ACTIVITY_LIMIT && (
                <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--surface)' }}>
                  <Button
                    variant="ghost"
                    className="w-full gap-2 rounded-apple"
                    onClick={() => setShowAllActivities(!showAllActivities)}
                  >
                    {showAllActivities ? (
                      <>
                        Show Less
                        <ChevronDown className="h-4 w-4 rotate-180" />
                      </>
                    ) : (
                      <>
                        Show More (
                        {Math.min(
                          recentActivities.length - INITIAL_ACTIVITY_LIMIT,
                          MAX_ACTIVITY_DISPLAY - INITIAL_ACTIVITY_LIMIT
                        )}{' '}
                        more)
                        <ChevronDown className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                  {recentActivities.length > MAX_ACTIVITY_DISPLAY && !showAllActivities && (
                    <p
                      className="text-xs text-center mt-2"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Showing latest {MAX_ACTIVITY_DISPLAY} of {recentActivities.length} activities
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function getActivityColor(action: string): string {
  switch (action) {
    case 'play':
      return 'var(--success)'
    case 'import':
      return 'var(--primary)'
    case 'create':
      return 'var(--accent)'
    case 'export':
      return 'var(--warning)'
    case 'delete':
      return 'var(--danger)'
    case 'edit':
      return 'var(--info)'
    default:
      return 'var(--text-secondary)'
  }
}

function formatActivityAction(action: string): string {
  switch (action) {
    case 'play':
      return 'Played track'
    case 'import':
      return 'Imported files'
    case 'create':
      return 'Created project'
    case 'export':
      return 'Exported audio'
    case 'delete':
      return 'Deleted item'
    case 'edit':
      return 'Edited track'
    default:
      return action
  }
}

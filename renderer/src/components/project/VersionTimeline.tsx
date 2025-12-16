import { useEffect, useState } from 'react'
import { GitBranch, Trash2, RotateCcw, Plus, Clock, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Snapshot {
  id: number
  name: string
  description?: string | null
  createdAt: string
  metadata?: {
    projectName: string
    tracks: { id: number; title: string; status: string }[]
  }
}

interface VersionTimelineProps {
  projectId: number
}

export function VersionTimeline({ projectId }: VersionTimelineProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [expandedSnapshot, setExpandedSnapshot] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadSnapshots()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const loadSnapshots = async () => {
    setIsLoading(true)
    try {
      const result = await window.electronAPI.getProjectSnapshots(projectId)
      if (result.success && result.data) {
        setSnapshots(result.data as Snapshot[])
      }
    } catch (error) {
      console.error('Failed to load snapshots:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateSnapshot = async () => {
    const name = prompt('Enter snapshot name:')
    if (!name) return

    const description = prompt('Enter description (optional):')

    try {
      const result = await window.electronAPI.createProjectSnapshot(
        projectId,
        name,
        description || undefined
      )
      if (result.success) {
        loadSnapshots()
      } else {
        alert('Failed to create snapshot: ' + result.error)
      }
    } catch (error) {
      console.error('Failed to create snapshot:', error)
    }
  }

  const handleRestoreSnapshot = async (snapshotId: number) => {
    if (!confirm('This will restore the project to this snapshot state. Continue?')) return

    try {
      const result = await window.electronAPI.restoreProjectSnapshot(snapshotId)
      if (result.success) {
        alert('Project restored from snapshot!')
      } else {
        alert('Failed to restore snapshot: ' + result.error)
      }
    } catch (error) {
      console.error('Failed to restore snapshot:', error)
    }
  }

  const handleDeleteSnapshot = async (snapshotId: number) => {
    if (!confirm('Delete this snapshot? This cannot be undone.')) return

    try {
      const result = await window.electronAPI.deleteProjectSnapshot(snapshotId)
      if (result.success) {
        loadSnapshots()
      } else {
        alert('Failed to delete snapshot: ' + result.error)
      }
    } catch (error) {
      console.error('Failed to delete snapshot:', error)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString()
  }

  // Helper functions for future use
  void function formatDuration(ms?: number) {
    if (!ms) return '—'
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  void function formatSize(bytes?: number) {
    if (!bytes) return '—'
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div
          className="animate-spin rounded-full h-8 w-8 border-b-2"
          style={{ borderColor: 'var(--primary)' }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
            Version Timeline
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {snapshots.length} snapshot{snapshots.length !== 1 ? 's' : ''} saved
          </p>
        </div>
        <Button onClick={handleCreateSnapshot} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Snapshot
        </Button>
      </div>

      {/* Timeline */}
      {snapshots.length === 0 ? (
        <div
          className="glass rounded-apple-lg p-12 text-center"
          style={{ borderColor: 'var(--surface)' }}
        >
          <GitBranch
            className="h-12 w-12 mx-auto mb-4 opacity-50"
            style={{ color: 'var(--text-secondary)' }}
          />
          <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text)' }}>
            No Snapshots Yet
          </h3>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            Create a snapshot to save the current state of your project
          </p>
          <Button onClick={handleCreateSnapshot} className="gap-2">
            <Plus className="h-4 w-4" />
            Create First Snapshot
          </Button>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div
            className="absolute left-6 top-0 bottom-0 w-0.5"
            style={{ backgroundColor: 'var(--surface)' }}
          />

          {/* Snapshots */}
          <div className="space-y-4">
            {snapshots.map((snapshot, index) => (
              <div key={snapshot.id} className="relative pl-14">
                {/* Timeline dot */}
                <div
                  className="absolute left-4 top-6 w-4 h-4 rounded-full border-2"
                  style={{
                    backgroundColor: index === 0 ? 'var(--primary)' : 'var(--surface)',
                    borderColor: 'var(--primary)',
                  }}
                />

                {/* Snapshot card */}
                <div
                  className="glass rounded-apple-lg p-4 transition-all hover:shadow-lg"
                  style={{ borderColor: 'var(--surface)' }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <button
                        onClick={() =>
                          setExpandedSnapshot(expandedSnapshot === snapshot.id ? null : snapshot.id)
                        }
                        className="flex items-center gap-2 text-left"
                      >
                        {expandedSnapshot === snapshot.id ? (
                          <ChevronDown
                            className="h-4 w-4"
                            style={{ color: 'var(--text-secondary)' }}
                          />
                        ) : (
                          <ChevronRight
                            className="h-4 w-4"
                            style={{ color: 'var(--text-secondary)' }}
                          />
                        )}
                        <h4 className="font-semibold" style={{ color: 'var(--text)' }}>
                          {snapshot.name}
                        </h4>
                        {index === 0 && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: 'var(--primary)', color: 'white' }}
                          >
                            Latest
                          </span>
                        )}
                      </button>
                      {snapshot.description && (
                        <p className="text-sm mt-1 ml-6" style={{ color: 'var(--text-secondary)' }}>
                          {snapshot.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 ml-6">
                        <span
                          className="flex items-center gap-1 text-xs"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          <Clock className="h-3 w-3" />
                          {formatDate(snapshot.createdAt)}
                        </span>
                        {snapshot.metadata && (
                          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            {snapshot.metadata.tracks.length} tracks
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRestoreSnapshot(snapshot.id)}
                        className="gap-1"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Restore
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSnapshot(snapshot.id)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Expanded content */}
                  {expandedSnapshot === snapshot.id && snapshot.metadata && (
                    <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--surface)' }}>
                      <h5 className="text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                        Tracks in Snapshot
                      </h5>
                      <div className="space-y-2">
                        {snapshot.metadata.tracks.map((track) => (
                          <div
                            key={track.id}
                            className="flex items-center justify-between p-2 rounded-apple"
                            style={{ backgroundColor: 'var(--surface)' }}
                          >
                            <span className="text-sm" style={{ color: 'var(--text)' }}>
                              {track.title}
                            </span>
                            <span
                              className="text-xs px-2 py-0.5 rounded-full capitalize"
                              style={{
                                backgroundColor:
                                  track.status === 'final'
                                    ? '#10b98120'
                                    : track.status === 'approved'
                                      ? '#3b82f620'
                                      : track.status === 'review'
                                        ? '#f59e0b20'
                                        : '#6b728020',
                                color:
                                  track.status === 'final'
                                    ? '#10b981'
                                    : track.status === 'approved'
                                      ? '#3b82f6'
                                      : track.status === 'review'
                                        ? '#f59e0b'
                                        : '#6b7280',
                              }}
                            >
                              {track.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

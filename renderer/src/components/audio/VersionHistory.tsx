import { useState, useEffect } from 'react'
import { Check, History, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatDistanceToNow } from 'date-fns'
import type { FileVersion } from '@/types/electron'

interface VersionHistoryProps {
  trackId: number
  currentVersionId?: number | null
  onVersionChange?: (versionId: number) => void
  className?: string
}

export function VersionHistory({
  trackId,
  currentVersionId,
  onVersionChange,
  className = '',
}: VersionHistoryProps) {
  const [versions, setVersions] = useState<FileVersion[]>([])
  const [editingLabelId, setEditingLabelId] = useState<number | null>(null)
  const [labelValue, setLabelValue] = useState('')

  useEffect(() => {
    loadVersions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackId])

  const loadVersions = async () => {
    try {
      const response = await window.electronAPI.getFileVersions(trackId)
      if (response.success && response.data) {
        setVersions(response.data)
      }
    } catch (error) {
      console.error('Failed to load versions:', error)
    }
  }

  const handleSetLatestVersion = async (versionId: number) => {
    try {
      await window.electronAPI.setLatestVersion(trackId, versionId)
      onVersionChange?.(versionId)
      await loadVersions()
    } catch (error) {
      console.error('Failed to set latest version:', error)
    }
  }

  const handleUpdateLabel = async (_versionId: number) => {
    try {
      // Note: Need to add updateFileVersionLabel API in backend
      // For now, just close the edit mode
      setEditingLabelId(null)
      setLabelValue('')
    } catch (error) {
      console.error('Failed to update label:', error)
    }
  }

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return 'Unknown'
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(2)} MB`
  }

  const formatDuration = (ms?: number | null) => {
    if (!ms) return 'Unknown'
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2">
        <History className="h-4 w-4" style={{ color: 'var(--primary)' }} />
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
          Version History
        </h3>
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          ({versions.length} versions)
        </span>
      </div>

      {versions.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: 'var(--text-secondary)' }}>
          No version history available.
        </p>
      ) : (
        <div className="space-y-2">
          {versions.map((version, index) => {
            const isLatest = version.id === currentVersionId
            const isEditing = editingLabelId === version.id

            return (
              <div
                key={version.id}
                className="p-3 rounded-lg border"
                style={{
                  borderColor: isLatest ? 'var(--primary)' : 'var(--border)',
                  backgroundColor: isLatest ? 'var(--primary)10' : 'var(--surface-subtle)',
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {/* Version Label */}
                    <div className="flex items-center gap-2 mb-1">
                      {isEditing ? (
                        <div className="flex items-center gap-1 flex-1">
                          <Input
                            value={labelValue}
                            onChange={(e) => setLabelValue(e.target.value)}
                            placeholder="e.g., Demo, Final Mix, Master"
                            className="h-7 text-sm"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            onClick={() => handleUpdateLabel(version.id)}
                            className="h-7 w-7 p-0"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <span className="font-medium text-sm" style={{ color: 'var(--text)' }}>
                            {version.label || `Version ${versions.length - index}`}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingLabelId(version.id)
                              setLabelValue(version.label || '')
                            }}
                            className="h-6 w-6 p-0"
                          >
                            <Tag className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                      {isLatest && (
                        <span
                          className="text-xs px-2 py-0.5 rounded"
                          style={{
                            backgroundColor: 'var(--primary)',
                            color: 'white',
                          }}
                        >
                          Current
                        </span>
                      )}
                    </div>

                    {/* Version Info */}
                    <div className="space-y-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <p>
                        Created{' '}
                        {formatDistanceToNow(new Date(version.createdAt), { addSuffix: true })}
                      </p>
                      <p>
                        {formatFileSize(version.sizeBytes)} • {formatDuration(version.durationMs)}
                      </p>
                      {version.createdBy && <p>by {version.createdBy}</p>}
                    </div>
                  </div>

                  {/* Set as Latest Button */}
                  {!isLatest && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSetLatestVersion(version.id)}
                      className="text-xs h-7"
                    >
                      Use This
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

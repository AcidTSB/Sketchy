import { useState } from 'react'
import {
  Play,
  MoreVertical,
  Share2,
  BarChart2,
  FileText,
  Disc,
  Split,
  ListPlus,
  Download,
  FolderInput,
  Copy,
  Trash2,
  Lock,
  Unlock,
  CheckSquare,
  Square,
  RefreshCw,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useProjectStore } from '../store/projectStore'
import { BatchProcessingDialog } from './BatchProcessingDialog'
import type { Track } from '@/types'

interface TrackListProps {
  projectId: number
  tracks?: Track[] // Optional: use filtered tracks from parent
  onTracksUpdated?: () => void
}

export default function TrackList({
  projectId,
  tracks: propTracks,
  onTracksUpdated,
}: TrackListProps) {
  const { tracks: storeTracks } = useProjectStore()
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set())
  const [showBatchDialog, setShowBatchDialog] = useState(false)

  const formatDuration = (ms: number | null | undefined) => {
    if (!ms) return '--:--'
    const seconds = Math.floor(ms / 1000)
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Use propTracks if provided, otherwise filter from store
  const projectTracks =
    propTracks || storeTracks.filter((t) => t.projectId === projectId.toString())

  const handleTrackAction = (_trackId: string, action: string) => {
    switch (action) {
      case 'share':
        // Open share dialog
        break
      case 'insights':
        // Navigate to insights
        break
      case 'notes':
        // Open notes panel
        break
      case 'replace':
        // Open replace audio dialog
        break
      case 'split':
        // Open split stems dialog
        break
      case 'queue':
        // Add to playback queue
        break
      case 'export':
        // Export track
        break
      case 'move':
        // Move to folder
        break
      case 'duplicate':
        // Duplicate track
        break
      case 'delete':
        // Delete track with confirmation
        break
    }
  }

  // Toggle track selection
  const toggleTrackSelection = (trackId: string) => {
    setSelectedTrackIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(trackId)) {
        newSet.delete(trackId)
      } else {
        newSet.add(trackId)
      }
      return newSet
    })
  }

  // Select all tracks
  const selectAllTracks = () => {
    if (selectedTrackIds.size === projectTracks.length) {
      setSelectedTrackIds(new Set())
    } else {
      setSelectedTrackIds(new Set(projectTracks.map((t) => t.id)))
    }
  }

  // Get selected tracks
  const selectedTracks = projectTracks.filter((t) => selectedTrackIds.has(t.id))

  // Check if track is locked (status = final)
  const isTrackLocked = (track: Track) => track.status === 'final'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Batch Actions Bar */}
      {projectTracks.length > 0 && (
        <div
          className="glass-elevated transition-apple"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--space-4)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <button
              onClick={selectAllTracks}
              className="transition-apple hover:opacity-80"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--systemQuaternary)',
              }}
            >
              {selectedTrackIds.size === projectTracks.length ? (
                <CheckSquare size={18} style={{ color: 'var(--keyColor)' }} />
              ) : (
                <Square size={18} style={{ color: 'var(--systemSecondary)' }} />
              )}
              <span className="text-callout" style={{ color: 'var(--systemPrimary)' }}>
                {selectedTrackIds.size === projectTracks.length ? 'Deselect All' : 'Select All'}
              </span>
            </button>
            {selectedTrackIds.size > 0 && (
              <span className="text-footnote" style={{ color: 'var(--systemSecondary)' }}>
                {selectedTrackIds.size} track(s) selected
              </span>
            )}
          </div>
          {selectedTrackIds.size > 0 && (
            <button
              onClick={() => setShowBatchDialog(true)}
              className="transition-apple hover:opacity-90 active:scale-[0.98]"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                padding: 'var(--space-3) var(--space-5)',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'var(--keyColor)',
                color: '#fff',
              }}
            >
              <RefreshCw size={16} />
              <span className="text-callout font-medium">Batch Process</span>
            </button>
          )}
        </div>
      )}

      {/* Track List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {projectTracks.map((track, index) => {
          const isSelected = selectedTrackIds.has(track.id)
          const isLocked = isTrackLocked(track)

          return (
            <div
              key={track.id}
              className="glass-elevated transition-apple hover:shadow-lg"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-4)',
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: isSelected ? 'var(--keyColor-muted)' : undefined,
                border: isSelected ? '1px solid var(--keyColor)' : '1px solid transparent',
                cursor: 'pointer',
              }}
            >
              {/* Checkbox */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toggleTrackSelection(track.id)
                }}
                className="transition-apple hover:opacity-80"
                style={{ padding: 'var(--space-1)' }}
              >
                {isSelected ? (
                  <CheckSquare size={20} style={{ color: 'var(--keyColor)' }} />
                ) : (
                  <Square size={20} style={{ color: 'var(--systemSecondary)' }} />
                )}
              </button>

              {/* Track number */}
              <div
                className="text-callout font-medium"
                style={{
                  width: '32px',
                  textAlign: 'center',
                  color: 'var(--systemTertiary)',
                }}
              >
                {index + 1}
              </div>

              {/* Play button */}
              <button
                className="transition-apple hover:opacity-80 active:scale-[0.95]"
                style={{
                  padding: 'var(--space-3)',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--keyColor)',
                  border: 'none',
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  // TODO: Implement play functionality
                }}
              >
                <Play size={14} fill="white" color="white" />
              </button>

              {/* Track info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <h4
                    className="text-body font-medium truncate"
                    style={{ color: 'var(--systemPrimary)' }}
                  >
                    {track.title}
                  </h4>
                  {/* Lock indicator */}
                  {isLocked && (
                    <div
                      className="text-caption font-medium"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-1)',
                        padding: 'var(--space-1) var(--space-2)',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: 'var(--systemWarning)',
                        color: '#000',
                      }}
                      title="This track is locked (Final)"
                    >
                      <Lock size={12} />
                      <span>Final</span>
                    </div>
                  )}
                </div>
                <p className="text-footnote truncate" style={{ color: 'var(--systemSecondary)' }}>
                  {track.artist || 'Unknown Artist'}
                </p>
              </div>

              {/* Status badge */}
              {track.status && track.status !== 'final' && (
                <div
                  className="text-caption font-medium capitalize"
                  style={{
                    padding: 'var(--space-1) var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor:
                      track.status === 'approved'
                        ? 'var(--systemSuccess)'
                        : track.status === 'review'
                          ? 'var(--systemInfo)'
                          : 'var(--systemQuaternary)',
                    color: track.status === 'draft' ? 'var(--systemSecondary)' : '#fff',
                  }}
                >
                  {track.status}
                </div>
              )}

              {/* Duration */}
              <div
                className="text-footnote tabular-nums"
                style={{ color: 'var(--systemSecondary)' }}
              >
                {formatDuration(track.duration * 1000)}
              </div>

              {/* More options */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="transition-apple hover:opacity-80"
                    style={{
                      padding: 'var(--space-2)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--systemQuaternary)',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical size={16} style={{ color: 'var(--systemPrimary)' }} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => handleTrackAction(track.id, 'share')}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleTrackAction(track.id, 'insights')}>
                    <BarChart2 className="mr-2 h-4 w-4" />
                    Insights
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleTrackAction(track.id, 'notes')}>
                    <FileText className="mr-2 h-4 w-4" />
                    Notes
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {/* Lock/Unlock option */}
                  <DropdownMenuItem
                    onClick={() => handleTrackAction(track.id, isLocked ? 'unlock' : 'lock')}
                  >
                    {isLocked ? (
                      <>
                        <Unlock className="mr-2 h-4 w-4" />
                        Unlock (Change Status)
                      </>
                    ) : (
                      <>
                        <Lock className="mr-2 h-4 w-4" />
                        Lock as Final
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleTrackAction(track.id, 'replace')}
                    disabled={isLocked}
                    className={isLocked ? 'opacity-50 cursor-not-allowed' : ''}
                  >
                    <Disc className="mr-2 h-4 w-4" />
                    Replace audio
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleTrackAction(track.id, 'split')}>
                    <Split className="mr-2 h-4 w-4" />
                    Split stems
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleTrackAction(track.id, 'queue')}>
                    <ListPlus className="mr-2 h-4 w-4" />
                    Add to queue
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleTrackAction(track.id, 'export')}>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleTrackAction(track.id, 'move')}>
                    <FolderInput className="mr-2 h-4 w-4" />
                    Move
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleTrackAction(track.id, 'duplicate')}>
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleTrackAction(track.id, 'delete')}
                    disabled={isLocked}
                    className={`text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950 ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        })}
      </div>

      {/* Batch Processing Dialog */}
      <BatchProcessingDialog
        isOpen={showBatchDialog}
        onClose={() => setShowBatchDialog(false)}
        selectedTracks={selectedTracks}
        onComplete={() => {
          setSelectedTrackIds(new Set())
          onTracksUpdated?.()
        }}
      />
    </div>
  )
}

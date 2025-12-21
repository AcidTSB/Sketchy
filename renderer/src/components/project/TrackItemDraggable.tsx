import {
  Share2,
  Trash2,
  GripVertical,
  MoreVertical,
  Upload,
  ListPlus,
  FolderInput,
  Copy,
  Split,
  Tag as TagIconLucide,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useProjectStore } from '@/store/projectStore'
import type { Track } from '@/types'
import { formatDuration } from '@/utils/format'
import { useRef, useState, useEffect } from 'react'
import { useClickOutside } from '@/hooks/useClickOutside'
import { TagManager } from './TagManager'
import { StatusSelector } from './StatusSelector'
import type { Track as ElectronTrack } from '@/types/electron'

interface TrackItemProps {
  track: Track
  index: number
  onEdit?: (track: Track) => void
  onShare: (track: Track) => void
  onDelete: (trackId: string) => void
  onSplit: (track: Track) => void
  onReplaceAudio?: (track: Track) => void
  onAddToQueue?: (track: Track) => void
  onMove?: (track: Track) => void
  onDuplicate?: (track: Track) => void
  onDragStart: (index: number) => void
  onDragOver: (e: React.DragEvent, index: number) => void
  onDragEnd: () => void
  isDragging: boolean
  isMenuOpen?: boolean
  onMenuOpenChange?: (open: boolean) => void
}

export function TrackItemDraggable({
  track,
  index,
  onShare,
  onDelete,
  onSplit,
  onReplaceAudio,
  onAddToQueue,
  onMove,
  onDuplicate,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragging,
  isMenuOpen = false,
  onMenuOpenChange,
}: TrackItemProps) {
  const { setCurrentTrack } = useProjectStore()
  // playbackStore không còn cần thiết - audioService xử lý tất cả
  const menuRef = useRef<HTMLDivElement>(null)
  const [trackDetails, setTrackDetails] = useState<ElectronTrack | null>(null)
  const [showTagManager, setShowTagManager] = useState(false)
  const tagEditorRef = useRef<HTMLDivElement>(null)

  // Fetch track details with tags
  useEffect(() => {
    fetchTrackDetails()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track.id])

  useClickOutside(tagEditorRef, () => {
    if (showTagManager) {
      setShowTagManager(false)
    }
  })

  const fetchTrackDetails = async () => {
    try {
      const response = await window.electronAPI.getTrack(parseInt(track.id))
      if (response.success && response.data) {
        setTrackDetails(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch track details:', error)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    try {
      await window.electronAPI.updateTrack(parseInt(track.id), { status: newStatus })
      await fetchTrackDetails()
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  useClickOutside(menuRef, () => {
    if (isMenuOpen && onMenuOpenChange) {
      onMenuOpenChange(false)
    }
  })

  const handleMenuToggle = () => {
    if (onMenuOpenChange) {
      onMenuOpenChange(!isMenuOpen)
    }
  }

  const getTypeColor = (type: Track['type']) => {
    switch (type) {
      case 'final':
        return '#10b981' // green
      case 'beat':
        return '#f59e0b' // orange
      case 'draft':
        return '#6b7280' // gray
      default:
        return '#6b7280'
    }
  }

  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragEnd={onDragEnd}
      className={`surface-subtle flex items-center gap-3 p-3 rounded-apple transition-all cursor-pointer ${
        isDragging ? 'opacity-50 scale-95' : 'opacity-100 scale-100'
      }`}
      style={{ borderLeft: `4px solid ${getTypeColor(track.type)}` }}
      // Chỉ cần setCurrentTrack với autoPlay = true, MediaPlayer.tsx sẽ xử lý load/play
      onClick={() => {
        if (track) {
          setCurrentTrack(track.id, true) // Set track và auto-play
        }
      }}
    >
      {/* 1. Drag Handle */}
      <div
        className="cursor-grab active:cursor-grabbing flex-shrink-0"
        style={{ color: 'var(--text-secondary)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-5 w-5" />
      </div>

      {/* 2. Track Number */}
      <span
        className="text-sm font-medium w-6 text-center flex-shrink-0"
        style={{ color: 'var(--text-secondary)' }}
      >
        {index + 1}
      </span>

      {/* 3. Khối Thông tin chính (flex-1) */}
      <div className="flex-1 min-w-0">
        {/* Dòng 1: Title */}
        <div>
          <p className="font-medium text-sm truncate" style={{ color: 'var(--text)' }}>
            {track.title}
          </p>
        </div>

        {/* Dòng 2: Metadata (Khi không edit tag) */}
        {!showTagManager && (
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {/* Duration */}
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {formatDuration((track.duration || 0) * 1000)}
            </span>

            {/* Static Tag List */}
            {trackDetails?.tags && trackDetails.tags.length > 0 ? (
              <div className="flex items-center gap-1 flex-wrap">
                {trackDetails.tags.slice(0, 3).map(({ tag }) => (
                  <span
                    key={tag.id}
                    className="text-xs px-2 py-0.5 rounded bg-secondary/50"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {tag.name}
                  </span>
                ))}
                {trackDetails.tags.length > 3 && (
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    +{trackDetails.tags.length - 3}
                  </span>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* Dòng 3: Tag Manager (Khi edit tag) */}
        {showTagManager && trackDetails ? (
          <div className="mt-2" ref={tagEditorRef} onClick={(e) => e.stopPropagation()}>
            <TagManager
              trackId={trackDetails.id}
              currentTags={trackDetails.tags || []}
              onTagsChange={fetchTrackDetails}
            />
          </div>
        ) : null}
      </div>

      {/* 4. Khối Điều khiển (Nằm bên phải) */}
      <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        {/* Status Selector */}
        {trackDetails && (
          <div onClick={(e) => e.stopPropagation()}>
            <StatusSelector
              currentStatus={trackDetails.status}
              onStatusChange={handleStatusChange}
            />
          </div>
        )}

        {/* Nút Tag Toggler */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-apple"
            onClick={(e) => {
              e.stopPropagation()
              setShowTagManager(!showTagManager)
            }}
          >
            <TagIconLucide className="h-4 w-4" />
          </Button>
        </div>

        {/* Actions Menu (Dấu ... ) */}
        <div className="relative" ref={menuRef}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-apple"
            onClick={(e) => {
              e.stopPropagation()
              handleMenuToggle()
            }}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>

          {isMenuOpen && (
            <div
              className="absolute right-0 bottom-10 z-50 glass-elevated rounded-apple-lg shadow-apple-lg overflow-hidden"
              style={{ width: '200px' }}
            >
              {/* --- NỘI DUNG MENU --- */}
              <button
                onClick={() => {
                  onShare(track)
                  onMenuOpenChange?.(false)
                }}
                className="w-full px-4 py-3 flex items-center gap-3 hover:opacity-80 transition-opacity border-b"
                style={{ borderColor: 'var(--surface)' }}
              >
                <Share2 className="h-4 w-4" style={{ color: 'var(--text)' }} />
                <span className="font-medium" style={{ color: 'var(--text)' }}>
                  Share
                </span>
              </button>

              {onReplaceAudio && (
                <button
                  onClick={() => {
                    onReplaceAudio(track)
                    onMenuOpenChange?.(false)
                  }}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:opacity-80 transition-opacity border-b"
                  style={{ borderColor: 'var(--surface)' }}
                >
                  <Upload className="h-4 w-4" style={{ color: 'var(--text)' }} />
                  <span className="font-medium" style={{ color: 'var(--text)' }}>
                    Replace Audio
                  </span>
                </button>
              )}

              <button
                onClick={() => {
                  onSplit(track)
                  onMenuOpenChange?.(false)
                }}
                className="w-full px-4 py-3 flex items-center gap-3 hover:opacity-80 transition-opacity border-b"
                style={{ borderColor: 'var(--surface)' }}
              >
                <Split className="h-4 w-4" style={{ color: 'var(--text)' }} />
                <span className="font-medium" style={{ color: 'var(--text)' }}>
                  Split Stems
                </span>
              </button>

              {onAddToQueue && (
                <button
                  onClick={() => {
                    onAddToQueue(track)
                    onMenuOpenChange?.(false)
                  }}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:opacity-80 transition-opacity border-b"
                  style={{ borderColor: 'var(--surface)' }}
                >
                  <ListPlus className="h-4 w-4" style={{ color: 'var(--text)' }} />
                  <span className="font-medium" style={{ color: 'var(--text)' }}>
                    Add to Queue
                  </span>
                </button>
              )}

              {onMove && (
                <button
                  onClick={() => {
                    onMove(track)
                    onMenuOpenChange?.(false)
                  }}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:opacity-80 transition-opacity border-b"
                  style={{ borderColor: 'var(--surface)' }}
                >
                  <FolderInput className="h-4 w-4" style={{ color: 'var(--text)' }} />
                  <span className="font-medium" style={{ color: 'var(--text)' }}>
                    Move
                  </span>
                </button>
              )}

              {onDuplicate && (
                <button
                  onClick={() => {
                    onDuplicate(track)
                    onMenuOpenChange?.(false)
                  }}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:opacity-80 transition-opacity border-b"
                  style={{ borderColor: 'var(--surface)' }}
                >
                  <Copy className="h-4 w-4" style={{ color: 'var(--text)' }} />
                  <span className="font-medium" style={{ color: 'var(--text)' }}>
                    Duplicate
                  </span>
                </button>
              )}

              <button
                onClick={() => {
                  onDelete(track.id)
                  onMenuOpenChange?.(false)
                }}
                className="w-full px-4 py-3 flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <Trash2 className="h-4 w-4 text-red-500" />
                <span className="font-medium text-red-500">Delete</span>
              </button>
              {/* --- HẾT NỘI DUNG MENU --- */}
            </div>
          )}
        </div>
      </div>
      {/* Hết Khối Điều khiển */}
    </div>
  )
}

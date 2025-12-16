import { useNavigate } from 'react-router-dom'
import { MoreVertical, Play } from 'lucide-react'
// useState is available for future use
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { formatDuration } from '@/lib/utils'
import type { Track } from '@/types'
import { useProjectStore } from '@/store/projectStore'
import { cn } from '@/lib/utils'

interface TrackItemProps {
  track: Track
  isSelected?: boolean
  isDropdownOpen?: boolean
  onDropdownChange?: (open: boolean) => void
}

export function TrackItem({ track, isSelected, isDropdownOpen, onDropdownChange }: TrackItemProps) {
  const navigate = useNavigate()
  const { deleteTrack } = useProjectStore()

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigate(`/player/${track.id}`)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    // TODO: Add confirmation modal before delete
    deleteTrack(parseInt(track.id, 10))
  }

  const handleDropdownOpenChange = (open: boolean) => {
    if (onDropdownChange) {
      onDropdownChange(open)
    }
  }

  const getTypeColor = (type: Track['type']) => {
    switch (type) {
      case 'final':
        return 'bg-green-500'
      case 'beat':
        return 'bg-blue-500'
      case 'draft':
        return '' // Use CSS variable instead
    }
  }

  const getTypeBgStyle = (type: Track['type']) => {
    if (type === 'draft') {
      return { backgroundColor: 'var(--text-secondary)' }
    }
    return {}
  }

  return (
    <div
      className={cn(
        'group flex items-center gap-4 p-4 rounded-apple transition-smooth hover:opacity-80 cursor-pointer',
        !isSelected && 'surface-subtle',
        isSelected && 'ring-2'
      )}
      style={{
        ...(isSelected && {
          backgroundColor: 'var(--accent)',
          borderColor: 'var(--primary)',
        }),
      }}
      onClick={() => navigate(`/player/${track.id}`)}
    >
      {/* Play Button */}
      <Button
        variant="ghost"
        size="icon"
        className="opacity-0 group-hover:opacity-100 transition-opacity rounded-apple"
        onClick={handlePlay}
      >
        <Play className="h-5 w-5" fill="currentColor" />
      </Button>

      {/* Track Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium truncate" style={{ color: 'var(--text)' }}>
            {track.title}
          </h4>
          <span
            className={cn('px-2 py-0.5 text-xs rounded-apple text-white', getTypeColor(track.type))}
            style={getTypeBgStyle(track.type)}
          >
            {track.type}
          </span>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {formatDuration(track.duration)}
        </p>
      </div>

      {/* Menu */}
      <DropdownMenu open={isDropdownOpen} onOpenChange={handleDropdownOpenChange}>
        <DropdownMenuTrigger asChild onClick={(e: React.MouseEvent) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-apple">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="z-[9999]">
          <DropdownMenuItem>Edit</DropdownMenuItem>
          <DropdownMenuItem>Rename</DropdownMenuItem>
          <DropdownMenuItem>Split into stems</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Share</DropdownMenuItem>
          <DropdownMenuItem className="text-red-600 dark:text-red-400" onClick={handleDelete}>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

import { useNavigate } from 'react-router-dom'
import { MoreVertical, Edit, Move, Cloud, Bell, Trash2, Play } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import type { Project } from '@/types'
import { useProjectStore } from '@/store/projectStore'

interface ProjectCardProps {
  project: Project
}

export function ProjectCard({ project }: ProjectCardProps) {
  const navigate = useNavigate()
  const { tracks, setCurrentTrack } = useProjectStore()

  const handleCardClick = () => {
    navigate(`/project/${project.id}`)
  }

  const handlePlayProject = (e: React.MouseEvent) => {
    e.stopPropagation()
    const projectTracks = tracks.filter((t) => t.projectId === project.id)
    if (projectTracks.length > 0) {
      // Play first track in project
      setCurrentTrack(projectTracks[0].id, true)
    }
  }

  const handleMenuAction = (e: React.MouseEvent, action: string) => {
    e.stopPropagation()

    switch (action) {
      case 'offline':
        // TODO: Toggle offline
        break
      case 'mute':
        // TODO: Toggle mute
        break
      case 'rename':
        // TODO: Rename project
        break
      case 'cover':
        // TODO: Change cover
        break
      case 'notes':
        // TODO: Open notes
        break
      case 'move':
        // TODO: Move project
        break
      case 'delete':
        // TODO: Implement delete with confirmation
        break
    }
  }

  const isCoverArtUrl =
    project.coverArt &&
    (project.coverArt.startsWith('http') ||
      project.coverArt.startsWith('/') ||
      project.coverArt.startsWith('data:image'))

  return (
    <div className="w-52" onClick={handleCardClick}>
      <div className="relative aspect-square cursor-pointer group">
        {isCoverArtUrl ? (
          <img
            src={project.coverArt}
            alt={project.title}
            className="w-full h-full object-cover rounded-apple-lg shadow-apple hover:shadow-apple-lg transition-all duration-300"
          />
        ) : (
          <div
            style={{
              background: project.coverArt || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
            className="w-full h-full rounded-apple-lg shadow-apple hover:shadow-apple-lg transition-all duration-300"
          />
        )}

        {/* Overlay with Play Button */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-apple-lg backdrop-blur-sm flex items-center justify-center">
          <button
            onClick={handlePlayProject}
            className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 shadow-apple-lg"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            <Play className="h-7 w-7 text-white ml-1" fill="currentColor" />
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-start justify-between gap-2 px-1">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate" style={{ color: 'var(--text)' }}>
            {project.title}
          </h3>
          <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
            {project.artist}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 flex-shrink-0 opacity-0 group-hover:opacity-100 rounded-apple"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => handleMenuAction(e, 'notes')}>
              <Edit className="mr-2 h-4 w-4" /> Add notes
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => handleMenuAction(e, 'rename')}>
              <Edit className="mr-2 h-4 w-4" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => handleMenuAction(e, 'move')}>
              <Move className="mr-2 h-4 w-4" /> Move
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={(e) => handleMenuAction(e, 'offline')}>
              <Cloud className="mr-2 h-4 w-4" />
              {project.offline ? 'Remove offline' : 'Make available offline'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => handleMenuAction(e, 'mute')}>
              <Bell className="mr-2 h-4 w-4" />
              {project.muted ? 'Unmute' : 'Mute'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950 dark:focus:text-red-500"
              onClick={(e) => handleMenuAction(e, 'delete')}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete Project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

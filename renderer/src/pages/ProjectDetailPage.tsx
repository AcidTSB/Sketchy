import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload, Plus, Trash2, MoreVertical, Filter } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useProjectStore } from '../store/projectStore'
import { useToast } from '../components/Toast'
import TrackList from '../components/TrackList'
import ImportModal from '../components/ImportModal'
import ConfirmDialog from '../components/common/ConfirmDialog'
import type { Tag } from '@/types/electron'

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { currentProject, tracks, loadProject, loadTracks, loading } = useProjectStore()
  const toast = useToast()
  const [showImportModal, setShowImportModal] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  // Tag filter state
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<Set<number>>(new Set())
  const [filteredTracks, setFilteredTracks] = useState(tracks)

  // Fetch all available tags
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await window.electronAPI.getTags()
        if (response.success && response.data) {
          setAllTags(response.data)
        }
      } catch (error) {
        console.error('Failed to fetch tags:', error)
      }
    }
    fetchTags()
  }, [])

  // Filter tracks when selection or tracks change
  useEffect(() => {
    if (selectedTagIds.size === 0) {
      setFilteredTracks(tracks)
    } else {
      const filtered = tracks.filter((track) => {
        // Track must have at least one of the selected tags
        if (!track.tags || track.tags.length === 0) return false
        return track.tags.some((trackTag) => selectedTagIds.has(trackTag.tagId))
      })
      setFilteredTracks(filtered)
    }
  }, [tracks, selectedTagIds])

  const toggleTagFilter = (tagId: number) => {
    setSelectedTagIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(tagId)) {
        newSet.delete(tagId)
      } else {
        newSet.add(tagId)
      }
      return newSet
    })
  }

  const clearFilters = () => {
    setSelectedTagIds(new Set())
  }

  const getTagColor = (tagId: number) => {
    const colors = [
      '#ef4444',
      '#f97316',
      '#f59e0b',
      '#eab308',
      '#84cc16',
      '#22c55e',
      '#10b981',
      '#14b8a6',
      '#06b6d4',
      '#0ea5e9',
      '#3b82f6',
      '#6366f1',
      '#8b5cf6',
      '#a855f7',
      '#d946ef',
      '#ec4899',
      '#f43f5e',
    ]
    return colors[tagId % colors.length]
  }

  useEffect(() => {
    if (projectId) {
      const id = parseInt(projectId)
      loadProject(id)
      loadTracks(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    const audioFiles = files.filter((file) => file.type.startsWith('audio/'))

    if (audioFiles.length === 0) {
      toast.error('Please drop audio files')
      return
    }

    if (!currentProject) {
      toast.error('No project selected')
      return
    }

    try {
      const filePaths = audioFiles.map((file) => {
        // In Electron, dragged files have a 'path' property
        const filePath = (file as { path?: string }).path
        if (!filePath) {
          throw new Error(`Cannot get file path for: ${file.name}`)
        }
        return {
          path: filePath,
          name: file.name,
        }
      })

      const response = await window.electronAPI.importFiles({
        projectId: parseInt(currentProject.id),
        files: filePaths,
        storageMode: 'copy',
      })

      if (response.success) {
        toast.success(`Importing ${audioFiles.length} file(s)...`)
        // Reload tracks after a delay
        setTimeout(() => {
          if (projectId) {
            loadTracks(parseInt(projectId))
          }
        }, 2000)
      } else {
        toast.error(response.error || 'Failed to import files')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to import files')
      console.error(error)
    }
  }

  const handleDeleteProject = async () => {
    if (!currentProject) return

    try {
      const response = await window.electronAPI.deleteProject(parseInt(currentProject.id))
      if (response.success) {
        toast.success('Project deleted successfully')
        navigate('/')
      } else {
        toast.error(response.error || 'Failed to delete project')
      }
    } catch (error) {
      toast.error('Failed to delete project')
      console.error(error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2"
          style={{ borderColor: 'var(--primary)' }}
        ></div>
      </div>
    )
  }

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-xl mb-4" style={{ color: 'var(--text)' }}>
            Project not found
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 rounded-apple"
            style={{ backgroundColor: 'var(--primary)', color: 'white' }}
          >
            Back to Library
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={dropZoneRef}
      className="h-full flex flex-col"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
        >
          <div className="text-center">
            <Upload size={64} style={{ color: 'var(--primary)' }} className="mx-auto mb-4" />
            <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
              Drop audio files here
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div
        className="glass border-b px-8 py-6 backdrop-blur-apple"
        style={{ borderColor: 'var(--surface)' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:opacity-80 rounded-apple transition-smooth"
              style={{ backgroundColor: 'var(--surface)' }}
            >
              <ArrowLeft size={24} style={{ color: 'var(--text)' }} />
            </button>

            {/* Project cover art with hover effect */}
            {currentProject.coverArt && (
              <div className="relative w-16 h-16 group cursor-pointer">
                <img
                  src={currentProject.coverArt}
                  alt={currentProject.title}
                  className="w-full h-full rounded-apple object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-apple flex items-center justify-center">
                  <span className="text-white text-xs font-medium">Change Cover</span>
                </div>
              </div>
            )}

            <div>
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                PROJECT
              </p>
              <h2 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>
                {currentProject.title}
              </h2>
              <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                {tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-apple transition-smooth hover:opacity-90 shadow-apple"
              style={{ backgroundColor: 'var(--primary)', color: '#fff' }}
            >
              <Plus size={20} />
              <span className="hidden sm:inline">Add Track</span>
            </button>

            {/* More options dropdown - với tooltip */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-2 rounded-apple hover:opacity-80 transition-smooth shadow-apple"
                  style={{ backgroundColor: 'var(--surface)' }}
                  title="More options (Edit, Delete...)"
                >
                  <MoreVertical size={20} style={{ color: 'var(--text)' }} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => {
                    /* TODO: Implement edit project details */
                  }}
                  className="cursor-pointer"
                >
                  Edit Details
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    /* TODO: Implement change cover */
                  }}
                  className="cursor-pointer"
                >
                  Change Cover
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950 cursor-pointer font-medium"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Tracks content */}
      <div className="flex-1 overflow-y-auto p-8">
        {/* Tag Filter Bar */}
        {allTags.length > 0 && tracks.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                  Filter by tags:
                </span>
              </div>
              {selectedTagIds.size > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-xs px-2 py-1 rounded-apple hover:opacity-80 transition-smooth"
                  style={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)' }}
                >
                  Clear all
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => {
                const isSelected = selectedTagIds.has(tag.id)
                const tagColor = getTagColor(tag.id)
                return (
                  <button
                    key={tag.id}
                    onClick={() => toggleTagFilter(tag.id)}
                    className="px-3 py-1.5 rounded-apple text-xs font-medium transition-all hover:scale-105"
                    style={{
                      backgroundColor: isSelected ? tagColor : `${tagColor}20`,
                      color: isSelected ? '#fff' : tagColor,
                      border: `1px solid ${isSelected ? tagColor : `${tagColor}40`}`,
                    }}
                  >
                    {tag.name}
                    {isSelected && <span className="ml-1.5">✓</span>}
                  </button>
                )
              })}
            </div>
            {selectedTagIds.size > 0 && (
              <p className="text-xs mt-3" style={{ color: 'var(--text-secondary)' }}>
                Showing {filteredTracks.length} of {tracks.length} tracks
              </p>
            )}
          </div>
        )}

        {tracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 glass rounded-apple-lg flex items-center justify-center mb-4 shadow-apple">
              <Upload className="h-10 w-10" style={{ color: 'var(--text-secondary)' }} />
            </div>
            <h3 className="text-2xl font-semibold mb-2" style={{ color: 'var(--text)' }}>
              No tracks yet
            </h3>
            <p className="mb-6 max-w-sm" style={{ color: 'var(--text-secondary)' }}>
              Add your first track by clicking the button above or drag & drop audio files here
            </p>
            <button
              onClick={() => setShowImportModal(true)}
              className="px-6 py-3 rounded-apple shadow-apple"
              style={{ backgroundColor: 'var(--primary)', color: 'white' }}
            >
              Add Track
            </button>
          </div>
        ) : filteredTracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 glass rounded-apple-lg flex items-center justify-center mb-4 shadow-apple">
              <Filter className="h-10 w-10" style={{ color: 'var(--text-secondary)' }} />
            </div>
            <h3 className="text-2xl font-semibold mb-2" style={{ color: 'var(--text)' }}>
              No tracks match filters
            </h3>
            <p className="mb-6 max-w-sm" style={{ color: 'var(--text-secondary)' }}>
              Try selecting different tags or clear all filters
            </p>
            <button
              onClick={clearFilters}
              className="px-6 py-3 rounded-apple shadow-apple"
              style={{ backgroundColor: 'var(--primary)', color: 'white' }}
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <TrackList projectId={parseInt(projectId!)} tracks={filteredTracks} />
        )}
      </div>

      {showImportModal && currentProject && (
        <ImportModal
          projectId={parseInt(currentProject.id)}
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            setShowImportModal(false)
            if (projectId) {
              loadTracks(parseInt(projectId))
            }
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Project"
        message={`Are you sure you want to delete "${currentProject?.title}"? This action cannot be undone and will delete all tracks and data in this project.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={() => {
          setShowDeleteConfirm(false)
          handleDeleteProject()
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  )
}

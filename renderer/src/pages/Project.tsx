import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Plus,
  Play,
  Music,
  FileAudio,
  Mic,
  MoreVertical,
  Trash2,
  FolderInput,
  Copy,
  ListPlus,
  Camera,
  Filter,
  X,
  CheckSquare,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TrackItemDraggable } from '@/components/project/TrackItemDraggable'
import { ImportAudioDialog } from '@/components/project/ImportAudioDialog'
import { RecordAudioDialog } from '@/components/project/RecordAudioDialog'
import { EditTrackDialog } from '@/components/project/EditTrackDialog'
import { SplitStemsDialog } from '@/components/project/SplitStemsDialog'
import { ShareDialog } from '@/components/ShareDialog'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { notifications } from '@/services/notificationClient'
import { MoveProjectDialog } from '@/components/project/MoveProjectDialog'
import { ReplaceAudioDialog } from '@/components/project/ReplaceAudioDialog'
import { MoveTrackDialog } from '@/components/project/MoveTrackDialog'
import { BatchProcessingDialog } from '@/components/BatchProcessingDialog'
import { useProjectStore } from '@/store/projectStore'
import { usePlaybackStore } from '@/store/playbackStore'
import type { Track, Tag } from '@/types'

export function Project() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const {
    currentProject,
    tracks: allTracks,
    setCurrentTrack,
    deleteTrack,
    loadTracks,
    loadProject,
  } = useProjectStore()
  const { addToQueue, addTracksToQueue } = usePlaybackStore()
  // Filter tracks for this project
  const projectTracks = id ? allTracks.filter((t) => t.projectId === id) : []
  const [localTracks, setLocalTracks] = useState(projectTracks)

  // Filter state
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<Set<number>>(new Set())
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(new Set())
  const [filteredTracks, setFilteredTracks] = useState(projectTracks)
  const [showFilters, setShowFilters] = useState(false)

  // Dialogs state
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [showRecordDialog, setShowRecordDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showSplitDialog, setShowSplitDialog] = useState(false)
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showMoveDialog, setShowMoveDialog] = useState(false)
  const [showReplaceAudioDialog, setShowReplaceAudioDialog] = useState(false)
  const [showMoveTrackDialog, setShowMoveTrackDialog] = useState(false)
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null)

  // Batch processing state
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set())
  const [showBatchDialog, setShowBatchDialog] = useState(false)

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  // Dropdown state - chỉ cho phép 1 dropdown mở tại 1 thời điểm
  const [openMenuIndex, setOpenMenuIndex] = useState<number | null>(null)

  // Edit states
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editedTitle, setEditedTitle] = useState('')
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [editedDescription, setEditedDescription] = useState('')
  const [isHoveringCover, setIsHoveringCover] = useState(false)

  const titleInputRef = useRef<HTMLInputElement>(null)
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null)

  // Fetch project data
  const fetchProject = async () => {
    if (!id) return

    try {
      // Load project from backend - this updates both projects array and currentProject
      await loadProject(parseInt(id))

      // Fetch tracks
      await loadTracks(parseInt(id))
      // projectTracks will be automatically updated via store subscription
    } catch (error) {
      console.error('Failed to fetch project:', error)
    }
  }

  useEffect(() => {
    fetchProject()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

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
    let filtered = localTracks

    // Filter by tags (OR logic - track has ANY selected tag)
    if (selectedTagIds.size > 0) {
      filtered = filtered.filter((track) => {
        if (!track.tags || track.tags.length === 0) return false
        return track.tags.some((trackTag) => selectedTagIds.has(trackTag.tagId))
      })
    }

    // Filter by status (OR logic - track has ANY selected status)
    if (selectedStatuses.size > 0) {
      filtered = filtered.filter((track) => {
        // Use status field from backend, default to 'draft' if not set
        const trackStatus = track.status || 'draft'
        // Capitalize first letter to match filter buttons
        const displayStatus = trackStatus.charAt(0).toUpperCase() + trackStatus.slice(1)
        return selectedStatuses.has(displayStatus)
      })
    }

    setFilteredTracks(filtered)
  }, [localTracks, selectedTagIds, selectedStatuses])

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [isEditingTitle])

  useEffect(() => {
    if (isEditingDescription && descriptionInputRef.current) {
      descriptionInputRef.current.focus()
      descriptionInputRef.current.select()
    }
  }, [isEditingDescription])

  // Sync khi có thay đổi tracks từ store (add/delete/update)
  useEffect(() => {
    setLocalTracks(projectTracks)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectTracks.length]) // Chỉ sync khi số lượng tracks thay đổi

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p style={{ color: 'var(--text-secondary)' }}>Project not found</p>
      </div>
    )
  }

  const handlePlayAll = () => {
    if (localTracks.length > 0) {
      setCurrentTrack(localTracks[0].id, true) // Auto-play enabled
    }
  }

  // Filter functions
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

  const toggleStatusFilter = (status: string) => {
    setSelectedStatuses((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(status)) {
        newSet.delete(status)
      } else {
        newSet.add(status)
      }
      return newSet
    })
  }

  const clearFilters = () => {
    setSelectedTagIds(new Set())
    setSelectedStatuses(new Set())
  }

  const hasActiveFilters = selectedTagIds.size > 0 || selectedStatuses.size > 0

  // Batch selection functions
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

  const selectAllTracks = () => {
    if (selectedTrackIds.size === filteredTracks.length) {
      setSelectedTrackIds(new Set())
    } else {
      setSelectedTrackIds(new Set(filteredTracks.map((t) => t.id)))
    }
  }

  const selectedTracksForBatch = filteredTracks.filter((t) => selectedTrackIds.has(t.id))

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

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      Draft: '#94a3b8', // slate
      Review: '#fb923c', // orange
      Approved: '#60a5fa', // blue
      Final: '#34d399', // green
    }
    return statusColors[status] || '#94a3b8'
  }

  const handleEdit = (track: Track) => {
    setSelectedTrack(track)
    setShowEditDialog(true)
  }

  const handleShare = (track: Track) => {
    setSelectedTrack(track)
    setShowShareDialog(true)
  }

  const handleDelete = (trackId: string) => {
    if (confirm('Are you sure you want to delete this track?')) {
      deleteTrack(parseInt(trackId))
    }
  }
  const handleSplit = (track: Track) => {
    setSelectedTrack(track)
    setShowSplitDialog(true)
  }

  const handleDeleteProject = async () => {
    if (!currentProject) return

    try {
      const response = await window.electronAPI.deleteProject(parseInt(currentProject.id))
      if (response.success) {
        notifications.success(
          'Project deleted',
          `"${currentProject.title}" has been deleted successfully`
        )
        navigate('/')
      } else {
        notifications.error('Failed to delete project', response.error || 'Please try again')
      }
    } catch (error) {
      notifications.error('Failed to delete project', String(error))
      console.error(error)
    }
  }

  // Cover art handlers
  const handleCoverClick = async () => {
    if (!currentProject) return

    try {
      const result = await window.electronAPI.selectImageFile()
      if (result.success && result.data) {
        const base64Image = (result.data as { base64: string }).base64

        // Update project with base64 image
        const response = await window.electronAPI.updateProject(parseInt(currentProject.id), {
          coverArt: base64Image,
        })

        if (response.success) {
          await fetchProject()
          notifications.success(
            'Cover art updated',
            'Project cover art has been updated successfully'
          )
        } else {
          notifications.error('Update failed', response.error || 'Failed to update cover art')
        }
      }
    } catch (error) {
      console.error('Failed to select/upload cover:', error)
      notifications.error('Update failed', 'An unexpected error occurred while updating cover art')
    }
  }

  // Title editing handlers
  const handleTitleClick = () => {
    setEditedTitle(currentProject?.title || '')
    setIsEditingTitle(true)
  }

  const handleTitleSave = async () => {
    if (!currentProject || !editedTitle.trim()) {
      setIsEditingTitle(false)
      return
    }

    try {
      const response = await window.electronAPI.updateProject(parseInt(currentProject.id), {
        name: editedTitle.trim(),
      })

      if (response.success) {
        await fetchProject()
        setIsEditingTitle(false)
      } else {
        notifications.error('Update failed', response.error || 'Failed to update project title')
      }
    } catch (error) {
      notifications.error('Update failed', 'An unexpected error occurred while updating title')
      console.error(error)
    }
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSave()
    } else if (e.key === 'Escape') {
      setIsEditingTitle(false)
    }
  }

  // Description editing handlers
  const handleDescriptionClick = () => {
    setEditedDescription(currentProject?.description || '')
    setIsEditingDescription(true)
  }

  const handleDescriptionSave = async () => {
    if (!currentProject) {
      setIsEditingDescription(false)
      return
    }

    try {
      const response = await window.electronAPI.updateProject(parseInt(currentProject.id), {
        description: editedDescription.trim(),
      })

      if (response.success) {
        await fetchProject()
        setIsEditingDescription(false)
      } else {
        notifications.error(
          'Update failed',
          response.error || 'Failed to update project description'
        )
      }
    } catch (error) {
      notifications.error(
        'Update failed',
        'An unexpected error occurred while updating description'
      )
      console.error(error)
    }
  }

  const handleDescriptionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsEditingDescription(false)
    }
  }

  // Project actions
  const handleMoveProject = () => {
    setShowMoveDialog(true)
  }

  const handleDuplicateProject = async () => {
    if (!currentProject) return

    try {
      const response = await window.electronAPI.createProject({
        name: `${currentProject.title} (Copy)`,
        description: currentProject.description,
      })

      if (response.success && response.data) {
        notifications.success(
          'Project duplicated',
          `"${currentProject.title}" has been duplicated successfully`
        )
        navigate(`/project/${response.data.id}`)
      } else {
        notifications.error('Duplicate failed', response.error || 'Failed to duplicate project')
      }
    } catch (error) {
      notifications.error(
        'Duplicate failed',
        'An unexpected error occurred while duplicating project'
      )
      console.error(error)
    }
  }

  const handleAddToQueue = () => {
    if (!currentProject || localTracks.length === 0) return
    addTracksToQueue(localTracks)
    notifications.info(
      'Added to queue',
      `${localTracks.length} ${localTracks.length === 1 ? 'track' : 'tracks'} added to playback queue`
    )
  }

  // Track actions
  const handleReplaceAudio = async (track: Track) => {
    setSelectedTrack(track)
    setShowReplaceAudioDialog(true)
  }

  const handleAddTrackToQueue = (track: Track) => {
    addToQueue(track)
    notifications.info('Added to queue', `"${track.title}" added to playback queue`)
  }
  const handleMoveTrack = (track: Track) => {
    setSelectedTrack(track)
    setShowMoveTrackDialog(true)
  }

  const handleDuplicateTrack = async (_track: Track) => {
    try {
      notifications.info('Coming soon', `Track duplication feature will be available soon`)
      // After duplication, reload tracks
      if (id) loadTracks(parseInt(id))
    } catch (error) {
      console.error('Error duplicating track:', error)
      notifications.error('Duplicate failed', 'Failed to duplicate track')
    }
  }

  // Drag and drop handlers
  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newTracks = [...localTracks]
    const draggedTrack = newTracks[draggedIndex]

    // Remove from old position
    newTracks.splice(draggedIndex, 1)

    // Insert at new position
    newTracks.splice(index, 0, draggedTrack)

    setLocalTracks(newTracks)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Header */}
      <div className="pb-8 glass">
        <div className="max-w-5xl mx-auto px-8 pt-8">
          <Button
            variant="ghost"
            className="mb-6 gap-2 rounded-apple"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Library
          </Button>

          <div className="flex gap-8">
            {/* Cover Art - Editable on hover */}
            <div
              className="flex-shrink-0 relative group cursor-pointer"
              onMouseEnter={() => setIsHoveringCover(true)}
              onMouseLeave={() => setIsHoveringCover(false)}
              onClick={handleCoverClick}
            >
              <img
                src={currentProject.coverArt}
                alt={currentProject.title}
                className="w-64 h-64 rounded-apple-lg shadow-apple-lg object-cover transition-opacity duration-200"
                style={{ opacity: isHoveringCover ? 0.7 : 1 }}
              />
              {isHoveringCover && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-black/80 px-4 py-2 rounded-apple flex items-center gap-2">
                    <Camera className="h-5 w-5 text-white" />
                    <span className="text-white text-sm font-medium">Change Cover</span>
                  </div>
                </div>
              )}
            </div>

            {/* Project Info */}
            <div className="flex flex-col justify-end flex-1">
              <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                PROJECT
              </p>

              {/* Editable Title */}
              {isEditingTitle ? (
                <div className="mb-4">
                  <input
                    ref={titleInputRef}
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    onBlur={handleTitleSave}
                    onKeyDown={handleTitleKeyDown}
                    className="text-5xl font-bold w-full bg-transparent border-b-2 border-primary outline-none"
                    style={{ color: 'var(--text)' }}
                  />
                </div>
              ) : (
                <h1
                  className="text-5xl font-bold mb-4 cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ color: 'var(--text)' }}
                  onClick={handleTitleClick}
                  title="Click to edit"
                >
                  {currentProject.title}
                </h1>
              )}

              {/* Editable Description */}
              {isEditingDescription ? (
                <div className="mb-4">
                  <textarea
                    ref={descriptionInputRef}
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    onBlur={handleDescriptionSave}
                    onKeyDown={handleDescriptionKeyDown}
                    className="w-full bg-transparent border border-primary rounded-apple p-2 outline-none resize-none"
                    style={{ color: 'var(--text-secondary)' }}
                    rows={2}
                    placeholder="Add a description..."
                  />
                </div>
              ) : (
                <p
                  className="text-sm mb-4 cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ color: 'var(--text-secondary)' }}
                  onClick={handleDescriptionClick}
                  title="Click to edit description"
                >
                  {currentProject.description || 'Add a description...'}
                </p>
              )}

              <div className="flex gap-3 mt-6">
                <Button
                  size="lg"
                  className="gap-2 rounded-apple"
                  onClick={handlePlayAll}
                  disabled={localTracks.length === 0}
                  style={{ backgroundColor: 'var(--primary)' }}
                >
                  <Play className="h-5 w-5" fill="currentColor" />
                  Play All
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="lg" variant="outline" className="gap-2 rounded-apple">
                      <Plus className="h-5 w-5" />
                      Add Track
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" alignOffset={0} className="w-48">
                    <DropdownMenuItem
                      onClick={() => setShowImportDialog(true)}
                      className="gap-2 cursor-pointer"
                    >
                      <FileAudio className="h-4 w-4" />
                      Import from file
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setShowRecordDialog(true)}
                      className="gap-2 cursor-pointer"
                    >
                      <Mic className="h-4 w-4" />
                      Record new track
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Project Options Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="lg"
                      variant="outline"
                      className="rounded-apple"
                      title="More options"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={handleMoveProject} className="gap-2 cursor-pointer">
                      <FolderInput className="h-4 w-4" />
                      Move Project
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleDuplicateProject}
                      className="gap-2 cursor-pointer"
                    >
                      <Copy className="h-4 w-4" />
                      Duplicate Project
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleAddToQueue} className="gap-2 cursor-pointer">
                      <ListPlus className="h-4 w-4" />
                      Add to Queue
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setShowDeleteConfirm(true)}
                      className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950 cursor-pointer font-medium gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Project
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tracks List */}
      <div className="max-w-5xl mx-auto px-8 py-8">
        {/* Filter Section */}
        {localTracks.length > 0 && (
          <div className="mb-6">
            {/* Filter Toggle Button */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 rounded-apple transition-smooth hover:opacity-80"
                style={{
                  backgroundColor: hasActiveFilters ? 'var(--primary)' : 'var(--surface)',
                  color: hasActiveFilters ? '#fff' : 'var(--text)',
                }}
              >
                <Filter className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Filters {hasActiveFilters && `(${selectedTagIds.size + selectedStatuses.size})`}
                </span>
              </button>

              {/* Active Filters Summary & Clear */}
              {hasActiveFilters && (
                <div className="flex items-center gap-3">
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Showing {filteredTracks.length} of {localTracks.length} tracks
                  </span>
                  <button
                    onClick={clearFilters}
                    className="text-xs px-3 py-1.5 rounded-apple transition-smooth hover:opacity-80 flex items-center gap-1"
                    style={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)' }}
                  >
                    <X className="h-3 w-3" />
                    Clear all
                  </button>
                </div>
              )}
            </div>

            {/* Expandable Filter Panel */}
            {showFilters && (
              <div
                className="glass rounded-apple-lg p-4 space-y-4 mb-4"
                style={{ borderColor: 'var(--surface)' }}
              >
                {/* Status Filter */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-1 h-4 rounded-full"
                      style={{ backgroundColor: 'var(--primary)' }}
                    />
                    <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                      Status
                    </span>
                    {selectedStatuses.size > 0 && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: 'var(--surface)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {selectedStatuses.size}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['Draft', 'Review', 'Approved', 'Final'].map((status) => {
                      const isSelected = selectedStatuses.has(status)
                      const statusColor = getStatusColor(status)
                      return (
                        <button
                          key={status}
                          onClick={() => toggleStatusFilter(status)}
                          className="px-3 py-1.5 rounded-apple text-xs font-medium transition-smooth hover:opacity-90 border"
                          style={{
                            backgroundColor: isSelected ? statusColor : `${statusColor}20`,
                            color: isSelected ? '#fff' : statusColor,
                            borderColor: statusColor,
                          }}
                        >
                          {status} {isSelected && '✓'}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Tags Filter */}
                {allTags.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-1 h-4 rounded-full"
                        style={{ backgroundColor: 'var(--primary)' }}
                      />
                      <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                        Tags
                      </span>
                      {selectedTagIds.size > 0 && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: 'var(--surface)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {selectedTagIds.size}
                        </span>
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
                            className="px-3 py-1.5 rounded-apple text-xs font-medium transition-smooth hover:opacity-90 border"
                            style={{
                              backgroundColor: isSelected ? tagColor : `${tagColor}20`,
                              color: isSelected ? '#fff' : tagColor,
                              borderColor: tagColor,
                            }}
                          >
                            {tag.name} {isSelected && '✓'}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {localTracks.length === 0 ? (
          <div className="text-center py-16">
            <Music
              className="h-16 w-16 mx-auto mb-4 opacity-50"
              style={{ color: 'var(--text-secondary)' }}
            />
            <p className="text-lg mb-2" style={{ color: 'var(--text)' }}>
              No tracks yet
            </p>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              Add your first track to get started
            </p>
            <Button
              variant="outline"
              className="gap-2 rounded-apple"
              onClick={() => setShowImportDialog(true)}
            >
              <Plus className="h-5 w-5" />
              Add Track
            </Button>
          </div>
        ) : filteredTracks.length === 0 ? (
          <div className="text-center py-16">
            <Filter
              className="h-16 w-16 mx-auto mb-4 opacity-50"
              style={{ color: 'var(--text-secondary)' }}
            />
            <p className="text-lg mb-2" style={{ color: 'var(--text)' }}>
              No tracks match filters
            </p>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              Try selecting different tags or clear all filters
            </p>
            <Button variant="outline" className="gap-2 rounded-apple" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Batch Selection Bar */}
            <div
              className="flex items-center gap-4 p-3 rounded-apple"
              style={{ background: 'var(--bg-secondary)' }}
            >
              <Button variant="ghost" size="sm" className="gap-2" onClick={selectAllTracks}>
                <CheckSquare className="h-4 w-4" />
                {selectedTrackIds.size === filteredTracks.length ? 'Deselect All' : 'Select All'}
              </Button>

              {selectedTrackIds.size > 0 && (
                <>
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {selectedTrackIds.size} track{selectedTrackIds.size !== 1 ? 's' : ''} selected
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 ml-auto"
                    onClick={() => setShowBatchDialog(true)}
                  >
                    <Layers className="h-4 w-4" />
                    Batch Process
                  </Button>
                </>
              )}
            </div>

            {/* Track List */}
            {filteredTracks.map((track, index) => (
              <div key={track.id} className="flex items-center gap-3">
                {/* Checkbox */}
                <button
                  className="flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors"
                  style={{
                    borderColor: selectedTrackIds.has(track.id) ? 'var(--accent)' : 'var(--border)',
                    background: selectedTrackIds.has(track.id) ? 'var(--accent)' : 'transparent',
                  }}
                  onClick={() => toggleTrackSelection(track.id)}
                >
                  {selectedTrackIds.has(track.id) && (
                    <CheckSquare className="h-4 w-4" style={{ color: 'white' }} />
                  )}
                </button>

                {/* Track Item */}
                <div className="flex-1">
                  <TrackItemDraggable
                    track={track}
                    index={index}
                    onEdit={handleEdit}
                    onShare={handleShare}
                    onDelete={handleDelete}
                    onSplit={handleSplit}
                    onReplaceAudio={handleReplaceAudio}
                    onAddToQueue={handleAddTrackToQueue}
                    onMove={handleMoveTrack}
                    onDuplicate={handleDuplicateTrack}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                    isDragging={draggedIndex === index}
                    isMenuOpen={openMenuIndex === index}
                    onMenuOpenChange={(open) => setOpenMenuIndex(open ? index : null)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <ImportAudioDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        projectId={currentProject.id}
        onImportComplete={() => {
          // Refetch tracks after import completes
          fetchProject()
        }}
      />
      <RecordAudioDialog
        isOpen={showRecordDialog}
        onClose={() => setShowRecordDialog(false)}
        projectId={currentProject.id}
        onTrackSaved={() => {
          // Refetch tracks after recording is saved
          fetchProject()
        }}
      />
      <EditTrackDialog
        isOpen={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        track={selectedTrack}
      />
      <SplitStemsDialog
        isOpen={showSplitDialog}
        onClose={() => setShowSplitDialog(false)}
        track={selectedTrack}
      />
      <ShareDialog
        isOpen={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        targetType="track"
        targetId={selectedTrack?.id || ''}
        targetTitle={selectedTrack?.title || ''}
      />

      {/* Batch Processing Dialog */}
      <BatchProcessingDialog
        isOpen={showBatchDialog}
        onClose={() => setShowBatchDialog(false)}
        selectedTracks={selectedTracksForBatch}
        onComplete={() => {
          // Clear selection and refetch
          setSelectedTrackIds(new Set())
          fetchProject()
        }}
      />

      {/* Delete Project Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onConfirm={handleDeleteProject}
        onCancel={() => setShowDeleteConfirm(false)}
        title="Delete Project"
        message={`Are you sure you want to delete "${currentProject.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Move Project Dialog */}
      <MoveProjectDialog
        isOpen={showMoveDialog}
        onClose={() => setShowMoveDialog(false)}
        projectId={currentProject.id}
        onMoveComplete={() => {
          fetchProject()
        }}
      />

      {/* Replace Audio Dialog */}
      <ReplaceAudioDialog
        isOpen={showReplaceAudioDialog}
        onClose={() => {
          setShowReplaceAudioDialog(false)
          setSelectedTrack(null)
        }}
        track={selectedTrack}
        onReplaceComplete={() => {
          fetchProject()
        }}
      />

      {/* Move Track Dialog */}
      <MoveTrackDialog
        isOpen={showMoveTrackDialog}
        onClose={() => {
          setShowMoveTrackDialog(false)
          setSelectedTrack(null)
        }}
        track={selectedTrack}
        projectId={currentProject.id}
        onMoveComplete={() => {
          fetchProject()
        }}
      />
    </div>
  )
}

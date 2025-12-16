import React, { useState, useRef, useEffect } from 'react'
import { Plus, X, TagIcon } from 'lucide-react'
import { useClickOutside } from '../../hooks/useClickOutside'

interface Tag {
  id: number
  name: string
}

interface TrackTag {
  trackId: number
  tagId: number
  tag: Tag
}

interface TagManagerProps {
  trackId: number
  currentTags: TrackTag[]
  onTagsChange: () => void
}

export const TagManager: React.FC<TagManagerProps> = ({ trackId, currentTags, onTagsChange }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [allTags, setAllTags] = useState<Tag[]>([])
  const menuRef = useRef<HTMLDivElement>(null)

  // Fetch all available tags on mount
  useEffect(() => {
    const fetchTags = async () => {
      const response = await window.electronAPI.getTags()
      if (response.success && response.data) {
        setAllTags(response.data)
      }
    }
    fetchTags()
  }, [])

  useClickOutside(menuRef, () => {
    if (!isCreating) {
      setIsOpen(false)
    }
  })

  const handleAddTag = async (tagId: number) => {
    try {
      const response = await window.electronAPI.addTagToTrack({ trackId, tagId })
      if (response.success) {
        setIsOpen(false)
        onTagsChange() // Refresh track details
      }
    } catch (error) {
      console.error('Failed to add tag:', error)
    }
  }

  const handleRemoveTag = async (tagId: number) => {
    try {
      await window.electronAPI.removeTagFromTrack(trackId, tagId)
      onTagsChange() // Refresh track details
    } catch (error) {
      console.error('Failed to remove tag:', error)
    }
  }

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return

    try {
      const response = await window.electronAPI.createTag({
        name: newTagName.trim(),
      })

      if (response.success && response.data) {
        // Add new tag to local state
        setAllTags((prev) => [...prev, response.data!])
        await handleAddTag(response.data.id)
        setNewTagName('')
        setIsCreating(false)
      }
    } catch (error) {
      console.error('Failed to create tag:', error)
    }
  }

  // Filter out tags that are already on the track
  const unselectedTags = allTags.filter((tag) => !currentTags.some((tt) => tt.tag.id === tag.id))

  // Generate a random color for each tag for display purposes
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

  return (
    <div className="relative inline-block" ref={menuRef}>
      {/* [SỬA] Div này giờ sẽ bọc cả tag và nút "Add Tag" */}
      <div className="flex flex-wrap items-center gap-1.5">
        {/* 1. Current tags */}
        {currentTags.map(({ tag }) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs"
            style={{
              backgroundColor: `${getTagColor(tag.id)}20`,
              color: getTagColor(tag.id),
            }}
          >
            {tag.name}
            <button
              onClick={() => handleRemoveTag(tag.id)}
              className="hover:opacity-70 transition-opacity"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}

        {/* 2. [DI CHUYỂN] Nút "Add Tag" giờ nằm trong div flex */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-apple text-xs hover:opacity-80 transition-opacity"
          style={{
            backgroundColor: 'var(--surface)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
          }}
        >
          <TagIcon className="h-3.5 w-3.5" />
          Add Tag
        </button>
      </div>{' '}
      {/* [SỬA] Đóng thẻ div flex chung */}
      {/* 3. Dropdown Menu (Nằm bên ngoài div flex, như vậy là đúng) */}
      {isOpen && (
        <div
          className="absolute left-0 bottom-full mb-1 z-50 glass-elevated rounded-apple-lg shadow-apple-lg overflow-hidden"
          style={{ width: '220px', maxHeight: '300px' }}
        >
          <div className="overflow-y-auto" style={{ maxHeight: '250px' }}>
            {unselectedTags.length > 0 ? (
              unselectedTags.map((tag, index) => (
                <button
                  key={tag.id}
                  onClick={() => handleAddTag(tag.id)}
                  className={`w-full px-4 py-3 flex items-center gap-3 hover:opacity-80 transition-opacity ${
                    index !== unselectedTags.length - 1 ? 'border-b' : ''
                  }`}
                  style={{
                    borderColor: 'var(--border)',
                    color: 'var(--text)',
                  }}
                >
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: getTagColor(tag.id) }}
                  />
                  <span className="text-sm truncate">{tag.name}</span>
                </button>
              ))
            ) : (
              <div
                className="px-4 py-3 text-sm text-center"
                style={{ color: 'var(--text-secondary)' }}
              >
                No tags available
              </div>
            )}
          </div>

          {/* Create New Tag */}
          {isCreating ? (
            <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateTag()
                  if (e.key === 'Escape') {
                    setIsCreating(false)
                    setNewTagName('')
                  }
                }}
                placeholder="Tag name..."
                autoFocus
                className="w-full px-2 py-1.5 text-sm rounded"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  outline: 'none',
                }}
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleCreateTag}
                  className="flex-1 px-2 py-1.5 text-xs rounded hover:opacity-80 transition-opacity"
                  style={{
                    backgroundColor: 'var(--primary)',
                    color: 'white',
                  }}
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setIsCreating(false)
                    setNewTagName('')
                  }}
                  className="flex-1 px-2 py-1.5 text-xs rounded hover:opacity-80 transition-opacity"
                  style={{
                    backgroundColor: 'var(--surface)',
                    color: 'var(--text)',
                    border: '1px solid var(--border)',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full px-4 py-3 flex items-center gap-3 hover:opacity-80 transition-opacity border-t"
              style={{
                borderColor: 'var(--border)',
                color: 'var(--text)',
              }}
            >
              <Plus className="h-4 w-4" />
              <span className="text-sm">Create New Tag</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

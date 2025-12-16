import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { formatDistanceToNow } from 'date-fns'
import type { Note } from '@/types/electron'

interface NotesListProps {
  trackId: number
  className?: string
}

export function NotesList({ trackId, className = '' }: NotesListProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [newNoteContent, setNewNoteContent] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null)
  const [editContent, setEditContent] = useState('')

  useEffect(() => {
    loadNotes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackId])

  const loadNotes = async () => {
    try {
      const response = await window.electronAPI.getNotes(trackId)
      if (response.success && response.data) {
        setNotes(response.data)
      }
    } catch (error) {
      console.error('Failed to load notes:', error)
    }
  }

  const handleCreateNote = async () => {
    if (!newNoteContent.trim()) return

    try {
      const response = await window.electronAPI.createNote({
        trackId,
        content: newNoteContent.trim(),
      })
      if (response.success) {
        setNewNoteContent('')
        setIsCreating(false)
        await loadNotes()
      }
    } catch (error) {
      console.error('Failed to create note:', error)
    }
  }

  const handleUpdateNote = async (noteId: number) => {
    if (!editContent.trim()) return

    try {
      const response = await window.electronAPI.updateNote(noteId, {
        content: editContent.trim(),
      })
      if (response.success) {
        setEditingNoteId(null)
        setEditContent('')
        await loadNotes()
      }
    } catch (error) {
      console.error('Failed to update note:', error)
    }
  }

  const handleDeleteNote = async (noteId: number) => {
    try {
      await window.electronAPI.deleteNote(noteId)
      await loadNotes()
    } catch (error) {
      console.error('Failed to delete note:', error)
    }
  }

  const startEdit = (note: Note) => {
    setEditingNoteId(note.id)
    setEditContent(note.content)
  }

  const cancelEdit = () => {
    setEditingNoteId(null)
    setEditContent('')
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
          Notes
        </h3>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsCreating(!isCreating)}
          className="h-7 gap-1"
        >
          <Plus className="h-3 w-3" />
          Add Note
        </Button>
      </div>

      {/* Create Note Form */}
      {isCreating && (
        <div className="space-y-2 p-3 rounded-lg border" style={{ borderColor: 'var(--border)' }}>
          <Textarea
            placeholder="Write a note..."
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            className="min-h-[80px] resize-none"
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setIsCreating(false)
                setNewNoteContent('')
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreateNote}
              disabled={!newNoteContent.trim()}
              style={{ backgroundColor: 'var(--primary)' }}
            >
              Save Note
            </Button>
          </div>
        </div>
      )}

      {/* Notes List */}
      {notes.length === 0 && !isCreating ? (
        <p className="text-sm text-center py-8" style={{ color: 'var(--text-secondary)' }}>
          No notes yet. Click &quot;Add Note&quot; to get started.
        </p>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <div
              key={note.id}
              className="p-3 rounded-lg border"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-subtle)' }}
            >
              {editingNoteId === note.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="min-h-[80px] resize-none"
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-7 w-7 p-0">
                      <X className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleUpdateNote(note.id)}
                      disabled={!editContent.trim()}
                      className="h-7 w-7 p-0"
                      style={{ backgroundColor: 'var(--primary)' }}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm flex-1" style={{ color: 'var(--text)' }}>
                      {note.content}
                    </p>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEdit(note)}
                        className="h-7 w-7 p-0"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteNote(note.id)}
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
                    {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                  </p>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

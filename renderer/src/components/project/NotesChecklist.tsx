import { useEffect, useState } from 'react'
import {
  StickyNote,
  CheckSquare,
  Square,
  Plus,
  Trash2,
  AlertCircle,
  Calendar,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ChecklistItem {
  text: string
  completed: boolean
}

interface ChecklistData {
  notes: string[]
  checklist: ChecklistItem[]
  priority: 'low' | 'medium' | 'high' | null
  deadline: string | null
}

interface NotesChecklistProps {
  projectId: number
  onSave?: () => void
}

export function NotesChecklist({ projectId, onSave }: NotesChecklistProps) {
  const [data, setData] = useState<ChecklistData>({
    notes: [],
    checklist: [],
    priority: null,
    deadline: null,
  })
  const [newNote, setNewNote] = useState('')
  const [newChecklistItem, setNewChecklistItem] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [, setHasChanges] = useState(false)

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const result = await window.electronAPI.getChecklist(projectId)
      if (result.success && result.data) {
        setData(result.data as ChecklistData)
        setHasChanges(false)
      }
    } catch (error) {
      console.error('Failed to load checklist:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const saveData = async (newData: ChecklistData) => {
    setIsSaving(true)
    try {
      const result = await window.electronAPI.updateChecklist(projectId, newData)
      if (result.success) {
        setHasChanges(false)
        onSave?.()
      }
    } catch (error) {
      console.error('Failed to save checklist:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const addNote = () => {
    if (!newNote.trim()) return
    const newData = { ...data, notes: [...data.notes, newNote.trim()] }
    setData(newData)
    setNewNote('')
    setHasChanges(true)
    saveData(newData)
  }

  const removeNote = (index: number) => {
    const newData = { ...data, notes: data.notes.filter((_, i) => i !== index) }
    setData(newData)
    setHasChanges(true)
    saveData(newData)
  }

  const addChecklistItem = () => {
    if (!newChecklistItem.trim()) return
    const newData = {
      ...data,
      checklist: [...data.checklist, { text: newChecklistItem.trim(), completed: false }],
    }
    setData(newData)
    setNewChecklistItem('')
    setHasChanges(true)
    saveData(newData)
  }

  const toggleChecklistItem = (index: number) => {
    const newChecklist = [...data.checklist]
    newChecklist[index] = { ...newChecklist[index], completed: !newChecklist[index].completed }
    const newData = { ...data, checklist: newChecklist }
    setData(newData)
    setHasChanges(true)
    saveData(newData)
  }

  const removeChecklistItem = (index: number) => {
    const newData = { ...data, checklist: data.checklist.filter((_, i) => i !== index) }
    setData(newData)
    setHasChanges(true)
    saveData(newData)
  }

  const updatePriority = (priority: 'low' | 'medium' | 'high' | null) => {
    const newData = { ...data, priority }
    setData(newData)
    setHasChanges(true)
    saveData(newData)
  }

  const updateDeadline = (deadline: string | null) => {
    const newData = { ...data, deadline }
    setData(newData)
    setHasChanges(true)
    saveData(newData)
  }

  const completedCount = data.checklist.filter((item) => item.completed).length
  const totalCount = data.checklist.length
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div
          className="animate-spin rounded-full h-8 w-8 border-b-2"
          style={{ borderColor: 'var(--primary)' }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Priority & Deadline */}
      <div className="glass rounded-apple-lg p-4" style={{ borderColor: 'var(--surface)' }}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Priority:
              </span>
              <div className="flex gap-1">
                {(['low', 'medium', 'high'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => updatePriority(data.priority === p ? null : p)}
                    className="px-2 py-1 text-xs rounded-apple capitalize transition-colors"
                    style={{
                      backgroundColor:
                        data.priority === p
                          ? p === 'high'
                            ? '#ef4444'
                            : p === 'medium'
                              ? '#f59e0b'
                              : '#10b981'
                          : 'var(--surface)',
                      color: data.priority === p ? 'white' : 'var(--text-secondary)',
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
            <input
              type="date"
              value={data.deadline || ''}
              onChange={(e) => updateDeadline(e.target.value || null)}
              className="px-2 py-1 text-sm rounded-apple"
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
              }}
            />
            {data.deadline && (
              <button onClick={() => updateDeadline(null)}>
                <X className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Notes */}
        <div className="glass rounded-apple-lg p-4" style={{ borderColor: 'var(--surface)' }}>
          <h4
            className="text-sm font-medium flex items-center gap-2 mb-4"
            style={{ color: 'var(--text)' }}
          >
            <StickyNote className="h-4 w-4" />
            Notes
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              ({data.notes.length})
            </span>
          </h4>

          <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
            {data.notes.length === 0 ? (
              <p className="text-sm italic" style={{ color: 'var(--text-secondary)' }}>
                No notes yet. Add your first note below.
              </p>
            ) : (
              data.notes.map((note, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-2 rounded-apple group"
                  style={{ backgroundColor: 'var(--surface)' }}
                >
                  <p className="flex-1 text-sm" style={{ color: 'var(--text)' }}>
                    {note}
                  </p>
                  <button
                    onClick={() => removeNote(index)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addNote()}
              placeholder="Add a note..."
              className="flex-1 px-3 py-2 text-sm rounded-apple"
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
              }}
            />
            <Button size="sm" onClick={addNote} disabled={!newNote.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Checklist */}
        <div className="glass rounded-apple-lg p-4" style={{ borderColor: 'var(--surface)' }}>
          <div className="flex items-center justify-between mb-4">
            <h4
              className="text-sm font-medium flex items-center gap-2"
              style={{ color: 'var(--text)' }}
            >
              <CheckSquare className="h-4 w-4" />
              Checklist
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                ({completedCount}/{totalCount})
              </span>
            </h4>
            {totalCount > 0 && (
              <span className="text-xs font-medium" style={{ color: 'var(--primary)' }}>
                {Math.round(progress)}%
              </span>
            )}
          </div>

          {/* Progress bar */}
          {totalCount > 0 && (
            <div
              className="h-1 rounded-full mb-4 overflow-hidden"
              style={{ backgroundColor: 'var(--surface)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%`, backgroundColor: 'var(--primary)' }}
              />
            </div>
          )}

          <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
            {data.checklist.length === 0 ? (
              <p className="text-sm italic" style={{ color: 'var(--text-secondary)' }}>
                No tasks yet. Add your first task below.
              </p>
            ) : (
              data.checklist.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 rounded-apple group"
                  style={{ backgroundColor: 'var(--surface)' }}
                >
                  <button onClick={() => toggleChecklistItem(index)}>
                    {item.completed ? (
                      <CheckSquare className="h-4 w-4" style={{ color: 'var(--primary)' }} />
                    ) : (
                      <Square className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
                    )}
                  </button>
                  <span
                    className={`flex-1 text-sm transition-all ${item.completed ? 'line-through' : ''}`}
                    style={{ color: item.completed ? 'var(--text-secondary)' : 'var(--text)' }}
                  >
                    {item.text}
                  </span>
                  <button
                    onClick={() => removeChecklistItem(index)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newChecklistItem}
              onChange={(e) => setNewChecklistItem(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addChecklistItem()}
              placeholder="Add a task..."
              className="flex-1 px-3 py-2 text-sm rounded-apple"
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
              }}
            />
            <Button size="sm" onClick={addChecklistItem} disabled={!newChecklistItem.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Saving indicator */}
      {isSaving && (
        <div
          className="flex items-center justify-center gap-2 text-sm"
          style={{ color: 'var(--text-secondary)' }}
        >
          <div
            className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent"
            style={{ borderColor: 'var(--primary)' }}
          />
          Saving...
        </div>
      )}
    </div>
  )
}

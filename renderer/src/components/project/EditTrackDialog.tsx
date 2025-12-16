import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { useProjectStore } from '@/store/projectStore'
import type { Track } from '@/types'

interface EditTrackDialogProps {
  isOpen: boolean
  onClose: () => void
  track: Track | null
}

export function EditTrackDialog({ isOpen, onClose, track }: EditTrackDialogProps) {
  const { updateTrack } = useProjectStore()
  const [title, setTitle] = useState(track?.title || '')
  const [type, setType] = useState<Track['type']>(track?.type || 'draft')

  // Suppress unused variable warning - type is for future use
  void type

  if (!isOpen || !track) return null

  const handleSave = async () => {
    await updateTrack(parseInt(track.id, 10), title.trim() || track.title)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

        <div className="relative glass-elevated rounded-apple-xl p-6 w-full max-w-md shadow-apple-lg">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
              Edit Track
            </h2>
            <Button variant="ghost" size="icon" className="rounded-apple" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                Track Name
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 rounded-apple"
                style={{
                  backgroundColor: 'var(--surface)',
                  color: 'var(--text)',
                  border: '1px solid var(--accent)',
                }}
                placeholder="Enter track name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                Track Type
              </label>
              <div className="flex gap-2">
                {(['draft', 'beat', 'final'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className="flex-1 px-4 py-2 rounded-apple font-medium transition-all"
                    style={{
                      backgroundColor: type === t ? 'var(--primary)' : 'var(--surface)',
                      color: type === t ? 'white' : 'var(--text)',
                      border: `1px solid ${type === t ? 'var(--primary)' : 'var(--accent)'}`,
                    }}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 rounded-apple" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="flex-1 rounded-apple"
              style={{ backgroundColor: 'var(--primary)', color: 'white' }}
              onClick={handleSave}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  )
}

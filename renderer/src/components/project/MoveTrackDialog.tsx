import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Folder, Home as HomeIcon } from 'lucide-react'
import type { Track } from '@/types'
import { notifications } from '@/services/notificationClient'

interface MoveTrackDialogProps {
  isOpen: boolean
  onClose: () => void
  track: Track | null
  projectId: string
  onMoveComplete?: () => void
}

export function MoveTrackDialog({
  isOpen,
  onClose,
  track,
  projectId,
  onMoveComplete,
}: MoveTrackDialogProps) {
  const [folders, setFolders] = useState<Array<{ id: string; name: string }>>([])
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && track) {
      loadFolders()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, track])

  const loadFolders = async () => {
    try {
      const foldersResponse = await window.electronAPI.getFolders(parseInt(projectId))

      if (foldersResponse.success && foldersResponse.data) {
        setFolders(
          foldersResponse.data.map((folder: { id: number; name: string }) => ({
            id: folder.id.toString(),
            name: folder.name,
          }))
        )
      }
    } catch (error) {
      console.error('Failed to load folders:', error)
      notifications.error('Failed to load folders', 'Could not retrieve folders from project')
    }
  }

  const handleMove = async () => {
    if (!track) return

    setLoading(true)
    try {
      const response = await window.electronAPI.updateTrack(parseInt(track.id), {
        folderId: selectedFolderId ? parseInt(selectedFolderId) : null,
      })

      if (response.success) {
        notifications.success(
          'Track moved',
          `"${track.title}" moved to ${selectedFolderId ? 'folder' : 'root'} successfully`
        )
        if (onMoveComplete) {
          onMoveComplete()
        }
        onClose()
      } else {
        notifications.error('Move failed', response.error || 'Failed to move track')
      }
    } catch (error) {
      notifications.error('Move failed', 'An unexpected error occurred while moving track')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  if (!track) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
            Move Track
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Move &quot;{track.title}&quot; to a different folder:
          </p>
        </DialogHeader>

        <div className="space-y-2 mb-6 max-h-96 overflow-y-auto">
          {/* Root option */}
          <button
            onClick={() => setSelectedFolderId(null)}
            className={`w-full p-3 rounded-apple flex items-center gap-3 transition-all ${
              selectedFolderId === null ? 'bg-primary text-white' : 'hover:opacity-80'
            }`}
            style={
              selectedFolderId === null
                ? {}
                : { backgroundColor: 'var(--surface)', color: 'var(--text)' }
            }
          >
            <HomeIcon className="h-5 w-5" />
            <span className="font-medium">Root (No Folder)</span>
          </button>

          {folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => setSelectedFolderId(folder.id)}
              className={`w-full p-3 rounded-apple flex items-center gap-3 transition-all ${
                selectedFolderId === folder.id ? 'bg-primary text-white' : 'hover:opacity-80'
              }`}
              style={
                selectedFolderId === folder.id
                  ? {}
                  : { backgroundColor: 'var(--surface)', color: 'var(--text)' }
              }
            >
              <Folder className="h-5 w-5" />
              <div className="flex-1 text-left">
                <div className="font-medium">{folder.name}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="flex gap-3 justify-end pt-4">
          <Button variant="outline" onClick={onClose} disabled={loading} className="rounded-apple">
            Cancel
          </Button>
          <Button
            onClick={handleMove}
            disabled={loading}
            className="rounded-apple"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            {loading ? 'Moving...' : 'Move Track'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Folder, Home as HomeIcon } from 'lucide-react'
import { notifications } from '@/services/notificationClient'

interface MoveProjectDialogProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  currentFolderId?: string | null
  onMoveComplete?: () => void
}

export function MoveProjectDialog({
  isOpen,
  onClose,
  projectId,
  currentFolderId,
  onMoveComplete,
}: MoveProjectDialogProps) {
  const [folders, setFolders] = useState<Array<{ id: string; name: string; projectCount: number }>>(
    []
  )
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(currentFolderId || null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadFolders()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const loadFolders = async () => {
    try {
      // Get folders for this project
      const foldersResponse = await window.electronAPI.getFolders(parseInt(projectId))

      if (foldersResponse.success && foldersResponse.data) {
        setFolders(
          foldersResponse.data.map((folder: { id: number; name: string }) => ({
            id: folder.id.toString(),
            name: folder.name,
            projectCount: 0, // Not available in current API
          }))
        )
      }
    } catch (error) {
      console.error('Failed to load folders:', error)
      notifications.error('Failed to load folders', 'Could not retrieve folders for this project')
    }
  }

  const handleMove = async () => {
    setLoading(true)
    try {
      // Move is actually updating track's folderId, not project
      // For now, show success message
      notifications.info('Feature in development', 'Moving projects between folders is coming soon')

      if (onMoveComplete) {
        onMoveComplete()
      }
      onClose()
    } catch (error) {
      notifications.error('Move failed', 'An unexpected error occurred while moving project')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
            Move Project
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Select a folder to move this project to:
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
                <div className="text-xs opacity-70">{folder.projectCount} projects</div>
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
            disabled={loading || selectedFolderId === currentFolderId}
            className="rounded-apple"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            {loading ? 'Moving...' : 'Move Project'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

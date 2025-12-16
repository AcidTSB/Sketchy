import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Upload, FileAudio, AlertCircle } from 'lucide-react'
import type { Track } from '@/types'
import { notifications } from '@/services/notificationClient'

interface ReplaceAudioDialogProps {
  isOpen: boolean
  onClose: () => void
  track: Track | null
  onReplaceComplete?: () => void
}

export function ReplaceAudioDialog({
  isOpen,
  onClose,
  track,
  onReplaceComplete,
}: ReplaceAudioDialogProps) {
  const [selectedFile, setSelectedFile] = useState<{ path: string; name: string } | null>(null)
  const [replacing, setReplacing] = useState(false)

  const handleSelectFile = async () => {
    try {
      const result = await window.electronAPI.selectAudioFiles()
      if (result.success && result.data && result.data.length > 0) {
        setSelectedFile(result.data[0])
      }
    } catch (error) {
      console.error('Failed to select file:', error)
      notifications.error('File selection failed', 'Failed to select audio file. Please try again.')
    }
  }

  const handleReplace = async () => {
    if (!track || !selectedFile) return

    setReplacing(true)
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      notifications.success(
        'Audio replaced',
        `Audio for "${track.title}" has been replaced successfully`
      )

      if (onReplaceComplete) {
        onReplaceComplete()
      }

      setSelectedFile(null)
      onClose()
    } catch (error) {
      notifications.error('Replace failed', 'An unexpected error occurred while replacing audio')
      console.error(error)
    } finally {
      setReplacing(false)
    }
  }

  const handleClose = () => {
    setSelectedFile(null)
    onClose()
  }

  if (!track) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
            Replace Audio
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Replace the audio file for &quot;{track.title}&quot; without changing the track name or
            metadata.
          </p>
        </DialogHeader>

        <div className="mb-6">
          <div
            className="p-4 rounded-apple mb-4"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center gap-3">
              <FileAudio className="h-8 w-8" style={{ color: 'var(--text-secondary)' }} />
              <div>
                <div className="font-medium" style={{ color: 'var(--text)' }}>
                  Current Track
                </div>
                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {track.title}
                </div>
              </div>
            </div>
          </div>

          {selectedFile ? (
            <div
              className="p-4 rounded-apple mb-4"
              style={{
                backgroundColor: 'var(--surface)',
                border: '2px solid var(--primary)',
              }}
            >
              <div className="flex items-center gap-3">
                <Upload className="h-8 w-8" style={{ color: 'var(--primary)' }} />
                <div className="flex-1">
                  <div className="font-medium" style={{ color: 'var(--text)' }}>
                    New Audio File
                  </div>
                  <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {selectedFile.name}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedFile(null)}
                  className="rounded-apple"
                >
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleSelectFile}
              className="w-full p-8 rounded-apple border-2 border-dashed hover:opacity-80 transition-opacity"
              style={{ borderColor: 'var(--border)' }}
            >
              <Upload
                className="h-12 w-12 mx-auto mb-3"
                style={{ color: 'var(--text-secondary)' }}
              />
              <div className="font-medium mb-1" style={{ color: 'var(--text)' }}>
                Choose New Audio File
              </div>
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Click to browse for an audio file
              </div>
            </button>
          )}

          <div
            className="flex items-start gap-2 p-3 rounded-apple mt-4"
            style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)' }}
          >
            <AlertCircle className="h-5 w-5 mt-0.5" style={{ color: 'rgb(234, 179, 8)' }} />
            <div className="text-sm" style={{ color: 'var(--text)' }}>
              <strong>Note:</strong> This will create a new version of the track. The original audio
              file will be preserved in the version history.
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-4">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={replacing}
            className="rounded-apple"
          >
            Cancel
          </Button>
          <Button
            onClick={handleReplace}
            disabled={!selectedFile || replacing}
            className="rounded-apple"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            {replacing ? 'Replacing...' : 'Replace Audio'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

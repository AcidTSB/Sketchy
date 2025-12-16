import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { notifications } from '@/services/notificationClient'
import { useProjectStore } from '@/store/projectStore'
import type { Track } from '@/types'

interface SplitStemsDialogProps {
  isOpen: boolean
  onClose: () => void
  track: Track | null
}

export function SplitStemsDialog({ isOpen, onClose, track }: SplitStemsDialogProps) {
  const { loadTracks } = useProjectStore()
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentStem, setCurrentStem] = useState('')
  const [extractionId, setExtractionId] = useState<string | null>(null)
  const [selectedStems, setSelectedStems] = useState({
    vocals: true,
    drums: true,
    bass: true,
    other: true,
  })

  // Listen for progress updates
  useEffect(() => {
    if (!isOpen || !track) return

    const unsubscribe = window.electronAPI.onStemProgress((progressData) => {
      if (progressData.trackId === parseInt(track.id)) {
        setProgress(progressData.progress)
        setCurrentStem(progressData.currentStem)

        if (progressData.status === 'complete') {
          setIsProcessing(false)
          notifications.success('Stems Extracted!', `Created ${selectedStems} stem tracks`)
          // Reload tracks to show new stems
          loadTracks(parseInt(track.projectId))
          setTimeout(() => {
            onClose()
            resetState()
          }, 1000)
        } else if (progressData.status === 'error') {
          setIsProcessing(false)

          // Parse error message for user-friendly display
          let errorTitle = 'Extraction Failed'
          let errorMessage = progressData.message || 'Unknown error occurred'

          // Check for common errors
          if (
            errorMessage.includes('Missing required package') ||
            errorMessage.includes('No module named')
          ) {
            errorTitle = 'Demucs Not Installed'
            errorMessage =
              'Please install Demucs first. See STEM_SEPARATION_SETUP.md for instructions.'
          } else if (
            errorMessage.includes('Out of memory') ||
            errorMessage.includes('MemoryError')
          ) {
            errorTitle = 'Insufficient Memory'
            errorMessage = 'Not enough RAM. Close other applications and try a shorter audio file.'
          } else if (errorMessage.includes('exited with code 3221225477')) {
            errorTitle = 'Demucs Installation Error'
            errorMessage =
              'Access violation (0xC0000005). Missing Visual C++ Redistributables or incorrect Python setup. See STEM_SEPARATION_SETUP.md for fix.'
          } else if (errorMessage.includes('Failed to spawn Python')) {
            errorTitle = 'Python Not Found'
            errorMessage =
              'Python is not installed or not in PATH. Install Python 3.8+ and try again.'
          }

          notifications.error(errorTitle, errorMessage)
          resetState()
        }
      }
    })

    return () => {
      unsubscribe()
    }
  }, [isOpen, track, selectedStems, loadTracks, onClose])

  const resetState = () => {
    setProgress(0)
    setCurrentStem('')
    setExtractionId(null)
  }

  if (!isOpen || !track) return null

  const handleSplit = async () => {
    setIsProcessing(true)
    setProgress(0)

    try {
      const stemsToExtract = Object.entries(selectedStems)
        .filter(([_, selected]) => selected)
        .map(([stem, _]) => stem as 'vocals' | 'drums' | 'bass' | 'other')

      if (stemsToExtract.length === 0) {
        notifications.error('No Stems Selected', 'Please select at least one stem to extract')
        setIsProcessing(false)
        return
      }

      const trackId = parseInt(track.id)
      const response = await window.electronAPI.splitStems({
        trackId: trackId,
        stems: stemsToExtract,
        outputFormat: 'wav',
      })

      if (response.success && response.data) {
        setExtractionId(response.data.extractionId)
        notifications.success('Processing Started', 'Extracting stems in background...')
      } else {
        throw new Error(response.error || 'Failed to start extraction')
      }
    } catch (error) {
      console.error('Stem separation error:', error)
      notifications.error(
        'Extraction Failed',
        error instanceof Error ? error.message : 'Failed to start stem extraction'
      )
      setIsProcessing(false)
      resetState()
    }
  }

  const handleCancel = async () => {
    if (extractionId && isProcessing) {
      await window.electronAPI.cancelStemExtraction(extractionId)
      notifications.success('Cancelled', 'Stem extraction cancelled')
    }
    setIsProcessing(false)
    resetState()
    onClose()
  }

  const toggleStem = (stem: keyof typeof selectedStems) => {
    setSelectedStems((prev) => ({ ...prev, [stem]: !prev[stem] }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

        <div className="relative glass-elevated rounded-apple-xl p-6 w-full max-w-md shadow-apple-lg">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
              Split into Stems
            </h2>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-apple"
              onClick={onClose}
              disabled={isProcessing}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="mb-6">
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              Separate{' '}
              <span className="font-medium" style={{ color: 'var(--text)' }}>
                {track.title}
              </span>{' '}
              into individual stems using AI
            </p>

            <div className="space-y-3">
              {Object.entries(selectedStems).map(([stem, selected]) => (
                <label
                  key={stem}
                  className="flex items-center gap-3 p-3 rounded-apple cursor-pointer transition-colors"
                  style={{ backgroundColor: selected ? 'var(--primary)20' : 'var(--surface)' }}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleStem(stem as keyof typeof selectedStems)}
                    className="w-5 h-5 rounded"
                    style={{ accentColor: 'var(--primary)' }}
                    disabled={isProcessing}
                  />
                  <div className="flex-1">
                    <p className="font-medium" style={{ color: 'var(--text)' }}>
                      {stem.charAt(0).toUpperCase() + stem.slice(1)}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {stem === 'vocals' && 'Isolate vocal tracks'}
                      {stem === 'drums' && 'Isolate percussion and drums'}
                      {stem === 'bass' && 'Isolate bass frequencies'}
                      {stem === 'other' && 'All other instruments'}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {isProcessing && (
            <div className="mb-4 p-4 rounded-apple" style={{ backgroundColor: 'var(--surface)' }}>
              <div className="flex items-center gap-3 mb-3">
                <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--primary)' }} />
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                    Processing stems... {progress}%
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {currentStem || 'Initializing...'}
                  </p>
                </div>
              </div>
              {/* Progress bar */}
              <div
                className="w-full h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: 'var(--surface)' }}
              >
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${progress}%`,
                    backgroundColor: 'var(--primary)',
                  }}
                />
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 rounded-apple"
              onClick={handleCancel}
              disabled={isProcessing}
            >
              {isProcessing ? 'Cancel' : 'Close'}
            </Button>
            <Button
              className="flex-1 rounded-apple"
              style={{ backgroundColor: 'var(--primary)', color: 'white' }}
              onClick={handleSplit}
              disabled={isProcessing || !Object.values(selectedStems).some(Boolean)}
            >
              {isProcessing ? 'Processing...' : 'Split Stems'}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  )
}

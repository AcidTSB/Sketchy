import { useState, useEffect } from 'react'
import { Upload, X, FileAudio } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { ImportProgress } from '@/types/electron'
import { notifications } from '@/services/notificationClient'

interface ImportAudioDialogProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  onImportComplete?: () => void
}

export function ImportAudioDialog({
  isOpen,
  onClose,
  projectId,
  onImportComplete,
}: ImportAudioDialogProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<{ path: string; name: string }[]>([])
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState<Record<string, ImportProgress>>({})
  const [currentImportId, setCurrentImportId] = useState<string | null>(null)

  // Setup progress listener
  useEffect(() => {
    if (!currentImportId) return

    const unsubscribe = window.electronAPI.onImportProgress((data: ImportProgress) => {
      if (data.importId === currentImportId) {
        setProgress((prev) => {
          const newProgress = {
            ...prev,
            [data.file]: data,
          }

          // Check if all files are done
          const allDone = selectedFiles.every(
            (f) => newProgress[f.name]?.status === 'done' || newProgress[f.name]?.status === 'error'
          )

          if (allDone) {
            const successCount = selectedFiles.filter(
              (f) => newProgress[f.name]?.status === 'done'
            ).length
            const errorCount = selectedFiles.filter(
              (f) => newProgress[f.name]?.status === 'error'
            ).length

            setTimeout(() => {
              setImporting(false)
              setSelectedFiles([])
              setProgress({})
              setCurrentImportId(null)
              onClose()

              // Show success/error notification
              if (errorCount === 0) {
                notifications.success(
                  'Import completed',
                  `${successCount} file${successCount > 1 ? 's' : ''} imported successfully`
                )
              } else if (successCount === 0) {
                notifications.error(
                  'Import failed',
                  `Failed to import ${errorCount} file${errorCount > 1 ? 's' : ''}`
                )
              } else {
                notifications.warning(
                  'Import completed with errors',
                  `${successCount} succeeded, ${errorCount} failed`
                )
              }

              // Trigger parent to refetch tracks
              if (onImportComplete) {
                onImportComplete()
              }
            }, 500)
          }

          return newProgress
        })
      }
    })

    return () => {
      unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentImportId, selectedFiles, onClose])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files).filter((file) =>
      /\.(mp3|wav|flac|m4a)$/i.test(file.name)
    )

    // Get file paths from Electron
    setSelectedFiles(
      files.map((f) => ({
        path: (f as { path?: string }).path || f.name,
        name: f.name,
      }))
    )
  }

  const handleFileSelect = async () => {
    try {
      const response = await window.electronAPI.selectAudioFiles()

      if (response.success && response.data) {
        setSelectedFiles(response.data)
      }
    } catch (error) {
      console.error('Failed to select files:', error)
      notifications.error(
        'File selection failed',
        'Failed to select audio files. Please try again.'
      )
    }
  }

  const handleImport = async () => {
    if (selectedFiles.length === 0) return

    setImporting(true)
    setProgress({})

    try {
      const response = await window.electronAPI.importFiles({
        projectId: parseInt(projectId),
        files: selectedFiles,
        storageMode: 'copy',
      })

      if (response.success && response.data) {
        const { importId } = response.data
        setCurrentImportId(importId)
      } else {
        setImporting(false)
        notifications.error('Import failed', response.error || 'Failed to import audio files')
      }
    } catch (error) {
      setImporting(false)
      notifications.error('Import failed', 'An unexpected error occurred while importing files')
    }
  }

  const removeFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index))
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

        {/* Dialog */}
        <div
          className="relative glass-elevated rounded-apple-xl p-6 w-full max-w-lg shadow-apple-lg"
          style={{ maxHeight: '80vh' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
              Import Audio Files
            </h2>
            <Button variant="ghost" size="icon" className="rounded-apple" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-apple-lg p-8 mb-4 transition-colors ${
              isDragging ? 'border-primary bg-primary/10' : 'border-surface'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center gap-4">
              <Upload className="h-12 w-12" style={{ color: 'var(--text-secondary)' }} />
              <div className="text-center">
                <p className="font-medium mb-1" style={{ color: 'var(--text)' }}>
                  Drag & drop audio files here
                </p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Supports MP3, WAV, FLAC, M4A
                </p>
              </div>
              <Button
                variant="outline"
                className="rounded-apple"
                onClick={handleFileSelect}
                type="button"
              >
                Browse Files
              </Button>
            </div>
          </div>

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div className="mb-6">
              <p className="text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                Selected Files ({selectedFiles.length})
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedFiles.map((file, index) => {
                  const fileProgress = progress[file.name]
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-apple"
                      style={{ backgroundColor: 'var(--surface)' }}
                    >
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <FileAudio className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
                        <p
                          className="text-sm font-medium truncate"
                          style={{ color: 'var(--text)' }}
                        >
                          {file.name}
                        </p>
                      </div>
                      {fileProgress ? (
                        <span className="text-xs ml-2" style={{ color: 'var(--text-secondary)' }}>
                          {fileProgress.status === 'done'
                            ? '✓'
                            : fileProgress.status === 'error'
                              ? '✗'
                              : `${fileProgress.progress}%`}
                        </span>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-apple"
                          onClick={() => removeFile(index)}
                          disabled={importing}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 rounded-apple"
              onClick={onClose}
              disabled={importing}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 rounded-apple"
              style={{ backgroundColor: 'var(--primary)', color: 'white' }}
              onClick={handleImport}
              disabled={selectedFiles.length === 0 || importing}
            >
              {importing
                ? 'Importing...'
                : `Import ${selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}`}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  )
}

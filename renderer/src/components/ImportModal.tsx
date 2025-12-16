import { useState, useCallback } from 'react'
import { X, Upload, File } from 'lucide-react'
import { ImportProgress } from '../types/electron'
import { useAnalyticsStore } from '@/store/analyticsStore'

interface ImportModalProps {
  projectId: number
  folderId?: number
  onClose: () => void
  onSuccess: () => void
}

export default function ImportModal({ projectId, folderId, onClose, onSuccess }: ImportModalProps) {
  const [storageMode, setStorageMode] = useState<'copy' | 'reference'>('copy')
  const [selectedFiles, setSelectedFiles] = useState<{ path: string; name: string; file?: File }[]>(
    []
  )
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState<Record<string, ImportProgress>>({})
  const { trackActivity } = useAnalyticsStore()
  const handleFileSelect = async () => {
    try {
      const response = await window.electronAPI.selectAudioFiles()

      if (response.success && response.data) {
        setSelectedFiles(
          response.data.map((f: { path: string; name: string }) => ({
            path: f.path,
            name: f.name,
            file: undefined, // No File object when using dialog
          }))
        )
      }
    } catch (error) {
      console.error('Failed to select files:', error)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    const audioFiles = files.filter(
      (f) =>
        f.type.startsWith('audio/') ||
        f.name.endsWith('.mp3') ||
        f.name.endsWith('.wav') ||
        f.name.endsWith('.flac')
    )
    // For web/Electron, we need to handle files differently
    // In Electron, files have a 'path' property accessible via file.path
    setSelectedFiles(
      audioFiles.map((f) => ({
        path: (f as { path?: string }).path || URL.createObjectURL(f),
        name: f.name,
        file: f, // Store the actual File object for later use
      }))
    )
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleImport = async () => {
    if (selectedFiles.length === 0) return

    setImporting(true)
    try {
      const response = await window.electronAPI.importFiles({
        projectId,
        folderId,
        files: selectedFiles.map((f) => ({ path: f.path, name: f.name })),
        storageMode,
      })

      if (response.success && response.data) {
        const { importId } = response.data

        // Listen for progress
        window.electronAPI.onImportProgress((data: ImportProgress) => {
          if (data.importId === importId) {
            setProgress((prev) => ({
              ...prev,
              [data.file]: data,
            }))

            // Check if all done
            const allProgress = { ...progress, [data.file]: data }
            const allDone = selectedFiles.every(
              (f) =>
                allProgress[f.name]?.status === 'done' || allProgress[f.name]?.status === 'error'
            )

            if (allDone) {
              // Track import activity
              const successCount = Object.values(allProgress).filter(
                (p) => p.status === 'done'
              ).length
              if (successCount > 0) {
                trackActivity('import', undefined, projectId, {
                  filesCount: successCount,
                  storageMode,
                })
              }

              setTimeout(() => {
                setImporting(false)
                onSuccess()
              }, 500)
            }
          }
        })
      }
    } catch (error) {
      console.error('Import failed:', error)
      setImporting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div
        className="glass-elevated rounded-apple-lg w-full max-w-2xl max-h-[80vh] flex flex-col"
        style={{ borderColor: 'var(--surface)' }}
      >
        <div
          className="p-6 border-b flex justify-between items-center"
          style={{ borderColor: 'var(--surface)' }}
        >
          <h3 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
            Import Audio Files
          </h3>
          <button onClick={onClose} className="p-1 hover:opacity-70 rounded-apple transition">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
              Storage Mode
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2" style={{ color: 'var(--text)' }}>
                <input
                  type="radio"
                  value="copy"
                  checked={storageMode === 'copy'}
                  onChange={(e) => setStorageMode(e.target.value as 'copy')}
                  className="w-4 h-4"
                  style={{ accentColor: 'var(--primary)' }}
                />
                <span>Copy files (recommended)</span>
              </label>
              <label className="flex items-center gap-2" style={{ color: 'var(--text)' }}>
                <input
                  type="radio"
                  value="reference"
                  checked={storageMode === 'reference'}
                  onChange={(e) => setStorageMode(e.target.value as 'reference')}
                  className="w-4 h-4"
                  style={{ accentColor: 'var(--primary)' }}
                />
                <span>Reference only</span>
              </label>
            </div>
          </div>

          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="border-2 border-dashed rounded-apple-lg p-12 text-center hover:opacity-80 transition"
            style={{ borderColor: 'var(--accent)' }}
          >
            <Upload className="mx-auto mb-4" style={{ color: 'var(--text-secondary)' }} size={48} />
            <p className="text-lg mb-2" style={{ color: 'var(--text)' }}>
              Drag & drop audio files here
            </p>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              Supports MP3, WAV, FLAC and more
            </p>
            <button
              type="button"
              onClick={handleFileSelect}
              className="px-6 py-2 rounded-apple hover:opacity-90 transition-smooth"
              style={{ backgroundColor: 'var(--primary)', color: 'white' }}
            >
              Browse Files
            </button>
          </div>

          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium" style={{ color: 'var(--text)' }}>
                Selected Files ({selectedFiles.length})
              </h4>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {selectedFiles.map((file, index) => {
                  const fileProgress = progress[file.name]
                  return (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-2 surface-subtle rounded-apple"
                    >
                      <File size={16} />
                      <span className="flex-1 text-sm truncate" style={{ color: 'var(--text)' }}>
                        {file.name}
                      </span>
                      {fileProgress && (
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {fileProgress.status === 'done'
                            ? '✓'
                            : fileProgress.status === 'error'
                              ? '✗'
                              : `${fileProgress.progress}%`}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div
          className="p-6 border-t flex justify-end gap-3"
          style={{ borderColor: 'var(--surface)' }}
        >
          <button
            onClick={onClose}
            disabled={importing}
            className="px-4 py-2 surface-subtle hover:opacity-80 rounded-apple transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={selectedFiles.length === 0 || importing}
            className="px-4 py-2 rounded-apple transition disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            {importing ? 'Importing...' : `Import ${selectedFiles.length} file(s)`}
          </button>
        </div>
      </div>
    </div>
  )
}

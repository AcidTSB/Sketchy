import { useEffect, useState } from 'react'
import {
  Download,
  Upload,
  Archive,
  Trash2,
  Clock,
  HardDrive,
  Shield,
  FolderOpen,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Backup {
  id: number
  name: string
  backupPath: string
  sizeBytes?: number | null
  isAutomatic: boolean
  createdAt: string
  metadata?: {
    projectName: string
    trackCount: number
    version: string
  }
}

interface BackupManagerProps {
  projectId: number
  projectName: string
  onImportComplete?: () => void
}

export function BackupManager({ projectId, onImportComplete }: BackupManagerProps) {
  const [backups, setBackups] = useState<Backup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isCreatingAutoBackup, setIsCreatingAutoBackup] = useState(false)

  useEffect(() => {
    loadBackups()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const loadBackups = async () => {
    setIsLoading(true)
    try {
      const result = await window.electronAPI.getBackups(projectId)
      if (result.success && result.data) {
        setBackups(result.data as Backup[])
      }
    } catch (error) {
      console.error('Failed to load backups:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const result = await window.electronAPI.exportProject(projectId)
      if (result.success && result.data) {
        alert(`Project exported successfully!\nPath: ${result.data.path}`)
        loadBackups()
      } else {
        alert('Failed to export project: ' + result.error)
      }
    } catch (error) {
      console.error('Failed to export project:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleImport = async () => {
    setIsImporting(true)
    try {
      // Open file dialog to select backup file
      const result = await window.electronAPI.showOpenDialog({
        title: 'Select Backup File',
        filters: [{ name: 'Backup Files', extensions: ['zip'] }],
        properties: ['openFile'],
      })

      if (result.canceled || !result.filePaths.length) {
        setIsImporting(false)
        return
      }

      const importResult = await window.electronAPI.importProject(result.filePaths[0])
      if (importResult.success) {
        alert('Project imported successfully!')
        onImportComplete?.()
      } else {
        alert('Failed to import project: ' + importResult.error)
      }
    } catch (error) {
      console.error('Failed to import project:', error)
    } finally {
      setIsImporting(false)
    }
  }

  const handleAutoBackup = async () => {
    setIsCreatingAutoBackup(true)
    try {
      const result = await window.electronAPI.createAutoBackup(projectId)
      if (result.success) {
        alert('Auto backup created successfully!')
        loadBackups()
      } else {
        alert('Failed to create auto backup: ' + result.error)
      }
    } catch (error) {
      console.error('Failed to create auto backup:', error)
    } finally {
      setIsCreatingAutoBackup(false)
    }
  }

  const handleDeleteBackup = async (backupId: number) => {
    if (!confirm('Delete this backup? This cannot be undone.')) return

    try {
      const result = await window.electronAPI.deleteBackup(backupId)
      if (result.success) {
        loadBackups()
      } else {
        alert('Failed to delete backup: ' + result.error)
      }
    } catch (error) {
      console.error('Failed to delete backup:', error)
    }
  }

  const handleOpenBackupFolder = async (backupPath: string) => {
    try {
      await window.electronAPI.showItemInFolder(backupPath)
    } catch (error) {
      console.error('Failed to open folder:', error)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString()
  }

  const formatSize = (bytes?: number | null) => {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }

  const totalSize = backups.reduce((acc, b) => acc + (b.sizeBytes || 0), 0)

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
      {/* Header & Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3
            className="text-lg font-semibold flex items-center gap-2"
            style={{ color: 'var(--text)' }}
          >
            <Archive className="h-5 w-5" />
            Backup & Export
          </h3>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {backups.length} backup{backups.length !== 1 ? 's' : ''} • {formatSize(totalSize)} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleImport}
            disabled={isImporting}
            className="gap-2"
          >
            {isImporting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Import
          </Button>
          <Button size="sm" onClick={handleExport} disabled={isExporting} className="gap-2">
            {isExporting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div
        className="glass rounded-apple-lg p-4 grid grid-cols-3 gap-4"
        style={{ borderColor: 'var(--surface)' }}
      >
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="p-4 rounded-apple text-center transition-colors hover:bg-opacity-80"
          style={{ backgroundColor: 'var(--surface)' }}
        >
          <Download className="h-8 w-8 mx-auto mb-2" style={{ color: 'var(--primary)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
            Export Project
          </span>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            Create ZIP backup
          </p>
        </button>

        <button
          onClick={handleAutoBackup}
          disabled={isCreatingAutoBackup}
          className="p-4 rounded-apple text-center transition-colors hover:bg-opacity-80"
          style={{ backgroundColor: 'var(--surface)' }}
        >
          <Shield className="h-8 w-8 mx-auto mb-2" style={{ color: 'var(--accent)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
            Auto Backup
          </span>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            Quick local backup
          </p>
        </button>

        <button
          onClick={handleImport}
          disabled={isImporting}
          className="p-4 rounded-apple text-center transition-colors hover:bg-opacity-80"
          style={{ backgroundColor: 'var(--surface)' }}
        >
          <Upload className="h-8 w-8 mx-auto mb-2" style={{ color: 'var(--text-secondary)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
            Import Project
          </span>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            Restore from ZIP
          </p>
        </button>
      </div>

      {/* Backup List */}
      <div className="glass rounded-apple-lg" style={{ borderColor: 'var(--surface)' }}>
        <div className="p-4 border-b" style={{ borderColor: 'var(--surface)' }}>
          <h4 className="text-sm font-medium" style={{ color: 'var(--text)' }}>
            Backup History
          </h4>
        </div>

        {backups.length === 0 ? (
          <div className="p-8 text-center">
            <HardDrive
              className="h-12 w-12 mx-auto mb-4 opacity-50"
              style={{ color: 'var(--text-secondary)' }}
            />
            <h5 className="font-medium mb-2" style={{ color: 'var(--text)' }}>
              No Backups Yet
            </h5>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              Create your first backup to protect your work
            </p>
            <Button onClick={handleExport} disabled={isExporting} className="gap-2">
              <Download className="h-4 w-4" />
              Create First Backup
            </Button>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--surface)' }}>
            {backups.map((backup) => (
              <div
                key={backup.id}
                className="p-4 flex items-center justify-between hover:bg-opacity-50 transition-colors"
                style={{ backgroundColor: 'transparent' }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="h-10 w-10 rounded-apple flex items-center justify-center"
                    style={{
                      backgroundColor: backup.isAutomatic ? '#3b82f620' : '#10b98120',
                    }}
                  >
                    {backup.isAutomatic ? (
                      <Shield className="h-5 w-5" style={{ color: '#3b82f6' }} />
                    ) : (
                      <Archive className="h-5 w-5" style={{ color: '#10b981' }} />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium" style={{ color: 'var(--text)' }}>
                        {backup.name}
                      </span>
                      {backup.isAutomatic && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: '#3b82f620', color: '#3b82f6' }}
                        >
                          Auto
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span
                        className="flex items-center gap-1 text-xs"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        <Clock className="h-3 w-3" />
                        {formatDate(backup.createdAt)}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {formatSize(backup.sizeBytes)}
                      </span>
                      {backup.metadata && (
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {backup.metadata.trackCount} tracks
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenBackupFolder(backup.backupPath)}
                    title="Open in folder"
                  >
                    <FolderOpen className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteBackup(backup.id)}
                    className="text-red-500 hover:text-red-600"
                    title="Delete backup"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Storage Info */}
      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
        <AlertCircle className="h-4 w-4" />
        Backups are stored locally. Export to a separate drive for extra protection.
      </div>
    </div>
  )
}

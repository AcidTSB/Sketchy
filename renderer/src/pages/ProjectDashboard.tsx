import React, { useEffect, useState } from 'react'
import {
  Clock,
  Save,
  Music,
  Settings,
  CheckSquare,
  FileText,
  Download,
  Upload,
  Wand2,
  GitBranch,
  ArrowLeft,
} from 'lucide-react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { VersionTimeline } from '../components/project/VersionTimeline'
import { NotesChecklist } from '../components/project/NotesChecklist'
import { MetadataEditor } from '../components/project/MetadataEditor'
import { useProjectStore } from '@/store/projectStore'

interface DashboardStats {
  totalTracks: number
  totalVersions: number
  totalSnapshots: number
  totalBackups: number
  lastBackup: string | null
}

export default function ProjectDashboard() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const projectId = parseInt(id || '0')

  const { currentProject, loadProject } = useProjectStore()
  const [stats, setStats] = useState<DashboardStats>({
    totalTracks: 0,
    totalVersions: 0,
    totalSnapshots: 0,
    totalBackups: 0,
    lastBackup: null,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'versions' | 'checklist' | 'metadata'>(
    'overview'
  )

  useEffect(() => {
    if (projectId) {
      loadProjectData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const loadProjectData = async () => {
    setIsLoading(true)
    try {
      await loadProject(projectId)

      // Load additional stats
      const [snapshotsRes, backupsRes] = await Promise.all([
        window.electronAPI.getProjectSnapshots(projectId),
        window.electronAPI.getBackups(projectId),
      ])

      setStats({
        totalTracks: currentProject?.tracks?.length || 0,
        totalVersions: 0, // Will be calculated from tracks
        totalSnapshots: snapshotsRes.success && snapshotsRes.data ? snapshotsRes.data.length : 0,
        totalBackups: backupsRes.success && backupsRes.data ? backupsRes.data.length : 0,
        lastBackup:
          backupsRes.success && backupsRes.data && backupsRes.data[0]
            ? new Date(backupsRes.data[0].createdAt).toLocaleString()
            : null,
      })
    } catch (error) {
      console.error('Failed to load project data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateSnapshot = async () => {
    const name = prompt('Enter snapshot name:', `Snapshot ${new Date().toLocaleDateString()}`)
    if (!name) return

    try {
      const result = await window.electronAPI.createProjectSnapshot(projectId, name)
      if (result.success) {
        alert('Snapshot created successfully!')
        loadProjectData()
      } else {
        alert('Failed to create snapshot: ' + result.error)
      }
    } catch (error) {
      console.error('Failed to create snapshot:', error)
    }
  }

  const handleExportProject = async () => {
    try {
      const result = await window.electronAPI.exportProject(projectId)
      if (result.success && result.data) {
        alert(`Project exported to: ${result.data.path}`)
        loadProjectData()
      } else {
        alert('Failed to export project: ' + result.error)
      }
    } catch (error) {
      console.error('Failed to export project:', error)
    }
  }

  const handleOrganizeProject = async () => {
    try {
      const confirmMessage = `This will automatically organize tracks into folders based on their names (drums, vocals, bass, etc.).\n\nContinue?`

      if (!confirm(confirmMessage)) return

      const result = await window.electronAPI.organizeProject(projectId)
      if (result.success && result.data) {
        const movedCount = result.data.moved?.length || 0
        const createdCount = result.data.created?.length || 0
        alert(`Organized ${movedCount} tracks into ${createdCount} folders!`)
        loadProjectData()
      } else {
        alert('Failed to organize project: ' + result.error)
      }
    } catch (error) {
      console.error('Failed to organize project:', error)
    }
  }

  const handleAutoBackup = async () => {
    try {
      const result = await window.electronAPI.createAutoBackup(projectId)
      if (result.success) {
        alert('Auto backup created!')
        loadProjectData()
      } else {
        alert('Failed to create backup: ' + result.error)
      }
    } catch (error) {
      console.error('Failed to create backup:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2"
          style={{ borderColor: 'var(--primary)' }}
        />
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-10 glass border-b px-6 py-4"
        style={{ borderColor: 'var(--surface)' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/project/${projectId}`)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Project
            </Button>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
                {currentProject?.title || 'Project'} Dashboard
              </h1>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Manage versions, notes, and metadata
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mt-4">
          {[
            { id: 'overview', label: 'Overview', icon: Settings },
            { id: 'versions', label: 'Versions', icon: GitBranch },
            { id: 'checklist', label: 'Checklist', icon: CheckSquare },
            { id: 'metadata', label: 'Metadata', icon: FileText },
          ].map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className="gap-2"
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={Music} label="Tracks" value={stats.totalTracks} color="#3b82f6" />
              <StatCard
                icon={GitBranch}
                label="Snapshots"
                value={stats.totalSnapshots}
                color="#8b5cf6"
              />
              <StatCard icon={Save} label="Backups" value={stats.totalBackups} color="#10b981" />
              <StatCard
                icon={Clock}
                label="Last Backup"
                value={stats.lastBackup || 'Never'}
                isText
                color="#f59e0b"
              />
            </div>

            {/* Quick Actions */}
            <div className="glass rounded-apple-lg p-6" style={{ borderColor: 'var(--surface)' }}>
              <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>
                Quick Actions
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <ActionButton
                  icon={Save}
                  label="Create Snapshot"
                  onClick={handleCreateSnapshot}
                  color="#8b5cf6"
                />
                <ActionButton
                  icon={Download}
                  label="Export Project"
                  onClick={handleExportProject}
                  color="#3b82f6"
                />
                <ActionButton
                  icon={Wand2}
                  label="Auto Organize"
                  onClick={handleOrganizeProject}
                  color="#10b981"
                />
                <ActionButton
                  icon={Upload}
                  label="Quick Backup"
                  onClick={handleAutoBackup}
                  color="#f59e0b"
                />
              </div>
            </div>

            {/* Recent Activity */}
            <div className="glass rounded-apple-lg p-6" style={{ borderColor: 'var(--surface)' }}>
              <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>
                Project Info
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    BPM
                  </p>
                  <p className="text-lg font-medium" style={{ color: 'var(--text)' }}>
                    {currentProject?.bpm || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Key
                  </p>
                  <p className="text-lg font-medium" style={{ color: 'var(--text)' }}>
                    {currentProject?.musicalKey || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Mood
                  </p>
                  <p className="text-lg font-medium" style={{ color: 'var(--text)' }}>
                    {currentProject?.mood || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Genre
                  </p>
                  <p className="text-lg font-medium" style={{ color: 'var(--text)' }}>
                    {currentProject?.genre || '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'versions' && <VersionTimeline projectId={projectId} />}

        {activeTab === 'checklist' && <NotesChecklist projectId={projectId} />}

        {activeTab === 'metadata' && (
          <MetadataEditor projectId={projectId} onSave={loadProjectData} />
        )}
      </div>
    </div>
  )
}

// Sub-components
function StatCard({
  icon: Icon,
  label,
  value,
  color,
  isText = false,
}: {
  icon: React.ElementType
  label: string
  value: number | string
  color: string
  isText?: boolean
}) {
  return (
    <div className="glass rounded-apple-lg p-4" style={{ borderColor: 'var(--surface)' }}>
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-apple flex items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        <div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {label}
          </p>
          <p
            className={`font-semibold ${isText ? 'text-sm' : 'text-xl'}`}
            style={{ color: 'var(--text)' }}
          >
            {value}
          </p>
        </div>
      </div>
    </div>
  )
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  color,
}: {
  icon: React.ElementType
  label: string
  onClick: () => void
  color: string
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-4 rounded-apple transition-all hover:scale-105"
      style={{ backgroundColor: `${color}10`, border: `1px solid ${color}30` }}
    >
      <Icon className="h-6 w-6" style={{ color }} />
      <span className="text-sm font-medium" style={{ color }}>
        {label}
      </span>
    </button>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Folder, Trash2, Edit2 } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useToast } from '../components/Toast'

export default function ProjectsPage() {
  const navigate = useNavigate()
  const { projects, setProjects, setLoading, setError } = useStore()
  const toast = useToast()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDesc, setNewProjectDesc] = useState('')

  useEffect(() => {
    loadProjects()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadProjects = async () => {
    setLoading(true)
    try {
      const response = await window.electronAPI.getProjects()
      if (response.success && response.data) {
        setProjects(response.data)
      } else {
        const errorMsg = response.error || 'Failed to load projects'
        setError(errorMsg)
        toast.error(errorMsg)
      }
    } catch (error) {
      const errorMsg = 'Failed to load projects'
      setError(errorMsg)
      toast.error(errorMsg)
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return

    setLoading(true)
    try {
      const response = await window.electronAPI.createProject({
        name: newProjectName,
        description: newProjectDesc || undefined,
      })

      if (response.success && response.data) {
        setShowCreateModal(false)
        setNewProjectName('')
        setNewProjectDesc('')
        await loadProjects()
        toast.success(`Project "${newProjectName}" created successfully!`)
      } else {
        const errorMsg = response.error || 'Failed to create project'
        setError(errorMsg)
        toast.error(errorMsg)
      }
    } catch (error) {
      const errorMsg = 'Failed to create project'
      setError(errorMsg)
      toast.error(errorMsg)
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteProject = async (id: number, event: React.MouseEvent) => {
    event.stopPropagation()
    if (!confirm('Are you sure you want to delete this project?')) return

    setLoading(true)
    try {
      const response = await window.electronAPI.deleteProject(id)
      if (response.success) {
        await loadProjects()
        toast.success('Project deleted successfully!')
      } else {
        const errorMsg = response.error || 'Failed to delete project'
        setError(errorMsg)
        toast.error(errorMsg)
      }
    } catch (error) {
      const errorMsg = 'Failed to delete project'
      setError(errorMsg)
      toast.error(errorMsg)
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>
          Projects
        </h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-apple transition hover:opacity-90"
          style={{ backgroundColor: 'var(--primary)' }}
        >
          <Plus size={20} />
          New Project
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <div
            key={project.id}
            onClick={() => navigate(`/project/${project.id}`)}
            className="surface-subtle rounded-apple-lg p-6 cursor-pointer hover:opacity-80 transition"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <Folder size={24} style={{ color: 'var(--primary)' }} />
                <h3 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
                  {project.name}
                </h3>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    // TODO: Implement edit
                  }}
                  className="p-1 hover:opacity-70 rounded-apple transition"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={(e) => handleDeleteProject(project.id, e)}
                  className="p-1 hover:opacity-70 rounded-apple transition text-red-400"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            {project.description && (
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                {project.description}
              </p>
            )}
            <div className="flex gap-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <span>{project.folders?.length || 0} folders</span>
              <span>{project.tracks?.length || 0} tracks</span>
            </div>
          </div>
        ))}
      </div>

      {showCreateModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        >
          <div
            className="glass-elevated rounded-apple-lg p-6 w-full max-w-md"
            style={{ borderColor: 'var(--surface)' }}
          >
            <h3 className="text-2xl font-bold mb-4" style={{ color: 'var(--text)' }}>
              Create New Project
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                  Project Name
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-3 py-2 surface-subtle rounded-apple focus:outline-none focus:ring-2"
                  style={{ '--tw-ring-color': 'var(--primary)' } as React.CSSProperties}
                  placeholder="My Project"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                  Description (optional)
                </label>
                <textarea
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  className="w-full px-3 py-2 surface-subtle rounded-apple focus:outline-none focus:ring-2"
                  style={{ '--tw-ring-color': 'var(--primary)' } as React.CSSProperties}
                  rows={3}
                  placeholder="Project description..."
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    setNewProjectName('')
                    setNewProjectDesc('')
                  }}
                  className="px-4 py-2 surface-subtle hover:opacity-80 rounded-apple transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateProject}
                  disabled={!newProjectName.trim()}
                  className="px-4 py-2 rounded-apple transition disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                  style={{ backgroundColor: 'var(--primary)' }}
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

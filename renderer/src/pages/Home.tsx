import { Grid, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProjectCard } from '@/components/project/ProjectCard'
import { useProjectStore } from '@/store/projectStore'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'

export function Home() {
  const navigate = useNavigate()
  const { projects, loadProjects, loading } = useProjectStore()
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Load projects on mount - force reload every time
  useEffect(() => {
    // Always reload to ensure fresh data (important after F5 refresh)
    loadProjects().catch(console.error)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="h-full flex flex-col">
      {/* Page Header with View Toggle */}
      <div
        className="glass border-b px-8 py-6 backdrop-blur-apple"
        style={{ borderColor: 'var(--surface)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text)' }}>
              Library
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              {projects.length} {projects.length === 1 ? 'project' : 'projects'}
            </p>
          </div>

          {/* View Mode Toggle - Non-draggable */}
          <div className="flex glass rounded-apple p-1 shadow-apple-sm non-draggable">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-9 w-9 rounded-apple transition-smooth',
                viewMode === 'grid' && 'shadow-apple-sm'
              )}
              style={viewMode === 'grid' ? { backgroundColor: 'var(--card)' } : {}}
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-9 w-9 rounded-apple transition-smooth',
                viewMode === 'list' && 'shadow-apple-sm'
              )}
              style={viewMode === 'list' ? { backgroundColor: 'var(--card)' } : {}}
              onClick={() => setViewMode('list')}
            >
              <List className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Projects Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div
              className="animate-spin rounded-full h-12 w-12 border-b-2"
              style={{ borderColor: 'var(--primary)' }}
            ></div>
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 glass rounded-apple-lg flex items-center justify-center mb-4 shadow-apple">
              <Grid className="h-10 w-10" style={{ color: 'var(--text-secondary)' }} />
            </div>
            <h2 className="text-2xl font-semibold mb-2" style={{ color: 'var(--text)' }}>
              No projects yet
            </h2>
            <p className="mb-6 max-w-sm" style={{ color: 'var(--text-secondary)' }}>
              Create your first project to start organizing your audio files
            </p>
            <Button
              onClick={() => window.dispatchEvent(new CustomEvent('openNewProjectModal'))}
              className="rounded-apple px-6 py-3 shadow-apple"
            >
              Create Project
            </Button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="flex flex-row flex-wrap justify-center gap-6 p-8">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <div className="space-y-2 p-8">
            {projects.map((project) => (
              <div
                key={project.id}
                className="flex items-center gap-4 p-4 glass rounded-apple shadow-apple hover:shadow-apple-lg transition-smooth cursor-pointer"
                onClick={() => navigate(`/project/${project.id}`)}
              >
                <img
                  src={project.coverArt}
                  alt={project.title}
                  className="w-16 h-16 rounded-apple object-cover"
                />
                <div className="flex-1">
                  <h3 className="font-semibold" style={{ color: 'var(--text)' }}>
                    {project.title}
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {project.artist}
                  </p>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {project.trackCount} tracks
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

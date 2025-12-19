import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Recorder } from '@/components/audio/Recorder'
import { useProjectStore } from '@/store/projectStore'

export function Record() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { loadProject, addTrackFromBackend } = useProjectStore()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSave = async (result?: any) => {
    // Add track to store immediately to show in UI
    if (projectId && result?.data) {
      // Add the new track to store first
      await addTrackFromBackend(result.data).catch(console.error)
      // Then reload project metadata
      await loadProject(parseInt(projectId)).catch(console.error)
    }
    // Navigate after store is updated
    navigate(`/project/${projectId}`)
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Header */}
      <div className="p-6 border-b" style={{ borderColor: 'var(--surface)' }}>
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/project/${projectId}`)}
            className="rounded-apple"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
            Record New Track
          </h1>
        </div>
      </div>

      {/* Recorder */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-4xl">
          <Recorder projectId={projectId || ''} onSave={handleSave} />
        </div>
      </div>
    </div>
  )
}

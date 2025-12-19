import { useState, useEffect, useMemo } from 'react'
import { Search, Folder, FolderOpen, Music, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useProjectStore } from '@/store/projectStore'

interface SearchDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function SearchDialog({ isOpen, onClose }: SearchDialogProps) {
  // FIX: Không render Dialog nếu chưa bao giờ mở
  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] p-0 rounded-apple-xl" hideCloseButton>
        <DialogTitle className="sr-only">Search</DialogTitle>
        <DialogDescription className="sr-only">Search app content</DialogDescription>

        <SearchDialogInner onClose={onClose} isOpen={isOpen} />
      </DialogContent>
    </Dialog>
  )
}

function SearchDialogInner({ onClose, isOpen }: { onClose: () => void; isOpen: boolean }) {
  const navigate = useNavigate()

  const folders = useProjectStore((state) => state.folders)
  const projects = useProjectStore((state) => state.projects)
  const loadProjects = useProjectStore((state) => state.loadProjects)
  const setCurrentTrack = useProjectStore((state) => state.setCurrentTrack)

  const [query, setQuery] = useState('')
  const [allTracks, setAllTracks] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Chỉ load khi Dialog mở
    if (!isOpen) return

    if (projects.length === 0) {
      loadProjects()
    } else {
      const loadAllTracks = async () => {
        setLoading(true)
        try {
          const allTracksPromises = projects.map(async (project) => {
            const { data, success } = await window.electronAPI.getTracks(parseInt(project.id))
            if (success && data) {
              return Promise.all(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                data.map(async (t: any) => {
                  let audioUrl: string | undefined
                  if (t.latestVersionId) {
                    try {
                      const response = await window.electronAPI.getFilePath(t.latestVersionId)
                      if (response.success && response.data) {
                        const encodedPath = encodeURIComponent(response.data.path)
                        audioUrl = `http://localhost:45678?path=${encodedPath}`
                      }
                    } catch (error) {
                      console.error(error)
                    }
                  }
                  return {
                    id: String(t.id),
                    projectId: String(t.projectId),
                    title: String(t.title || 'Untitled'),
                    artist: undefined,
                    coverArt: project.coverArt,
                    duration: (t.latestVersion?.durationMs || 0) / 1000,
                    type: 'final' as const,
                    waveformData: [],
                    audioUrl,
                    createdAt: new Date(t.createdAt || Date.now()),
                  }
                })
              )
            }
            return []
          })
          const tracksArrays = await Promise.all(allTracksPromises)
          const flatTracks = tracksArrays.flat()

          setAllTracks((prev) => {
            if (prev.length === flatTracks.length) return prev
            return flatTracks
          })
        } catch (error) {
          console.error(error)
        } finally {
          setLoading(false)
        }
      }
      loadAllTracks()
    }
  }, [isOpen, projects, loadProjects])

  const results = useMemo(() => {
    if (!query.trim()) return { folders: [], projects: [], tracks: [] }
    const searchTerm = query.toLowerCase()
    return {
      folders: folders.filter((f) => f.title.toLowerCase().includes(searchTerm)),
      projects: projects.filter(
        (p) =>
          p.title.toLowerCase().includes(searchTerm) ||
          (p.artist && p.artist.toLowerCase().includes(searchTerm))
      ),
      tracks: allTracks.filter((t) =>
        String(t.title || '')
          .toLowerCase()
          .includes(searchTerm)
      ),
    }
  }, [query, folders, projects, allTracks])

  const handleSelect = (type: 'folder' | 'project' | 'track', id: string) => {
    if (type === 'folder') navigate('/')
    else if (type === 'project') navigate(`/project/${id}`)
    else {
      setCurrentTrack(id, true)
      navigate(`/player/${id}`)
    }
    onClose()
  }

  const totalResults = results.folders.length + results.projects.length + results.tracks.length

  return (
    <>
      <div
        className="flex items-center gap-3 px-4 py-3 border-b"
        style={{ borderColor: 'var(--surface)' }}
      >
        <Search className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--text-secondary)' }} />
        <input
          type="text"
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-sm"
          style={{ color: 'var(--text)' }}
          autoFocus
        />
        <button
          onClick={() => (query ? setQuery('') : onClose())}
          className="p-1.5 hover:bg-opacity-10 hover:bg-gray-500 rounded-apple transition-smooth flex-shrink-0"
        >
          <X className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
        </button>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {loading && !allTracks.length ? (
          <div className="px-4 py-12 text-center" style={{ color: 'var(--text-secondary)' }}>
            <div
              className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-3"
              style={{ borderColor: 'var(--primary)' }}
            ></div>
            <p>Loading...</p>
          </div>
        ) : !query.trim() ? (
          <div className="px-4 py-12 text-center" style={{ color: 'var(--text-secondary)' }}>
            <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Type to search...</p>
          </div>
        ) : totalResults === 0 ? (
          <div className="px-4 py-12 text-center" style={{ color: 'var(--text-secondary)' }}>
            <p>No results found</p>
          </div>
        ) : (
          <div className="py-2">
            {results.folders.length > 0 && (
              <div className="mb-2">
                <div
                  className="px-4 py-2 text-xs font-semibold uppercase"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Folders
                </div>
                {results.folders.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => handleSelect('folder', f.id)}
                    className="w-full px-4 py-2 flex items-center gap-3 hover:opacity-80"
                  >
                    <Folder className="h-5 w-5" style={{ color: 'var(--text-secondary)' }} />
                    <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                      {f.title}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {results.projects.length > 0 && (
              <div className="mb-2">
                <div
                  className="px-4 py-2 text-xs font-semibold uppercase"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Projects
                </div>
                {results.projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelect('project', p.id)}
                    className="w-full px-4 py-2 flex items-center gap-3 hover:opacity-80"
                  >
                    <FolderOpen className="h-5 w-5" style={{ color: 'var(--text-secondary)' }} />
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                        {p.title}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {results.tracks.length > 0 && (
              <div>
                <div
                  className="px-4 py-2 text-xs font-semibold uppercase"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Tracks
                </div>
                {results.tracks.map((t) => (
                  <button
                    key={String(t.id)}
                    onClick={() => handleSelect('track', String(t.id))}
                    className="w-full px-4 py-2 flex items-center gap-3 hover:opacity-80"
                  >
                    <Music className="h-5 w-5" style={{ color: 'var(--text-secondary)' }} />
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                        {String(t.title || 'Untitled')}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div
        className="px-4 py-2 border-t text-xs"
        style={{ borderColor: 'var(--surface)', color: 'var(--text-secondary)' }}
      >
        <kbd className="px-2 py-1 rounded-apple" style={{ backgroundColor: 'var(--surface)' }}>
          ESC
        </kbd>{' '}
        to close
      </div>
    </>
  )
}

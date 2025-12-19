import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useShareStore } from '@/store/shareStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import {
  Loader2,
  Lock,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Download,
  Folder,
  Music,
  Calendar,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

// --- Helper Components ---

interface PasswordScreenProps {
  onSubmit: (password: string) => void
  error: string | null
  loading: boolean
}

// 1. Màn hình nhập Password
const PasswordScreen = ({ onSubmit, error, loading }: PasswordScreenProps) => {
  const [password, setPassword] = useState('')

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
          <Lock className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Protected Content</h1>
          <p className="text-muted-foreground">This content requires a password to access.</p>
        </div>
        <div className="flex gap-2">
          <Input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-10"
            onKeyDown={(e) => e.key === 'Enter' && onSubmit(password)}
          />
          <Button onClick={() => onSubmit(password)} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Unlock'}
          </Button>
        </div>
        {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
      </div>
    </div>
  )
}

// 2. Audio Player (Dành cho Track View)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SharedTrackPlayer = ({ track }: { track: any }) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Giả lập Waveform bằng CSS
  const waveformBars = Array.from({ length: 40 }).map((_, i) => (
    <div
      key={i}
      className="w-1 bg-primary/20 rounded-full transition-all duration-300"
      style={{
        height: `${Math.max(20, Math.random() * 100)}%`,
        opacity: (i / 40) * 100 < progress ? 1 : 0.3, // Highlight đã chạy
        backgroundColor: (i / 40) * 100 < progress ? 'var(--primary)' : undefined,
      }}
    />
  ))

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause()
      else audioRef.current.play()
      setIsPlaying(!isPlaying)
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime
      const total = audioRef.current.duration
      setProgress((current / total) * 100)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  // Format thời gian (mm:ss)
  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00'
    const min = Math.floor(time / 60)
    const sec = Math.floor(time % 60)
    return `${min}:${sec < 10 ? '0' + sec : sec}`
  }

  return (
    <div className="max-w-2xl mx-auto w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Artwork / Icon Placeholder */}
      <div className="aspect-square w-48 mx-auto bg-gradient-to-br from-indigo-500 to-purple-600 rounded-apple-xl shadow-2xl flex items-center justify-center">
        <Music className="h-20 w-20 text-white opacity-80" />
      </div>

      {/* Info */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">{String(track.name || 'Untitled')}</h1>
        <p className="text-muted-foreground font-medium">
          Last updated{' '}
          {formatDistanceToNow(new Date((track.updatedAt as number) || Date.now()), {
            addSuffix: true,
          })}
        </p>
      </div>

      {/* Visualizer */}
      <div className="h-16 flex items-center justify-center gap-1 px-4">{waveformBars}</div>

      {/* Controls */}
      <div className="bg-muted/30 p-6 rounded-apple-xl backdrop-blur-md border shadow-sm space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <Slider
            value={[progress]}
            max={100}
            step={0.1}
            onValueChange={(val) => {
              if (audioRef.current) {
                audioRef.current.currentTime = (val[0] / 100) * duration
                setProgress(val[0])
              }
            }}
          />
          <div className="flex justify-between text-xs text-muted-foreground font-mono">
            <span>{formatTime(audioRef.current?.currentTime || 0)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-center gap-6">
          <Button variant="ghost" size="icon" className="rounded-full">
            <SkipBack className="h-6 w-6" />
          </Button>

          <Button
            size="icon"
            className="h-16 w-16 rounded-full shadow-lg text-white"
            onClick={togglePlay}
          >
            {isPlaying ? (
              <Pause className="h-8 w-8 fill-current" />
            ) : (
              <Play className="h-8 w-8 fill-current ml-1" />
            )}
          </Button>

          <Button variant="ghost" size="icon" className="rounded-full">
            <SkipForward className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex justify-center">
        <Button variant="outline" className="gap-2 rounded-full">
          <Download className="h-4 w-4" /> Download Original
        </Button>
      </div>

      {/* Hidden Audio Element - Cần URL thực tế từ backend */}
      <audio
        ref={audioRef}
        src={`http://localhost:3000/api/stream/${track.id}`} // Ví dụ URL
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />
    </div>
  )
}

// 3. Project View (Dành cho Project/Folder View)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SharedProjectView = ({ project }: { project: any }) => {
  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex items-start justify-between pb-6 border-b">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Folder className="h-5 w-5" />
            <span className="text-sm font-medium uppercase tracking-wider">Shared Project</span>
          </div>
          <h1 className="text-4xl font-bold">{String(project.name || 'Untitled')}</h1>
          <p className="mt-2 text-muted-foreground">
            {(project.tracks || []).length} tracks • {(project.folders || []).length} folders
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" /> Download All
        </Button>
      </div>

      {/* Content List */}
      <div className="space-y-2">
        {/* Folders List */}
        {(project.folders || []).map((folder: any) => (
          <div
            key={folder.id}
            className="flex items-center gap-4 p-4 rounded-apple bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer group"
          >
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
              <Folder className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">{String(folder.name || 'Untitled')}</h3>
              <p className="text-sm text-muted-foreground">{(folder.tracks || []).length} items</p>
            </div>
          </div>
        ))}

        {/* Tracks List */}
        {(project.tracks || []).map((track: any) => (
          <div
            key={track.id}
            className="flex items-center gap-4 p-3 rounded-apple hover:bg-muted/50 transition-colors group border border-transparent hover:border-border"
          >
            <Button size="icon" variant="secondary" className="h-10 w-10 rounded-full shrink-0">
              <Play className="h-4 w-4 ml-0.5" />
            </Button>

            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate">
                {String(track.name || track.title || 'Untitled')}
              </h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(track.updatedAt || Date.now()).toLocaleDateString()}
                </span>
                <span>•</span>
                <span>Ver {track.latestVersion?.versionNumber || 1}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button size="sm" variant="ghost">
                Download
              </Button>
            </div>
          </div>
        ))}

        {!(project.tracks || []).length && !(project.folders || []).length && (
          <div className="text-center py-12 text-muted-foreground">This project is empty.</div>
        )}
      </div>
    </div>
  )
}

// --- Main Page Component ---

export function SharedPageView() {
  const { token } = useParams<{ token: string }>()
  const { getSharedContent, sharedContent, loading, error } = useShareStore()

  // State cục bộ để handle logic hiển thị
  const [needsPassword, setNeedsPassword] = useState(false)
  const [isUnlocked, setIsUnlocked] = useState(false)

  // Initial Load
  useEffect(() => {
    if (token) {
      // Thử load không pass trước
      handleLoad(token)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const handleLoad = async (token: string, password?: string) => {
    const result = await getSharedContent(token, password)

    // Logic check lỗi từ backend trả về
    if (!result && !password) {
      // Nếu fail lần đầu, có thể do cần pass
      const currentError = useShareStore.getState().error
      if (currentError === 'Password required') {
        setNeedsPassword(true)
      }
    } else if (result) {
      setIsUnlocked(true)
      setNeedsPassword(false)
    }
  }

  const handleUnlock = (password: string) => {
    if (token) handleLoad(token, password)
  }

  // 1. Loading State
  if (loading && !sharedContent) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // 2. Password Required State
  if (needsPassword && !isUnlocked) {
    return <PasswordScreen onSubmit={handleUnlock} error={error} loading={loading} />
  }

  // 3. Error State (Not Found / Expired)
  if (error && !needsPassword) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-4 text-center">
        <h2 className="text-2xl font-bold text-destructive mb-2">Access Denied</h2>
        <p className="text-muted-foreground">{error}</p>
        <Button variant="link" className="mt-4" onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    )
  }

  // 4. Content View
  if (!sharedContent) return null

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-12">
      {/* Navbar Minimal */}
      <nav className="fixed top-0 left-0 w-full p-6 flex justify-between items-center z-10 pointer-events-none">
        <div className="font-bold text-xl pointer-events-auto flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg"></div> {/* Logo Placeholder */}
          <span>MyStudio Share</span>
        </div>
      </nav>

      <div className="pt-16">
        {'folders' in sharedContent ? (
          <SharedProjectView project={sharedContent} />
        ) : (
          <SharedTrackPlayer track={sharedContent as any} />
        )}
      </div>
    </div>
  )
}

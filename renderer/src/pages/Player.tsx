// Player.tsx (Đã sửa lỗi vòng lặp seek)

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Save,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  AlertTriangle,
  X,
  Loader2,
  Keyboard,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Slider } from '@/components/ui/slider'
import { WaveformVisualizer } from '@/components/audio/WaveformVisualizer'
import { NotesList } from '@/components/notes/NotesList'
import { VersionHistory } from '@/components/audio/VersionHistory'
import { useProjectStore } from '@/store/projectStore'
import { useAnalyticsStore } from '@/store/analyticsStore'
import { audioService, AudioState } from '@/services/audioService'
import { audioAnalysisService } from '@/services/audioAnalysisService'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { KeyboardShortcutsDialog } from '@/components/KeyboardShortcutsDialog'
import type { AudioAnalysisProgress } from '@/types/electron'
import type { Track as ElectronTrack } from '@/types/electron'
import { formatDuration } from '@/lib/utils' // Use lib/utils (takes seconds, not ms)
import { notifySuccess, notifyError } from '@/store/notificationStore'

// Unsaved Changes Dialog Component (Giữ nguyên)
function UnsavedChangesDialog({
  isOpen,
  onSave,
  onDiscard,
  onCancel,
}: {
  isOpen: boolean
  onSave: () => void
  onDiscard: () => void
  onCancel: () => void
}) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative glass-elevated rounded-apple-xl p-6 w-full max-w-md shadow-apple-lg">
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 rounded-apple" style={{ backgroundColor: 'var(--warning)20' }}>
            <AlertTriangle className="h-6 w-6" style={{ color: 'var(--warning)' }} />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text)' }}>
              Unsaved Changes
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              You have unsaved changes to your audio settings. Do you want to save them before
              leaving?
            </p>
          </div>
          <Button variant="ghost" size="icon" className="rounded-apple" onClick={onCancel}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 rounded-apple" onClick={onDiscard}>
            Discard
          </Button>
          <Button
            className="flex-1 rounded-apple"
            style={{ backgroundColor: 'var(--primary)', color: 'white' }}
            onClick={onSave}
          >
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  )
}

export function Player() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { currentTrack, setCurrentTrack, getProjectTracks, loadProject, setPlaybackStems } =
    useProjectStore()
  const { trackActivity } = useAnalyticsStore()

  // State (giữ nguyên)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speed, setSpeed] = useState(1.0)
  const [pitch, setPitch] = useState(0)
  const [volume, setVolume] = useState(0)
  const [stemVolumes, setStemVolumes] = useState({
    vocals: 100,
    drums: 100,
    bass: 100,
    other: 100,
  })
  const [eqLow, setEqLow] = useState(0)
  const [eqMid, setEqMid] = useState(0)
  const [eqHigh, setEqHigh] = useState(0)
  const [reverb, setReverb] = useState(0)
  const [reverbDecay, setReverbDecay] = useState(1.5)

  // Effects toggle state
  const [effectsEnabled, setEffectsEnabled] = useState(false)

  // Audio analysis state
  const [bpm, setBpm] = useState<number | undefined>(undefined)
  const [musicalKey, setMusicalKey] = useState<string | undefined>(undefined)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisMessage, setAnalysisMessage] = useState('')

  // Loading state to prevent race conditions
  const [isLoadingTrack, setIsLoadingTrack] = useState(false)

  // Track details with full info (tags, notes, versions, etc.)
  const [trackDetails, setTrackDetails] = useState<ElectronTrack | null>(null)

  const [availableStems, setAvailableStems] = useState<{
    permanent: { trackId: number; stem: string; path: string; title: string }[]
    temporary: { stem: string; path: string }[]
  } | null>(null)
  const [stemsLoading, setStemsLoading] = useState(false)
  const [originalValues, setOriginalValues] = useState({
    speed: 1.0,
    pitch: 0,
    volume: 0,
    stemVolumes: { vocals: 100, drums: 100, bass: 100, other: 100 },
  })
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
  const shouldAllowNavigation = useRef(false)
  const projectTracks = currentTrack ? getProjectTracks(currentTrack.projectId) : []

  // Keyboard shortcuts hook
  useKeyboardShortcuts({
    enabled: !showUnsavedDialog && !showKeyboardShortcuts,
    onSeekForward: (seconds) => {
      const newTime = Math.min(currentTime + seconds, duration)
      audioService.seek(newTime)
    },
    onSeekBackward: (seconds) => {
      const newTime = Math.max(currentTime - seconds, 0)
      audioService.seek(newTime)
    },
    onVolumeUp: (amount) => {
      const newVolume = Math.min(volume + amount, 100)
      setVolume(newVolume)
      audioService.setVolume(newVolume)
    },
    onVolumeDown: (amount) => {
      const newVolume = Math.max(volume - amount, 0)
      setVolume(newVolume)
      audioService.setVolume(newVolume)
    },
    onEscape: () => {
      if (showKeyboardShortcuts) {
        setShowKeyboardShortcuts(false)
      }
    },
  })

  // Listen for "?" key to show keyboard shortcuts
  useEffect(() => {
    const handleShowShortcuts = (e: KeyboardEvent) => {
      if (e.key === '?' || (e.ctrlKey && e.key === '/')) {
        e.preventDefault()
        setShowKeyboardShortcuts((prev) => !prev)
      }
    }
    document.addEventListener('keydown', handleShowShortcuts)
    return () => document.removeEventListener('keydown', handleShowShortcuts)
  }, [])

  // useEffects (giữ nguyên)
  useEffect(() => {
    const hasChanges =
      speed !== originalValues.speed ||
      pitch !== originalValues.pitch ||
      volume !== originalValues.volume ||
      stemVolumes.vocals !== originalValues.stemVolumes.vocals ||
      stemVolumes.drums !== originalValues.stemVolumes.drums ||
      stemVolumes.bass !== originalValues.stemVolumes.bass ||
      stemVolumes.other !== originalValues.stemVolumes.other
    setHasUnsavedChanges(hasChanges)
  }, [speed, pitch, volume, stemVolumes, originalValues])

  // Fetch track details when currentTrack changes
  useEffect(() => {
    if (currentTrack?.id) {
      const fetchDetails = async () => {
        try {
          const response = await window.electronAPI.getTrack(parseInt(currentTrack.id))
          if (response.success && response.data) {
            setTrackDetails(response.data)

            // Load BPM and Key from database if available
            if (response.data.bpm) {
              setBpm(response.data.bpm)
            } else {
              setBpm(undefined)
            }
            if (response.data.key) {
              setMusicalKey(response.data.key)
            } else {
              setMusicalKey(undefined)
            }

            // Auto-analyze in background if BPM or Key is missing
            if (!response.data.bpm || !response.data.key) {
              // Small delay to not block UI on track load
              setTimeout(() => {
                autoAnalyzeTrack(parseInt(currentTrack.id))
              }, 500)
            }
          }
        } catch (error) {
          console.error('Failed to fetch track details:', error)
        }
      }
      fetchDetails()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id])

  // Auto-analyze track in background (non-blocking)
  const autoAnalyzeTrack = async (trackId: number) => {
    if (isAnalyzing) return

    setIsAnalyzing(true)
    setAnalysisMessage('Auto-analyzing...')

    try {
      const result = await audioAnalysisService.analyzeTrack(trackId)

      if (!result.error) {
        if (result.bpm) setBpm(result.bpm)
        if (result.key) setMusicalKey(result.key)
      }
    } catch (error) {
      console.error('Auto-analyze failed:', error)
    } finally {
      setIsAnalyzing(false)
      setAnalysisMessage('')
    }
  }

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  // Subscribe to audioService - single source of truth for playback state
  useEffect(() => {
    const unsubscribe = audioService.subscribe((state: Partial<AudioState>) => {
      // Only update local state if it actually changed to avoid loops
      if (state.isPlaying !== undefined && state.isPlaying !== isPlaying) {
        setIsPlaying(state.isPlaying)
      }
      if (state.currentTime !== undefined && Math.abs(state.currentTime - currentTime) > 0.1) {
        setCurrentTime(state.currentTime)
      }
      if (state.duration !== undefined && state.duration !== duration) {
        setDuration(state.duration)
      }
      // Speed/pitch/volume are controlled by Player UI, synced back through audioService calls
    })
    return unsubscribe
  }, [isPlaying, currentTime, duration])

  useEffect(() => {
    if (currentTrack?.id) {
      setIsLoadingTrack(true)

      // Get current audioService state instead of resetting
      const currentState = audioService.getState()
      setSpeed(currentState.speed)
      setPitch(currentState.pitch)
      setVolume(currentState.volume)
      setIsPlaying(currentState.isPlaying)
      setCurrentTime(currentState.currentTime)
      setDuration(currentState.duration)

      // Reset stem volumes
      setStemVolumes({ vocals: 100, drums: 100, bass: 100, other: 100 })
      setOriginalValues({
        speed: currentState.speed,
        pitch: currentState.pitch,
        volume: currentState.volume,
        stemVolumes: { vocals: 100, drums: 100, bass: 100, other: 100 },
      })
      setHasUnsavedChanges(false)

      // Load stems for this track - audioService will handle playback seamlessly
      loadTrackStems().finally(() => {
        setIsLoadingTrack(false)

        // Apply initial stem volumes after stems are loaded
        // Wait a bit for audioService to finish loading
        setTimeout(() => {
          Object.entries(stemVolumes).forEach(([stem, percentage]) => {
            audioService.setStemVolume(stem as 'vocals' | 'drums' | 'bass' | 'other', percentage)
          })
          console.log('[Player] Applied initial stem volumes after load')
        }, 100)
      })
    } else if (!currentTrack && id) {
      // Loading...
    } else {
      setAvailableStems(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id])

  useEffect(() => {
    // Only set current track if it's different from URL param
    // This prevents overriding autoPlay flag from handleNext/handlePrevious
    if (id && currentTrack?.id !== id) {
      setCurrentTrack(id)
    }
  }, [id, currentTrack?.id, setCurrentTrack])

  // Load stems (permanent from DB + temporary from temp folder)
  // Trong file Player.tsx

  // Load stems (permanent from DB + temporary from temp folder)
  const loadTrackStems = useCallback(async () => {
    if (!currentTrack) return

    setStemsLoading(true)
    try {
      const response = await window.electronAPI.getTrackStems(parseInt(currentTrack.id))
      if (!response.success || !response.data) {
        console.error('[Player] Failed to load stems:', response.error)
        return
      }

      setAvailableStems(response.data)

      const totalStems = response.data.permanent.length + response.data.temporary.length
      if (totalStems <= 0) {
        return
      }

      // Build stem URLs
      const stemUrls: { vocals?: string; drums?: string; bass?: string; other?: string } = {}

      response.data.permanent.forEach((stem) => {
        const stemType = stem.stem as 'vocals' | 'drums' | 'bass' | 'other'
        stemUrls[stemType] = `http://localhost:45678?path=${encodeURIComponent(stem.path)}`
      })

      response.data.temporary.forEach((stem) => {
        const stemType = stem.stem as 'vocals' | 'drums' | 'bass' | 'other'
        if (!stemUrls[stemType]) {
          stemUrls[stemType] = `http://localhost:45678?path=${encodeURIComponent(stem.path)}`
        }
      })

      setPlaybackStems(currentTrack.id, stemUrls)

      // ------------------------------------------------------------------
      // 👇 ĐÂY LÀ PHẦN QUAN TRỌNG BẠN ĐANG THIẾU 👇
      // ------------------------------------------------------------------
      console.log('[Player] Loading stems into Audio Engine...', stemUrls)

      // 1. Ra lệnh cho AudioService tải các file này ngay lập tức
      await audioService.loadStems(stemUrls, currentTrack.id)

      // 2. Chỉnh volume cho khớp với thanh trượt ngay sau khi tải xong
      Object.entries(stemVolumes).forEach(([stem, percentage]) => {
        audioService.setStemVolume(stem as 'vocals' | 'drums' | 'bass' | 'other', percentage)
      })
      // ------------------------------------------------------------------

      notifySuccess('Stems Ready', `Found ${Object.keys(stemUrls).length} stems for mixing`)
    } catch (error) {
      console.error('[Player] Error loading stems:', error)
      notifyError('Stem Error', 'Failed to load stems into audio engine')
    } finally {
      setStemsLoading(false)
    }
  }, [currentTrack, setPlaybackStems, stemVolumes])

  // Callbacks
  const handleSave = useCallback(() => {
    setOriginalValues({
      speed,
      pitch,
      volume,
      stemVolumes: { ...stemVolumes },
    })
    setHasUnsavedChanges(false)
    notifySuccess('Changes saved', 'Your audio settings have been saved')
    if (showUnsavedDialog) {
      setShowUnsavedDialog(false)
      if (pendingNavigation) {
        shouldAllowNavigation.current = true
        navigate(pendingNavigation)
        setPendingNavigation(null)
        shouldAllowNavigation.current = false
      }
    }
  }, [speed, pitch, volume, stemVolumes, showUnsavedDialog, pendingNavigation, navigate])

  const handleDiscard = useCallback(() => {
    setSpeed(originalValues.speed)
    setPitch(originalValues.pitch)
    setVolume(originalValues.volume)
    setStemVolumes({ ...originalValues.stemVolumes })
    audioService.setSpeed(originalValues.speed)
    audioService.setPitch(originalValues.pitch)
    audioService.setVolume(originalValues.volume)
    setHasUnsavedChanges(false)
    setShowUnsavedDialog(false)
    if (pendingNavigation) {
      shouldAllowNavigation.current = true
      navigate(pendingNavigation)
      setPendingNavigation(null)
      shouldAllowNavigation.current = false
    }
  }, [originalValues, pendingNavigation, navigate])

  const handleCancelDialog = useCallback(() => {
    setShowUnsavedDialog(false)
    setPendingNavigation(null)
  }, [])

  const handlePlayPause = async () => {
    // Player is just an extended UI - audioService is single source of truth
    if (isLoadingTrack) {
      return
    }

    if (isPlaying) {
      audioService.pause()
    } else {
      await audioService.play()

      // Track play activity
      if (currentTrack) {
        trackActivity('play', parseInt(currentTrack.id), parseInt(currentTrack.projectId))
      }
    }
  }

  // !!!!!!!!! SỬA LỖI VÒNG LẶP SEEK !!!!!!!!!
  const handleSeek = useCallback((time: number) => {
    audioService.seek(time)
    // XÓA DÒNG NÀY: setCurrentTime(time)
    // audioService.seek() sẽ tự động notifyListeners (trong file audioService.ts)
    // và cập nhật state một cách an toàn, phá vỡ vòng lặp.
  }, []) // <-- Bọc bằng useCallback

  const handleSpeedChange = (value: number[]) => {
    const newSpeed = value[0]
    setSpeed(newSpeed)
    audioService.setSpeed(newSpeed)
    setHasUnsavedChanges(true)
  }

  const handlePitchChange = (value: number[]) => {
    const newPitch = value[0]
    setPitch(newPitch)
    audioService.setPitch(newPitch)
    setHasUnsavedChanges(true)
  }

  const handleVolumeChange = (value: number[]) => {
    const db = value[0]
    setVolume(db)
    audioService.setVolume(db)
    setHasUnsavedChanges(true)
  }

  const handleStemVolumeChange = (stem: keyof typeof stemVolumes, value: number[]) => {
    const percentage = value[0]
    console.log(`[Player] Stem volume change: ${stem} = ${percentage}%`)
    setStemVolumes((prev) => ({ ...prev, [stem]: percentage }))
    audioService.setStemVolume(stem as 'vocals' | 'drums' | 'bass' | 'other', percentage)
    setHasUnsavedChanges(true)
  }

  const handlePrevious = () => {
    // Prevent navigation while loading
    if (!currentTrack || isLoadingTrack) return

    if (hasUnsavedChanges) {
      const currentIndex = projectTracks.findIndex((t) => t.id === currentTrack.id)
      if (currentIndex > 0) {
        const prevTrack = projectTracks[currentIndex - 1]
        setPendingNavigation(`/player/${prevTrack.id}`)
        setShowUnsavedDialog(true)
      }
    } else {
      const currentIndex = projectTracks.findIndex((t) => t.id === currentTrack.id)
      if (currentIndex > 0) {
        const prevTrack = projectTracks[currentIndex - 1]
        // Set current track with autoPlay=true to continue playback, then navigate
        const wasPlaying = isPlaying
        setCurrentTrack(prevTrack.id, wasPlaying)
        navigate(`/player/${prevTrack.id}`)
      }
    }
  }

  const handleNext = () => {
    // Prevent navigation while loading
    if (!currentTrack || isLoadingTrack) return

    if (hasUnsavedChanges) {
      const currentIndex = projectTracks.findIndex((t) => t.id === currentTrack.id)
      if (currentIndex < projectTracks.length - 1) {
        const nextTrack = projectTracks[currentIndex + 1]
        setPendingNavigation(`/player/${nextTrack.id}`)
        setShowUnsavedDialog(true)
      }
    } else {
      const currentIndex = projectTracks.findIndex((t) => t.id === currentTrack.id)
      if (currentIndex < projectTracks.length - 1) {
        const nextTrack = projectTracks[currentIndex + 1]
        // Set current track with autoPlay=true to continue playback, then navigate
        const wasPlaying = isPlaying
        setCurrentTrack(nextTrack.id, wasPlaying)
        navigate(`/player/${nextTrack.id}`)
      }
    }
  }

  const handleBack = () => {
    if (!currentTrack) return
    const targetProjectId = currentTrack.projectId
    if (hasUnsavedChanges) {
      setPendingNavigation(`/project/${targetProjectId}`)
      setShowUnsavedDialog(true)
    } else {
      navigate(`/project/${targetProjectId}`)
    }
  }

  // Audio Analysis Handler
  const handleAnalyzeAudio = async () => {
    if (!currentTrack || isAnalyzing) return

    setIsAnalyzing(true)
    setAnalysisMessage('Starting analysis...')

    try {
      const trackId = parseInt(currentTrack.id, 10)
      const result = await audioAnalysisService.analyzeTrack(trackId)

      if (result.error) {
        notifyError('Analysis Error', `Analysis failed: ${result.error}`)
      } else {
        setBpm(result.bpm)
        setMusicalKey(result.key)
        notifySuccess('Analysis Complete', 'Audio analysis complete!')
      }
    } catch (error) {
      console.error('Failed to analyze audio:', error)
      notifyError('Analysis Error', 'Failed to analyze audio')
    } finally {
      setIsAnalyzing(false)
      setAnalysisMessage('')
    }
  }

  // Subscribe to analysis progress
  useEffect(() => {
    const unsubscribe = audioAnalysisService.onProgress((progress: AudioAnalysisProgress) => {
      const currentTrackId = currentTrack?.id ? parseInt(currentTrack.id, 10) : null
      if (progress.trackId === currentTrackId) {
        setAnalysisMessage(progress.message)

        if (progress.status === 'complete') {
          if (progress.bpm) setBpm(progress.bpm)
          if (progress.key) setMusicalKey(progress.key)
        }
      }
    })

    return () => {
      unsubscribe()
    }
  }, [currentTrack?.id])

  // Render (giữ nguyên)
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}
    >
      {/* Unsaved Changes Dialog */}
      <UnsavedChangesDialog
        isOpen={showUnsavedDialog}
        onSave={handleSave}
        onDiscard={handleDiscard}
        onCancel={handleCancelDialog}
      />

      {/* Keyboard Shortcuts Dialog */}
      <KeyboardShortcutsDialog
        isOpen={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
      />

      {/* Header */}
      <div
        className="p-6 flex items-center justify-between border-b"
        style={{ borderColor: 'var(--surface)' }}
      >
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="rounded-apple"
            disabled={!currentTrack}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
              {currentTrack?.title || 'Loading...'}
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {currentTrack?.type || '...'}
            </p>
            {/* BPM & Key Display */}
            {(bpm || musicalKey) && (
              <div className="flex gap-3 mt-2">
                {bpm && (
                  <span
                    className="px-2 py-1 text-xs font-semibold rounded-apple"
                    style={{
                      backgroundColor: 'var(--primary)20',
                      color: 'var(--primary)',
                    }}
                  >
                    {bpm} BPM
                  </span>
                )}
                {musicalKey && (
                  <span
                    className="px-2 py-1 text-xs font-semibold rounded-apple"
                    style={{
                      backgroundColor: 'var(--keyColor)',
                      color: '#fff',
                      border: '1.5px solid var(--keyColor)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Key: {musicalKey}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          {/* Analyze Button */}
          <Button
            variant="outline"
            className="gap-2 rounded-apple"
            onClick={handleAnalyzeAudio}
            disabled={!currentTrack || isAnalyzing}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {analysisMessage || 'Analyzing...'}
              </>
            ) : (
              'Analyze Audio'
            )}
          </Button>

          {/* Keyboard Shortcuts Button */}
          <Button
            variant="ghost"
            size="icon"
            className="rounded-apple"
            onClick={() => setShowKeyboardShortcuts(true)}
            title="Keyboard Shortcuts (?)"
          >
            <Keyboard className="h-4 w-4" />
          </Button>

          {/* Save Button */}
          <Button
            className="gap-2 rounded-apple"
            onClick={handleSave}
            disabled={!hasUnsavedChanges || !currentTrack}
            style={{
              backgroundColor: hasUnsavedChanges ? 'var(--primary)' : 'var(--surface)',
              color: hasUnsavedChanges ? 'white' : 'var(--text-secondary)',
            }}
          >
            <Save className="h-4 w-4" />
            {hasUnsavedChanges ? 'Save Changes' : 'Saved'}
          </Button>
        </div>
      </div>

      {/* Waveform Section */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-4xl space-y-8">
          <div
            className="rounded-apple-lg p-6 glass border relative"
            style={{ borderColor: 'var(--surface)' }}
          >
            <WaveformVisualizer
              audioUrl={currentTrack?.audioUrl || null}
              onSeek={handleSeek}
              height={150}
              barWidth={3}
              barGap={2}
              barRadius={3}
            />

            {!currentTrack && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm rounded-apple-lg">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            )}

            <div
              className="flex justify-between mt-4 text-sm font-mono"
              style={{ color: 'var(--text-secondary)' }}
            >
              <span>{formatDuration(currentTime)}</span>
              <span>{formatDuration(duration)}</span>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12 rounded-apple"
              onClick={handlePrevious}
              disabled={
                !currentTrack ||
                isLoadingTrack ||
                projectTracks.findIndex((t) => t.id === currentTrack.id) === 0
              }
            >
              <SkipBack className="h-6 w-6" />
            </Button>

            <Button
              size="icon"
              className="h-16 w-16 rounded-full"
              onClick={handlePlayPause}
              style={{ backgroundColor: 'var(--primary)' }}
              disabled={!currentTrack}
            >
              {isPlaying ? (
                <Pause className="h-8 w-8" fill="white" style={{ color: 'white' }} />
              ) : (
                <Play className="h-8 w-8 ml-1" fill="white" style={{ color: 'white' }} />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12 rounded-apple"
              onClick={handleNext}
              disabled={
                !currentTrack ||
                isLoadingTrack ||
                projectTracks.findIndex((t) => t.id === currentTrack.id) ===
                  projectTracks.length - 1
              }
            >
              <SkipForward className="h-6 w-6" />
            </Button>
          </div>

          {/* Tabs for Effects */}
          <Tabs defaultValue="varispeed" className="w-full">
            <TabsList className="w-full grid grid-cols-6">
              <TabsTrigger value="varispeed" disabled={!currentTrack}>
                VARISPEED
              </TabsTrigger>
              <TabsTrigger value="gain" disabled={!currentTrack}>
                GAIN
              </TabsTrigger>
              <TabsTrigger value="effects" disabled={!currentTrack}>
                EFFECTS
              </TabsTrigger>
              <TabsTrigger value="stems" disabled={!currentTrack}>
                STEMS
              </TabsTrigger>
              <TabsTrigger value="notes" disabled={!currentTrack}>
                NOTES
              </TabsTrigger>
              <TabsTrigger value="versions" disabled={!currentTrack}>
                VERSIONS
              </TabsTrigger>
            </TabsList>

            {/* Varispeed Tab */}
            <TabsContent value="varispeed" className="space-y-6 mt-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium" style={{ color: 'var(--primary)' }}>
                    Speed
                  </label>
                  <div className="flex items-center gap-3">
                    <span
                      className="text-sm tabular-nums"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {speed.toFixed(2)}x
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs rounded-apple"
                      onClick={() => handleSpeedChange([1.0])}
                    >
                      Reset
                    </Button>
                  </div>
                </div>
                <Slider
                  value={[speed]}
                  min={0.5}
                  max={2}
                  step={0.05}
                  onValueChange={handleSpeedChange}
                  disabled={!currentTrack}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium" style={{ color: 'var(--primary)' }}>
                    Pitch
                  </label>
                  <div className="flex items-center gap-3">
                    <span
                      className="text-sm tabular-nums"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {pitch > 0 ? '+' : ''}
                      {pitch} semitones
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs rounded-apple"
                      onClick={() => handlePitchChange([0])}
                    >
                      Reset
                    </Button>
                  </div>
                </div>
                <Slider
                  value={[pitch]}
                  min={-12}
                  max={12}
                  step={1}
                  onValueChange={handlePitchChange}
                  disabled={!currentTrack}
                />
              </div>

              {/* Sync to Tempo Section */}
              {bpm && (
                <div
                  className="p-4 rounded-apple glass border space-y-4"
                  style={{ borderColor: 'var(--surface)' }}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                      Sync to Tempo
                    </h3>
                    <span
                      className="text-xs px-2 py-1 rounded-apple"
                      style={{ backgroundColor: 'var(--primary)', color: '#fff' }}
                    >
                      Current: {bpm} BPM
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Adjust playback speed to match a target BPM. Effective BPM:{' '}
                    <strong>{(bpm * speed).toFixed(1)} BPM</strong>
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {[80, 100, 120, 140].map((targetBpm) => {
                      const rate = targetBpm / bpm
                      const isInRange = rate >= 0.5 && rate <= 2.0
                      return (
                        <Button
                          key={targetBpm}
                          variant="outline"
                          size="sm"
                          className="rounded-apple text-xs"
                          disabled={!isInRange || !currentTrack}
                          onClick={() => {
                            const newRate = audioService.syncToTempo(bpm, targetBpm)
                            if (newRate) setSpeed(newRate)
                          }}
                        >
                          {targetBpm} BPM
                          {!isInRange && <span className="ml-1 text-red-400">✗</span>}
                        </Button>
                      )
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Custom BPM"
                      min={Math.ceil(bpm * 0.5)}
                      max={Math.floor(bpm * 2)}
                      className="flex-1 px-3 py-2 text-sm rounded-apple border"
                      style={{
                        backgroundColor: 'var(--surface)',
                        borderColor: 'var(--surface)',
                        color: 'var(--text)',
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const target = parseInt((e.target as HTMLInputElement).value)
                          if (target && bpm) {
                            const newRate = audioService.syncToTempo(bpm, target)
                            if (newRate) setSpeed(newRate)
                          }
                        }
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-apple"
                      onClick={() => {
                        audioService.resetSpeed()
                        setSpeed(1.0)
                      }}
                    >
                      Reset
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Gain Tab */}
            <TabsContent value="gain" className="space-y-3 mt-6">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium" style={{ color: 'var(--primary)' }}>
                  Gain
                </label>
                <div className="flex items-center gap-3">
                  <span className="text-sm tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                    {volume.toFixed(1)} dB
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs rounded-apple"
                    onClick={() => handleVolumeChange([0])}
                  >
                    Reset
                  </Button>
                </div>
              </div>
              <Slider
                value={[volume]}
                min={-36}
                max={36}
                step={0.1}
                onValueChange={handleVolumeChange}
                disabled={!currentTrack}
              />
            </TabsContent>

            {/* Effects Tab - EQ & Reverb */}
            <TabsContent value="effects" className="space-y-6 mt-6">
              {/* Effects Toggle */}
              <div
                className="flex items-center justify-between p-4 rounded-apple glass border"
                style={{ borderColor: 'var(--surface)' }}
              >
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                    Enable Audio Effects
                  </h3>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                    Toggle EQ and Reverb processing
                  </p>
                </div>
                <Button
                  variant={effectsEnabled ? 'default' : 'outline'}
                  size="sm"
                  className="rounded-apple"
                  onClick={() => {
                    const newState = !effectsEnabled
                    setEffectsEnabled(newState)
                    audioService.setEffectsEnabled(newState)
                  }}
                  style={
                    effectsEnabled
                      ? {
                          backgroundColor: 'var(--primary)',
                          color: 'white',
                        }
                      : undefined
                  }
                >
                  {effectsEnabled ? 'ON' : 'OFF'}
                </Button>
              </div>

              {/* 3-Band EQ */}
              <div className="space-y-4" style={{ opacity: effectsEnabled ? 1 : 0.5 }}>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                  3-Band Equalizer
                </h3>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium" style={{ color: 'var(--primary)' }}>
                      Low (Bass)
                    </label>
                    <span
                      className="text-sm tabular-nums"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {eqLow.toFixed(1)} dB
                    </span>
                  </div>
                  <Slider
                    value={[eqLow]}
                    min={-20}
                    max={20}
                    step={0.5}
                    onValueChange={(value) => {
                      setEqLow(value[0])
                      audioService.setEQLow(value[0])
                    }}
                    disabled={!currentTrack}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium" style={{ color: 'var(--primary)' }}>
                      Mid
                    </label>
                    <span
                      className="text-sm tabular-nums"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {eqMid.toFixed(1)} dB
                    </span>
                  </div>
                  <Slider
                    value={[eqMid]}
                    min={-20}
                    max={20}
                    step={0.5}
                    onValueChange={(value) => {
                      setEqMid(value[0])
                      audioService.setEQMid(value[0])
                    }}
                    disabled={!currentTrack}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium" style={{ color: 'var(--primary)' }}>
                      High (Treble)
                    </label>
                    <span
                      className="text-sm tabular-nums"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {eqHigh.toFixed(1)} dB
                    </span>
                  </div>
                  <Slider
                    value={[eqHigh]}
                    min={-20}
                    max={20}
                    step={0.5}
                    onValueChange={(value) => {
                      setEqHigh(value[0])
                      audioService.setEQHigh(value[0])
                    }}
                    disabled={!currentTrack}
                  />
                </div>
              </div>

              {/* Reverb */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                  Reverb
                </h3>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium" style={{ color: 'var(--primary)' }}>
                      Wet Amount
                    </label>
                    <span
                      className="text-sm tabular-nums"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {reverb}%
                    </span>
                  </div>
                  <Slider
                    value={[reverb]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={(value) => {
                      setReverb(value[0])
                      audioService.setReverb(value[0])
                    }}
                    disabled={!currentTrack}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium" style={{ color: 'var(--primary)' }}>
                      Decay Time
                    </label>
                    <span
                      className="text-sm tabular-nums"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {reverbDecay.toFixed(1)}s
                    </span>
                  </div>
                  <Slider
                    value={[reverbDecay]}
                    min={0.1}
                    max={10}
                    step={0.1}
                    onValueChange={(value) => {
                      setReverbDecay(value[0])
                      audioService.setReverbDecay(value[0])
                    }}
                    disabled={!currentTrack}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Stems Tab */}
            <TabsContent value="stems" className="space-y-6 mt-6">
              {stemsLoading ? (
                <div className="flex items-center justify-center gap-3 p-8">
                  <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--primary)' }} />
                  <span style={{ color: 'var(--text-secondary)' }}>Loading stems...</span>
                </div>
              ) : availableStems &&
                (availableStems.permanent.length > 0 || availableStems.temporary.length > 0) ? (
                <>
                  {/* Show available stems info */}
                  <div
                    className="p-3 rounded-apple text-xs"
                    style={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)' }}
                  >
                    ✅ Found {availableStems.permanent.length + availableStems.temporary.length}{' '}
                    stems ({availableStems.permanent.length} permanent,{' '}
                    {availableStems.temporary.length} temporary)
                  </div>

                  {/* Stem volume sliders */}
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium" style={{ color: 'var(--primary)' }}>
                          Vocals
                        </label>
                        <span
                          className="text-sm tabular-nums"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {stemVolumes.vocals}%
                        </span>
                      </div>
                      <Slider
                        value={[stemVolumes.vocals]}
                        min={0}
                        max={100}
                        step={1}
                        onValueChange={(value) => handleStemVolumeChange('vocals', value)}
                        disabled={!currentTrack}
                      />
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium" style={{ color: 'var(--primary)' }}>
                          Drums
                        </label>
                        <span
                          className="text-sm tabular-nums"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {stemVolumes.drums}%
                        </span>
                      </div>
                      <Slider
                        value={[stemVolumes.drums]}
                        min={0}
                        max={100}
                        step={1}
                        onValueChange={(value) => handleStemVolumeChange('drums', value)}
                        disabled={!currentTrack}
                      />
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium" style={{ color: 'var(--primary)' }}>
                          Bass
                        </label>
                        <span
                          className="text-sm tabular-nums"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {stemVolumes.bass}%
                        </span>
                      </div>
                      <Slider
                        value={[stemVolumes.bass]}
                        min={0}
                        max={100}
                        step={1}
                        onValueChange={(value) => handleStemVolumeChange('bass', value)}
                        disabled={!currentTrack}
                      />
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium" style={{ color: 'var(--primary)' }}>
                          Other
                        </label>
                        <span
                          className="text-sm tabular-nums"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {stemVolumes.other}%
                        </span>
                      </div>
                      <Slider
                        value={[stemVolumes.other]}
                        min={0}
                        max={100}
                        step={1}
                        onValueChange={(value) => handleStemVolumeChange('other', value)}
                        disabled={!currentTrack}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div
                  className="mt-6 p-4 rounded-apple text-center text-xs"
                  style={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)' }}
                >
                  <p>
                    💡 Tip: Individual stem mixing is available when you split the track into stems.
                    <br />
                    Go back to the project page and use the &quot;Split Stems&quot; feature.
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Notes Tab */}
            <TabsContent value="notes" className="mt-6">
              {currentTrack && <NotesList trackId={parseInt(currentTrack.id)} />}
            </TabsContent>

            {/* Versions Tab */}
            <TabsContent value="versions" className="mt-6">
              {currentTrack && trackDetails && (
                <VersionHistory
                  trackId={parseInt(currentTrack.id)}
                  currentVersionId={trackDetails.latestVersionId}
                  onVersionChange={async () => {
                    // Reload track data when version changes
                    await loadProject(parseInt(currentTrack.projectId))
                  }}
                />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

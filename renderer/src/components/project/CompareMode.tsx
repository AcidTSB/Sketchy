import React, { useEffect, useRef, useState, useCallback } from 'react'
import { ArrowLeftRight, Play, Pause, Volume2, VolumeX, SkipBack, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import * as Tone from 'tone'

interface Track {
  id: number
  title: string
  filePath: string
}

interface CompareVersion {
  id: number
  label: string
  track: Track
}

interface CompareModeProps {
  versionA?: CompareVersion
  versionB?: CompareVersion
  onSelectVersionA?: () => void
  onSelectVersionB?: () => void
}

export function CompareMode({
  versionA,
  versionB,
  onSelectVersionA,
  onSelectVersionB,
}: CompareModeProps) {
  const [activeVersion, setActiveVersion] = useState<'A' | 'B'>('A')
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [volume, setVolume] = useState(80)

  // Audio players với volume control
  const playerARef = useRef<Tone.Player | null>(null)
  const playerBRef = useRef<Tone.Player | null>(null)
  const volumeARef = useRef<Tone.Volume | null>(null)
  const volumeBRef = useRef<Tone.Volume | null>(null)
  const animationRef = useRef<number | null>(null)

  // Tracking thời gian chính xác
  const startTimeRef = useRef<number>(0)
  const pausedAtRef = useRef<number>(0)

  // Cleanup
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [])

  const cleanup = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }
    playerARef.current?.dispose()
    playerBRef.current?.dispose()
    volumeARef.current?.dispose()
    volumeBRef.current?.dispose()
    playerARef.current = null
    playerBRef.current = null
    volumeARef.current = null
    volumeBRef.current = null
  }

  // Load audio when versions change
  useEffect(() => {
    loadAudio()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versionA?.track.filePath, versionB?.track.filePath])

  const loadAudio = async () => {
    if (!versionA?.track.filePath && !versionB?.track.filePath) return

    setIsLoading(true)
    cleanup()

    try {
      await Tone.start()

      // Create volume nodes
      volumeARef.current = new Tone.Volume(0).toDestination()
      volumeBRef.current = new Tone.Volume(-Infinity).toDestination() // Start B muted

      if (versionA?.track.filePath) {
        playerARef.current = new Tone.Player(versionA.track.filePath).connect(volumeARef.current)
        await playerARef.current.load(versionA.track.filePath)
      }

      if (versionB?.track.filePath) {
        playerBRef.current = new Tone.Player(versionB.track.filePath).connect(volumeBRef.current)
        await playerBRef.current.load(versionB.track.filePath)
      }

      // Get max duration from both tracks
      const durationA = playerARef.current?.buffer.duration || 0
      const durationB = playerBRef.current?.buffer.duration || 0
      setDuration(Math.max(durationA, durationB))

      // Reset time tracking
      setCurrentTime(0)
      pausedAtRef.current = 0
    } catch (error) {
      console.error('Failed to load audio:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Time update loop - more accurate tracking
  const updateTime = useCallback(() => {
    if (isPlaying) {
      const elapsed = Tone.now() - startTimeRef.current
      const newTime = Math.min(elapsed, duration)
      setCurrentTime(newTime)

      // Auto-stop when reaching end
      if (newTime >= duration - 0.1) {
        handleStop()
        return
      }
    }
    animationRef.current = requestAnimationFrame(updateTime)
  }, [isPlaying, duration])

  useEffect(() => {
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(updateTime)
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isPlaying, updateTime])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if this component is focused or no input is focused
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      switch (e.code) {
        case 'Space':
          e.preventDefault()
          handlePlayPause()
          break
        case 'Tab':
          e.preventDefault()
          handleSwitch()
          break
        case 'KeyA':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault()
            switchToVersion('A')
          }
          break
        case 'KeyB':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault()
            switchToVersion('B')
          }
          break
        case 'ArrowLeft':
          e.preventDefault()
          seekRelative(-5)
          break
        case 'ArrowRight':
          e.preventDefault()
          seekRelative(5)
          break
        case 'KeyM':
          e.preventDefault()
          handleMuteToggle()
          break
        case 'Home':
          e.preventDefault()
          seekTo(0)
          break
        case 'End':
          e.preventDefault()
          seekTo(duration)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, currentTime, duration, activeVersion])

  const handlePlayPause = async () => {
    if (!playerARef.current && !playerBRef.current) return

    if (isPlaying) {
      // Pause both players
      pausedAtRef.current = currentTime
      playerARef.current?.stop()
      playerBRef.current?.stop()
      setIsPlaying(false)
    } else {
      await Tone.start()

      // Start BOTH players at the same position (seamless switching)
      const startOffset = pausedAtRef.current
      startTimeRef.current = Tone.now() - startOffset

      if (playerARef.current?.buffer.loaded) {
        playerARef.current.start(0, startOffset)
      }
      if (playerBRef.current?.buffer.loaded) {
        playerBRef.current.start(0, startOffset)
      }

      // Only the active version is audible
      updateVolumeForActiveVersion(activeVersion)

      setIsPlaying(true)
    }
  }

  const handleStop = () => {
    playerARef.current?.stop()
    playerBRef.current?.stop()
    setIsPlaying(false)
    setCurrentTime(0)
    pausedAtRef.current = 0
  }

  const updateVolumeForActiveVersion = (version: 'A' | 'B') => {
    const dbVolume = isMuted ? -Infinity : (volume / 100) * 40 - 40 // Map 0-100 to -40db to 0db

    if (version === 'A') {
      if (volumeARef.current) volumeARef.current.volume.value = dbVolume
      if (volumeBRef.current) volumeBRef.current.volume.value = -Infinity
    } else {
      if (volumeARef.current) volumeARef.current.volume.value = -Infinity
      if (volumeBRef.current) volumeBRef.current.volume.value = dbVolume
    }
  }

  const switchToVersion = (version: 'A' | 'B') => {
    if (activeVersion === version) return
    setActiveVersion(version)
    updateVolumeForActiveVersion(version)
  }

  const handleSwitch = () => {
    const newVersion = activeVersion === 'A' ? 'B' : 'A'
    switchToVersion(newVersion)
  }

  const seekTo = (time: number) => {
    const clampedTime = Math.max(0, Math.min(time, duration))
    setCurrentTime(clampedTime)
    pausedAtRef.current = clampedTime

    if (isPlaying) {
      // Stop and restart both players at new position
      playerARef.current?.stop()
      playerBRef.current?.stop()

      startTimeRef.current = Tone.now() - clampedTime

      if (playerARef.current?.buffer.loaded) {
        playerARef.current.start(0, clampedTime)
      }
      if (playerBRef.current?.buffer.loaded) {
        playerBRef.current.start(0, clampedTime)
      }
    }
  }

  const seekRelative = (seconds: number) => {
    seekTo(currentTime + seconds)
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const newTime = percent * duration
    seekTo(newTime)
  }

  const handleMuteToggle = () => {
    const newMuted = !isMuted
    setIsMuted(newMuted)

    // Update active volume
    const dbVolume = newMuted ? -Infinity : (volume / 100) * 40 - 40
    if (activeVersion === 'A' && volumeARef.current) {
      volumeARef.current.volume.value = dbVolume
    } else if (activeVersion === 'B' && volumeBRef.current) {
      volumeBRef.current.volume.value = dbVolume
    }
  }

  const handleVolumeChange = (values: number[]) => {
    const newVolume = values[0]
    setVolume(newVolume)

    if (!isMuted) {
      const dbVolume = (newVolume / 100) * 40 - 40
      if (activeVersion === 'A' && volumeARef.current) {
        volumeARef.current.volume.value = dbVolume
      } else if (activeVersion === 'B' && volumeBRef.current) {
        volumeBRef.current.volume.value = dbVolume
      }
    }
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="glass rounded-apple-lg p-6 space-y-6" style={{ borderColor: 'var(--surface)' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3
          className="text-lg font-semibold flex items-center gap-2"
          style={{ color: 'var(--text)' }}
        >
          <ArrowLeftRight className="h-5 w-5" />
          Compare Mode (A/B)
        </h3>
        <div className="flex items-center gap-2">
          <span
            className="text-sm px-2 py-1 rounded-full font-medium"
            style={{
              backgroundColor: activeVersion === 'A' ? 'var(--primary)' : 'var(--surface)',
              color: activeVersion === 'A' ? 'white' : 'var(--text-secondary)',
            }}
          >
            Version A
          </span>
          <span
            className="text-sm px-2 py-1 rounded-full font-medium"
            style={{
              backgroundColor: activeVersion === 'B' ? 'var(--accent)' : 'var(--surface)',
              color: activeVersion === 'B' ? 'white' : 'var(--text-secondary)',
            }}
          >
            Version B
          </span>
        </div>
      </div>

      {/* Version cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Version A */}
        <div
          className={`p-4 rounded-apple-lg border-2 cursor-pointer transition-all ${
            activeVersion === 'A' ? 'ring-2 ring-[var(--primary)]' : ''
          }`}
          style={{
            borderColor: activeVersion === 'A' ? 'var(--primary)' : 'var(--surface)',
            backgroundColor: 'var(--surface)',
          }}
          onClick={onSelectVersionA}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-xs font-bold px-2 py-0.5 rounded"
              style={{ backgroundColor: 'var(--primary)', color: 'white' }}
            >
              A
            </span>
            {activeVersion === 'A' && (
              <span className="text-xs" style={{ color: 'var(--primary)' }}>
                ● Playing
              </span>
            )}
          </div>
          {versionA ? (
            <>
              <h4 className="font-medium truncate" style={{ color: 'var(--text)' }}>
                {versionA.label}
              </h4>
              <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
                {versionA.track.title}
              </p>
            </>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Click to select Version A
            </p>
          )}
        </div>

        {/* Version B */}
        <div
          className={`p-4 rounded-apple-lg border-2 cursor-pointer transition-all ${
            activeVersion === 'B' ? 'ring-2 ring-[var(--accent)]' : ''
          }`}
          style={{
            borderColor: activeVersion === 'B' ? 'var(--accent)' : 'var(--surface)',
            backgroundColor: 'var(--surface)',
          }}
          onClick={onSelectVersionB}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-xs font-bold px-2 py-0.5 rounded"
              style={{ backgroundColor: 'var(--accent)', color: 'white' }}
            >
              B
            </span>
            {activeVersion === 'B' && (
              <span className="text-xs" style={{ color: 'var(--accent)' }}>
                ● Playing
              </span>
            )}
          </div>
          {versionB ? (
            <>
              <h4 className="font-medium truncate" style={{ color: 'var(--text)' }}>
                {versionB.label}
              </h4>
              <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
                {versionB.track.title}
              </p>
            </>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Click to select Version B
            </p>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div
          className="h-2 rounded-full cursor-pointer overflow-hidden"
          style={{ backgroundColor: 'var(--surface)' }}
          onClick={handleSeek}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${progress}%`,
              backgroundColor: activeVersion === 'A' ? 'var(--primary)' : 'var(--accent)',
            }}
          />
        </div>
        <div
          className="flex items-center justify-between text-xs"
          style={{ color: 'var(--text-secondary)' }}
        >
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        {/* Volume control */}
        <div className="flex items-center gap-2 w-32">
          <Button variant="ghost" size="sm" onClick={handleMuteToggle} className="shrink-0">
            {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </Button>
          <Slider
            value={[volume]}
            min={0}
            max={100}
            step={1}
            onValueChange={handleVolumeChange}
            className="flex-1"
          />
        </div>

        {/* Skip back */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => seekRelative(-5)}
          disabled={isLoading}
          title="Skip back 5s (←)"
        >
          <SkipBack className="h-5 w-5" />
        </Button>

        {/* Play/Pause */}
        <Button
          onClick={handlePlayPause}
          disabled={(!versionA?.track.filePath && !versionB?.track.filePath) || isLoading}
          className="h-14 w-14 rounded-full"
          style={{ backgroundColor: 'var(--primary)' }}
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
          ) : isPlaying ? (
            <Pause className="h-6 w-6" fill="white" />
          ) : (
            <Play className="h-6 w-6 ml-0.5" fill="white" />
          )}
        </Button>

        {/* Skip forward */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => seekRelative(5)}
          disabled={isLoading}
          title="Skip forward 5s (→)"
        >
          <SkipForward className="h-5 w-5" />
        </Button>

        {/* Switch button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleSwitch}
          disabled={!versionA?.track.filePath || !versionB?.track.filePath}
          className="gap-2 px-4"
          title="Switch versions (Tab)"
        >
          <ArrowLeftRight className="h-5 w-5" />
          Switch
        </Button>
      </div>

      {/* Keyboard shortcut hint */}
      <div
        className="text-center text-xs space-y-1 p-3 rounded-apple"
        style={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)' }}
      >
        <p>
          <kbd className="px-1.5 py-0.5 rounded bg-card border text-xs">Space</kbd> Play/Pause
          <span className="mx-2">•</span>
          <kbd className="px-1.5 py-0.5 rounded bg-card border text-xs">Tab</kbd> Switch A/B
          <span className="mx-2">•</span>
          <kbd className="px-1.5 py-0.5 rounded bg-card border text-xs">A</kbd>/
          <kbd className="px-1.5 py-0.5 rounded bg-card border text-xs">B</kbd> Select version
        </p>
        <p>
          <kbd className="px-1.5 py-0.5 rounded bg-card border text-xs">←</kbd>/
          <kbd className="px-1.5 py-0.5 rounded bg-card border text-xs">→</kbd> Seek ±5s
          <span className="mx-2">•</span>
          <kbd className="px-1.5 py-0.5 rounded bg-card border text-xs">M</kbd> Mute
          <span className="mx-2">•</span>
          <kbd className="px-1.5 py-0.5 rounded bg-card border text-xs">Home</kbd>/
          <kbd className="px-1.5 py-0.5 rounded bg-card border text-xs">End</kbd> Jump
        </p>
      </div>
    </div>
  )
}

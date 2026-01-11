import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Shuffle,
  Repeat,
  List,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { useProjectStore } from '@/store/projectStore'
import { useUserStore } from '@/store/userStore'
import { formatDuration } from '@/lib/utils'
import { audioService, AudioState } from '@/services/audioService'
import Marquee from 'react-fast-marquee'
import { useClickOutside } from '@/hooks/useClickOutside'

export function MediaPlayer() {
  const location = useLocation()
  const navigate = useNavigate()
  const { currentTrack, tracks, setCurrentTrack, shouldAutoPlay, playbackStems } = useProjectStore()
  const { settings } = useUserStore()

  // Check if we're on the Player page
  const isOnPlayerPage = location.pathname.startsWith('/player/')

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLoadingTrack] = useState(false)

  // Audio controls state
  const [volume, setVolume] = useState(0) // 0 dB = 100%
  const [isMuted, setIsMuted] = useState(false)

  // UI state
  const [isShuffled, setIsShuffled] = useState(false)
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off')
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)
  const [showQueue, setShowQueue] = useState(false)
  const [shuffledQueue, setShuffledQueue] = useState<typeof tracks>([])
  const volumeTimeoutRef = useRef<number | null>(null)
  const queueRef = useRef<HTMLDivElement>(null)
  const hasAutoPlayedRef = useRef(false)
  const originalVolumeRef = useRef<number>(0)
  const lastLoadedKeyRef = useRef<string | null>(null)
  const lastCompletedTrackIdRef = useRef<string | null>(null)

  // Helper: Get Audio URL with Quality
  const getAudioUrlWithQuality = (url: string | undefined) => {
    if (!url) return ''
    try {
      const urlObj = new URL(url)
      urlObj.searchParams.set('quality', settings.defaultQuality)
      return urlObj.toString()
    } catch (e) {
      return url
    }
  }

  // Helper: Crossfade Logic
  const performCrossfade = useCallback(
    async (nextTrackId: string, wasPlaying: boolean) => {
      // Only auto-play next track if user has autoPlay enabled AND was playing
      const shouldAutoPlayNext = wasPlaying && settings.autoPlay

      if (settings.crossfade && wasPlaying && shouldAutoPlayNext) {
        // Only fade out if we're going to auto-play (so fade in can complete the cycle)
        const duration = settings.crossfadeDuration * 1000
        const steps = 20
        const stepTime = duration / steps
        const startVol = audioService.getVolume()

        for (let i = 0; i < steps; i++) {
          const newVol = startVol - ((i + 1) / steps) * (startVol + 60)
          audioService.setVolume(Math.max(-60, newVol))
          await new Promise((r) => setTimeout(r, stepTime))
        }
      }

      setCurrentTrack(nextTrackId, shouldAutoPlayNext)
      if (isOnPlayerPage) navigate(`/player/${nextTrackId}`)
    },
    [
      isOnPlayerPage,
      navigate,
      setCurrentTrack,
      settings.autoPlay,
      settings.crossfade,
      settings.crossfadeDuration,
    ]
  )

  // Đóng Queue khi click ra ngoài
  useClickOutside(queueRef, () => {
    if (showQueue) {
      setShowQueue(false)
    }
  })

  // Update shuffled queue when shuffle is enabled or tracks change
  useEffect(() => {
    if (isShuffled && tracks.length > 0) {
      const shuffled = [...tracks]
      // Fisher-Yates shuffle algorithm
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }
      setShuffledQueue(shuffled)
    } else {
      setShuffledQueue(tracks)
    }
  }, [isShuffled, tracks])

  // Subscribe to audio service updates (UI sync only)
  useEffect(() => {
    const unsubscribe = audioService.subscribe((state: Partial<AudioState>) => {
      if (state.isPlaying !== undefined) setIsPlaying(state.isPlaying)
      if (state.currentTime !== undefined) setCurrentTime(state.currentTime)
      if (state.duration !== undefined) setDuration(state.duration)
      if (state.volume !== undefined) {
        setVolume(state.volume)
        if (!isMuted) originalVolumeRef.current = state.volume
      }
    })

    return () => {
      unsubscribe()
    }
  }, [isMuted])

  // Single source of truth for end-of-track behavior (no duplicate timers)
  useEffect(() => {
    const handleEnded = async () => {
      // Record completed play
      if (currentTrack && currentTrack.projectId) {
        try {
          const { useAnalyticsStore } = await import('@/store/analyticsStore')
          const { trackPlay } = useAnalyticsStore.getState()

          await trackPlay(
            parseInt(currentTrack.id, 10),
            parseInt(currentTrack.projectId, 10),
            Math.floor(audioService.getDuration()),
            true
          )

          lastCompletedTrackIdRef.current = currentTrack.id
        } catch (e) {
          console.warn('[MediaPlayer] Failed to track completed play', e)
        }
      }

      // Repeat one
      if (repeatMode === 'one') {
        audioService.seek(0)
        await audioService.play()
        return
      }

      // Respect autoplay setting
      if (!settings.autoPlay) {
        audioService.stop()
        setIsPlaying(false)
        return
      }

      const displayQueue = isShuffled ? shuffledQueue : tracks
      const currentIndex = displayQueue.findIndex((t) => t.id === currentTrack?.id)

      if (currentIndex < 0 || displayQueue.length === 0) {
        audioService.stop()
        setIsPlaying(false)
        return
      }

      const nextIndex = currentIndex + 1
      const nextTrack =
        nextIndex < displayQueue.length
          ? displayQueue[nextIndex]
          : repeatMode === 'all'
            ? displayQueue[0]
            : null

      if (!nextTrack) {
        audioService.stop()
        setIsPlaying(false)
        return
      }

      await performCrossfade(nextTrack.id, true)
    }

    audioService.onEnded(handleEnded)
    return () => audioService.offEnded(handleEnded)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentTrack?.id,
    currentTrack?.projectId,
    isShuffled,
    performCrossfade,
    repeatMode,
    settings.autoPlay,
    shuffledQueue,
    tracks,
  ])

  // Track play time when track changes or component unmounts
  useEffect(() => {
    let playStartTime: number | null = null
    let totalPlayDuration = 0

    const unsubscribePlayState = audioService.subscribe((state: Partial<AudioState>) => {
      if (state.isPlaying !== undefined) {
        if (state.isPlaying && !playStartTime) {
          playStartTime = Date.now()
        } else if (!state.isPlaying && playStartTime) {
          totalPlayDuration += (Date.now() - playStartTime) / 1000
          playStartTime = null
        }
      }
    })

    return () => {
      unsubscribePlayState()
      // If still playing, include the current session time
      if (playStartTime) {
        totalPlayDuration += (Date.now() - playStartTime) / 1000
        playStartTime = null
      }
      // Save play analytics when unmounting or track changing
      if (
        currentTrack &&
        currentTrack.projectId &&
        totalPlayDuration > 0 &&
        lastCompletedTrackIdRef.current !== currentTrack.id
      ) {
        const completed = currentTime >= duration * 0.9
        ;(async () => {
          const { useAnalyticsStore } = await import('@/store/analyticsStore')
          const { trackPlay } = useAnalyticsStore.getState()

          await trackPlay(
            parseInt(currentTrack.id),
            parseInt(currentTrack.projectId),
            Math.floor(totalPlayDuration),
            completed
          )

          // Refresh user stats after tracking play
          const { useUserStore } = await import('@/store/userStore')
          useUserStore.getState().fetchUser()
        })()
      } else {
        if (lastCompletedTrackIdRef.current === currentTrack?.id) {
          // Clear after skipping one cleanup flush
          lastCompletedTrackIdRef.current = null
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id, currentTime, duration, isOnPlayerPage])

  // Load audio when track changes - Always sync state from audioService
  useEffect(() => {
    if (!currentTrack?.audioUrl) return

    // IMPORTANT: If we're on the Player page, Player component handles audio loading
    // MediaPlayer should NOT interfere to avoid race conditions
    if (isOnPlayerPage) {
      console.log('[MediaPlayer] On Player page - skipping auto-load, Player controls audio')
      return
    }

    hasAutoPlayedRef.current = false

    const loadAudio = async () => {
      try {
        if (currentTrack.duration) setDuration(currentTrack.duration)

        // Decide single-file vs stems (single playback controller)
        // Check playbackStems at load time, but don't make it a dependency
        const stemUrlsForTrack =
          playbackStems && playbackStems.trackId === currentTrack.id ? playbackStems.stems : null
        const hasAnyStem = !!(
          stemUrlsForTrack &&
          (stemUrlsForTrack.vocals ||
            stemUrlsForTrack.drums ||
            stemUrlsForTrack.bass ||
            stemUrlsForTrack.other)
        )

        const finalUrl = getAudioUrlWithQuality(currentTrack.audioUrl)
        const loadKey = hasAnyStem
          ? `stems:${stemUrlsForTrack?.vocals || ''}|${stemUrlsForTrack?.drums || ''}|${
              stemUrlsForTrack?.bass || ''
            }|${stemUrlsForTrack?.other || ''}`
          : `audio:${finalUrl}`

        // Check if this exact loadKey was already loaded
        // audioService will handle duplicate track ID checks internally
        const isAlreadyLoaded = lastLoadedKeyRef.current === loadKey

        if (!isAlreadyLoaded) {
          // 2. If crossfading AND will auto-play, set volume low for fade-in
          if (shouldAutoPlay && settings.autoPlay && settings.crossfade) {
            audioService.setVolume(-60)
          }

          if (hasAnyStem && stemUrlsForTrack) {
            await audioService.loadStems(stemUrlsForTrack, currentTrack.id)

            // For stems, manually handle autoPlay after load
            if (shouldAutoPlay && settings.autoPlay && !hasAutoPlayedRef.current) {
              hasAutoPlayedRef.current = true
              await audioService.play()
            }
          } else {
            // For single audio, loadAudio handles autoPlay internally
            await audioService.loadAudio(
              finalUrl,
              currentTrack.id,
              shouldAutoPlay && settings.autoPlay
            )
            if (shouldAutoPlay && settings.autoPlay) {
              hasAutoPlayedRef.current = true
            }
          }

          lastLoadedKeyRef.current = loadKey
          setCurrentTime(0)

          // Apply crossfade fade-in if needed
          if (
            shouldAutoPlay &&
            settings.autoPlay &&
            settings.crossfade &&
            hasAutoPlayedRef.current
          ) {
            const duration = settings.crossfadeDuration * 1000
            const targetVolume = originalVolumeRef.current || 0
            const steps = 20
            const stepTime = duration / steps

            for (let i = 0; i <= steps; i++) {
              const newVol = -60 + (i / steps) * (targetVolume + 60)
              audioService.setVolume(newVol)
              await new Promise((r) => setTimeout(r, stepTime))
            }
          }

          setCurrentTrack(currentTrack.id, false)
        } else {
          // Already loaded - sync state from service
          const state = audioService.getState()
          setIsPlaying(state.isPlaying)
          setCurrentTime(state.currentTime)
          setDuration(state.duration)
          setVolume(state.volume)
        }

        // Restore volume if not auto-playing
        if (!shouldAutoPlay || !settings.autoPlay) {
          const targetVolume = originalVolumeRef.current || 0
          audioService.setVolume(targetVolume)
        }
      } catch (error) {
        console.error('[MediaPlayer] Failed to load audio:', error)
        setCurrentTrack(currentTrack.id, false)
      }
    }

    loadAudio()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentTrack?.id, // Only reload when track ID changes
    // playbackStems removed from dependencies to prevent reload on stem change
    settings.autoPlay,
    settings.crossfade,
    settings.crossfadeDuration,
    settings.defaultQuality,
    shouldAutoPlay,
  ])

  const handlePlayPause = async () => {
    // Both MediaPlayer and Player can control playback - no conflict
    if (isLoadingTrack) return

    if (isPlaying) {
      audioService.pause()
    } else {
      await audioService.play()
    }
  }

  const handlePrevious = async () => {
    // Both MediaPlayer and Player can control navigation - audioService is single source of truth
    if (isLoadingTrack) return

    if (currentTime > 1) {
      audioService.seek(0)
      if (!isPlaying) await audioService.play()
      return
    }

    const displayQueue = isShuffled ? shuffledQueue : tracks
    const currentIndex = displayQueue.findIndex((t) => t.id === currentTrack?.id)
    const wasPlaying = isPlaying

    if (currentIndex > 0) {
      const prevTrack = displayQueue[currentIndex - 1]
      performCrossfade(prevTrack.id, wasPlaying)
    } else if (repeatMode === 'all') {
      const prevTrack = displayQueue[displayQueue.length - 1]
      performCrossfade(prevTrack.id, wasPlaying)
    } else {
      audioService.seek(0)
      if (!isPlaying) await audioService.play()
    }
  }

  const handleNext = async () => {
    // Both MediaPlayer and Player can control navigation - audioService is single source of truth
    if (isLoadingTrack) return

    const displayQueue = isShuffled ? shuffledQueue : tracks
    const currentIndex = displayQueue.findIndex((t) => t.id === currentTrack?.id)
    const wasPlaying = isPlaying

    if (currentIndex < displayQueue.length - 1) {
      const nextTrack = displayQueue[currentIndex + 1]
      performCrossfade(nextTrack.id, wasPlaying)
    } else if (repeatMode === 'all') {
      const nextTrack = displayQueue[0]
      performCrossfade(nextTrack.id, wasPlaying)
    } else {
      audioService.stop()
    }
  }

  const handleVolumeChange = (value: number[]) => {
    // Volume is shared across MediaPlayer and Player - audioService is single source of truth
    const db = (value[0] / 100) * 60 - 60
    setVolume(db)
    audioService.setVolume(db)
    setIsMuted(value[0] === 0)
    if (value[0] > 0) originalVolumeRef.current = db
  }

  const handleToggleMute = () => {
    if (isMuted) {
      // Unmute: restore original volume (or default to -10dB if it was too low)
      const restoreVolume = originalVolumeRef.current > -50 ? originalVolumeRef.current : -10
      audioService.setVolume(restoreVolume)
      setVolume(restoreVolume)
      setIsMuted(false)
    } else {
      // Mute: save current volume and set to -60dB
      originalVolumeRef.current = volume
      audioService.setVolume(-60)
      setVolume(-60)
      setIsMuted(true)
    }
  }

  const handleToggleShuffle = () => {
    setIsShuffled(!isShuffled)
  }

  const handleToggleRepeat = () => {
    const modes: Array<'off' | 'all' | 'one'> = ['off', 'all', 'one']
    const currentIndex = modes.indexOf(repeatMode)
    const nextMode = modes[(currentIndex + 1) % modes.length]
    setRepeatMode(nextMode)
  }

  const handleToggleQueue = () => {
    setShowQueue(!showQueue)
  }

  const volumePercent = Math.round(((volume + 60) / 60) * 100)

  if (!currentTrack) return null

  return (
    <div className={`w-full max-w-4xl mx-auto space-y-4 ${isOnPlayerPage ? 'hidden' : 'block'}`}>
      {/* Queue Panel (appears above when toggled) */}
      {showQueue && (
        <div
          className="rounded-apple glass overflow-hidden"
          ref={queueRef}
          style={{ maxWidth: '600px', margin: '0 auto' }}
        >
          {/* Queue Header */}
          <div
            className="flex items-center justify-between p-4 border-b"
            style={{ borderColor: 'var(--surface)' }}
          >
            <h3 className="font-semibold" style={{ color: 'var(--text)' }}>
              Queue
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-apple"
              onClick={() => setShowQueue(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Queue List */}
          <div className="max-h-96 overflow-y-auto">
            {shuffledQueue.length === 0 ? (
              <div className="p-8 text-center" style={{ color: 'var(--text-secondary)' }}>
                <p>No tracks in queue</p>
              </div>
            ) : (
              <div>
                {shuffledQueue.map((track, index) => {
                  const isCurrentTrack = track.id === currentTrack?.id

                  return (
                    <div
                      key={track.id}
                      className={`group flex items-center gap-3 p-3 cursor-pointer transition-opacity hover:opacity-80 border-b ${
                        isCurrentTrack ? 'surface-subtle' : ''
                      }`}
                      style={{
                        borderColor: 'var(--surface)',
                        ...(isCurrentTrack && {
                          backgroundColor: 'rgba(var(--primary-rgb), 0.1)',
                        }),
                      }}
                      onClick={() => setCurrentTrack(track.id, true)}
                    >
                      {/* Track Cover */}
                      <div
                        className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0"
                        style={{ backgroundColor: 'var(--surface)' }}
                      >
                        {track.coverArt ? (
                          <img
                            src={track.coverArt}
                            alt={track.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-lg" style={{ color: 'var(--text-secondary)' }}>
                              🎵
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Track Info */}
                      <div className="flex-1 min-w-0">
                        <p
                          className="font-medium text-sm truncate"
                          style={{ color: isCurrentTrack ? 'var(--primary)' : 'var(--text)' }}
                        >
                          {track.title}
                        </p>
                        <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                          {track.artist || 'Unknown Artist'} •{' '}
                          {formatDuration(track.duration * 1000)}
                        </p>
                      </div>

                      {/* Status Indicator */}
                      {isCurrentTrack && (
                        <div className="flex-shrink-0">
                          {isPlaying ? (
                            <div className="flex items-center gap-0.5">
                              <div
                                className="w-0.5 h-3 rounded-full animate-pulse"
                                style={{
                                  backgroundColor: 'var(--primary)',
                                  animationDelay: '0ms',
                                }}
                              />
                              <div
                                className="w-0.5 h-4 rounded-full animate-pulse"
                                style={{
                                  backgroundColor: 'var(--primary)',
                                  animationDelay: '150ms',
                                }}
                              />
                              <div
                                className="w-0.5 h-3 rounded-full animate-pulse"
                                style={{
                                  backgroundColor: 'var(--primary)',
                                  animationDelay: '300ms',
                                }}
                              />
                            </div>
                          ) : (
                            <Pause className="h-4 w-4" style={{ color: 'var(--primary)' }} />
                          )}
                        </div>
                      )}

                      {/* Track Number for non-current tracks */}
                      {!isCurrentTrack && (
                        <span
                          className="text-xs font-medium w-6 text-right flex-shrink-0"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {index + 1}
                        </span>
                      )}

                      {/* Remove from Queue Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        style={{ borderRadius: 'var(--radius-md)' }}
                        onClick={(e) => {
                          e.stopPropagation()
                          // Remove track from queue
                          const newQueue = shuffledQueue.filter((t) => t.id !== track.id)
                          setShuffledQueue(newQueue)
                          // If we're removing the current track, stop playback
                          if (isCurrentTrack) {
                            audioService.pause()
                            if (newQueue.length > 0) {
                              setCurrentTrack(newQueue[0].id, false)
                            } else {
                              setCurrentTrack(null, false)
                            }
                          }
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compact horizontal player */}
      <div
        className="glass-elevated transition-apple"
        style={{
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          paddingInline: 'var(--space-3)',
          gap: 'var(--space-3)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-xl)',
          maxWidth: '600px',
          margin: '0 auto',
        }}
      >
        {/* Left: Track Info + Cover - Click to open full player */}
        <div
          className="cursor-pointer transition-apple hover:opacity-80 flex items-center gap-2 min-w-0"
          style={{
            maxWidth: '144px',
            flex: '0 1 144px',
          }}
          onClick={() => {
            if (!isOnPlayerPage && currentTrack) {
              navigate(`/player/${currentTrack.id}`)
            }
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              flexShrink: 0,
              backgroundColor: 'var(--systemQuaternary)',
            }}
          >
            {currentTrack.coverArt ? (
              <img
                src={currentTrack.coverArt}
                alt={currentTrack.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ color: 'var(--systemTertiary)' }}
              >
                <span className="text-lg">🎵</span>
              </div>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="flex-1 min-w-0 overflow-hidden">
              <div className="h-6 w-full">
                <Marquee gradient={false} speed={40} delay={2} pauseOnHover>
                  <p
                    className="text-callout font-semibold pr-8"
                    style={{ color: 'var(--systemPrimary)' }}
                  >
                    {currentTrack.title}
                  </p>
                </Marquee>
              </div>
              <p className="text-footnote truncate" style={{ color: 'var(--systemSecondary)' }}>
                {currentTrack.artist || 'Unknown Artist'}
              </p>
            </div>
          </div>
        </div>

        {/* Center: Controls & Time */}
        <div
          className="flex items-center gap-4 min-w-0 flex-1 justify-center"
          style={{ minWidth: 0 }}
        >
          {/* Time */}
          <span
            className="text-footnote font-medium tabular-nums"
            style={{
              color: 'var(--systemPrimary)',
              flexShrink: 0,
              width: '40px',
              textAlign: 'right',
            }}
          >
            {formatDuration(currentTime)}
          </span>

          {/* Playback Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 transition-apple"
              style={{ borderRadius: 'var(--radius-md)' }}
              onClick={handlePrevious}
              disabled={tracks.length === 0}
            >
              <SkipBack className="h-4 w-4" />
            </Button>

            <Button
              size="icon"
              className="h-10 w-10 transition-apple active:scale-[0.95]"
              style={{
                backgroundColor: 'var(--keyColor)',
                color: 'white',
                borderRadius: 'var(--radius-full)',
              }}
              onClick={handlePlayPause}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" fill="currentColor" />
              ) : (
                <Play className="h-4 w-4 ml-0.5" fill="currentColor" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 transition-apple"
              style={{ borderRadius: 'var(--radius-md)' }}
              onClick={handleNext}
              disabled={tracks.length === 0}
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          {/* Duration */}
          <span
            className="text-footnote font-medium tabular-nums"
            style={{ color: 'var(--systemSecondary)', flexShrink: 0, width: '40px' }}
          >
            {formatDuration(duration)}
          </span>
        </div>

        {/* Right: Extra Controls */}
        <div
          className="flex items-center gap-2 min-w-0"
          style={{ flex: '0 1 180px', justifyContent: 'flex-end' }}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 transition-apple"
            style={{
              borderRadius: 'var(--radius-md)',
              color: isShuffled ? 'var(--keyColor)' : undefined,
            }}
            onClick={handleToggleShuffle}
          >
            <Shuffle className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 transition-apple"
            style={{
              borderRadius: 'var(--radius-md)',
              color: repeatMode !== 'off' ? 'var(--keyColor)' : undefined,
            }}
            onClick={handleToggleRepeat}
          >
            {repeatMode === 'one' ? (
              <div className="relative">
                <Repeat className="h-4 w-4" />
                <span className="absolute text-[10px] font-bold -top-1 -right-1">1</span>
              </div>
            ) : (
              <Repeat className="h-4 w-4" />
            )}
          </Button>

          <div
            style={{
              width: '1px',
              height: '24px',
              marginInline: 'var(--space-2)',
              backgroundColor: 'var(--systemQuaternary)',
            }}
          />

          {/* Volume Control with Popup Slider */}
          <div
            className="relative"
            onMouseEnter={() => {
              if (volumeTimeoutRef.current) {
                clearTimeout(volumeTimeoutRef.current)
              }
              setShowVolumeSlider(true)
            }}
            onMouseLeave={() => {
              volumeTimeoutRef.current = window.setTimeout(() => {
                setShowVolumeSlider(false)
              }, 300)
            }}
          >
            {showVolumeSlider && (
              <div
                className="absolute bottom-full right-0 glass-elevated animate-scale-in"
                style={{
                  marginBottom: 'var(--space-3)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-3)',
                  boxShadow: 'var(--shadow-lg)',
                  width: '48px',
                }}
              >
                {/* Simple Vertical Slider - như hình */}
                <div className="h-32 flex items-center justify-center">
                  <Slider
                    value={[isMuted ? 0 : volumePercent]}
                    max={100}
                    step={1}
                    onValueChange={handleVolumeChange}
                    orientation="vertical"
                    className="h-full"
                  />
                </div>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 transition-apple"
              style={{ borderRadius: 'var(--radius-md)' }}
              onClick={handleToggleMute}
            >
              {isMuted || volumePercent === 0 ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Queue Button with highlight */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 transition-apple"
            style={{
              borderRadius: 'var(--radius-md)',
              color: showQueue ? 'var(--keyColor)' : undefined,
            }}
            onClick={handleToggleQueue}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useCallback, useRef } from 'react'
import { audioService } from '@/services/audioService'
import { usePlaybackStore } from '@/store/playbackStore'

// Keyboard shortcut configuration
export interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  metaKey?: boolean
  action: () => void
  description: string
  category: 'playback' | 'navigation' | 'volume' | 'general'
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean
  // Custom callbacks
  onSeekForward?: (seconds: number) => void
  onSeekBackward?: (seconds: number) => void
  onVolumeUp?: (amount: number) => void
  onVolumeDown?: (amount: number) => void
  onToggleMute?: () => void
  onToggleFullscreen?: () => void
  onNextTrack?: () => void
  onPrevTrack?: () => void
  onToggleLoop?: () => void
  onEscape?: () => void
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const {
    enabled = true,
    onSeekForward,
    onSeekBackward,
    onVolumeUp,
    onVolumeDown,
    onToggleMute,
    onToggleFullscreen,
    onNextTrack,
    onPrevTrack,
    onToggleLoop,
    onEscape,
  } = options

  const { togglePlay, volume, setVolume, playNext, playPrevious, isPlaying } = usePlaybackStore()

  // Store previous volume for mute toggle
  const previousVolumeRef = useRef(volume)

  // Default playback toggle
  const handleTogglePlay = useCallback(() => {
    togglePlay()
    if (!isPlaying) {
      audioService.play()
    } else {
      audioService.pause()
    }
  }, [togglePlay, isPlaying])

  // Seek forward (default: 5 seconds)
  const handleSeekForward = useCallback(
    (seconds = 5) => {
      if (onSeekForward) {
        onSeekForward(seconds)
      } else {
        const currentTime = audioService.getCurrentTime()
        const duration = audioService.getDuration()
        const newTime = Math.min(currentTime + seconds, duration)
        audioService.seek(newTime)
      }
    },
    [onSeekForward]
  )

  // Seek backward (default: 5 seconds)
  const handleSeekBackward = useCallback(
    (seconds = 5) => {
      if (onSeekBackward) {
        onSeekBackward(seconds)
      } else {
        const currentTime = audioService.getCurrentTime()
        const newTime = Math.max(currentTime - seconds, 0)
        audioService.seek(newTime)
      }
    },
    [onSeekBackward]
  )

  // Volume up (default: 10%)
  const handleVolumeUp = useCallback(
    (amount = 10) => {
      if (onVolumeUp) {
        onVolumeUp(amount)
      } else {
        const newVolume = Math.min(volume + amount, 100)
        setVolume(newVolume)
        audioService.setVolume(newVolume)
      }
    },
    [onVolumeUp, volume, setVolume]
  )

  // Volume down (default: 10%)
  const handleVolumeDown = useCallback(
    (amount = 10) => {
      if (onVolumeDown) {
        onVolumeDown(amount)
      } else {
        const newVolume = Math.max(volume - amount, 0)
        setVolume(newVolume)
        audioService.setVolume(newVolume)
      }
    },
    [onVolumeDown, volume, setVolume]
  )

  // Toggle mute
  const handleToggleMute = useCallback(() => {
    if (onToggleMute) {
      onToggleMute()
    } else {
      if (volume > 0) {
        previousVolumeRef.current = volume
        setVolume(0)
        audioService.setVolume(0)
      } else {
        const restoredVolume = previousVolumeRef.current || 100
        setVolume(restoredVolume)
        audioService.setVolume(restoredVolume)
      }
    }
  }, [onToggleMute, volume, setVolume])

  // Next/Previous track
  const handleNextTrack = useCallback(() => {
    if (onNextTrack) {
      onNextTrack()
    } else {
      playNext()
    }
  }, [onNextTrack, playNext])

  const handlePrevTrack = useCallback(() => {
    if (onPrevTrack) {
      onPrevTrack()
    } else {
      playPrevious()
    }
  }, [onPrevTrack, playPrevious])

  // Keyboard event handler
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Ignore if typing in an input, textarea, or contenteditable
      const target = event.target as HTMLElement
      const isInputField =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

      // Allow Space to work in input fields if they're not focused on text inputs
      const isTextInput =
        isInputField &&
        (target as HTMLInputElement).type !== 'range' &&
        (target as HTMLInputElement).type !== 'button' &&
        (target as HTMLInputElement).type !== 'checkbox'

      // Key mappings
      const key = event.key.toLowerCase()
      const { ctrlKey, shiftKey, metaKey } = event

      // Define shortcuts
      const shortcuts: Record<string, () => void> = {
        // Playback controls
        ' ': () => {
          if (isTextInput) return
          event.preventDefault()
          handleTogglePlay()
        },
        k: () => {
          if (isTextInput) return
          event.preventDefault()
          handleTogglePlay()
        },

        // Seek controls
        arrowright: () => {
          if (isTextInput) return
          event.preventDefault()
          handleSeekForward(shiftKey ? 10 : 5)
        },
        l: () => {
          if (isTextInput) return
          event.preventDefault()
          handleSeekForward(shiftKey ? 10 : 5)
        },
        arrowleft: () => {
          if (isTextInput) return
          event.preventDefault()
          handleSeekBackward(shiftKey ? 10 : 5)
        },
        j: () => {
          if (isTextInput) return
          event.preventDefault()
          handleSeekBackward(shiftKey ? 10 : 5)
        },

        // Volume controls
        arrowup: () => {
          if (isTextInput) return
          event.preventDefault()
          handleVolumeUp(shiftKey ? 20 : 10)
        },
        arrowdown: () => {
          if (isTextInput) return
          event.preventDefault()
          handleVolumeDown(shiftKey ? 20 : 10)
        },
        m: () => {
          if (isTextInput) return
          event.preventDefault()
          handleToggleMute()
        },

        // Track navigation
        n: () => {
          if (isTextInput) return
          if (shiftKey) {
            event.preventDefault()
            handleNextTrack()
          }
        },
        p: () => {
          if (isTextInput) return
          if (shiftKey) {
            event.preventDefault()
            handlePrevTrack()
          }
        },

        // Jump to start/end
        home: () => {
          if (isTextInput) return
          event.preventDefault()
          audioService.seek(0)
        },
        '0': () => {
          if (isTextInput) return
          event.preventDefault()
          audioService.seek(0)
        },
        end: () => {
          if (isTextInput) return
          event.preventDefault()
          const duration = audioService.getDuration()
          audioService.seek(duration - 0.5)
        },

        // Number keys for position jumps (1-9 = 10%-90%)
        '1': () => {
          if (isTextInput) return
          event.preventDefault()
          const duration = audioService.getDuration()
          audioService.seek(duration * 0.1)
        },
        '2': () => {
          if (isTextInput) return
          event.preventDefault()
          const duration = audioService.getDuration()
          audioService.seek(duration * 0.2)
        },
        '3': () => {
          if (isTextInput) return
          event.preventDefault()
          const duration = audioService.getDuration()
          audioService.seek(duration * 0.3)
        },
        '4': () => {
          if (isTextInput) return
          event.preventDefault()
          const duration = audioService.getDuration()
          audioService.seek(duration * 0.4)
        },
        '5': () => {
          if (isTextInput) return
          event.preventDefault()
          const duration = audioService.getDuration()
          audioService.seek(duration * 0.5)
        },
        '6': () => {
          if (isTextInput) return
          event.preventDefault()
          const duration = audioService.getDuration()
          audioService.seek(duration * 0.6)
        },
        '7': () => {
          if (isTextInput) return
          event.preventDefault()
          const duration = audioService.getDuration()
          audioService.seek(duration * 0.7)
        },
        '8': () => {
          if (isTextInput) return
          event.preventDefault()
          const duration = audioService.getDuration()
          audioService.seek(duration * 0.8)
        },
        '9': () => {
          if (isTextInput) return
          event.preventDefault()
          const duration = audioService.getDuration()
          audioService.seek(duration * 0.9)
        },

        // Fullscreen toggle
        f: () => {
          if (isTextInput) return
          event.preventDefault()
          if (onToggleFullscreen) {
            onToggleFullscreen()
          }
        },

        // Loop toggle
        r: () => {
          if (isTextInput) return
          if (!ctrlKey && !metaKey) {
            event.preventDefault()
            if (onToggleLoop) {
              onToggleLoop()
            }
          }
        },

        // Escape
        escape: () => {
          event.preventDefault()
          if (onEscape) {
            onEscape()
          }
        },
      }

      // Execute shortcut
      const handler = shortcuts[key]
      if (handler) {
        handler()
      }
    },
    [
      handleTogglePlay,
      handleSeekForward,
      handleSeekBackward,
      handleVolumeUp,
      handleVolumeDown,
      handleToggleMute,
      handleNextTrack,
      handlePrevTrack,
      onToggleFullscreen,
      onToggleLoop,
      onEscape,
    ]
  )

  // Attach event listener
  useEffect(() => {
    if (!enabled) return

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled, handleKeyDown])

  // Return available shortcuts for documentation
  return {
    shortcuts: [
      { key: 'Space / K', description: 'Play/Pause', category: 'playback' },
      { key: '→ / L', description: 'Seek forward 5s (Shift: 10s)', category: 'playback' },
      { key: '← / J', description: 'Seek backward 5s (Shift: 10s)', category: 'playback' },
      { key: '↑', description: 'Volume up 10% (Shift: 20%)', category: 'volume' },
      { key: '↓', description: 'Volume down 10% (Shift: 20%)', category: 'volume' },
      { key: 'M', description: 'Mute/Unmute', category: 'volume' },
      { key: 'Shift + N', description: 'Next track', category: 'navigation' },
      { key: 'Shift + P', description: 'Previous track', category: 'navigation' },
      { key: 'Home / 0', description: 'Jump to start', category: 'playback' },
      { key: 'End', description: 'Jump to end', category: 'playback' },
      { key: '1-9', description: 'Jump to 10%-90% position', category: 'playback' },
      { key: 'F', description: 'Toggle fullscreen', category: 'general' },
      { key: 'R', description: 'Toggle loop', category: 'playback' },
      { key: 'Escape', description: 'Close dialog/Exit', category: 'general' },
    ] as const,
  }
}

// Export shortcut documentation for UI display
export const KEYBOARD_SHORTCUTS = {
  playback: [
    { key: 'Space / K', description: 'Play/Pause' },
    { key: '→ / L', description: 'Seek forward 5s (Shift: 10s)' },
    { key: '← / J', description: 'Seek backward 5s (Shift: 10s)' },
    { key: 'Home / 0', description: 'Jump to start' },
    { key: 'End', description: 'Jump to end' },
    { key: '1-9', description: 'Jump to 10%-90% position' },
    { key: 'R', description: 'Toggle loop' },
  ],
  volume: [
    { key: '↑', description: 'Volume up 10% (Shift: 20%)' },
    { key: '↓', description: 'Volume down 10% (Shift: 20%)' },
    { key: 'M', description: 'Mute/Unmute' },
  ],
  navigation: [
    { key: 'Shift + N', description: 'Next track' },
    { key: 'Shift + P', description: 'Previous track' },
  ],
  general: [
    { key: 'F', description: 'Toggle fullscreen' },
    { key: 'Escape', description: 'Close dialog/Exit' },
  ],
}

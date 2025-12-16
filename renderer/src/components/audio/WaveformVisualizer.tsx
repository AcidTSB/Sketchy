// src/components/audio/WaveformVisualizer.tsx (Simplified - Display Only)

import { useEffect, useRef, useState } from 'react'
import WaveSurfer from 'wavesurfer.js'
import { audioService } from '@/services/audioService'

interface WaveformVisualizerProps {
  audioUrl: string | null
  onSeek: (time: number) => void
  height?: number
  barWidth?: number
  barGap?: number
  barRadius?: number
}

export function WaveformVisualizer({
  audioUrl,
  onSeek,
  height = 150,
  barWidth = 3,
  barGap = 2,
  barRadius = 3,
}: WaveformVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wavesurferRef = useRef<WaveSurfer | null>(null)
  const [isReady, setIsReady] = useState(false)
  const isReadyRef = useRef(false) // Track ready state for event handlers

  // 1. Initialize WaveSurfer ONCE on mount
  useEffect(() => {
    if (!containerRef.current) return

    const ws = WaveSurfer.create({
      container: containerRef.current,
      height: height,
      waveColor: 'rgba(255, 255, 255, 0.2)',
      progressColor: 'var(--primary)',
      cursorColor: 'var(--primary)',
      barWidth: barWidth,
      barGap: barGap,
      barRadius: barRadius,
      cursorWidth: 2,
      normalize: true,
      interact: true,
      // CRITICAL: Don't let WaveSurfer control audio playback
      backend: 'WebAudio',
      // Prevent WaveSurfer from auto-playing
      autoplay: false,
      autoCenter: false,
      // Don't create audio element - we only use it for visualization
      media: undefined,
    })

    wavesurferRef.current = ws

    // Handle user seeking
    ws.on('interaction', () => {
      // Chỉ cho phép seek khi waveform đã sẵn sàng
      if (!isReadyRef.current) {
        return
      }

      const duration = ws.getDuration()
      if (duration > 0) {
        const newTime = ws.getCurrentTime()
        onSeek(newTime)
      }
    })

    ws.on('ready', () => {
      isReadyRef.current = true
      setIsReady(true)

      // Ensure WaveSurfer is paused (never auto-play)
      if (ws.isPlaying()) {
        ws.pause()
      }
    })

    ws.on('error', (err) => {
      console.error('[WaveformVisualizer] Error:', err)
      isReadyRef.current = false
      setIsReady(false)
    })

    return () => {
      ws.destroy()
    }
  }, [height, barWidth, barGap, barRadius, onSeek])

  // 2. Load audio when URL changes
  useEffect(() => {
    const ws = wavesurferRef.current
    if (!ws) return

    // Create abort controller for this load
    const controller = new AbortController()
    let isMounted = true

    if (audioUrl) {
      // Reset ready state BEFORE loading
      isReadyRef.current = false
      setIsReady(false)

      // Load with abort capability
      ws.load(audioUrl)
        .then(() => {
          if (!isMounted || controller.signal.aborted) {
            return
          }
        })
        .catch((err) => {
          if (!controller.signal.aborted) {
            console.error('[WaveformVisualizer] Load error:', err)
          }
        })
    } else {
      ws.empty()
      isReadyRef.current = false
      setIsReady(false)
    }

    // Cleanup: Abort load if component unmounts or URL changes
    return () => {
      isMounted = false
      controller.abort()
      // Reset ready state on cleanup
      isReadyRef.current = false
    }
  }, [audioUrl])

  // 3. Update waveform progress from audioService (DISPLAY ONLY)
  useEffect(() => {
    if (!isReady) return

    const unsubscribe = audioService.subscribe((state) => {
      const ws = wavesurferRef.current
      if (!ws) return

      // Only update visual progress, don't control playback
      if (state.currentTime !== undefined) {
        const duration = ws.getDuration()
        if (duration > 0) {
          const progress = state.currentTime / duration

          // [SỬA LỖI] Xoá bỏ isSeekingRef.current = true
          // isSeekingRef.current = true

          // Use seekTo to update visual progress without triggering audio playback
          // Hàm này KHÔNG kích hoạt 'interaction', nên nó an toàn
          ws.seekTo(progress)

          // [SỬA LỖI] Xoá bỏ setTimeout
          // setTimeout(() => {
          //   isSeekingRef.current = false
          // }, 50)
        }
      }
    })

    return unsubscribe
  }, [isReady])

  return <div ref={containerRef} className="w-full h-full" style={{ minHeight: `${height}px` }} />
}

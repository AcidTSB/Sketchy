import { useEffect, useRef } from 'react'
import WaveSurfer from 'wavesurfer.js'
import { usePlaybackStore } from '@/store/playbackStore'

interface WaveformProps {
  waveformData?: number[]
  audioUrl?: string
  height?: number
}

export function Waveform({ waveformData, audioUrl, height = 128 }: WaveformProps) {
  const waveformRef = useRef<HTMLDivElement>(null)
  const wavesurfer = useRef<WaveSurfer | null>(null)

  const { isPlaying, setCurrentTime, setDuration } = usePlaybackStore()

  useEffect(() => {
    if (!waveformRef.current) return

    // Initialize WaveSurfer
    wavesurfer.current = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#9CA3AF',
      progressColor: '#FFD54F',
      cursorColor: '#FFD54F',
      barWidth: 2,
      barRadius: 3,
      cursorWidth: 2,
      height,
      barGap: 2,
      normalize: true,
      interact: true,
    })

    // Load audio or mock data
    if (audioUrl) {
      wavesurfer.current.load(audioUrl)
    } else if (waveformData) {
      // Create mock audio buffer for waveform visualization
      wavesurfer.current.loadBlob(createMockAudioBlob(waveformData))
    }

    // Event listeners
    wavesurfer.current.on('ready', () => {
      if (wavesurfer.current) {
        setDuration(wavesurfer.current.getDuration())
      }
    })

    wavesurfer.current.on('audioprocess', () => {
      if (wavesurfer.current) {
        setCurrentTime(wavesurfer.current.getCurrentTime())
      }
    })

    wavesurfer.current.on('interaction', () => {
      if (wavesurfer.current) {
        setCurrentTime(wavesurfer.current.getCurrentTime())
      }
    })

    return () => {
      wavesurfer.current?.destroy()
    }
  }, [audioUrl, waveformData, height, setCurrentTime, setDuration])

  useEffect(() => {
    if (!wavesurfer.current) return

    if (isPlaying) {
      wavesurfer.current.play()
    } else {
      wavesurfer.current.pause()
    }
  }, [isPlaying])

  return (
    <div className="w-full">
      <div ref={waveformRef} className="w-full" />
    </div>
  )
}

// Helper to create mock audio blob
function createMockAudioBlob(waveformData: number[]): Blob {
  const sampleRate = 44100
  const duration = 180 // 3 minutes mock
  const length = sampleRate * duration
  const buffer = new Float32Array(length)

  // Generate simple tone based on waveform data
  for (let i = 0; i < length; i++) {
    const dataIndex = Math.floor((i / length) * waveformData.length)
    buffer[i] = waveformData[dataIndex] * 0.5 * Math.sin((2 * Math.PI * 440 * i) / sampleRate)
  }

  // Create WAV file
  const wavData = encodeWAV(buffer, sampleRate)
  return new Blob([wavData], { type: 'audio/wav' })
}

function encodeWAV(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)

  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i))
    }
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeString(36, 'data')
  view.setUint32(40, samples.length * 2, true)

  const volume = 0.8
  let offset = 44
  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff * volume, true)
    offset += 2
  }

  return buffer
}

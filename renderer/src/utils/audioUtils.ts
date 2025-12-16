/**
 * Audio utility functions for metadata extraction and processing
 */

export interface AudioMetadata {
  duration: number
  sampleRate: number
  numberOfChannels: number
  bitrate?: number
}

/**
 * Extract metadata from audio file
 */
export async function extractAudioMetadata(file: File): Promise<AudioMetadata> {
  return new Promise((resolve, reject) => {
    const audio = new Audio()
    const url = URL.createObjectURL(file)

    audio.addEventListener('loadedmetadata', () => {
      const metadata: AudioMetadata = {
        duration: audio.duration,
        sampleRate: 44100, // Default, actual value requires Web Audio API
        numberOfChannels: 2, // Default stereo
      }

      URL.revokeObjectURL(url)
      resolve(metadata)
    })

    audio.addEventListener('error', () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load audio metadata'))
    })

    audio.src = url
  })
}

/**
 * Extract waveform data from audio file using Web Audio API
 */
export async function extractWaveformData(
  audioBuffer: AudioBuffer,
  targetSamples: number = 200
): Promise<number[]> {
  const rawData = audioBuffer.getChannelData(0) // Use first channel
  const samples = targetSamples
  const blockSize = Math.floor(rawData.length / samples)
  const waveform: number[] = []

  for (let i = 0; i < samples; i++) {
    const start = blockSize * i
    let sum = 0

    for (let j = 0; j < blockSize; j++) {
      sum += Math.abs(rawData[start + j])
    }

    waveform.push(sum / blockSize)
  }

  // Normalize to 0-1 range
  const max = Math.max(...waveform)
  return waveform.map((v) => v / max)
}

/**
 * Generate waveform from audio file
 */
export async function generateWaveformFromFile(
  file: File,
  samples: number = 200
): Promise<number[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer
        const audioContext = new AudioContext()
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
        const waveform = await extractWaveformData(audioBuffer, samples)
        audioContext.close()
        resolve(waveform)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Format file size to human readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Validate audio file format
 */
export function isValidAudioFile(file: File): boolean {
  const validTypes = [
    'audio/mpeg',
    'audio/wav',
    'audio/flac',
    'audio/mp4',
    'audio/webm',
    'audio/ogg',
  ]
  const validExtensions = /\.(mp3|wav|flac|m4a|webm|ogg)$/i

  return validTypes.includes(file.type) || validExtensions.test(file.name)
}

/**
 * Get audio file extension
 */
export function getAudioExtension(filename: string): string {
  const match = filename.match(/\.([^.]+)$/)
  return match ? match[1].toLowerCase() : ''
}

/**
 * Convert blob to base64
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Download audio file
 */
export function downloadAudio(url: string, filename: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

/**
 * Calculate audio quality from bitrate
 */
export function getAudioQuality(bitrate: number): string {
  if (bitrate >= 320000) return 'Excellent'
  if (bitrate >= 256000) return 'Very Good'
  if (bitrate >= 192000) return 'Good'
  if (bitrate >= 128000) return 'Fair'
  return 'Low'
}

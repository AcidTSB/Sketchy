/**
 * Recording Service - Handles audio recording functionality
 * Supports device selection, recording, and audio processing
 */

export interface AudioDevice {
  deviceId: string
  label: string
  kind: 'audioinput' | 'audiooutput'
}

export interface RecordingSettings {
  inputDeviceId: string
  outputDeviceId: string
  sampleRate: 44100 | 48000 | 96000
  bitDepth: 16 | 24 | 32
  channels: 1 | 2
  format: 'wav' | 'mp3' | 'flac'
}

export interface RecordingState {
  isRecording: boolean
  isPaused: boolean
  duration: number
  audioLevel: number
  waveformData: number[]
}

type RecordingCallback = (state: Partial<RecordingState>) => void

class RecordingService {
  private mediaRecorder: MediaRecorder | null = null
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private mediaStream: MediaStream | null = null
  private chunks: Blob[] = []
  private startTime: number = 0
  private pausedDuration: number = 0
  private animationFrame: number = 0
  private subscribers: Set<RecordingCallback> = new Set()

  private state: RecordingState = {
    isRecording: false,
    isPaused: false,
    duration: 0,
    audioLevel: 0,
    waveformData: [],
  }

  private settings: RecordingSettings = {
    inputDeviceId: 'default',
    outputDeviceId: 'default',
    sampleRate: 48000,
    bitDepth: 24,
    channels: 2,
    format: 'wav',
  }

  /**
   * Get list of available audio input devices (microphones)
   */
  async getInputDevices(): Promise<AudioDevice[]> {
    try {
      // Request permission first to get device labels
      await navigator.mediaDevices.getUserMedia({ audio: true })

      const devices = await navigator.mediaDevices.enumerateDevices()
      return devices
        .filter((device) => device.kind === 'audioinput')
        .map((device) => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone ${device.deviceId.slice(0, 8)}`,
          kind: 'audioinput' as const,
        }))
    } catch (error) {
      console.error('[RecordingService] Failed to get input devices:', error)
      return []
    }
  }

  /**
   * Get list of available audio output devices (speakers)
   */
  async getOutputDevices(): Promise<AudioDevice[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      return devices
        .filter((device) => device.kind === 'audiooutput')
        .map((device) => ({
          deviceId: device.deviceId,
          label: device.label || `Speaker ${device.deviceId.slice(0, 8)}`,
          kind: 'audiooutput' as const,
        }))
    } catch (error) {
      console.error('[RecordingService] Failed to get output devices:', error)
      return []
    }
  }

  /**
   * Update recording settings
   */
  updateSettings(settings: Partial<RecordingSettings>): void {
    this.settings = { ...this.settings, ...settings }
    this.saveSettingsToStorage()
  }

  /**
   * Get current recording settings
   */
  getSettings(): RecordingSettings {
    return { ...this.settings }
  }

  /**
   * Load settings from localStorage
   */
  loadSettingsFromStorage(): void {
    try {
      const stored = localStorage.getItem('recording-settings')
      if (stored) {
        this.settings = { ...this.settings, ...JSON.parse(stored) }
      }
    } catch (error) {
      console.error('[RecordingService] Failed to load settings:', error)
    }
  }

  /**
   * Save settings to localStorage
   */
  private saveSettingsToStorage(): void {
    try {
      localStorage.setItem('recording-settings', JSON.stringify(this.settings))
    } catch (error) {
      console.error('[RecordingService] Failed to save settings:', error)
    }
  }

  /**
   * Subscribe to recording state changes
   */
  subscribe(callback: RecordingCallback): () => void {
    this.subscribers.add(callback)
    // Immediately send current state
    callback(this.state)
    return () => {
      this.subscribers.delete(callback)
    }
  }

  private notify(state: Partial<RecordingState>): void {
    this.state = { ...this.state, ...state }
    this.subscribers.forEach((cb) => cb(state))
  }

  /**
   * Start recording
   */
  async startRecording(): Promise<void> {
    try {
      // Request audio stream with selected device
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId:
            this.settings.inputDeviceId !== 'default'
              ? { exact: this.settings.inputDeviceId }
              : undefined,
          sampleRate: this.settings.sampleRate,
          channelCount: this.settings.channels,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints)

      // Setup audio context for visualization
      this.audioContext = new AudioContext({ sampleRate: this.settings.sampleRate })

      // Resume AudioContext if suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume()
      }

      const source = this.audioContext.createMediaStreamSource(this.mediaStream)
      this.analyser = this.audioContext.createAnalyser()
      this.analyser.fftSize = 256
      source.connect(this.analyser)

      // Determine MIME type based on format
      let mimeType = 'audio/webm;codecs=opus'
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus'
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus'
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4'
      }

      // Create media recorder
      this.mediaRecorder = new MediaRecorder(this.mediaStream, {
        mimeType,
        audioBitsPerSecond:
          this.settings.bitDepth * this.settings.sampleRate * this.settings.channels,
      })

      this.chunks = []

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data)
        }
      }

      this.mediaRecorder.start(100) // Collect data every 100ms
      this.startTime = Date.now()
      this.pausedDuration = 0

      // Notify initial state immediately
      this.notify({
        isRecording: true,
        isPaused: false,
        duration: 0,
        waveformData: [],
      })

      // Start visualization loop
      // Use setTimeout to ensure state update has propagated and analyser is ready
      setTimeout(() => this.startVisualization(), 0)
    } catch (error) {
      console.error('[RecordingService] Failed to start recording:', error)
      throw error
    }
  }

  /**
   * Pause recording
   */
  pauseRecording(): void {
    if (this.mediaRecorder && this.state.isRecording && !this.state.isPaused) {
      this.mediaRecorder.pause()
      this.pausedDuration += Date.now() - this.startTime
      this.notify({ isPaused: true })
    }
  }

  /**
   * Resume recording
   */
  resumeRecording(): void {
    if (this.mediaRecorder && this.state.isRecording && this.state.isPaused) {
      this.mediaRecorder.resume()
      this.startTime = Date.now()
      this.notify({ isPaused: false })
    }
  }

  /**
   * Stop recording and return the recorded audio blob
   */
  async stopRecording(): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || !this.state.isRecording) {
        resolve(null)
        return
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: this.mediaRecorder?.mimeType || 'audio/webm' })
        this.cleanup()
        resolve(blob)
      }

      this.mediaRecorder.stop()
      this.stopVisualization()

      this.notify({
        isRecording: false,
        isPaused: false,
        audioLevel: 0,
      })
    })
  }

  /**
   * Cancel recording without saving
   */
  cancelRecording(): void {
    if (this.mediaRecorder && this.state.isRecording) {
      this.mediaRecorder.stop()
      this.stopVisualization()
      this.cleanup()

      this.notify({
        isRecording: false,
        isPaused: false,
        duration: 0,
        audioLevel: 0,
        waveformData: [],
      })
    }
  }

  /**
   * Get current recording state
   */
  getState(): RecordingState {
    return { ...this.state }
  }

  /**
   * Start visualization loop
   */
  private startVisualization(): void {
    const update = () => {
      if (!this.analyser || !this.state.isRecording) {
        return
      }

      // Update duration
      const now = Date.now()
      const elapsed = now - this.startTime
      const duration = this.state.isPaused ? this.pausedDuration : this.pausedDuration + elapsed

      // Get frequency data
      const dataArray = new Uint8Array(this.analyser.frequencyBinCount)
      this.analyser.getByteFrequencyData(dataArray)

      // Calculate audio level (RMS)
      const sum = dataArray.reduce((acc, val) => acc + val * val, 0)
      const rms = Math.sqrt(sum / dataArray.length)
      const audioLevel = rms / 255

      // Get time domain data for waveform
      const timeDomainData = new Uint8Array(this.analyser.fftSize)
      this.analyser.getByteTimeDomainData(timeDomainData)

      // Sample waveform data (take every Nth sample)
      const sampleStep = Math.floor(timeDomainData.length / 50)
      const waveformSample: number[] = []
      for (let i = 0; i < timeDomainData.length; i += sampleStep) {
        // Normalize to -1 to 1 range
        const normalized = (timeDomainData[i] - 128) / 128
        waveformSample.push(Math.abs(normalized))
      }

      // Update state
      // IMPORTANT: duration is in SECONDS for the UI
      this.notify({
        duration: duration / 1000,
        audioLevel,
        waveformData: [...this.state.waveformData, audioLevel].slice(-100),
      })

      this.animationFrame = requestAnimationFrame(update)
    }

    update()
  }

  /**
   * Stop visualization loop
   */
  private stopVisualization(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame)
      this.animationFrame = 0
    }
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop())
      this.mediaStream = null
    }

    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }

    this.analyser = null
    this.mediaRecorder = null
    this.chunks = []
  }

  /**
   * Convert blob to ArrayBuffer for saving
   */
  async blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
    return await blob.arrayBuffer()
  }

  /**
   * Save recording to file system via Electron API
   */
  async saveRecording(
    blob: Blob,
    projectId: string,
    filename: string
  ): Promise<{
    success: boolean
    path?: string
    error?: string
    trackId?: number
    data?: unknown
  }> {
    try {
      const arrayBuffer = await this.blobToArrayBuffer(blob)

      // Convert to base64
      const uint8Array = new Uint8Array(arrayBuffer)
      let binary = ''
      for (let i = 0; i < uint8Array.byteLength; i++) {
        binary += String.fromCharCode(uint8Array[i])
      }
      const base64Data = btoa(binary)

      // Calculate duration (approximate from blob size and settings)
      const bitsPerSecond =
        this.settings.bitDepth * this.settings.sampleRate * this.settings.channels
      const durationMs = Math.floor(((blob.size * 8) / bitsPerSecond) * 1000)

      // Use Electron API to save the file
      const result = await window.electronAPI.saveRecording({
        projectId: parseInt(projectId, 10),
        name: filename,
        durationMs: durationMs || 0,
        audioData: base64Data,
        mimeType: blob.type,
      })

      if (result.success && result.data) {
        // Return track info instead of file path
        return {
          success: true,
          path: result.data.latestVersion?.storedPath || result.data.latestVersion?.originalPath,
          trackId: result.data.id,
          data: result.data,
        }
      } else {
        return { success: false, error: result.error || 'Failed to save recording' }
      }
    } catch (error) {
      console.error('[RecordingService] Failed to save recording:', error)
      return { success: false, error: String(error) }
    }
  }

  /**
   * Test microphone input
   */
  async testMicrophone(deviceId?: string): Promise<{ success: boolean; level: number }> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
        },
      })

      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)

      const dataArray = new Uint8Array(analyser.frequencyBinCount)

      // Wait a bit for audio data
      await new Promise((resolve) => setTimeout(resolve, 100))

      analyser.getByteFrequencyData(dataArray)
      const sum = dataArray.reduce((acc, val) => acc + val, 0)
      const level = sum / (dataArray.length * 255)

      // Cleanup
      stream.getTracks().forEach((track) => track.stop())
      audioContext.close()

      return { success: true, level }
    } catch (error) {
      console.error('[RecordingService] Microphone test failed:', error)
      return { success: false, level: 0 }
    }
  }
}

// Create singleton instance
export const recordingService = new RecordingService()

// Load settings on initialization
recordingService.loadSettingsFromStorage()

// src/services/audioService.ts

import * as Tone from 'tone'

export interface AudioState {
  isPlaying: boolean
  currentTime: number
  duration: number
  speed: number
  pitch: number
  volume: number
  eqLow?: number
  eqMid?: number
  eqHigh?: number
  reverb?: number
  currentTrackId?: string | null
}

export interface StemInfo {
  vocals?: string
  drums?: string
  bass?: string
  other?: string
}

type StemType = 'vocals' | 'drums' | 'bass' | 'other'

class AudioService {
  // Single-file mode
  private player: Tone.Player
  private pitchShift: Tone.PitchShift
  private volume: Tone.Volume

  // Audio Effects
  private eq3: Tone.EQ3
  private reverb: Tone.Reverb

  // Multi-stem mode
  private stemPlayers: Map<StemType, Tone.Player> = new Map()
  private stemVolumes: Map<StemType, Tone.Volume> = new Map()
  private stemPitchShifts: Map<StemType, Tone.PitchShift> = new Map()
  private stemEQ3s: Map<StemType, Tone.EQ3> = new Map()
  private stemReverbs: Map<StemType, Tone.Reverb> = new Map()
  private isStemMode: boolean = false

  // Effects state
  private effectsEnabled: boolean = false

  // Loading state
  private isLoading: boolean = false
  private currentLoadUrl: string | null = null
  private currentAudioUrl: string | null = null // Track loaded audio URL
  private currentTrackId: string | null = null // Track currently loaded track ID

  // [SỬA LỖI] Cờ `isSeeking` và `isPausing` PHẢI nằm ở đây
  private isSeeking: boolean = false // Flag to prevent onstop during seek
  private isPausing: boolean = false // Flag to prevent onstop during pause

  private listeners: Set<(state: Partial<AudioState>) => void> = new Set()
  private endedListeners: Set<() => void> = new Set() // New: Listeners for track end
  private updateInterval: number | null = null
  private startTime: number = 0
  private pausedAt: number = 0

  constructor() {
    // Initialize audio effects
    this.eq3 = new Tone.EQ3({ low: 0, mid: 0, high: 0, lowFrequency: 400, highFrequency: 2500 })
    this.reverb = new Tone.Reverb({ decay: 1.5, wet: 0 })

    // Initialize single-file chain: Player → PitchShift → Volume → Destination (bypass effects by default)
    this.player = new Tone.Player()
    this.pitchShift = new Tone.PitchShift(0)
    this.volume = new Tone.Volume(0)

    // Default chain WITHOUT effects (effects disabled by default)
    this.player.chain(this.pitchShift, this.volume, Tone.Destination)

    // [SỬA LỖI 1] Cập nhật logic `onstop`
    this.player.onstop = () => {
      // Nếu onstop bị gọi khi đang seek,
      // nó chỉ có nhiệm vụ dọn dẹp cờ isSeeking.
      if (this.isSeeking) {
        this.isSeeking = false // Dọn dẹp cờ
        return // KHÔNG gửi notifyListeners({ isPlaying: false })
      }

      // Cờ isPausing vẫn hoạt động như cũ
      if (this.isPausing) {
        return
      }

      // Chỉ chạy nếu KHÔNG PHẢI seek hoặc pause
      const currentTime = this.getCurrentTime()
      const duration = this.getDuration()

      // Nếu dừng ở gần cuối, coi như hết bài
      if (Math.abs(currentTime - duration) < 0.1) {
        this.pausedAt = 0
        this.startTime = 0
        this.notifyListeners({ isPlaying: false, currentTime: 0 })
        this.notifyEnded() // Notify track ended
      } else {
        // Dừng ở giữa chừng (ví dụ: lỗi)
        this.notifyListeners({ isPlaying: false })
      }
      this.stopTimeUpdates()
    }
    this.initializeAudioContext()
  }

  private async initializeAudioContext() {
    await Tone.start()
  }

  private notifyListeners(state: Partial<AudioState>) {
    this.listeners.forEach((listener) => listener(state))
  }

  private notifyEnded() {
    this.endedListeners.forEach((listener) => listener())
  }

  public onEnded(listener: () => void) {
    this.endedListeners.add(listener)
  }

  public offEnded(listener: () => void) {
    this.endedListeners.delete(listener)
  }

  /**
   * Get the currently loaded track ID
   */
  public getCurrentTrackId(): string | null {
    return this.currentTrackId
  }

  public subscribe(listener: (state: Partial<AudioState>) => void) {
    this.listeners.add(listener)

    // Trả về một hàm void (để unsubscribe)
    return () => {
      this.listeners.delete(listener)
    }
  }

  public async loadAudio(
    url: string,
    trackId: string,
    shouldAutoPlay: boolean = false
  ): Promise<void> {
    try {
      // Prevent race condition: If already loading this URL, skip
      if (this.isLoading && this.currentLoadUrl === url) {
        return
      }

      // Check if already loaded this track with this URL
      if (
        this.currentTrackId === trackId &&
        this.currentAudioUrl === url &&
        this.player.buffer.loaded
      ) {
        if (shouldAutoPlay) await this.play()
        return
      }

      // If loading different URL, abort previous load
      if (this.isLoading && this.currentLoadUrl !== url) {
        // Stop current playback immediately
        if (this.player.state === 'started') {
          this.player.stop()
        }
      }

      this.isLoading = true
      this.currentLoadUrl = url
      this.currentTrackId = trackId

      // Clear stem mode if active
      this.clearStems()
      this.isStemMode = false

      if (Tone.context.state === 'suspended') {
        await Tone.start()
      }

      // CRITICAL: Stop any playing audio before loading new track
      if (this.player.state === 'started') {
        this.player.stop()
      }
      // Also stop any stem players if they're running
      this.stemPlayers.forEach((player) => {
        if (player.state === 'started') {
          player.stop()
        }
      })

      // Create new buffer to avoid conflicts
      this.player.buffer = new Tone.ToneAudioBuffer()
      this.startTime = 0
      this.pausedAt = 0

      await this.player.load(url)

      // Check if this load was superseded by another
      if (this.currentLoadUrl !== url) {
        return
      }

      const duration = this.player.buffer.duration

      this.currentAudioUrl = url // Save loaded URL
      this.notifyListeners({ duration, currentTime: 0, isPlaying: false })

      if (shouldAutoPlay) {
        await this.play()
      }

      this.isLoading = false
    } catch (error) {
      console.error('[audioService] Error loading audio:', error)
      this.isLoading = false
      this.currentLoadUrl = null
      this.notifyListeners({ duration: 0, currentTime: 0, isPlaying: false })
      throw error
    }
  }

  /**
   * Load multiple stems for mixing
   * @param stems Object with stem URLs (vocals, drums, bass, other)
   * @param trackId Track ID to identify the loaded track
   */
  public async loadStems(stems: StemInfo, trackId: string): Promise<void> {
    try {
      // Prevent duplicate stem loads, but allow superseding an in-flight single-file load
      if (this.isLoading && this.currentLoadUrl === 'stems') {
        return
      }

      // Check if already loaded this track in stem mode
      if (this.currentTrackId === trackId && this.isStemMode && this.stemPlayers.size > 0) {
        return
      }

      // Supersede any in-flight loadAudio
      this.currentLoadUrl = 'stems'
      this.isLoading = true
      this.currentTrackId = trackId

      if (Tone.context.state === 'suspended') {
        await Tone.start()
      }

      // Stop current playback
      this.stop()

      // Clear previous stems
      this.clearStems()

      // Load each stem
      const stemTypes: StemType[] = ['vocals', 'drums', 'bass', 'other']
      let maxDuration = 0

      for (const stemType of stemTypes) {
        const url = stems[stemType]
        if (!url) continue

        // Check if load was aborted
        if (this.currentLoadUrl !== 'stems') {
          return
        }

        // Create player chain for this stem
        const player = new Tone.Player()
        const pitchShift = new Tone.PitchShift(0)
        const eq3 = new Tone.EQ3({ low: 0, mid: 0, high: 0 })
        const reverb = new Tone.Reverb({ decay: 1.5, wet: 0 })
        const volume = new Tone.Volume(0) // Start at 0db (100%)

        // Chain based on effectsEnabled (consistent with single-file mode)
        if (this.effectsEnabled) {
          player.chain(pitchShift, eq3, reverb, volume, Tone.Destination)
        } else {
          player.chain(pitchShift, volume, Tone.Destination)
        }

        // Load audio
        await player.load(url)

        // Track max duration
        if (player.buffer.duration > maxDuration) {
          maxDuration = player.buffer.duration
        }

        // Store references
        this.stemPlayers.set(stemType, player)
        this.stemPitchShifts.set(stemType, pitchShift)
        this.stemEQ3s.set(stemType, eq3)
        this.stemReverbs.set(stemType, reverb)
        this.stemVolumes.set(stemType, volume)

        // [SỬA LỖI 1.1] Thêm logic onstop cho stem players
        player.onstop = () => {
          if (this.isSeeking) {
            // Cờ isSeeking sẽ được dọn dẹp bởi player chính (hoặc player cuối cùng)
            return
          }
          if (this.isPausing) {
            return
          }

          // Nếu stem này là stem cuối cùng dừng
          const allStemsStopped = Array.from(this.stemPlayers.values()).every(
            (p) => p.state !== 'started'
          )
          if (allStemsStopped) {
            this.stopTimeUpdates()
            const currentTime = this.getCurrentTime()
            const duration = this.getDuration()
            if (Math.abs(currentTime - duration) < 0.1) {
              this.pausedAt = 0
              this.startTime = 0
              this.notifyListeners({ isPlaying: false, currentTime: 0 })
            } else {
              this.notifyListeners({ isPlaying: false })
            }
          }
        }
      }

      this.isStemMode = true
      this.startTime = 0
      this.pausedAt = 0

      // Mark current audio as stems (helps callers detect loaded mode)
      this.currentAudioUrl = 'stems'

      this.notifyListeners({ duration: maxDuration, currentTime: 0, isPlaying: false })

      this.isLoading = false
      this.currentLoadUrl = null
    } catch (error) {
      console.error('[audioService] Error loading stems:', error)
      this.clearStems()
      this.isStemMode = false
      this.isLoading = false
      this.currentLoadUrl = null
      this.currentAudioUrl = null
      throw error
    }
  }

  /**
   * Clear all loaded stems
   */
  private clearStems(): void {
    this.stemPlayers.forEach((player) => {
      if (player.state === 'started') player.stop()
      player.dispose()
    })
    this.stemPitchShifts.forEach((ps) => ps.dispose())
    this.stemEQ3s.forEach((eq) => eq.dispose())
    this.stemReverbs.forEach((rev) => rev.dispose())
    this.stemVolumes.forEach((vol) => vol.dispose())

    this.stemPlayers.clear()
    this.stemPitchShifts.clear()
    this.stemEQ3s.clear()
    this.stemReverbs.clear()
    this.stemVolumes.clear()
  }

  /**
   * Set volume for individual stem (0-100%)
   */
  public setStemVolume(stemType: StemType, percentage: number): void {
    const volume = this.stemVolumes.get(stemType)
    if (!volume) {
      console.warn(`[audioService] Stem ${stemType} not loaded - cannot set volume`)
      console.warn(`[audioService] Available stems:`, Array.from(this.stemVolumes.keys()))
      return
    }

    // Convert percentage (0-100) to decibels (-60 to 0)
    // 0% = -60db (mute), 100% = 0db (full volume)
    const db = percentage === 0 ? -60 : (percentage / 100) * 60 - 60

    console.log(`[audioService] Setting ${stemType} volume: ${percentage}% → ${db.toFixed(1)}db`)
    volume.volume.value = db

    // Verify the value was set
    console.log(`[audioService] Verified ${stemType} volume: ${volume.volume.value.toFixed(1)}db`)
  }

  public async play(): Promise<void> {
    if (Tone.context.state === 'suspended') {
      await Tone.start()
    }

    try {
      if (this.isStemMode) {
        // Stem mode: play all loaded stems in sync
        if (this.stemPlayers.size === 0) {
          console.warn('Play called in stem mode, but no stems loaded')
          return
        }

        // Đảm bảo cờ isPausing là false khi play
        this.isPausing = false

        this.stemPlayers.forEach((player) => {
          if (!player.disposed && player.buffer.loaded) {
            player.start('+0', this.pausedAt)
          }
        })

        this.startTime = Tone.now() - this.pausedAt
        this.notifyListeners({ isPlaying: true })
        this.startTimeUpdates()
      } else {
        // Single-file mode
        if (!this.player || !this.player.buffer.loaded) {
          console.warn('Play called, but buffer not loaded')
          return
        }
        if (this.player.disposed) {
          console.error('Player is disposed. Cannot play.')
          return
        }

        // Đảm bảo cờ isPausing là false khi play
        this.isPausing = false

        this.player.start('+0', this.pausedAt)
        this.startTime = Tone.now() - this.pausedAt
        this.notifyListeners({ isPlaying: true })
        this.startTimeUpdates()
      }
    } catch (error) {
      console.error('Error playing audio:', error)
    }
  }

  public pause(): void {
    if (this.isStemMode) {
      // Stem mode: pause all stems
      this.pausedAt = Math.min(Tone.now() - this.startTime, this.getDuration())

      this.isPausing = true // Set flag before stopping
      this.stemPlayers.forEach((player) => {
        if (!player.disposed && player.state === 'started') {
          player.stop()
        }
      })
      // Cờ isPausing sẽ được dọn dẹp khi play()

      this.notifyListeners({ isPlaying: false, currentTime: this.pausedAt })
      this.stopTimeUpdates()
    } else {
      // Single-file mode
      if (!this.player || this.player.disposed || this.player.state !== 'started') return
      this.pausedAt = Math.min(Tone.now() - this.startTime, this.getDuration())

      this.isPausing = true // Set flag before stopping
      this.player.stop()
      // Cờ isPausing sẽ được dọn dẹp khi play()

      this.notifyListeners({ isPlaying: false, currentTime: this.pausedAt })
      this.stopTimeUpdates()
    }
  }

  public stop(): void {
    if (this.isStemMode) {
      // Stem mode: stop all stems
      this.stemPlayers.forEach((player) => {
        if (!player.disposed) player.stop()
      })
      this.pausedAt = 0
      this.startTime = 0
      this.notifyListeners({ isPlaying: false, currentTime: 0 })
      this.stopTimeUpdates()
    } else {
      // Single-file mode
      if (!this.player || this.player.disposed) return
      this.player.stop()
      this.pausedAt = 0
      this.startTime = 0
      this.notifyListeners({ isPlaying: false, currentTime: 0 })
      this.stopTimeUpdates()
    }
  }

  // [SỬA LỖI 2] Cập nhật logic `seek`
  public seek(time: number): void {
    if (this.isStemMode) {
      // Stem mode: seek all stems
      if (this.stemPlayers.size === 0) return
      const wasPlaying = Array.from(this.stemPlayers.values()).some((p) => p.state === 'started')

      this.isSeeking = true // Set flag before stopping

      if (wasPlaying) {
        this.stemPlayers.forEach((player) => {
          if (!player.disposed) player.stop()
        })
      }

      this.pausedAt = time

      if (wasPlaying) {
        this.stemPlayers.forEach((player) => {
          if (!player.disposed && player.buffer.loaded) {
            player.start('+0', time)
          }
        })
        this.startTime = Tone.now() - time
      }

      // Cờ isSeeking sẽ được dọn dẹp bởi onstop

      this.notifyListeners({ currentTime: time, isPlaying: wasPlaying })
    } else {
      // Single-file mode
      if (!this.player || !this.player.buffer.loaded || this.player.disposed) return
      const wasPlaying = this.player.state === 'started'

      this.isSeeking = true // Set flag before stopping

      if (wasPlaying) {
        this.player.stop() // Sẽ kích hoạt onstop
      }
      this.pausedAt = time
      if (wasPlaying) {
        this.player.start('+0', time)
        this.startTime = Tone.now() - time
      }

      // Cờ isSeeking sẽ được dọn dẹp bởi onstop

      this.notifyListeners({ currentTime: time, isPlaying: wasPlaying })
    }
  }

  public setSpeed(speed: number): void {
    const clampedSpeed = Math.max(0.5, Math.min(2.0, speed))

    if (this.isStemMode) {
      // Apply to all stem players
      this.stemPlayers.forEach((player) => {
        if (!player.disposed) {
          player.playbackRate = clampedSpeed
        }
      })
    } else {
      // Single-file mode
      if (this.player) {
        this.player.playbackRate = clampedSpeed
      }
    }

    this.notifyListeners({ speed })
  }

  /**
   * Sync playback speed to match target BPM
   * @param originalBpm The original BPM of the track
   * @param targetBpm The target BPM to sync to
   * @returns The calculated playback rate (or null if invalid params)
   */
  public syncToTempo(originalBpm: number, targetBpm: number): number | null {
    if (!originalBpm || !targetBpm || originalBpm <= 0 || targetBpm <= 0) {
      console.warn('[audioService] Invalid BPM values for syncToTempo')
      return null
    }

    // Calculate playback rate ratio
    const playbackRate = targetBpm / originalBpm

    // Clamp to safe range (0.5x - 2.0x)
    const clampedRate = Math.max(0.5, Math.min(2.0, playbackRate))

    // Apply the speed
    this.setSpeed(clampedRate)

    return clampedRate
  }

  /**
   * Calculate what the effective BPM will be after time-stretching
   * @param originalBpm The original BPM
   * @param playbackRate The current playback rate
   * @returns The effective BPM
   */
  public getEffectiveBpm(originalBpm: number, playbackRate: number): number {
    return originalBpm * playbackRate
  }

  /**
   * Reset speed to normal (1.0x)
   */
  public resetSpeed(): void {
    this.setSpeed(1.0)
  }

  public setPitch(semitones: number): void {
    const clampedPitch = Math.max(-12, Math.min(12, semitones))

    if (this.isStemMode) {
      // Apply to all stem pitch shifters
      this.stemPitchShifts.forEach((pitchShift) => {
        if (!pitchShift.disposed) {
          pitchShift.pitch = clampedPitch
        }
      })
    } else {
      // Single-file mode
      if (this.pitchShift) {
        this.pitchShift.pitch = clampedPitch
      }
    }

    this.notifyListeners({ pitch: semitones })
  }

  public setVolume(db: number): void {
    if (!this.volume) return

    this.volume.volume.value = Math.max(-60, Math.min(36, db))

    this.notifyListeners({ volume: db })
  }

  public getVolume(): number {
    return this.volume?.volume.value || 0
  }

  /**
   * Set EQ Low frequency gain (-20 to +20 dB)
   */
  public setEQLow(db: number): void {
    if (!this.effectsEnabled) return

    const clampedDb = Math.max(-20, Math.min(20, db))

    // Apply to single-file mode
    if (this.eq3) {
      this.eq3.low.value = clampedDb
    }

    // Apply to all stems if in stem mode
    if (this.isStemMode) {
      this.stemEQ3s.forEach((eq3) => {
        eq3.low.value = clampedDb
      })
    }

    this.notifyListeners({ eqLow: db })
  }

  /**
   * Set EQ Mid frequency gain (-20 to +20 dB)
   */
  public setEQMid(db: number): void {
    if (!this.effectsEnabled) return

    const clampedDb = Math.max(-20, Math.min(20, db))

    // Apply to single-file mode
    if (this.eq3) {
      this.eq3.mid.value = clampedDb
    }

    // Apply to all stems if in stem mode
    if (this.isStemMode) {
      this.stemEQ3s.forEach((eq3) => {
        eq3.mid.value = clampedDb
      })
    }

    this.notifyListeners({ eqMid: db })
  }

  /**
   * Set EQ High frequency gain (-20 to +20 dB)
   */
  public setEQHigh(db: number): void {
    if (!this.effectsEnabled) return

    const clampedDb = Math.max(-20, Math.min(20, db))

    // Apply to single-file mode
    if (this.eq3) {
      this.eq3.high.value = clampedDb
    }

    // Apply to all stems if in stem mode
    if (this.isStemMode) {
      this.stemEQ3s.forEach((eq3) => {
        eq3.high.value = clampedDb
      })
    }

    this.notifyListeners({ eqHigh: db })
  }

  /**
   * Set Reverb wet amount (0-100%)
   */
  public setReverb(percentage: number): void {
    if (!this.effectsEnabled) return

    const wet = Math.max(0, Math.min(100, percentage)) / 100

    // Apply to single-file mode
    if (this.reverb) {
      this.reverb.wet.value = wet
    }

    // Apply to all stems if in stem mode
    if (this.isStemMode) {
      this.stemReverbs.forEach((reverb) => {
        reverb.wet.value = wet
      })
    }

    this.notifyListeners({ reverb: percentage })
  }

  /**
   * Set Reverb decay time (0.1 to 10 seconds)
   */
  public setReverbDecay(seconds: number): void {
    if (!this.effectsEnabled) return

    const clampedSeconds = Math.max(0.1, Math.min(10, seconds))

    // Apply to single-file mode
    if (this.reverb) {
      this.reverb.decay = clampedSeconds
    }

    // Apply to all stems if in stem mode
    if (this.isStemMode) {
      this.stemReverbs.forEach((reverb) => {
        reverb.decay = clampedSeconds
      })
    }
  }

  /**
   * Toggle audio effects on/off
   */
  public setEffectsEnabled(enabled: boolean): void {
    this.effectsEnabled = enabled

    // Reconnect audio chain based on effects state
    try {
      // === Single-file mode reconnection ===
      this.player.disconnect()
      this.pitchShift.disconnect()
      this.eq3.disconnect()
      this.reverb.disconnect()
      this.volume.disconnect()

      if (enabled) {
        // WITH effects: Player → PitchShift → EQ3 → Reverb → Volume → Destination
        this.player.chain(this.pitchShift, this.eq3, this.reverb, this.volume, Tone.Destination)
      } else {
        // WITHOUT effects: Player → PitchShift → Volume → Destination (bypass EQ3 & Reverb)
        this.player.chain(this.pitchShift, this.volume, Tone.Destination)

        // Reset effects to default values
        this.eq3.low.value = 0
        this.eq3.mid.value = 0
        this.eq3.high.value = 0
        this.reverb.wet.value = 0
      }

      // === Stem mode reconnection ===
      if (this.isStemMode && this.stemPlayers.size > 0) {
        this.stemPlayers.forEach((player, stemType) => {
          const pitchShift = this.stemPitchShifts.get(stemType)
          const eq3 = this.stemEQ3s.get(stemType)
          const reverb = this.stemReverbs.get(stemType)
          const volume = this.stemVolumes.get(stemType)

          if (!pitchShift || !eq3 || !reverb || !volume) return

          // Disconnect all stem nodes
          player.disconnect()
          pitchShift.disconnect()
          eq3.disconnect()
          reverb.disconnect()
          volume.disconnect()

          if (enabled) {
            // WITH effects
            player.chain(pitchShift, eq3, reverb, volume, Tone.Destination)
          } else {
            // WITHOUT effects (bypass)
            player.chain(pitchShift, volume, Tone.Destination)

            // Reset stem effects
            eq3.low.value = 0
            eq3.mid.value = 0
            eq3.high.value = 0
            reverb.wet.value = 0
          }
        })
      }
    } catch (error) {
      console.error('[audioService] Error reconnecting audio chain:', error)
    }
  }

  /**
   * Get effects enabled state
   */
  public getEffectsEnabled(): boolean {
    return this.effectsEnabled
  }

  public getCurrentTime(): number {
    if (this.isStemMode) {
      // Stem mode: use first available player
      const firstPlayer = Array.from(this.stemPlayers.values())[0]
      if (!firstPlayer || !firstPlayer.buffer.loaded || firstPlayer.disposed) return 0
      if (firstPlayer.state === 'started') {
        const elapsed = Tone.now() - this.startTime
        return Math.min(elapsed, this.getDuration())
      }
      return this.pausedAt
    } else {
      // Single-file mode
      if (!this.player || !this.player.buffer.loaded || this.player.disposed) return 0
      if (this.player.state === 'started') {
        const elapsed = Tone.now() - this.startTime
        return Math.min(elapsed, this.getDuration())
      }
      return this.pausedAt
    }
  }

  public getDuration(): number {
    if (this.isStemMode) {
      // Return max duration among all stems
      let maxDuration = 0
      this.stemPlayers.forEach((player) => {
        if (!player.disposed && player.buffer.loaded) {
          maxDuration = Math.max(maxDuration, player.buffer.duration)
        }
      })
      return maxDuration
    } else {
      // Single-file mode
      if (!this.player || !this.player.buffer.loaded || this.player.disposed) return 0
      return this.player.buffer.duration
    }
  }

  public isPlaying(): boolean {
    if (this.isStemMode) {
      // Check if any stem is playing
      return Array.from(this.stemPlayers.values()).some((p) => p.state === 'started')
    } else {
      return this.player?.state === 'started'
    }
  }

  private startTimeUpdates(): void {
    this.stopTimeUpdates()
    this.updateInterval = window.setInterval(() => {
      // [SỬA LỖI] Phải check cả stem mode
      if (this.isPlaying()) {
        const currentTime = this.getCurrentTime()
        this.notifyListeners({ currentTime })
      }
    }, 100)
  }

  private stopTimeUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
    }
  }

  // Get current loaded audio URL
  public getCurrentAudioUrl(): string | null {
    return this.currentAudioUrl
  }

  // Get complete audio state
  public getState(): AudioState {
    return {
      isPlaying: this.isPlaying(),
      currentTime: this.getCurrentTime(),
      duration: this.getDuration(),
      speed: this.player?.playbackRate ?? 1.0,
      pitch: this.pitchShift?.pitch ?? 0,
      volume: this.volume?.volume.value ?? 0,
    }
  }

  public dispose(): void {
    this.stopTimeUpdates()

    // Dispose single-file chain
    if (this.player) {
      this.player.dispose()
    }
    if (this.pitchShift) {
      this.pitchShift.dispose()
    }
    if (this.volume) {
      this.volume.dispose()
    }
    if (this.eq3) {
      this.eq3.dispose()
    }
    if (this.reverb) {
      this.reverb.dispose()
    }

    // Dispose stems
    this.clearStems()

    // Clear track ID
    this.currentTrackId = null

    this.listeners.clear()
  }
}

// Singleton instance
export const audioService = new AudioService()

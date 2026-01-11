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
  private currentAudioUrl: string | null = null
  private currentTrackId: string | null = null

  // --- CÁC CỜ TRẠNG THÁI (ĐÃ FIX) ---
  private isSeeking: boolean = false
  private isPausing: boolean = false
  // [MỚI] Cờ để nhận biết dừng do người dùng bấm nút Stop/Load bài khác
  private isManualStop: boolean = false

  private listeners: Set<(state: Partial<AudioState>) => void> = new Set()
  private endedListeners: Set<() => void> = new Set()
  private updateInterval: number | null = null
  private startTime: number = 0
  private pausedAt: number = 0

  constructor() {
    // Initialize audio effects
    this.eq3 = new Tone.EQ3({ low: 0, mid: 0, high: 0, lowFrequency: 400, highFrequency: 2500 })
    this.reverb = new Tone.Reverb({ decay: 1.5, wet: 0 })

    // Initialize single-file chain
    this.player = new Tone.Player()
    // Use minimal window size to eliminate pitch shift latency/delay
    this.pitchShift = new Tone.PitchShift({
      pitch: 0,
      windowSize: 0.01, // Minimal window = no perceptible delay
      delayTime: 0,
      feedback: 0,
    })
    this.volume = new Tone.Volume(0)

    // Default chain WITHOUT effects
    this.player.chain(this.pitchShift, this.volume, Tone.Destination)

    // --- [LOGIC ONSTOP ĐÃ FIX] ---
    this.player.onstop = () => {
      // 1. Nếu đang Seek -> bỏ qua
      if (this.isSeeking) {
        this.isSeeking = false
        return
      }

      // 2. Nếu đang Pause -> bỏ qua
      if (this.isPausing) {
        return
      }

      // 3. Nếu dừng do người dùng bấm nút Stop/Load bài -> bỏ qua
      if (this.isManualStop) {
        this.isManualStop = false
        return
      }

      // 4. Nếu chạy xuống đây -> NHẠC HẾT TỰ NHIÊN (Auto End)
      this.pausedAt = 0
      this.startTime = 0
      this.notifyListeners({ isPlaying: false, currentTime: 0 })

      // Kích hoạt sự kiện kết thúc bài để Auto Next
      this.notifyEnded()
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

  public getCurrentTrackId(): string | null {
    return this.currentTrackId
  }

  public subscribe(listener: (state: Partial<AudioState>) => void) {
    this.listeners.add(listener)
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
      if (this.isLoading && this.currentLoadUrl === url) return

      if (
        this.currentTrackId === trackId &&
        this.currentAudioUrl === url &&
        this.player.buffer.loaded
      ) {
        if (shouldAutoPlay) await this.play()
        return
      }

      if (this.isLoading && this.currentLoadUrl !== url) {
        if (this.player.state === 'started') {
          this.isManualStop = true // Đánh dấu dừng tay
          this.player.stop()
        }
      }

      this.isLoading = true
      this.currentLoadUrl = url
      this.currentTrackId = trackId
      this.clearStems()
      this.isStemMode = false

      if (Tone.context.state === 'suspended') {
        await Tone.start()
      }

      if (this.player.state === 'started') {
        this.isManualStop = true // Đánh dấu dừng tay
        this.player.stop()
      }

      // Stop stem players thủ công
      this.stemPlayers.forEach((player) => {
        if (player.state === 'started') {
          player.stop()
        }
      })

      this.player.buffer = new Tone.ToneAudioBuffer()
      this.startTime = 0
      this.pausedAt = 0

      await this.player.load(url)

      if (this.currentLoadUrl !== url) return

      const duration = this.player.buffer.duration
      this.currentAudioUrl = url
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

  public async loadStems(stems: StemInfo, trackId: string): Promise<void> {
    try {
      if (this.isLoading && this.currentLoadUrl === 'stems') return
      if (this.currentTrackId === trackId && this.isStemMode && this.stemPlayers.size > 0) return

      this.currentLoadUrl = 'stems'
      this.isLoading = true
      this.currentTrackId = trackId

      if (Tone.context.state === 'suspended') await Tone.start()

      this.stop() // Gọi hàm stop() đã có flag manual
      this.clearStems()

      const stemTypes: StemType[] = ['vocals', 'drums', 'bass', 'other']
      let maxDuration = 0

      for (const stemType of stemTypes) {
        const url = stems[stemType]
        if (!url) continue

        if (this.currentLoadUrl !== 'stems') return

        const player = new Tone.Player()
        // Use minimal window size to eliminate pitch shift latency/delay
        const pitchShift = new Tone.PitchShift({
          pitch: 0,
          windowSize: 0.01, // Minimal window = no perceptible delay
          delayTime: 0,
          feedback: 0,
        })
        const eq3 = new Tone.EQ3({ low: 0, mid: 0, high: 0 })
        const reverb = new Tone.Reverb({ decay: 1.5, wet: 0 })
        const volume = new Tone.Volume(0)

        if (this.effectsEnabled) {
          player.chain(pitchShift, eq3, reverb, volume, Tone.Destination)
        } else {
          player.chain(pitchShift, volume, Tone.Destination)
        }

        await player.load(url)

        if (player.buffer.duration > maxDuration) {
          maxDuration = player.buffer.duration
        }

        this.stemPlayers.set(stemType, player)
        this.stemPitchShifts.set(stemType, pitchShift)
        this.stemEQ3s.set(stemType, eq3)
        this.stemReverbs.set(stemType, reverb)
        this.stemVolumes.set(stemType, volume)

        // --- [LOGIC ONSTOP CHO STEMS] ---
        player.onstop = () => {
          if (this.isSeeking || this.isPausing || this.isManualStop) {
            return
          }

          // Check xem tất cả các stems đã dừng chưa
          const allStemsStopped = Array.from(this.stemPlayers.values()).every(
            (p) => p.state !== 'started'
          )

          if (allStemsStopped) {
            this.stopTimeUpdates()
            this.pausedAt = 0
            this.startTime = 0
            this.notifyListeners({ isPlaying: false, currentTime: 0 })
            // Natural End -> Auto Next
            this.notifyEnded()
          }
        }
      }

      this.isStemMode = true
      this.startTime = 0
      this.pausedAt = 0
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

  public setStemVolume(stemType: StemType, percentage: number): void {
    const volume = this.stemVolumes.get(stemType)
    if (!volume) {
      console.warn(`[audioService] Stem ${stemType} not loaded`)
      return
    }
    const db = percentage === 0 ? -60 : (percentage / 100) * 60 - 60
    volume.volume.value = db
  }

  public async play(): Promise<void> {
    if (Tone.context.state === 'suspended') await Tone.start()

    try {
      this.isPausing = false
      this.isManualStop = false // Reset cờ manual stop khi play

      if (this.isStemMode) {
        if (this.stemPlayers.size === 0) return
        this.stemPlayers.forEach((player) => {
          if (!player.disposed && player.buffer.loaded) {
            player.start('+0', this.pausedAt)
          }
        })
      } else {
        if (!this.player || !this.player.buffer.loaded || this.player.disposed) return
        this.player.start('+0', this.pausedAt)
      }

      this.startTime = Tone.now() - this.pausedAt
      this.notifyListeners({ isPlaying: true })
      this.startTimeUpdates()
    } catch (error) {
      console.error('Error playing audio:', error)
    }
  }

  public pause(): void {
    this.isPausing = true // Đánh dấu pause
    this.pausedAt = Math.min(Tone.now() - this.startTime, this.getDuration())

    if (this.isStemMode) {
      this.stemPlayers.forEach((player) => {
        if (!player.disposed && player.state === 'started') player.stop()
      })
    } else {
      if (!this.player || this.player.disposed || this.player.state !== 'started') return
      this.player.stop()
    }

    this.notifyListeners({ isPlaying: false, currentTime: this.pausedAt })
    this.stopTimeUpdates()
  }

  public stop(): void {
    this.isManualStop = true // [MỚI] Đánh dấu là dừng thủ công (User bấm nút Stop)

    if (this.isStemMode) {
      this.stemPlayers.forEach((player) => {
        if (!player.disposed) player.stop()
      })
    } else {
      if (!this.player || this.player.disposed) return
      this.player.stop()
    }

    this.pausedAt = 0
    this.startTime = 0
    this.notifyListeners({ isPlaying: false, currentTime: 0 })
    this.stopTimeUpdates()
  }

  public seek(time: number): void {
    this.isSeeking = true // Đánh dấu seeking

    if (this.isStemMode) {
      if (this.stemPlayers.size === 0) return
      const wasPlaying = Array.from(this.stemPlayers.values()).some((p) => p.state === 'started')

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
      this.notifyListeners({ currentTime: time, isPlaying: wasPlaying })
    } else {
      if (!this.player || !this.player.buffer.loaded || this.player.disposed) return
      const wasPlaying = this.player.state === 'started'

      if (wasPlaying) this.player.stop()

      this.pausedAt = time

      if (wasPlaying) {
        this.player.start('+0', time)
        this.startTime = Tone.now() - time
      }
      this.notifyListeners({ currentTime: time, isPlaying: wasPlaying })
    }
  }

  public setSpeed(speed: number): void {
    const clampedSpeed = Math.max(0.5, Math.min(2.0, speed))

    if (this.isStemMode) {
      this.stemPlayers.forEach((player) => {
        if (!player.disposed) {
          player.playbackRate = clampedSpeed
        }
      })
    } else {
      if (this.player) {
        this.player.playbackRate = clampedSpeed
      }
    }

    this.notifyListeners({ speed })
  }

  public syncToTempo(originalBpm: number, targetBpm: number): number | null {
    if (!originalBpm || !targetBpm || originalBpm <= 0 || targetBpm <= 0) {
      return null
    }
    const playbackRate = targetBpm / originalBpm
    const clampedRate = Math.max(0.5, Math.min(2.0, playbackRate))
    this.setSpeed(clampedRate)
    return clampedRate
  }

  public getEffectiveBpm(originalBpm: number, playbackRate: number): number {
    return originalBpm * playbackRate
  }

  public resetSpeed(): void {
    this.setSpeed(1.0)
  }

  public setPitch(semitones: number): void {
    const clampedPitch = Math.max(-12, Math.min(12, semitones))

    if (this.isStemMode) {
      this.stemPitchShifts.forEach((pitchShift) => {
        if (!pitchShift.disposed) {
          // Use ramp to smooth pitch changes and avoid phasing
          pitchShift.pitch = clampedPitch
        }
      })
    } else {
      if (this.pitchShift) {
        // Use ramp to smooth pitch changes and avoid phasing
        this.pitchShift.pitch = clampedPitch
      }
    }

    this.notifyListeners({ pitch: semitones })
  }

  public setVolume(db: number): void {
    const clampedDb = Math.max(-60, Math.min(36, db))

    // Apply to master volume (single-file mode)
    if (this.volume) {
      this.volume.volume.value = clampedDb
    }

    // Also apply to all stem volumes when in stem mode
    if (this.isStemMode) {
      this.stemVolumes.forEach((volume) => {
        volume.volume.value = clampedDb
      })
    }

    this.notifyListeners({ volume: db })
  }

  public getVolume(): number {
    return this.volume?.volume.value || 0
  }

  public setEQLow(db: number): void {
    if (!this.effectsEnabled) return
    const clampedDb = Math.max(-20, Math.min(20, db))

    if (this.eq3) {
      this.eq3.low.value = clampedDb
    }

    if (this.isStemMode) {
      this.stemEQ3s.forEach((eq3) => {
        eq3.low.value = clampedDb
      })
    }

    this.notifyListeners({ eqLow: db })
  }

  public setEQMid(db: number): void {
    if (!this.effectsEnabled) return
    const clampedDb = Math.max(-20, Math.min(20, db))

    if (this.eq3) {
      this.eq3.mid.value = clampedDb
    }

    if (this.isStemMode) {
      this.stemEQ3s.forEach((eq3) => {
        eq3.mid.value = clampedDb
      })
    }

    this.notifyListeners({ eqMid: db })
  }

  public setEQHigh(db: number): void {
    if (!this.effectsEnabled) return
    const clampedDb = Math.max(-20, Math.min(20, db))

    if (this.eq3) {
      this.eq3.high.value = clampedDb
    }

    if (this.isStemMode) {
      this.stemEQ3s.forEach((eq3) => {
        eq3.high.value = clampedDb
      })
    }

    this.notifyListeners({ eqHigh: db })
  }

  public setReverb(percentage: number): void {
    if (!this.effectsEnabled) return
    const wet = Math.max(0, Math.min(100, percentage)) / 100

    if (this.reverb) {
      this.reverb.wet.value = wet
    }

    if (this.isStemMode) {
      this.stemReverbs.forEach((reverb) => {
        reverb.wet.value = wet
      })
    }

    this.notifyListeners({ reverb: percentage })
  }

  public setReverbDecay(seconds: number): void {
    if (!this.effectsEnabled) return
    const clampedSeconds = Math.max(0.1, Math.min(10, seconds))

    if (this.reverb) {
      this.reverb.decay = clampedSeconds
    }

    if (this.isStemMode) {
      this.stemReverbs.forEach((reverb) => {
        reverb.decay = clampedSeconds
      })
    }
  }

  public setEffectsEnabled(enabled: boolean): void {
    this.effectsEnabled = enabled
    try {
      this.player.disconnect()
      this.pitchShift.disconnect()
      this.eq3.disconnect()
      this.reverb.disconnect()
      this.volume.disconnect()

      if (enabled) {
        this.player.chain(this.pitchShift, this.eq3, this.reverb, this.volume, Tone.Destination)
      } else {
        this.player.chain(this.pitchShift, this.volume, Tone.Destination)
        this.eq3.low.value = 0
        this.eq3.mid.value = 0
        this.eq3.high.value = 0
        this.reverb.wet.value = 0
      }

      if (this.isStemMode && this.stemPlayers.size > 0) {
        this.stemPlayers.forEach((player, stemType) => {
          const ps = this.stemPitchShifts.get(stemType)
          const eq = this.stemEQ3s.get(stemType)
          const rev = this.stemReverbs.get(stemType)
          const vol = this.stemVolumes.get(stemType)

          if (!ps || !eq || !rev || !vol) return

          player.disconnect()
          ps.disconnect()
          eq.disconnect()
          rev.disconnect()
          vol.disconnect()

          if (enabled) {
            player.chain(ps, eq, rev, vol, Tone.Destination)
          } else {
            player.chain(ps, vol, Tone.Destination)
            eq.low.value = 0
            eq.mid.value = 0
            eq.high.value = 0
            rev.wet.value = 0
          }
        })
      }
    } catch (error) {
      console.error('[audioService] Error reconnecting audio chain:', error)
    }
  }

  public getEffectsEnabled(): boolean {
    return this.effectsEnabled
  }

  public getCurrentTime(): number {
    if (this.isStemMode) {
      const firstPlayer = Array.from(this.stemPlayers.values())[0]
      if (!firstPlayer || !firstPlayer.buffer.loaded || firstPlayer.disposed) return 0
      if (firstPlayer.state === 'started') {
        const elapsed = Tone.now() - this.startTime
        return Math.min(elapsed, this.getDuration())
      }
      return this.pausedAt
    } else {
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
      let maxDuration = 0
      this.stemPlayers.forEach((player) => {
        if (!player.disposed && player.buffer.loaded) {
          maxDuration = Math.max(maxDuration, player.buffer.duration)
        }
      })
      return maxDuration
    } else {
      if (!this.player || !this.player.buffer.loaded || this.player.disposed) return 0
      return this.player.buffer.duration
    }
  }

  public isPlaying(): boolean {
    if (this.isStemMode) {
      return Array.from(this.stemPlayers.values()).some((p) => p.state === 'started')
    } else {
      return this.player?.state === 'started'
    }
  }

  private startTimeUpdates(): void {
    this.stopTimeUpdates()
    this.updateInterval = window.setInterval(() => {
      // Logic đã sửa: Chỉ cập nhật khi đang chơi
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

  public getCurrentAudioUrl(): string | null {
    return this.currentAudioUrl
  }

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

    if (this.player) this.player.dispose()
    if (this.pitchShift) this.pitchShift.dispose()
    if (this.volume) this.volume.dispose()
    if (this.eq3) this.eq3.dispose()
    if (this.reverb) this.reverb.dispose()

    this.clearStems()
    this.currentTrackId = null
    this.listeners.clear()
  }
}

export const audioService = new AudioService()

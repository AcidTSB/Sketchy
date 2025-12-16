/**
 * Audio Analysis Service
 * Handles BPM and musical key detection
 */

import type { AudioAnalysisResult, AudioAnalysisProgress } from '../types/electron'

class AudioAnalysisService {
  private progressListeners = new Set<(progress: AudioAnalysisProgress) => void>()
  private unsubscribe?: () => void

  constructor() {
    // Listen for progress updates from main process
    if (typeof window !== 'undefined' && window.electronAPI) {
      this.setupProgressListener()
    }
  }

  private setupProgressListener() {
    this.unsubscribe = window.electronAPI.onAudioAnalysisProgress((progress) => {
      this.notifyProgressListeners(progress)
    })
  }

  /**
   * Analyze audio track for BPM and key
   */
  async analyzeTrack(trackId: number): Promise<AudioAnalysisResult> {
    try {
      const response = await window.electronAPI.analyzeAudio({ trackId })

      if (response.success && response.data) {
        return response.data
      } else {
        throw new Error(response.error || 'Analysis failed')
      }
    } catch (error) {
      console.error('[Audio Analysis Service] Analysis failed:', error)
      return {
        error: error instanceof Error ? error.message : 'Analysis failed',
      }
    }
  }

  /**
   * Subscribe to progress updates
   */
  onProgress(callback: (progress: AudioAnalysisProgress) => void) {
    this.progressListeners.add(callback)
    return () => this.progressListeners.delete(callback)
  }

  private notifyProgressListeners(progress: AudioAnalysisProgress) {
    this.progressListeners.forEach((listener) => listener(progress))
  }

  dispose() {
    this.progressListeners.clear()
    if (this.unsubscribe) {
      this.unsubscribe()
    }
  }
}

// Singleton instance
export const audioAnalysisService = new AudioAnalysisService()

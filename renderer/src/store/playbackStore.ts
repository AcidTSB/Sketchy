import { create } from 'zustand'
import type { Track } from '@/types'

interface PlaybackStore {
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  speed: number
  pitch: number
  gain: number
  stems: {
    vocals: number
    bass: number
    drums: number
    other: number
  }
  queue: Track[]
  currentTrackIndex: number

  // Actions
  play: () => void
  pause: () => void
  togglePlay: () => void
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
  setVolume: (volume: number) => void
  setSpeed: (speed: number) => void
  setPitch: (pitch: number) => void
  setGain: (gain: number) => void
  setStemVolume: (stem: keyof PlaybackStore['stems'], volume: number) => void
  addToQueue: (track: Track) => void
  addTracksToQueue: (tracks: Track[]) => void
  removeFromQueue: (trackId: string) => void
  clearQueue: () => void
  playTrack: (track: Track) => void
  playNext: () => void
  playPrevious: () => void
  setCurrentTrackIndex: (index: number) => void
  reset: () => void
}

export const usePlaybackStore = create<PlaybackStore>((set) => ({
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 100,
  speed: 1.0,
  pitch: 0,
  gain: 100,
  stems: {
    vocals: 100,
    bass: 100,
    drums: 100,
    other: 100,
  },
  queue: [],
  currentTrackIndex: -1,

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration }),
  setVolume: (volume) => set({ volume }),
  setSpeed: (speed) => set({ speed }),
  setPitch: (pitch) => set({ pitch }),
  setGain: (gain) => set({ gain }),
  setStemVolume: (stem, volume) =>
    set((state) => ({
      stems: { ...state.stems, [stem]: volume },
    })),

  addToQueue: (track) =>
    set((state) => ({
      queue: [...state.queue, track],
    })),

  addTracksToQueue: (tracks) =>
    set((state) => ({
      queue: [...state.queue, ...tracks],
    })),

  removeFromQueue: (trackId) =>
    set((state) => ({
      queue: state.queue.filter((t) => t.id !== trackId),
    })),

  clearQueue: () =>
    set({
      queue: [],
      currentTrackIndex: -1,
    }),

  playTrack: (track) =>
    set((state) => {
      const existingIndex = state.queue.findIndex((t) => t.id === track.id)
      if (existingIndex >= 0) {
        return { currentTrackIndex: existingIndex, isPlaying: true }
      }
      return {
        queue: [track, ...state.queue],
        currentTrackIndex: 0,
        isPlaying: true,
      }
    }),

  playNext: () =>
    set((state) => {
      if (state.currentTrackIndex < state.queue.length - 1) {
        return { currentTrackIndex: state.currentTrackIndex + 1 }
      }
      return {}
    }),

  playPrevious: () =>
    set((state) => {
      if (state.currentTrackIndex > 0) {
        return { currentTrackIndex: state.currentTrackIndex - 1 }
      }
      return {}
    }),

  setCurrentTrackIndex: (index) => set({ currentTrackIndex: index }),

  reset: () =>
    set({
      isPlaying: false,
      currentTime: 0,
      speed: 1.0,
      pitch: 0,
      gain: 100,
      stems: {
        vocals: 100,
        bass: 100,
        drums: 100,
        other: 100,
      },
    }),
}))

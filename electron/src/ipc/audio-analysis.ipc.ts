import { ipcMain, BrowserWindow, app } from 'electron'
import { prisma } from '../db/client'
import { existsSync } from 'fs'
import { readFile, unlink } from 'fs/promises'
import fs from 'fs'
import path from 'path'
import ffmpeg from 'fluent-ffmpeg'
// @ts-expect-error - node-wav has no type definitions
import * as wav from 'node-wav'

// Define AudioBuffer type for Node.js environment
interface AudioBuffer {
  length: number
  duration: number
  sampleRate: number
  numberOfChannels: number
  getChannelData(channel: number): Float32Array
  copyFromChannel(destination: Float32Array, channelNumber: number, startInChannel?: number): void
  copyToChannel(source: Float32Array, channelNumber: number, startInChannel?: number): void
}

export interface AudioAnalysisOptions {
  trackId: number
}

export interface LoudnessResult {
  integratedLUFS: number
  shortTermLUFS: number
  momentaryLUFS: number
  truePeak: number
  peak: number
  loudnessRange: number
}

export interface AudioAnalysisResult {
  bpm?: number
  key?: string
  loudness?: LoudnessResult
  sampleType?: string // 'kick' | 'snare' | 'hihat' | 'bass' | 'vocal' | 'fx' | 'loop' | 'one-shot'
  error?: string
}

/**
 * Analyze audio track for BPM and musical key
 */
async function analyzeAudio(
  mainWindow: BrowserWindow,
  options: AudioAnalysisOptions
): Promise<AudioAnalysisResult> {
  try {
    // 1. Get track info from database
    const track = await prisma.track.findUnique({
      where: { id: options.trackId },
      include: {
        latestVersion: true,
      },
    })

    if (!track) {
      throw new Error('Track not found')
    }

    if (!track.latestVersion) {
      throw new Error('Track has no audio file version')
    }

    const filePath = track.latestVersion.originalPath

    if (!existsSync(filePath)) {
      throw new Error(`Audio file not found at: ${filePath}`)
    }

    // Send progress update
    mainWindow.webContents.send('audio-analysis:progress', {
      trackId: options.trackId,
      status: 'analyzing',
      message: 'Loading audio file...',
    })

    // 2. Load and decode audio file
    const { audioBuffer, tempFile } = await loadAudioFile(filePath)

    try {
      // 3. Analyze BPM
      mainWindow.webContents.send('audio-analysis:progress', {
        trackId: options.trackId,
        status: 'analyzing',
        message: 'Analyzing BPM...',
      })

      const bpm = await analyzeBPM(audioBuffer)

      // 4. Analyze Musical Key
      mainWindow.webContents.send('audio-analysis:progress', {
        trackId: options.trackId,
        status: 'analyzing',
        message: 'Detecting musical key...',
      })

      const key = await analyzeKey(audioBuffer)

      // 5. Analyze Loudness (LUFS)
      mainWindow.webContents.send('audio-analysis:progress', {
        trackId: options.trackId,
        status: 'analyzing',
        message: 'Measuring loudness (LUFS)...',
      })

      const loudness = analyzeLoudness(audioBuffer)

      // 6. Auto-detect sample type
      mainWindow.webContents.send('audio-analysis:progress', {
        trackId: options.trackId,
        status: 'analyzing',
        message: 'Classifying sample type...',
      })

      const sampleType = classifySampleType(audioBuffer, bpm)

      // 7. Save BPM and Key to database
      if (bpm || key) {
        mainWindow.webContents.send('audio-analysis:progress', {
          trackId: options.trackId,
          status: 'analyzing',
          message: 'Saving analysis results...',
        })

        await prisma.track.update({
          where: { id: options.trackId },
          data: {
            bpm: bpm ?? undefined,
            key: key ?? undefined,
          },
        })
      }

      // 8. Send completion
      mainWindow.webContents.send('audio-analysis:progress', {
        trackId: options.trackId,
        status: 'complete',
        message: 'Analysis complete',
        bpm,
        key,
        loudness,
        sampleType,
      })

      return { bpm, key, loudness, sampleType }
    } finally {
      // Clean up temporary WAV file if created
      if (tempFile && existsSync(tempFile)) {
        try {
          await unlink(tempFile)
        } catch (err) {
          console.warn('[AUDIO ANALYSIS] Failed to clean up temp file:', err)
        }
      }
    }
  } catch (error) {
    console.error('[AUDIO ANALYSIS] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    mainWindow.webContents.send('audio-analysis:progress', {
      trackId: options.trackId,
      status: 'error',
      message: errorMessage,
    })

    return { error: errorMessage }
  }
}

/**
 * Convert audio file to WAV format using ffmpeg
 */
async function convertToWav(inputPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const tempDir = path.join(app.getPath('temp'), 'audio-analysis')
    const outputPath = path.join(tempDir, `temp_${Date.now()}.wav`)

    // Create temp directory if it doesn't exist
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }

    ffmpeg(inputPath)
      .toFormat('wav')
      .audioChannels(2)
      .audioFrequency(44100)
      .on('end', () => {
        resolve(outputPath)
      })
      .on('error', (err: Error) => {
        console.error('[AUDIO ANALYSIS] Conversion error:', err)
        reject(new Error(`Failed to convert audio: ${err.message}`))
      })
      .save(outputPath)
  })
}

/**
 * Load audio file and return Web Audio API compatible AudioBuffer
 * Automatically converts non-WAV files to WAV
 */
async function loadAudioFile(
  filePath: string
): Promise<{ audioBuffer: AudioBuffer; tempFile?: string }> {
  try {
    const ext = filePath.toLowerCase().split('.').pop()
    let wavFilePath = filePath
    let tempFile: string | undefined

    // Convert to WAV if not already WAV
    if (ext !== 'wav') {
      wavFilePath = await convertToWav(filePath)
      tempFile = wavFilePath
    }

    // Read and decode WAV file
    const fileBuffer = await readFile(wavFilePath)
    const decoded = wav.decode(fileBuffer)

    // Create AudioBuffer-like object
    const audioBuffer: AudioBuffer = {
      length: decoded.channelData[0].length,
      duration: decoded.channelData[0].length / decoded.sampleRate,
      sampleRate: decoded.sampleRate,
      numberOfChannels: decoded.channelData.length,
      getChannelData: (channel: number) => {
        return decoded.channelData[channel]
      },
      copyFromChannel: () => {},
      copyToChannel: () => {},
    }

    return { audioBuffer, tempFile }
  } catch (error) {
    console.error('[AUDIO ANALYSIS] Failed to load audio file:', error)
    throw new Error(error instanceof Error ? error.message : 'Failed to decode audio file')
  }
}

/**
 * Analyze BPM using music-tempo library
 */
async function analyzeBPM(audioBuffer: AudioBuffer): Promise<number | undefined> {
  try {
    // @ts-expect-error - music-tempo has no type definitions
    const { default: MusicTempo } = await import('music-tempo')

    // Get first channel (mono)
    const channelData = audioBuffer.getChannelData(0)

    // Create analyzer
    const tempo = new MusicTempo(channelData)

    return Math.round(tempo.tempo)
  } catch (error) {
    console.error('[AUDIO ANALYSIS] BPM analysis failed:', error)
    return undefined
  }
}

/**
 * Analyze musical key using Chromagram analysis
 * Uses pitch class profiling to detect the most likely key
 */
async function analyzeKey(audioBuffer: AudioBuffer): Promise<string | undefined> {
  try {
    const sampleRate = audioBuffer.sampleRate
    const channelData = audioBuffer.getChannelData(0)

    // Use 8192 samples for FFT (good frequency resolution for music)
    const fftSize = 8192
    const hopSize = fftSize / 2

    // Chromagram: 12 pitch classes (C, C#, D, D#, E, F, F#, G, G#, A, A#, B)
    const chromagram = new Float32Array(12).fill(0)
    let frameCount = 0

    // Process audio in overlapping frames
    for (let i = 0; i < channelData.length - fftSize; i += hopSize) {
      const frame = channelData.slice(i, i + fftSize)

      // Apply Hanning window
      const windowed = applyWindow(frame, fftSize)

      // Compute magnitude spectrum using real FFT approximation
      const spectrum = computeSpectrum(windowed, fftSize)

      // Map spectrum bins to pitch classes
      addToChromagram(chromagram, spectrum, sampleRate, fftSize)
      frameCount++
    }

    // Normalize chromagram
    if (frameCount > 0) {
      for (let i = 0; i < 12; i++) {
        chromagram[i] /= frameCount
      }
    }

    // Find the best matching key using Krumhansl-Schmuckler key profiles
    const key = detectKeyFromChromagram(chromagram)

    return key
  } catch (error) {
    console.error('[AUDIO ANALYSIS] Key analysis failed:', error)
    return undefined
  }
}

/**
 * Apply Hanning window to audio frame
 */
function applyWindow(frame: Float32Array, size: number): Float32Array {
  const windowed = new Float32Array(size)
  for (let i = 0; i < size; i++) {
    const window = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)))
    windowed[i] = frame[i] * window
  }
  return windowed
}

/**
 * Cooley-Tukey FFT (radix-2) - O(n log n) instead of O(n²)
 */
function fft(real: Float32Array, imag: Float32Array): void {
  const n = real.length

  // Bit-reversal permutation
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) {
      j ^= bit
    }
    j ^= bit
    if (i < j) {
      ;[real[i], real[j]] = [real[j], real[i]]
      ;[imag[i], imag[j]] = [imag[j], imag[i]]
    }
  }

  // Cooley-Tukey iterative FFT
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (2 * Math.PI) / len
    const wReal = Math.cos(ang)
    const wImag = -Math.sin(ang)

    for (let i = 0; i < n; i += len) {
      let curReal = 1
      let curImag = 0

      for (let j = 0; j < len / 2; j++) {
        const uReal = real[i + j]
        const uImag = imag[i + j]
        const tReal = curReal * real[i + j + len / 2] - curImag * imag[i + j + len / 2]
        const tImag = curReal * imag[i + j + len / 2] + curImag * real[i + j + len / 2]

        real[i + j] = uReal + tReal
        imag[i + j] = uImag + tImag
        real[i + j + len / 2] = uReal - tReal
        imag[i + j + len / 2] = uImag - tImag

        const nextReal = curReal * wReal - curImag * wImag
        curImag = curReal * wImag + curImag * wReal
        curReal = nextReal
      }
    }
  }
}

/**
 * Compute magnitude spectrum using FFT - much faster than DFT
 */
function computeSpectrum(frame: Float32Array, fftSize: number): Float32Array {
  const spectrum = new Float32Array(fftSize / 2)

  // Prepare arrays for FFT
  const real = new Float32Array(fftSize)
  const imag = new Float32Array(fftSize)

  // Copy input to real part
  for (let i = 0; i < fftSize; i++) {
    real[i] = frame[i]
    imag[i] = 0
  }

  // Perform FFT
  fft(real, imag)

  // Calculate magnitude spectrum
  for (let k = 0; k < fftSize / 2; k++) {
    spectrum[k] = Math.sqrt(real[k] * real[k] + imag[k] * imag[k])
  }

  return spectrum
}

/**
 * Map spectrum bins to chromagram (12 pitch classes)
 */
function addToChromagram(
  chromagram: Float32Array,
  spectrum: Float32Array,
  sampleRate: number,
  fftSize: number
): void {
  // Reference frequency for A4 = 440 Hz
  const A4 = 440
  const C0 = A4 * Math.pow(2, -4.75) // C0 frequency

  const binFreqResolution = sampleRate / fftSize

  // Focus on musical range (roughly 65 Hz to 2000 Hz - C2 to B6)
  const minBin = Math.floor(65 / binFreqResolution)
  const maxBin = Math.min(Math.floor(2000 / binFreqResolution), spectrum.length - 1)

  for (let bin = minBin; bin <= maxBin; bin++) {
    const freq = bin * binFreqResolution
    if (freq < 20) continue

    // Convert frequency to pitch class (0-11)
    const pitchClass = Math.round(12 * Math.log2(freq / C0)) % 12
    const normalizedPitch = ((pitchClass % 12) + 12) % 12

    // Weight by magnitude
    chromagram[normalizedPitch] += spectrum[bin]
  }
}

/**
 * Detect key using Krumhansl-Schmuckler key profiles
 */
function detectKeyFromChromagram(chromagram: Float32Array): string {
  // Krumhansl-Schmuckler key profiles (major and minor)
  const majorProfile = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
  const minorProfile = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]

  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

  let bestKey = 'C'
  let bestCorrelation = -Infinity

  // Normalize chromagram
  const chromaNorm = normalizeArray(chromagram)

  // Try all 24 keys (12 major + 12 minor)
  for (let shift = 0; shift < 12; shift++) {
    // Rotate chromagram
    const rotated = rotateArray(chromaNorm, shift)

    // Correlate with major profile
    const majorCorr = correlate(rotated, normalizeArray(new Float32Array(majorProfile)))
    if (majorCorr > bestCorrelation) {
      bestCorrelation = majorCorr
      bestKey = noteNames[shift]
    }

    // Correlate with minor profile
    const minorCorr = correlate(rotated, normalizeArray(new Float32Array(minorProfile)))
    if (minorCorr > bestCorrelation) {
      bestCorrelation = minorCorr
      bestKey = noteNames[shift] + 'm'
    }
  }

  return bestKey
}

/**
 * Normalize array to unit variance
 */
function normalizeArray(arr: Float32Array): Float32Array {
  const n = arr.length
  let mean = 0
  for (let i = 0; i < n; i++) mean += arr[i]
  mean /= n

  let variance = 0
  for (let i = 0; i < n; i++) variance += (arr[i] - mean) ** 2
  const std = Math.sqrt(variance / n) || 1

  const result = new Float32Array(n)
  for (let i = 0; i < n; i++) result[i] = (arr[i] - mean) / std

  return result
}

/**
 * Rotate array by shift positions
 */
function rotateArray(arr: Float32Array, shift: number): Float32Array {
  const n = arr.length
  const result = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    result[i] = arr[(i + shift) % n]
  }
  return result
}

/**
 * Compute Pearson correlation coefficient
 */
function correlate(a: Float32Array, b: Float32Array): number {
  const n = a.length
  let sum = 0
  for (let i = 0; i < n; i++) sum += a[i] * b[i]
  return sum / n
}

/**
 * Analyze loudness using LUFS (Loudness Units Full Scale)
 * Implementation based on ITU-R BS.1770-4 standard
 */
function analyzeLoudness(audioBuffer: AudioBuffer): LoudnessResult {
  const channelData = audioBuffer.getChannelData(0)
  const sampleRate = audioBuffer.sampleRate

  // Block size: 400ms for momentary, 3s for short-term
  const momentaryBlockSize = Math.floor(sampleRate * 0.4)
  const shortTermBlockSize = Math.floor(sampleRate * 3)
  const hopSize = Math.floor(sampleRate * 0.1) // 100ms hop

  // K-weighting filter coefficients (simplified high-shelf + high-pass)
  // Stage 1: High shelf filter (+4dB above 1500Hz)
  // Stage 2: High-pass filter (cutoff ~38Hz)
  const kWeighted = applyKWeighting(channelData, sampleRate)

  // Calculate momentary loudness values (400ms blocks)
  const momentaryValues: number[] = []
  for (let i = 0; i < kWeighted.length - momentaryBlockSize; i += hopSize) {
    const block = kWeighted.slice(i, i + momentaryBlockSize)
    const meanSquare = calculateMeanSquare(block)
    const lufs = -0.691 + 10 * Math.log10(Math.max(meanSquare, 1e-10))
    momentaryValues.push(lufs)
  }

  // Calculate short-term loudness values (3s blocks)
  const shortTermValues: number[] = []
  for (let i = 0; i < kWeighted.length - shortTermBlockSize; i += hopSize) {
    const block = kWeighted.slice(i, i + shortTermBlockSize)
    const meanSquare = calculateMeanSquare(block)
    const lufs = -0.691 + 10 * Math.log10(Math.max(meanSquare, 1e-10))
    shortTermValues.push(lufs)
  }

  // Integrated loudness (gated, BS.1770-4)
  const integratedLUFS = calculateIntegratedLoudness(kWeighted, sampleRate)

  // Peak and True Peak
  const peak = calculatePeak(channelData)
  const truePeak = calculateTruePeak(channelData, sampleRate)

  // Loudness Range (LRA)
  const loudnessRange = calculateLoudnessRange(shortTermValues)

  return {
    integratedLUFS: Math.round(integratedLUFS * 10) / 10,
    shortTermLUFS:
      shortTermValues.length > 0 ? Math.round(Math.max(...shortTermValues) * 10) / 10 : -70,
    momentaryLUFS:
      momentaryValues.length > 0 ? Math.round(Math.max(...momentaryValues) * 10) / 10 : -70,
    truePeak: Math.round(truePeak * 10) / 10,
    peak: Math.round(peak * 10) / 10,
    loudnessRange: Math.round(loudnessRange * 10) / 10,
  }
}

/**
 * Apply K-weighting filter (simplified implementation)
 */
function applyKWeighting(samples: Float32Array, sampleRate: number): Float32Array {
  const output = new Float32Array(samples.length)

  // High-shelf filter: boost frequencies above 1500Hz by ~4dB
  // Using simple 1-pole high-shelf approximation
  const fc = 1500 / sampleRate
  const k = Math.tan(Math.PI * fc)
  const sqrt2 = Math.sqrt(2)
  const gain = Math.pow(10, 4 / 20) // +4dB

  // Biquad coefficients for high-shelf
  const norm = 1 / (1 + sqrt2 * k + k * k)
  const a0 = (gain + sqrt2 * Math.sqrt(gain) * k + k * k) * norm
  const a1 = 2 * (k * k - gain) * norm
  const a2 = (gain - sqrt2 * Math.sqrt(gain) * k + k * k) * norm
  const b1 = 2 * (k * k - 1) * norm
  const b2 = (1 - sqrt2 * k + k * k) * norm

  // Apply filter
  let x1 = 0,
    x2 = 0,
    y1 = 0,
    y2 = 0
  for (let i = 0; i < samples.length; i++) {
    const x0 = samples[i]
    const y0 = a0 * x0 + a1 * x1 + a2 * x2 - b1 * y1 - b2 * y2
    x2 = x1
    x1 = x0
    y2 = y1
    y1 = y0
    output[i] = y0
  }

  // Apply high-pass filter (remove DC and sub-bass)
  const hpFc = 38 / sampleRate
  const hpK = Math.tan(Math.PI * hpFc)
  const hpNorm = 1 / (1 + sqrt2 * hpK + hpK * hpK)

  const result = new Float32Array(samples.length)
  x1 = 0
  x2 = 0
  y1 = 0
  y2 = 0
  for (let i = 0; i < output.length; i++) {
    const x0 = output[i]
    const y0 =
      hpNorm * x0 -
      2 * hpNorm * x1 +
      hpNorm * x2 -
      2 * (hpK * hpK - 1) * hpNorm * y1 -
      (1 - sqrt2 * hpK + hpK * hpK) * hpNorm * y2
    x2 = x1
    x1 = x0
    y2 = y1
    y1 = y0
    result[i] = y0
  }

  return result
}

/**
 * Calculate mean square of samples
 */
function calculateMeanSquare(samples: Float32Array): number {
  let sum = 0
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i]
  }
  return sum / samples.length
}

/**
 * Calculate integrated loudness with gating (BS.1770-4)
 */
function calculateIntegratedLoudness(kWeighted: Float32Array, sampleRate: number): number {
  const blockSize = Math.floor(sampleRate * 0.4) // 400ms
  const hopSize = Math.floor(sampleRate * 0.1) // 75% overlap

  // Calculate loudness for each block
  const blockLoudness: number[] = []
  for (let i = 0; i < kWeighted.length - blockSize; i += hopSize) {
    const block = kWeighted.slice(i, i + blockSize)
    const meanSquare = calculateMeanSquare(block)
    const lufs = -0.691 + 10 * Math.log10(Math.max(meanSquare, 1e-10))
    blockLoudness.push(lufs)
  }

  if (blockLoudness.length === 0) return -70

  // Absolute gate: -70 LUFS
  const absoluteGated = blockLoudness.filter((l) => l > -70)
  if (absoluteGated.length === 0) return -70

  // Calculate ungated mean
  const ungatedMean =
    absoluteGated.reduce((a, b) => a + Math.pow(10, b / 10), 0) / absoluteGated.length
  const relativeThreshold = 10 * Math.log10(ungatedMean) - 10 // -10 LU below ungated

  // Relative gate
  const relativeGated = absoluteGated.filter((l) => l > relativeThreshold)
  if (relativeGated.length === 0) return -70

  // Final integrated loudness
  const gatedMean =
    relativeGated.reduce((a, b) => a + Math.pow(10, b / 10), 0) / relativeGated.length
  return 10 * Math.log10(gatedMean)
}

/**
 * Calculate sample peak in dBFS
 */
function calculatePeak(samples: Float32Array): number {
  let maxAbs = 0
  for (let i = 0; i < samples.length; i++) {
    const abs = Math.abs(samples[i])
    if (abs > maxAbs) maxAbs = abs
  }
  return 20 * Math.log10(Math.max(maxAbs, 1e-10))
}

/**
 * Calculate true peak using oversampling (simplified 4x)
 */
function calculateTruePeak(samples: Float32Array, _sampleRate: number): number {
  // Simple 4x oversampling using linear interpolation
  // Real implementation would use sinc interpolation
  let maxAbs = 0

  for (let i = 0; i < samples.length - 1; i++) {
    const s0 = samples[i]
    const s1 = samples[i + 1]

    // Check 4 interpolated points
    for (let j = 0; j < 4; j++) {
      const t = j / 4
      const interpolated = s0 + (s1 - s0) * t
      const abs = Math.abs(interpolated)
      if (abs > maxAbs) maxAbs = abs
    }
  }

  return 20 * Math.log10(Math.max(maxAbs, 1e-10))
}

/**
 * Calculate Loudness Range (LRA)
 */
function calculateLoudnessRange(shortTermValues: number[]): number {
  if (shortTermValues.length < 2) return 0

  // Filter out values below absolute threshold
  const filtered = shortTermValues.filter((v) => v > -70)
  if (filtered.length < 2) return 0

  // Sort and get 10th and 95th percentiles
  const sorted = [...filtered].sort((a, b) => a - b)
  const p10Index = Math.floor(sorted.length * 0.1)
  const p95Index = Math.floor(sorted.length * 0.95)

  return sorted[p95Index] - sorted[p10Index]
}

/**
 * Classify sample type based on audio characteristics
 */
function classifySampleType(audioBuffer: AudioBuffer, bpm?: number): string {
  const channelData = audioBuffer.getChannelData(0)
  const sampleRate = audioBuffer.sampleRate
  const duration = audioBuffer.duration

  // Feature extraction
  const features = extractAudioFeatures(channelData, sampleRate)

  // Classification rules

  // 1. One-shot vs Loop detection
  const isShort = duration < 1.5
  const hasRepetition = detectRepetition(channelData, sampleRate, bpm)

  // 2. Frequency-based classification
  const { lowEnergy, midEnergy, highEnergy, transientRatio, spectralCentroid } = features
  const totalEnergy = lowEnergy + midEnergy + highEnergy

  const lowRatio = lowEnergy / totalEnergy
  const midRatio = midEnergy / totalEnergy
  const highRatio = highEnergy / totalEnergy

  // Kick: dominant low frequencies, short, transient
  if (isShort && lowRatio > 0.5 && transientRatio > 0.3) {
    return 'kick'
  }

  // Snare: mid frequencies, short, strong transient
  if (isShort && midRatio > 0.3 && highRatio > 0.2 && transientRatio > 0.4) {
    return 'snare'
  }

  // Hi-hat/Cymbal: dominant high frequencies
  if (isShort && highRatio > 0.5) {
    return 'hihat'
  }

  // Bass: dominant low frequencies, longer
  if (lowRatio > 0.6 && spectralCentroid < 400) {
    return 'bass'
  }

  // Vocal: mid-range, specific spectral characteristics
  if (midRatio > 0.4 && spectralCentroid > 300 && spectralCentroid < 3000) {
    // Check for formant-like patterns (simplified)
    if (detectVocalCharacteristics(channelData, sampleRate)) {
      return 'vocal'
    }
  }

  // FX: high transient variety, unusual spectral distribution
  if (transientRatio > 0.5 && highRatio > 0.4) {
    return 'fx'
  }

  // Loop: detected repetition pattern
  if (hasRepetition && duration > 1) {
    return 'loop'
  }

  // One-shot: short, no repetition
  if (isShort) {
    return 'one-shot'
  }

  // Default: instrumental
  return 'instrumental'
}

/**
 * Extract audio features for classification
 */
function extractAudioFeatures(
  samples: Float32Array,
  sampleRate: number
): {
  lowEnergy: number
  midEnergy: number
  highEnergy: number
  transientRatio: number
  spectralCentroid: number
} {
  const fftSize = 2048
  const spectrum = new Float32Array(fftSize / 2)

  // Compute average spectrum
  let frameCount = 0
  for (let i = 0; i < samples.length - fftSize; i += fftSize / 2) {
    const frame = samples.slice(i, i + fftSize)
    const frameSpectrum = computeSpectrum(applyWindow(frame, fftSize), fftSize)
    for (let j = 0; j < spectrum.length; j++) {
      spectrum[j] += frameSpectrum[j]
    }
    frameCount++
  }

  if (frameCount > 0) {
    for (let j = 0; j < spectrum.length; j++) {
      spectrum[j] /= frameCount
    }
  }

  // Calculate frequency band energies
  const binWidth = sampleRate / fftSize
  let lowEnergy = 0,
    midEnergy = 0,
    highEnergy = 0
  let weightedSum = 0,
    totalMag = 0

  for (let bin = 0; bin < spectrum.length; bin++) {
    const freq = bin * binWidth
    const mag = spectrum[bin]

    if (freq < 250) {
      lowEnergy += mag * mag
    } else if (freq < 2000) {
      midEnergy += mag * mag
    } else {
      highEnergy += mag * mag
    }

    weightedSum += freq * mag
    totalMag += mag
  }

  const spectralCentroid = totalMag > 0 ? weightedSum / totalMag : 0

  // Calculate transient ratio (onset detection)
  let transientCount = 0
  let prevEnergy = 0
  const blockSize = Math.floor(sampleRate * 0.01) // 10ms blocks

  for (let i = 0; i < samples.length - blockSize; i += blockSize) {
    let energy = 0
    for (let j = 0; j < blockSize; j++) {
      energy += samples[i + j] * samples[i + j]
    }

    if (prevEnergy > 0 && energy > prevEnergy * 3) {
      transientCount++
    }
    prevEnergy = energy
  }

  const totalBlocks = Math.floor(samples.length / blockSize)
  const transientRatio = totalBlocks > 0 ? transientCount / totalBlocks : 0

  return { lowEnergy, midEnergy, highEnergy, transientRatio, spectralCentroid }
}

/**
 * Detect repetition pattern for loop detection
 */
function detectRepetition(samples: Float32Array, sampleRate: number, bpm?: number): boolean {
  if (!bpm || bpm < 60) return false

  // Calculate expected beat length
  const beatLength = Math.floor((60 / bpm) * sampleRate)
  const barLength = beatLength * 4

  // Check if audio length is close to a multiple of bar length
  const numBars = samples.length / barLength
  const isBarAligned = Math.abs(numBars - Math.round(numBars)) < 0.1

  if (!isBarAligned) return false

  // Check for self-similarity at bar boundaries
  if (samples.length < barLength * 2) return false

  const firstBar = samples.slice(0, barLength)
  const secondBar = samples.slice(barLength, barLength * 2)

  // Calculate correlation
  let correlation = 0
  let norm1 = 0,
    norm2 = 0

  const checkLength = Math.min(firstBar.length, secondBar.length, sampleRate * 0.5)
  for (let i = 0; i < checkLength; i++) {
    correlation += firstBar[i] * secondBar[i]
    norm1 += firstBar[i] * firstBar[i]
    norm2 += secondBar[i] * secondBar[i]
  }

  const normalizedCorr = correlation / (Math.sqrt(norm1 * norm2) || 1)

  return normalizedCorr > 0.7 // High similarity indicates loop
}

/**
 * Detect vocal characteristics (simplified formant detection)
 */
function detectVocalCharacteristics(samples: Float32Array, sampleRate: number): boolean {
  // Check for formant-like spectral peaks in vocal range (300-3400 Hz)
  const fftSize = 4096
  const spectrum = new Float32Array(fftSize / 2)

  // Compute average spectrum
  let frameCount = 0
  for (let i = 0; i < samples.length - fftSize; i += fftSize) {
    const frame = samples.slice(i, i + fftSize)
    const frameSpectrum = computeSpectrum(applyWindow(frame, fftSize), fftSize)
    for (let j = 0; j < spectrum.length; j++) {
      spectrum[j] += frameSpectrum[j]
    }
    frameCount++
  }

  if (frameCount === 0) return false

  const binWidth = sampleRate / fftSize
  const lowBin = Math.floor(300 / binWidth)
  const highBin = Math.floor(3400 / binWidth)

  // Count spectral peaks in vocal range
  let peakCount = 0
  for (let bin = lowBin + 1; bin < highBin - 1; bin++) {
    if (spectrum[bin] > spectrum[bin - 1] && spectrum[bin] > spectrum[bin + 1]) {
      if (spectrum[bin] > 0.1 * Math.max(...spectrum)) {
        peakCount++
      }
    }
  }

  // Vocals typically have 2-4 prominent formants
  return peakCount >= 2 && peakCount <= 6
}

/**
 * Register IPC handlers
 */
export function registerAudioAnalysisHandlers(mainWindow: BrowserWindow) {
  // Remove old handlers if they exist
  try {
    ipcMain.removeHandler('audio-analysis:analyze')
  } catch (e) {
    // Ignore errors if handlers don't exist
  }

  ipcMain.handle('audio-analysis:analyze', async (_event, options: AudioAnalysisOptions) => {
    try {
      const result = await analyzeAudio(mainWindow, options)
      return result
    } catch (error) {
      console.error('❌ [AUDIO ANALYSIS] Analysis failed:', error)
      throw error
    }
  })
}

import { useState, useEffect, useRef } from 'react'
import { Mic, Square, Save, RotateCcw, Pause, Play, Settings, AlertCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatTime } from '@/lib/utils'
import {
  recordingService,
  type AudioDevice,
  type RecordingState,
} from '@/services/recordingService'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

interface RecorderProps {
  projectId: string
  onSave?: (trackData?: unknown) => void
}

export function Recorder({ projectId, onSave }: RecorderProps) {
  // Recording state
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    audioLevel: 0,
    waveformData: [],
  })
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Device selection
  const [inputDevices, setInputDevices] = useState<AudioDevice[]>([])
  const [selectedInputDevice, setSelectedInputDevice] = useState<string>('default')
  const [showSettings, setShowSettings] = useState(false)
  const [micLevel, setMicLevel] = useState(0)

  // Track name input
  const [trackName, setTrackName] = useState(`Recording ${new Date().toLocaleDateString()}`)

  const micTestIntervalRef = useRef<number | null>(null)

  // Subscribe to recording service state changes
  useEffect(() => {
    const unsubscribe = recordingService.subscribe((state) => {
      setRecordingState((prev) => ({ ...prev, ...state }))
    })

    return () => {
      unsubscribe()
    }
  }, [])

  // Load devices on mount
  useEffect(() => {
    loadDevices()

    // Load saved settings
    const settings = recordingService.getSettings()
    setSelectedInputDevice(settings.inputDeviceId)

    return () => {
      stopMicTest()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadDevices = async () => {
    try {
      const inputs = await recordingService.getInputDevices()
      setInputDevices(inputs)

      if (inputs.length > 0 && selectedInputDevice === 'default') {
        setSelectedInputDevice(inputs[0].deviceId)
      }
    } catch (err) {
      console.error('Failed to load devices:', err)
      setError('Không thể truy cập thiết bị âm thanh. Vui lòng cấp quyền.')
    }
  }

  const startMicTest = async () => {
    stopMicTest()

    const testMic = async () => {
      const result = await recordingService.testMicrophone(selectedInputDevice)
      if (result.success) {
        setMicLevel(result.level)
      }
    }

    testMic()
    micTestIntervalRef.current = setInterval(testMic, 100) as unknown as number
  }

  const stopMicTest = () => {
    if (micTestIntervalRef.current) {
      clearInterval(micTestIntervalRef.current)
      micTestIntervalRef.current = null
      setMicLevel(0)
    }
  }

  const handleStartRecording = async () => {
    try {
      setError(null)
      setRecordedBlob(null)

      // Update settings with selected device
      recordingService.updateSettings({ inputDeviceId: selectedInputDevice })

      await recordingService.startRecording()
    } catch (err) {
      console.error('Failed to start recording:', err)
      setError('Không thể bắt đầu thu âm. Vui lòng kiểm tra quyền truy cập microphone.')
    }
  }

  const handlePauseResume = () => {
    if (recordingState.isPaused) {
      recordingService.resumeRecording()
    } else {
      recordingService.pauseRecording()
    }
  }

  const handleStopRecording = async () => {
    try {
      const blob = await recordingService.stopRecording()
      if (blob) {
        setRecordedBlob(blob)
      }
    } catch (err) {
      console.error('Failed to stop recording:', err)
      setError('Không thể dừng thu âm.')
    }
  }

  const handleSave = async () => {
    if (!recordedBlob) return

    setIsSaving(true)
    setError(null)

    try {
      const filename = trackName.trim() || `Recording_${Date.now()}`
      const result = await recordingService.saveRecording(recordedBlob, projectId, filename)

      if (result.success) {
        setRecordedBlob(null)
        setTrackName(`Recording ${new Date().toLocaleDateString()}`)
        // Pass the full result object (contains data, path, trackId)
        onSave?.(result)
      } else {
        setError(result.error || 'Không thể lưu bản ghi.')
      }
    } catch (err) {
      console.error('Failed to save recording:', err)
      setError('Không thể lưu bản ghi.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleRetry = () => {
    setRecordedBlob(null)
    setError(null)
  }

  const handleCancel = () => {
    recordingService.cancelRecording()
    setRecordedBlob(null)
    setError(null)
  }

  const handleDeviceChange = (deviceId: string) => {
    setSelectedInputDevice(deviceId)
    recordingService.updateSettings({ inputDeviceId: deviceId })
  }

  const { isRecording, isPaused, duration, audioLevel, waveformData } = recordingState
  const hasRecording = recordedBlob !== null

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        gap: 'var(--space-8)',
      }}
    >
      {/* Error Message */}
      {error && (
        <div
          className="glass-elevated animate-fade-in"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            padding: 'var(--space-4)',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
          }}
        >
          <AlertCircle size={20} />
          <span className="text-callout">{error}</span>
        </div>
      )}

      {/* Settings Button */}
      <div style={{ position: 'absolute', top: 'var(--space-4)', right: 'var(--space-4)' }}>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowSettings(true)}
          style={{ borderRadius: 'var(--radius-md)' }}
        >
          <Settings size={20} />
        </Button>
      </div>

      {/* Timer */}
      <div
        className="text-large-title tabular-nums"
        style={{
          color: isRecording ? 'var(--keyColor)' : 'var(--systemPrimary)',
          fontSize: '72px',
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {formatTime(duration * 1000)}
      </div>

      {/* Debug Info (Hidden in production) */}
      {/* <div className="text-xs text-gray-500 absolute top-0 left-0">
        Dur: {duration}s | State: {isRecording ? 'Rec' : 'Stop'} | Lvl: {audioLevel.toFixed(2)}
      </div> */}

      {/* Audio Level Indicator */}
      {isRecording && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            width: '200px',
          }}
        >
          <Mic
            size={16}
            style={{ color: audioLevel > 0.1 ? 'var(--keyColor)' : 'var(--systemSecondary)' }}
          />
          <div
            style={{
              flex: 1,
              height: '8px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--systemQuaternary)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${audioLevel * 100}%`,
                height: '100%',
                backgroundColor:
                  audioLevel > 0.8 ? '#ef4444' : audioLevel > 0.5 ? '#eab308' : 'var(--keyColor)',
                transition: 'width 50ms ease-out',
                borderRadius: 'var(--radius-full)',
              }}
            />
          </div>
        </div>
      )}

      {/* Waveform Visualization */}
      <div
        className="glass-elevated"
        style={{
          width: '100%',
          maxWidth: '600px',
          height: '120px',
          borderRadius: 'var(--radius-xl)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          padding: '0 var(--space-4)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', height: '100%' }}>
          {waveformData.length > 0 ? (
            waveformData.map((value, index) => (
              <div
                key={index}
                className="transition-apple"
                style={{
                  width: '4px',
                  height: `${Math.max(value * 100, 4)}%`,
                  backgroundColor: isRecording ? 'var(--keyColor)' : 'var(--systemTertiary)',
                  borderRadius: 'var(--radius-sm)',
                  opacity: isPaused ? 0.5 : 1,
                }}
              />
            ))
          ) : hasRecording ? (
            <div className="text-callout" style={{ color: 'var(--systemSecondary)' }}>
              Bản ghi sẵn sàng để lưu
            </div>
          ) : (
            <div className="text-callout" style={{ color: 'var(--systemSecondary)' }}>
              Nhấn nút để bắt đầu thu âm...
            </div>
          )}
        </div>
      </div>

      {/* Track Name Input (when recording is done) */}
      {hasRecording && (
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <label
            className="text-footnote font-medium"
            style={{
              color: 'var(--systemSecondary)',
              marginBottom: 'var(--space-2)',
              display: 'block',
            }}
          >
            Tên bản ghi
          </label>
          <Input
            value={trackName}
            onChange={(e) => setTrackName(e.target.value)}
            placeholder="Nhập tên bản ghi..."
            style={{ textAlign: 'center' }}
          />
        </div>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
        {/* Not Recording & No Recording */}
        {!isRecording && !hasRecording && (
          <Button
            size="lg"
            onClick={handleStartRecording}
            className="transition-apple active:scale-[0.98]"
            style={{
              gap: 'var(--space-2)',
              paddingInline: 'var(--space-8)',
              height: '56px',
              borderRadius: 'var(--radius-full)',
              fontSize: '16px',
            }}
          >
            <Mic className="h-5 w-5" />
            Bắt đầu thu âm
          </Button>
        )}

        {/* Recording */}
        {isRecording && (
          <>
            <Button
              size="lg"
              variant="ghost"
              onClick={handleCancel}
              className="transition-apple"
              style={{
                gap: 'var(--space-2)',
                height: '56px',
                paddingInline: 'var(--space-6)',
                borderRadius: 'var(--radius-full)',
                fontSize: '16px',
              }}
            >
              <X className="h-5 w-5" />
              Hủy
            </Button>

            <Button
              size="lg"
              variant="outline"
              onClick={handlePauseResume}
              className="transition-apple"
              style={{
                gap: 'var(--space-2)',
                height: '56px',
                width: '56px',
                borderRadius: 'var(--radius-full)',
                padding: 0,
              }}
            >
              {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
            </Button>

            <Button
              size="lg"
              variant="destructive"
              onClick={handleStopRecording}
              className="transition-apple active:scale-[0.98]"
              style={{
                gap: 'var(--space-2)',
                paddingInline: 'var(--space-8)',
                height: '56px',
                borderRadius: 'var(--radius-full)',
                fontSize: '16px',
              }}
            >
              <Square className="h-5 w-5" fill="currentColor" />
              Dừng
            </Button>
          </>
        )}

        {/* Has Recording */}
        {hasRecording && (
          <>
            <Button
              size="lg"
              onClick={handleSave}
              disabled={isSaving}
              className="transition-apple active:scale-[0.98]"
              style={{
                gap: 'var(--space-2)',
                paddingInline: 'var(--space-8)',
                height: '56px',
                borderRadius: 'var(--radius-full)',
                fontSize: '16px',
              }}
            >
              <Save className="h-5 w-5" />
              {isSaving ? 'Đang lưu...' : 'Lưu'}
            </Button>

            <Button
              size="lg"
              variant="outline"
              onClick={handleRetry}
              className="transition-apple"
              style={{
                gap: 'var(--space-2)',
                paddingInline: 'var(--space-6)',
                height: '56px',
                borderRadius: 'var(--radius-full)',
                fontSize: '16px',
              }}
            >
              <RotateCcw className="h-5 w-5" />
              Thu lại
            </Button>
          </>
        )}
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent style={{ maxWidth: '480px' }}>
          <DialogHeader>
            <DialogTitle>Cài đặt thu âm</DialogTitle>
            <DialogDescription>
              Chọn thiết bị đầu vào và cấu hình chất lượng thu âm
            </DialogDescription>
          </DialogHeader>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-6)',
              marginTop: 'var(--space-4)',
            }}
          >
            {/* Input Device Selection */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <label className="text-callout font-medium" style={{ color: 'var(--systemPrimary)' }}>
                Microphone
              </label>
              <select
                value={selectedInputDevice}
                onChange={(e) => handleDeviceChange(e.target.value)}
                className="transition-apple"
                style={{
                  padding: 'var(--space-3) var(--space-4)',
                  borderRadius: 'var(--radius-lg)',
                  backgroundColor: 'var(--systemQuaternary)',
                  color: 'var(--systemPrimary)',
                  border: '1px solid var(--systemQuaternary)',
                  fontSize: '14px',
                }}
              >
                {inputDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Mic Test */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <label className="text-callout font-medium" style={{ color: 'var(--systemPrimary)' }}>
                Kiểm tra Microphone
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={micTestIntervalRef.current ? stopMicTest : startMicTest}
                  style={{ borderRadius: 'var(--radius-md)' }}
                >
                  {micTestIntervalRef.current ? 'Dừng test' : 'Test mic'}
                </Button>
                <div
                  style={{
                    flex: 1,
                    height: '8px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--systemQuaternary)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${micLevel * 100}%`,
                      height: '100%',
                      backgroundColor:
                        micLevel > 0.8 ? '#ef4444' : micLevel > 0.5 ? '#eab308' : 'var(--keyColor)',
                      transition: 'width 50ms ease-out',
                      borderRadius: 'var(--radius-full)',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Recording Quality */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <label className="text-callout font-medium" style={{ color: 'var(--systemPrimary)' }}>
                Chất lượng thu âm
              </label>
              <select
                value={recordingService.getSettings().sampleRate}
                onChange={(e) =>
                  recordingService.updateSettings({
                    sampleRate: Number(e.target.value) as 44100 | 48000 | 96000,
                  })
                }
                className="transition-apple"
                style={{
                  padding: 'var(--space-3) var(--space-4)',
                  borderRadius: 'var(--radius-lg)',
                  backgroundColor: 'var(--systemQuaternary)',
                  color: 'var(--systemPrimary)',
                  border: '1px solid var(--systemQuaternary)',
                  fontSize: '14px',
                }}
              >
                <option value={44100}>44.1 kHz (CD Quality)</option>
                <option value={48000}>48 kHz (Standard)</option>
                <option value={96000}>96 kHz (High Resolution)</option>
              </select>
            </div>

            {/* Channels */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <label className="text-callout font-medium" style={{ color: 'var(--systemPrimary)' }}>
                Kênh âm thanh
              </label>
              <select
                value={recordingService.getSettings().channels}
                onChange={(e) =>
                  recordingService.updateSettings({ channels: Number(e.target.value) as 1 | 2 })
                }
                className="transition-apple"
                style={{
                  padding: 'var(--space-3) var(--space-4)',
                  borderRadius: 'var(--radius-lg)',
                  backgroundColor: 'var(--systemQuaternary)',
                  color: 'var(--systemPrimary)',
                  border: '1px solid var(--systemQuaternary)',
                  fontSize: '14px',
                }}
              >
                <option value={1}>Mono</option>
                <option value={2}>Stereo</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-6)' }}>
            <Button onClick={() => setShowSettings(false)}>Xong</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

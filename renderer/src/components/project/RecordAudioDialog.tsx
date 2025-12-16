import { useState, useRef, useEffect } from 'react'
import { Mic, Square, Play, Pause, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { formatDuration } from '@/utils/format'
import { toast } from 'sonner'

interface RecordAudioDialogProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  folderId?: number
  onSave?: (blob: Blob, name: string, duration: number) => void
  onTrackSaved?: () => void // Callback to refresh track list
}

export function RecordAudioDialog({
  isOpen,
  onClose,
  projectId,
  folderId,
  onSave,
  onTrackSaved,
}: RecordAudioDialogProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [recordedUrl, setRecordedUrl] = useState<string>('')
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [trackName, setTrackName] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number>()
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl)
      }
    }
  }, [recordedUrl])

  const startRecording = async () => {
    try {
      // Enhanced audio constraints for better quality
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 2,
        },
      })

      // Try to use better audio format if supported
      let mimeType = 'audio/webm;codecs=opus'
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm'
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/mp4'
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000, // 128 kbps
      })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        const url = URL.createObjectURL(blob)
        setRecordedBlob(blob)
        setRecordedUrl(url)

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setDuration(0)

      // Start timer
      timerRef.current = window.setInterval(() => {
        setDuration((prev) => prev + 1)
      }, 1000)
    } catch (error) {
      console.error('Error accessing microphone:', error)
      alert('Could not access microphone. Please check permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsPaused(false)

      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume()
        timerRef.current = window.setInterval(() => {
          setDuration((prev) => prev + 1)
        }, 1000)
      } else {
        mediaRecorderRef.current.pause()
        if (timerRef.current) {
          clearInterval(timerRef.current)
        }
      }
      setIsPaused(!isPaused)
    }
  }

  const playRecording = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(recordedUrl)
      audioRef.current.onended = () => setIsPlaying(false)
    }

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const handleSave = async () => {
    if (!recordedBlob || !recordedUrl) return

    const name = trackName.trim() || `Recording ${new Date().toLocaleString()}`
    setIsSaving(true)

    try {
      // Convert blob to base64
      const reader = new FileReader()
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const result = reader.result as string
          // Remove data URL prefix (e.g., "data:audio/webm;base64,")
          const base64Data = result.split(',')[1]
          resolve(base64Data)
        }
        reader.onerror = reject
      })
      reader.readAsDataURL(recordedBlob)

      const audioData = await base64Promise

      // Save to backend
      const response = await window.electronAPI.saveRecording({
        projectId: parseInt(projectId, 10),
        folderId: folderId,
        name: name,
        durationMs: duration * 1000,
        audioData: audioData,
        mimeType: recordedBlob.type,
      })

      if (response.success) {
        toast.success('Recording saved successfully!')

        // Call optional callbacks
        if (onSave) {
          onSave(recordedBlob, name, duration)
        }
        if (onTrackSaved) {
          onTrackSaved()
        }

        handleClose()
      } else {
        toast.error(response.error || 'Failed to save recording')
      }
    } catch (error) {
      console.error('Error saving recording:', error)
      toast.error('An error occurred while saving the recording')
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    stopRecording()
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl)
    }
    setRecordedBlob(null)
    setRecordedUrl('')
    setDuration(0)
    setTrackName('')
    setIsPlaying(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

        {/* Dialog */}
        <div className="relative glass-elevated rounded-apple-xl p-6 w-full max-w-md shadow-apple-lg">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
              Record Audio
            </h2>
            <Button variant="ghost" size="icon" className="rounded-apple" onClick={handleClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Recording Visualizer */}
          <div className="mb-6">
            <div
              className="rounded-apple-lg p-8 flex flex-col items-center justify-center"
              style={{ backgroundColor: 'var(--surface)', minHeight: '200px' }}
            >
              {/* Microphone Icon with Animation */}
              <div
                className={`mb-4 ${isRecording && !isPaused ? 'animate-pulse' : ''}`}
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  backgroundColor: isRecording ? 'var(--primary)' : 'var(--card)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Mic className="h-10 w-10" style={{ color: 'white' }} />
              </div>

              {/* Duration */}
              <p className="text-4xl font-mono font-bold mb-2" style={{ color: 'var(--text)' }}>
                {formatDuration(duration * 1000)}
              </p>

              {/* Status */}
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {isRecording
                  ? isPaused
                    ? 'Recording Paused'
                    : 'Recording...'
                  : recordedBlob
                    ? 'Recording Complete'
                    : 'Ready to Record'}
              </p>
            </div>
          </div>

          {/* Track Name Input (shown after recording) */}
          {recordedBlob && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                Track Name
              </label>
              <input
                type="text"
                value={trackName}
                onChange={(e) => setTrackName(e.target.value)}
                placeholder={`Recording ${new Date().toLocaleString()}`}
                className="w-full px-4 py-2 rounded-apple"
                style={{
                  backgroundColor: 'var(--surface)',
                  color: 'var(--text)',
                  border: '1px solid var(--accent)',
                }}
              />
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-3">
            {!isRecording && !recordedBlob && (
              <Button
                className="flex-1 rounded-apple"
                style={{ backgroundColor: 'var(--primary)', color: 'white' }}
                onClick={startRecording}
              >
                <Mic className="h-4 w-4 mr-2" />
                Start Recording
              </Button>
            )}

            {isRecording && (
              <>
                <Button variant="outline" className="flex-1 rounded-apple" onClick={pauseRecording}>
                  {isPaused ? (
                    <Play className="h-4 w-4 mr-2" />
                  ) : (
                    <Pause className="h-4 w-4 mr-2" />
                  )}
                  {isPaused ? 'Resume' : 'Pause'}
                </Button>
                <Button variant="outline" className="flex-1 rounded-apple" onClick={stopRecording}>
                  <Square className="h-4 w-4 mr-2" />
                  Stop
                </Button>
              </>
            )}

            {recordedBlob && !isRecording && (
              <>
                <Button
                  variant="outline"
                  className="flex-1 rounded-apple"
                  onClick={playRecording}
                  disabled={isSaving}
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4 mr-2" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  {isPlaying ? 'Pause' : 'Play'}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 rounded-apple"
                  disabled={isSaving}
                  onClick={() => {
                    setRecordedBlob(null)
                    setRecordedUrl('')
                    setDuration(0)
                    setTrackName('')
                  }}
                >
                  Re-record
                </Button>
                <Button
                  className="flex-1 rounded-apple"
                  style={{ backgroundColor: 'var(--primary)', color: 'white' }}
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save'
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  )
}

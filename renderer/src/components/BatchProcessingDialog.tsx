import { useState, useEffect, useCallback } from 'react'
import {
  RefreshCw,
  FileAudio,
  Scissors,
  Volume2,
  Tag,
  X,
  Check,
  AlertCircle,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Slider } from '@/components/ui/slider'
import type { BatchProgress, BatchResult, BatchResultItem, Track } from '@/types'
import type { AudioAnalysisResult } from '@/types/electron'

interface BatchProcessingDialogProps {
  isOpen: boolean
  onClose: () => void
  selectedTracks: Track[]
  onComplete?: () => void
}

type OutputFormat = 'mp3' | 'wav' | 'flac' | 'ogg' | 'aac'
type BatchOperation = 'convert' | 'rename' | 'normalize' | 'trim' | 'aitag'

interface FormatOption {
  value: OutputFormat
  label: string
  description: string
}

const FORMAT_OPTIONS: FormatOption[] = [
  { value: 'mp3', label: 'MP3', description: 'Popular, lossy' },
  { value: 'wav', label: 'WAV', description: 'Uncompressed, high quality' },
  { value: 'flac', label: 'FLAC', description: 'Lossless compression' },
  { value: 'ogg', label: 'OGG', description: 'Open source, good compression' },
  { value: 'aac', label: 'AAC', description: 'Efficient compression' },
]

const BITRATE_OPTIONS = ['128k', '192k', '256k', '320k']

const TEMPLATE_PLACEHOLDERS = [
  { key: '[NAME]', description: 'Original filename' },
  { key: '[BPM]', description: 'Track BPM' },
  { key: '[KEY]', description: 'Track key' },
  { key: '[NUM]', description: 'Sequence number' },
  { key: '[DATE]', description: 'Current date' },
]

export function BatchProcessingDialog({
  isOpen,
  onClose,
  selectedTracks,
  onComplete,
}: BatchProcessingDialogProps) {
  const [activeTab, setActiveTab] = useState<BatchOperation>('convert')
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState<BatchProgress | null>(null)
  const [results, setResults] = useState<BatchResult | null>(null)
  const [batchId, setBatchId] = useState<string | null>(null)

  // Convert options
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('mp3')
  const [bitrate, setBitrate] = useState('256k')
  const [sampleRate, setSampleRate] = useState(44100)

  // Rename options
  const [renameTemplate, setRenameTemplate] = useState('[BPM]_[KEY]_[NAME]')
  const [startNumber, setStartNumber] = useState(1)

  // Normalize options
  const [targetLUFS, setTargetLUFS] = useState(-14)
  const [targetPeak, setTargetPeak] = useState(-1)

  // Trim options
  const [silenceThreshold, setSilenceThreshold] = useState(-50)
  const [minSilenceMs, setMinSilenceMs] = useState(100)

  // AI Tag options
  const [addBpmTag, setAddBpmTag] = useState(true)
  const [addKeyTag, setAddKeyTag] = useState(true)
  const [addTypeTag, setAddTypeTag] = useState(true)
  const [aiTagProgress, setAiTagProgress] = useState<{
    current: number
    total: number
    trackName: string
  } | null>(null)

  // Listen for progress updates
  useEffect(() => {
    if (!isOpen) return

    const cleanup = window.electronAPI.onBatchProgress((progressData: BatchProgress) => {
      setProgress(progressData)
      if (progressData.status === 'complete' || progressData.status === 'error') {
        setIsProcessing(false)
      }
    })

    return () => {
      cleanup?.()
    }
  }, [isOpen])

  const handleClose = useCallback(() => {
    if (isProcessing && batchId) {
      window.electronAPI.cancelBatch(batchId)
    }
    setProgress(null)
    setResults(null)
    setIsProcessing(false)
    setBatchId(null)
    onClose()
  }, [isProcessing, batchId, onClose])

  const handleConvert = async () => {
    if (selectedTracks.length === 0) return

    setIsProcessing(true)
    setProgress(null)
    setResults(null)

    try {
      const response = await window.electronAPI.batchConvert({
        trackIds: selectedTracks.map((t) => parseInt(t.id, 10)),
        outputFormat,
        bitrate,
        sampleRate,
      })
      if (response.success && response.data) {
        setBatchId(response.data.batchId)
        setResults(response.data)
      }
    } catch (error) {
      console.error('Batch convert error:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRename = async () => {
    if (selectedTracks.length === 0) return

    setIsProcessing(true)
    setProgress(null)
    setResults(null)

    try {
      const response = await window.electronAPI.batchRename({
        trackIds: selectedTracks.map((t) => parseInt(t.id, 10)),
        template: renameTemplate,
        startNumber,
      })
      if (response.success && response.data) {
        setBatchId(response.data.batchId)
        setResults(response.data)
        onComplete?.()
      }
    } catch (error) {
      console.error('Batch rename error:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleNormalize = async () => {
    if (selectedTracks.length === 0) return

    setIsProcessing(true)
    setProgress(null)
    setResults(null)

    try {
      const response = await window.electronAPI.batchNormalize({
        trackIds: selectedTracks.map((t) => parseInt(t.id, 10)),
        targetLUFS,
        targetPeak,
        createNewVersion: true,
      })
      if (response.success && response.data) {
        setBatchId(response.data.batchId)
        setResults(response.data)
        onComplete?.()
      }
    } catch (error) {
      console.error('Normalize error:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleTrimSilence = async () => {
    if (selectedTracks.length === 0) return

    setIsProcessing(true)
    setProgress(null)
    setResults(null)

    try {
      const response = await window.electronAPI.batchTrimSilence({
        trackIds: selectedTracks.map((t) => parseInt(t.id, 10)),
        threshold: silenceThreshold,
        minSilenceMs,
        createNewVersion: true,
      })
      if (response.success && response.data) {
        setBatchId(response.data.batchId)
        setResults(response.data)
        onComplete?.()
      }
    } catch (error) {
      console.error('Trim silence error:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleAiTag = async () => {
    if (selectedTracks.length === 0) return

    setIsProcessing(true)
    setProgress(null)
    setResults(null)
    setAiTagProgress({ current: 0, total: selectedTracks.length, trackName: '' })

    const resultItems: BatchResultItem[] = []

    try {
      for (let i = 0; i < selectedTracks.length; i++) {
        const track = selectedTracks[i]
        const trackId = parseInt(track.id, 10)

        setAiTagProgress({
          current: i + 1,
          total: selectedTracks.length,
          trackName: track.title,
        })

        try {
          // Analyze audio
          const response = await window.electronAPI.analyzeAudio({ trackId })

          if (!response.success || !response.data) {
            resultItems.push({
              trackId,
              success: false,
              error: `${track.title}: ${response.error || 'Analysis failed'}`,
            })
            continue
          }

          const analysisResult: AudioAnalysisResult = response.data

          if (analysisResult.error) {
            resultItems.push({
              trackId,
              success: false,
              error: `${track.title}: ${analysisResult.error}`,
            })
            continue
          }

          // Build tags based on analysis
          const tagsToAdd: string[] = []

          if (addBpmTag && analysisResult.bpm) {
            tagsToAdd.push(`${analysisResult.bpm}bpm`)
          }

          if (addKeyTag && analysisResult.key) {
            tagsToAdd.push(analysisResult.key)
          }

          if (addTypeTag && analysisResult.sampleType) {
            tagsToAdd.push(analysisResult.sampleType)
          }

          // Add tags to track
          if (tagsToAdd.length > 0) {
            // Get existing tags
            const tagsResponse = await window.electronAPI.getTags()
            const existingTags = tagsResponse.success ? tagsResponse.data || [] : []

            for (const tagName of tagsToAdd) {
              // Find or create tag
              let tag = existingTags.find((t) => t.name.toLowerCase() === tagName.toLowerCase())

              if (!tag) {
                // Create new tag
                const createResponse = await window.electronAPI.createTag({ name: tagName })
                if (createResponse.success && createResponse.data) {
                  tag = createResponse.data
                  existingTags.push(tag) // Add to cache for next iteration
                }
              }

              if (tag) {
                // Add tag to track
                await window.electronAPI.addTagToTrack({ trackId, tagId: tag.id })
              }
            }
          }

          resultItems.push({
            trackId,
            success: true,
            message: `Added tags: ${tagsToAdd.join(', ') || 'None'}`,
          })
        } catch (error) {
          resultItems.push({
            trackId,
            success: false,
            error: `${track.title}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          })
        }
      }

      setResults({
        batchId: `aitag-${Date.now()}`,
        results: resultItems,
      })
      onComplete?.()
    } catch (error) {
      console.error('AI Tag error:', error)
    } finally {
      setIsProcessing(false)
      setAiTagProgress(null)
    }
  }

  const getProcessHandler = () => {
    switch (activeTab) {
      case 'convert':
        return handleConvert
      case 'rename':
        return handleRename
      case 'normalize':
        return handleNormalize
      case 'trim':
        return handleTrimSilence
      case 'aitag':
        return handleAiTag
    }
  }

  const getSuccessCount = () =>
    results?.results.filter((r: BatchResultItem) => r.success).length ?? 0
  const getFailCount = () => results?.results.filter((r: BatchResultItem) => !r.success).length ?? 0

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Batch Processing ({selectedTracks.length} files)
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as BatchOperation)}>
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="convert" className="flex items-center gap-1">
              <FileAudio className="h-4 w-4" />
              Convert
            </TabsTrigger>
            <TabsTrigger value="rename" className="flex items-center gap-1">
              <Tag className="h-4 w-4" />
              Rename
            </TabsTrigger>
            <TabsTrigger value="normalize" className="flex items-center gap-1">
              <Volume2 className="h-4 w-4" />
              Normalize
            </TabsTrigger>
            <TabsTrigger value="trim" className="flex items-center gap-1">
              <Scissors className="h-4 w-4" />
              Trim
            </TabsTrigger>
            <TabsTrigger value="aitag" className="flex items-center gap-1">
              <Sparkles className="h-4 w-4" />
              AI Tag
            </TabsTrigger>
          </TabsList>

          {/* Convert Tab */}
          <TabsContent value="convert" className="space-y-4 mt-4">
            <div>
              <Label className="mb-2 block">Output Format</Label>
              <div className="grid grid-cols-5 gap-2">
                {FORMAT_OPTIONS.map((format) => (
                  <button
                    key={format.value}
                    onClick={() => setOutputFormat(format.value)}
                    className={`p-3 rounded-apple border text-center transition-smooth ${
                      outputFormat === format.value
                        ? 'border-accent bg-accent/10'
                        : 'border-surface hover:border-accent/50'
                    }`}
                  >
                    <div className="font-medium text-sm">{format.label}</div>
                    <div className="text-xs text-text-secondary mt-1">{format.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {outputFormat === 'mp3' && (
              <div>
                <Label className="mb-2 block">Bitrate</Label>
                <div className="flex gap-2">
                  {BITRATE_OPTIONS.map((br) => (
                    <button
                      key={br}
                      onClick={() => setBitrate(br)}
                      className={`px-4 py-2 rounded-apple border transition-smooth ${
                        bitrate === br
                          ? 'border-accent bg-accent/10'
                          : 'border-surface hover:border-accent/50'
                      }`}
                    >
                      {br}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label className="mb-2 block">Sample Rate</Label>
              <div className="flex gap-2">
                {[44100, 48000, 96000].map((sr) => (
                  <button
                    key={sr}
                    onClick={() => setSampleRate(sr)}
                    className={`px-4 py-2 rounded-apple border transition-smooth ${
                      sampleRate === sr
                        ? 'border-accent bg-accent/10'
                        : 'border-surface hover:border-accent/50'
                    }`}
                  >
                    {sr / 1000}kHz
                  </button>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Rename Tab */}
          <TabsContent value="rename" className="space-y-4 mt-4">
            <div>
              <Label className="mb-2 block">Rename Template</Label>
              <Input
                value={renameTemplate}
                onChange={(e) => setRenameTemplate(e.target.value)}
                placeholder="[BPM]_[KEY]_[NAME]"
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {TEMPLATE_PLACEHOLDERS.map((ph) => (
                  <button
                    key={ph.key}
                    onClick={() => setRenameTemplate((prev) => prev + ph.key)}
                    className="px-2 py-1 text-xs rounded-apple bg-surface hover:bg-accent/20 transition-smooth"
                    title={ph.description}
                  >
                    {ph.key}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Starting Number (for [NUM])</Label>
              <Input
                type="number"
                value={startNumber}
                onChange={(e) => setStartNumber(parseInt(e.target.value) || 1)}
                min={1}
              />
            </div>

            <div className="p-3 bg-surface rounded-apple">
              <div className="text-sm text-text-secondary mb-1">Preview:</div>
              <div className="font-mono text-sm">
                {renameTemplate
                  .replace('[NAME]', selectedTracks[0]?.title || 'track_name')
                  .replace('[BPM]', '128')
                  .replace('[KEY]', 'Am')
                  .replace('[NUM]', String(startNumber).padStart(2, '0'))
                  .replace('[DATE]', new Date().toISOString().split('T')[0])}
              </div>
            </div>
          </TabsContent>

          {/* Normalize Tab */}
          <TabsContent value="normalize" className="space-y-4 mt-4">
            <div>
              <Label className="mb-2 block">Target LUFS: {targetLUFS} LUFS</Label>
              <Slider
                value={[targetLUFS]}
                onValueChange={([v]) => setTargetLUFS(v)}
                min={-24}
                max={-6}
                step={0.5}
              />
              <div className="flex justify-between text-xs text-text-secondary mt-1">
                <span>-24 (Quiet)</span>
                <span>-14 (Streaming)</span>
                <span>-6 (Loud)</span>
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Target True Peak: {targetPeak} dBTP</Label>
              <Slider
                value={[targetPeak]}
                onValueChange={([v]) => setTargetPeak(v)}
                min={-6}
                max={0}
                step={0.1}
              />
              <div className="flex justify-between text-xs text-text-secondary mt-1">
                <span>-6 dB</span>
                <span>-1 dB (Recommended)</span>
                <span>0 dB</span>
              </div>
            </div>

            <div className="p-3 bg-accent/10 rounded-apple border border-accent/20">
              <div className="text-sm font-medium">Info</div>
              <div className="text-xs text-text-secondary mt-1">
                • -14 LUFS: Spotify, YouTube standard
                <br />
                • -16 LUFS: Apple Music standard
                <br />• -23 LUFS: EBU R128 broadcast standard
              </div>
            </div>
          </TabsContent>

          {/* Trim Tab */}
          <TabsContent value="trim" className="space-y-4 mt-4">
            <div>
              <Label className="mb-2 block">Silence Threshold: {silenceThreshold} dB</Label>
              <Slider
                value={[silenceThreshold]}
                onValueChange={([v]) => setSilenceThreshold(v)}
                min={-70}
                max={-20}
                step={1}
              />
              <div className="flex justify-between text-xs text-text-secondary mt-1">
                <span>-70 dB (Sensitive)</span>
                <span>-50 dB</span>
                <span>-20 dB (Aggressive)</span>
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Minimum Silence Duration: {minSilenceMs}ms</Label>
              <Slider
                value={[minSilenceMs]}
                onValueChange={([v]) => setMinSilenceMs(v)}
                min={50}
                max={500}
                step={10}
              />
            </div>

            <div className="p-3 bg-surface rounded-apple">
              <div className="text-sm font-medium">Trim Mode</div>
              <div className="text-xs text-text-secondary mt-1">
                Automatically removes silence at the beginning and end of audio files. A new version
                will be created.
              </div>
            </div>
          </TabsContent>

          {/* AI Tag Tab */}
          <TabsContent value="aitag" className="space-y-4 mt-4">
            <div className="p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-apple border border-purple-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-purple-400" />
                <span className="font-semibold">AI Audio Analysis</span>
              </div>
              <p className="text-sm text-text-secondary">
                Automatically analyze audio and add tags based on detected BPM, musical key, and
                sample type.
              </p>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Tags to Add</Label>

              <label className="flex items-center gap-3 p-3 rounded-apple border border-surface hover:border-accent/50 cursor-pointer transition-smooth">
                <input
                  type="checkbox"
                  checked={addBpmTag}
                  onChange={(e) => setAddBpmTag(e.target.checked)}
                  className="w-4 h-4 rounded accent-accent"
                />
                <div>
                  <div className="font-medium text-sm">BPM Tag</div>
                  <div className="text-xs text-text-secondary">
                    Add detected tempo (e.g., &quot;128bpm&quot;)
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-apple border border-surface hover:border-accent/50 cursor-pointer transition-smooth">
                <input
                  type="checkbox"
                  checked={addKeyTag}
                  onChange={(e) => setAddKeyTag(e.target.checked)}
                  className="w-4 h-4 rounded accent-accent"
                />
                <div>
                  <div className="font-medium text-sm">Key Tag</div>
                  <div className="text-xs text-text-secondary">
                    Add detected musical key (e.g., &quot;Am&quot;, &quot;C#&quot;)
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-apple border border-surface hover:border-accent/50 cursor-pointer transition-smooth">
                <input
                  type="checkbox"
                  checked={addTypeTag}
                  onChange={(e) => setAddTypeTag(e.target.checked)}
                  className="w-4 h-4 rounded accent-accent"
                />
                <div>
                  <div className="font-medium text-sm">Sample Type Tag</div>
                  <div className="text-xs text-text-secondary">
                    Add detected type (kick, snare, bass, vocal, loop, etc.)
                  </div>
                </div>
              </label>
            </div>

            {aiTagProgress && (
              <div className="p-3 bg-surface rounded-apple">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing...
                  </span>
                  <span className="text-sm text-text-secondary">
                    {aiTagProgress.current}/{aiTagProgress.total}
                  </span>
                </div>
                <div className="w-full bg-surface-subtle rounded-full h-2">
                  <div
                    className="bg-purple-500 h-2 rounded-full transition-all"
                    style={{ width: `${(aiTagProgress.current / aiTagProgress.total) * 100}%` }}
                  />
                </div>
                <div className="text-xs text-text-secondary mt-2 truncate">
                  {aiTagProgress.trackName}
                </div>
              </div>
            )}

            <div className="p-3 bg-surface rounded-apple">
              <div className="text-sm font-medium mb-2">Sample Types Detected</div>
              <div className="flex flex-wrap gap-2">
                {['kick', 'snare', 'hihat', 'bass', 'vocal', 'fx', 'loop', 'one-shot'].map(
                  (type) => (
                    <span
                      key={type}
                      className="px-2 py-1 text-xs rounded-apple bg-accent/10 text-accent"
                    >
                      {type}
                    </span>
                  )
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Progress Display */}
        {progress && (
          <div className="mt-4 p-4 bg-surface rounded-apple">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                {progress.status === 'processing' && (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </span>
                )}
                {progress.status === 'complete' && (
                  <span className="flex items-center gap-2 text-green-500">
                    <Check className="h-4 w-4" />
                    Complete
                  </span>
                )}
                {progress.status === 'error' && (
                  <span className="flex items-center gap-2 text-red-500">
                    <X className="h-4 w-4" />
                    Error
                  </span>
                )}
              </span>
              <span className="text-sm text-text-secondary">
                {progress.currentIndex}/{progress.totalFiles}
              </span>
            </div>
            <div className="w-full bg-surface-subtle rounded-full h-2">
              <div
                className="bg-accent h-2 rounded-full transition-all"
                style={{ width: `${(progress.currentIndex / progress.totalFiles) * 100}%` }}
              />
            </div>
            <div className="text-xs text-text-secondary mt-2 truncate">{progress.currentFile}</div>
          </div>
        )}

        {/* Results Display */}
        {results && (
          <div className="mt-4 p-4 bg-surface rounded-apple">
            <div className="flex items-center gap-4 mb-3">
              <div className="flex items-center gap-2 text-green-500">
                <Check className="h-4 w-4" />
                <span>{getSuccessCount()} succeeded</span>
              </div>
              {getFailCount() > 0 && (
                <div className="flex items-center gap-2 text-red-500">
                  <AlertCircle className="h-4 w-4" />
                  <span>{getFailCount()} failed</span>
                </div>
              )}
            </div>
            {getFailCount() > 0 && (
              <div className="text-xs text-text-secondary max-h-24 overflow-y-auto">
                {results.results
                  .filter((r: BatchResultItem) => !r.success)
                  .map((r: BatchResultItem, i: number) => (
                    <div key={i} className="flex gap-2">
                      <X className="h-3 w-3 text-red-500 flex-shrink-0 mt-0.5" />
                      <span>{r.error}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div
          className="flex justify-end gap-3 border-t pt-4 mt-4"
          style={{ borderColor: 'var(--surface)' }}
        >
          <Button variant="ghost" onClick={handleClose} disabled={isProcessing}>
            {results ? 'Close' : 'Cancel'}
          </Button>
          {!results && (
            <Button
              onClick={getProcessHandler()}
              disabled={isProcessing || selectedTracks.length === 0}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Process {selectedTracks.length} files
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

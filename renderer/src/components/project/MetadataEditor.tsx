import { useEffect, useState } from 'react'
import { Music, Hash, Smile, Album, Save, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MetadataEditorProps {
  projectId: number
  onSave?: () => void
}

interface Metadata {
  bpm: number | null
  musicalKey: string | null
  mood: string | null
  genre: string | null
}

// Common musical keys
const MUSICAL_KEYS = [
  'C',
  'C#',
  'Db',
  'D',
  'D#',
  'Eb',
  'E',
  'F',
  'F#',
  'Gb',
  'G',
  'G#',
  'Ab',
  'A',
  'A#',
  'Bb',
  'B',
  'Cm',
  'C#m',
  'Dbm',
  'Dm',
  'D#m',
  'Ebm',
  'Em',
  'Fm',
  'F#m',
  'Gbm',
  'Gm',
  'G#m',
  'Abm',
  'Am',
  'A#m',
  'Bbm',
  'Bm',
]

// Common moods for music production
const MOODS = [
  'Energetic',
  'Chill',
  'Dark',
  'Uplifting',
  'Melancholic',
  'Aggressive',
  'Dreamy',
  'Funky',
  'Epic',
  'Ambient',
  'Romantic',
  'Mysterious',
  'Happy',
  'Sad',
  'Intense',
  'Relaxed',
  'Groovy',
  'Ethereal',
]

// Common music genres
const GENRES = [
  'Hip-Hop',
  'Pop',
  'Rock',
  'EDM',
  'R&B',
  'Jazz',
  'Classical',
  'Country',
  'Trap',
  'House',
  'Techno',
  'Dubstep',
  'Lo-Fi',
  'Indie',
  'Metal',
  'Soul',
  'Funk',
  'Reggae',
  'Latin',
  'World',
  'Ambient',
  'Cinematic',
  'Other',
]

export function MetadataEditor({ projectId, onSave }: MetadataEditorProps) {
  const [metadata, setMetadata] = useState<Metadata>({
    bpm: null,
    musicalKey: null,
    mood: null,
    genre: null,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    loadMetadata()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const loadMetadata = async () => {
    setIsLoading(true)
    try {
      const result = await window.electronAPI.getMetadata(projectId)
      if (result.success && result.data) {
        setMetadata(result.data as Metadata)
        setHasChanges(false)
      }
    } catch (error) {
      console.error('Failed to load metadata:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const result = await window.electronAPI.updateMetadata(projectId, metadata)
      if (result.success) {
        setHasChanges(false)
        onSave?.()
      } else {
        alert('Failed to save metadata: ' + result.error)
      }
    } catch (error) {
      console.error('Failed to save metadata:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const updateField = <K extends keyof Metadata>(field: K, value: Metadata[K]) => {
    setMetadata((prev) => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div
          className="animate-spin rounded-full h-8 w-8 border-b-2"
          style={{ borderColor: 'var(--primary)' }}
        />
      </div>
    )
  }

  return (
    <div className="glass rounded-apple-lg p-6 space-y-6" style={{ borderColor: 'var(--surface)' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3
          className="text-lg font-semibold flex items-center gap-2"
          style={{ color: 'var(--text)' }}
        >
          <Album className="h-5 w-5" />
          Track Metadata
        </h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={loadMetadata} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          {hasChanges && (
            <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-2">
              {isSaving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save
            </Button>
          )}
        </div>
      </div>

      {/* Metadata fields */}
      <div className="grid grid-cols-2 gap-4">
        {/* BPM */}
        <div className="space-y-2">
          <label
            className="flex items-center gap-2 text-sm font-medium"
            style={{ color: 'var(--text)' }}
          >
            <Hash className="h-4 w-4" />
            BPM (Tempo)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="20"
              max="300"
              value={metadata.bpm || ''}
              onChange={(e) => updateField('bpm', e.target.value ? parseInt(e.target.value) : null)}
              placeholder="120"
              className="flex-1 px-3 py-2 rounded-apple text-sm"
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
              }}
            />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              bpm
            </span>
          </div>
          <div className="flex gap-1">
            {[80, 100, 120, 140, 160].map((bpm) => (
              <button
                key={bpm}
                onClick={() => updateField('bpm', bpm)}
                className="px-2 py-1 text-xs rounded-apple transition-colors"
                style={{
                  backgroundColor: metadata.bpm === bpm ? 'var(--primary)' : 'var(--surface)',
                  color: metadata.bpm === bpm ? 'white' : 'var(--text-secondary)',
                }}
              >
                {bpm}
              </button>
            ))}
          </div>
        </div>

        {/* Musical Key */}
        <div className="space-y-2">
          <label
            className="flex items-center gap-2 text-sm font-medium"
            style={{ color: 'var(--text)' }}
          >
            <Music className="h-4 w-4" />
            Musical Key
          </label>
          <select
            value={metadata.musicalKey || ''}
            onChange={(e) => updateField('musicalKey', e.target.value || null)}
            className="w-full px-3 py-2 rounded-apple text-sm"
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            }}
          >
            <option value="">Select Key</option>
            <optgroup label="Major Keys">
              {MUSICAL_KEYS.filter((k) => !k.includes('m')).map((key) => (
                <option key={key} value={key}>
                  {key} Major
                </option>
              ))}
            </optgroup>
            <optgroup label="Minor Keys">
              {MUSICAL_KEYS.filter((k) => k.includes('m')).map((key) => (
                <option key={key} value={key}>
                  {key.replace('m', '')} Minor
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Mood */}
        <div className="space-y-2">
          <label
            className="flex items-center gap-2 text-sm font-medium"
            style={{ color: 'var(--text)' }}
          >
            <Smile className="h-4 w-4" />
            Mood / Vibe
          </label>
          <select
            value={metadata.mood || ''}
            onChange={(e) => updateField('mood', e.target.value || null)}
            className="w-full px-3 py-2 rounded-apple text-sm"
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            }}
          >
            <option value="">Select Mood</option>
            {MOODS.map((mood) => (
              <option key={mood} value={mood.toLowerCase()}>
                {mood}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-1">
            {['Energetic', 'Chill', 'Dark', 'Uplifting'].map((mood) => (
              <button
                key={mood}
                onClick={() => updateField('mood', mood.toLowerCase())}
                className="px-2 py-1 text-xs rounded-apple transition-colors"
                style={{
                  backgroundColor:
                    metadata.mood === mood.toLowerCase() ? 'var(--accent)' : 'var(--surface)',
                  color: metadata.mood === mood.toLowerCase() ? 'white' : 'var(--text-secondary)',
                }}
              >
                {mood}
              </button>
            ))}
          </div>
        </div>

        {/* Genre */}
        <div className="space-y-2">
          <label
            className="flex items-center gap-2 text-sm font-medium"
            style={{ color: 'var(--text)' }}
          >
            <Album className="h-4 w-4" />
            Genre
          </label>
          <select
            value={metadata.genre || ''}
            onChange={(e) => updateField('genre', e.target.value || null)}
            className="w-full px-3 py-2 rounded-apple text-sm"
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            }}
          >
            <option value="">Select Genre</option>
            {GENRES.map((genre) => (
              <option key={genre} value={genre.toLowerCase()}>
                {genre}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-1">
            {['Hip-Hop', 'Pop', 'EDM', 'Rock'].map((genre) => (
              <button
                key={genre}
                onClick={() => updateField('genre', genre.toLowerCase())}
                className="px-2 py-1 text-xs rounded-apple transition-colors"
                style={{
                  backgroundColor:
                    metadata.genre === genre.toLowerCase() ? 'var(--primary)' : 'var(--surface)',
                  color: metadata.genre === genre.toLowerCase() ? 'white' : 'var(--text-secondary)',
                }}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary */}
      {(metadata.bpm || metadata.musicalKey || metadata.mood || metadata.genre) && (
        <div className="pt-4 border-t" style={{ borderColor: 'var(--surface)' }}>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            <span style={{ color: 'var(--text)' }}>Summary: </span>
            {[
              metadata.bpm ? `${metadata.bpm} BPM` : null,
              metadata.musicalKey,
              metadata.mood,
              metadata.genre,
            ]
              .filter(Boolean)
              .join(' • ') || 'No metadata set'}
          </p>
        </div>
      )}
    </div>
  )
}

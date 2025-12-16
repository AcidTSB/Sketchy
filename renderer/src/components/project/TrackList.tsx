import { TrackItem } from './TrackItem'
import type { Track } from '@/types'

interface TrackListProps {
  tracks: Track[]
  currentTrackId?: string
}

export function TrackList({ tracks, currentTrackId }: TrackListProps) {
  if (tracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-gray-500 dark:text-gray-400">No tracks yet</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
          Click &quot;Add Track&quot; to get started
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {tracks.map((track) => (
        <TrackItem key={track.id} track={track} isSelected={track.id === currentTrackId} />
      ))}
    </div>
  )
}

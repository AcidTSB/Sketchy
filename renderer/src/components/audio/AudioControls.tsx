import { Play, Pause, SkipBack, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { usePlaybackStore } from '@/store/playbackStore'
import { formatTime } from '@/lib/utils'

export function AudioControls() {
  const { isPlaying, currentTime, duration, volume, togglePlay, setCurrentTime, setVolume } =
    usePlaybackStore()

  const handleSeek = (value: number[]) => {
    setCurrentTime(value[0])
  }

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0])
  }

  return (
    <div className="flex flex-col space-y-4">
      {/* Time and Seek Bar */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[40px]">
          {formatTime(currentTime * 1000)}
        </span>
        <Slider
          value={[currentTime]}
          max={duration || 180}
          step={0.1}
          onValueChange={handleSeek}
          className="flex-1"
        />
        <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[40px]">
          {formatTime((duration || 180) * 1000)}
        </span>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center justify-center gap-4">
        <Button variant="ghost" size="icon">
          <SkipBack className="h-5 w-5" />
        </Button>

        <Button size="icon" className="h-14 w-14" onClick={togglePlay}>
          {isPlaying ? (
            <Pause className="h-6 w-6" fill="currentColor" />
          ) : (
            <Play className="h-6 w-6" fill="currentColor" />
          )}
        </Button>

        <Button variant="ghost" size="icon">
          <SkipForward className="h-5 w-5" />
        </Button>
      </div>

      {/* Volume Control */}
      <div className="flex items-center gap-3 px-8">
        <span className="text-sm text-gray-600 dark:text-gray-400">Vol</span>
        <Slider
          value={[volume]}
          max={100}
          step={1}
          onValueChange={handleVolumeChange}
          className="flex-1"
        />
        <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[40px]">{volume}%</span>
      </div>
    </div>
  )
}

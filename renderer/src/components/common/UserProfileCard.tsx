import { User as UserType } from '@/store/userStore'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MapPin, Calendar, Music, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface UserProfileCardProps {
  user: UserType
  showStats?: boolean
  showFollowButton?: boolean
  isFollowing?: boolean
  onFollow?: () => void
}

export function UserProfileCard({
  user,
  showStats = true,
  showFollowButton = false,
  isFollowing = false,
  onFollow,
}: UserProfileCardProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div className="surface-subtle rounded-apple-lg p-6">
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={user.avatar} />
          <AvatarFallback className="text-xl">
            {user.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold truncate" style={{ color: 'var(--text)' }}>
            {user.name}
          </h3>
          <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
            {user.email}
          </p>
        </div>
        {showFollowButton && onFollow && (
          <Button
            onClick={onFollow}
            variant={isFollowing ? 'outline' : 'default'}
            size="sm"
            className="rounded-apple"
          >
            {isFollowing ? 'Following' : 'Follow'}
          </Button>
        )}
      </div>

      {/* Bio */}
      {user.bio && (
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          {user.bio}
        </p>
      )}

      {/* Meta Info */}
      <div className="flex flex-wrap gap-3 mb-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
        {user.location && (
          <div className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            <span>{user.location}</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          <span>Joined {formatDate(user.createdAt)}</span>
        </div>
      </div>

      {/* Stats */}
      {showStats && (
        <div className="grid grid-cols-4 gap-3">
          <div className="text-center p-2 rounded-apple" style={{ backgroundColor: 'var(--bg)' }}>
            <div className="flex items-center justify-center gap-1 mb-1">
              <Music className="h-3.5 w-3.5" style={{ color: 'var(--primary)' }} />
              <span className="text-lg font-bold" style={{ color: 'var(--text)' }}>
                {user.totalTracks}
              </span>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Tracks
            </p>
          </div>
          <div className="text-center p-2 rounded-apple" style={{ backgroundColor: 'var(--bg)' }}>
            <div className="flex items-center justify-center gap-1 mb-1">
              <Play className="h-3.5 w-3.5" style={{ color: 'var(--primary)' }} />
              <span className="text-lg font-bold" style={{ color: 'var(--text)' }}>
                {user.totalPlays > 999
                  ? `${(user.totalPlays / 1000).toFixed(1)}k`
                  : user.totalPlays}
              </span>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Plays
            </p>
          </div>
          <div className="text-center p-2 rounded-apple" style={{ backgroundColor: 'var(--bg)' }}>
            <span className="text-lg font-bold block" style={{ color: 'var(--text)' }}>
              {user.followers}
            </span>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Followers
            </p>
          </div>
          <div className="text-center p-2 rounded-apple" style={{ backgroundColor: 'var(--bg)' }}>
            <span className="text-lg font-bold block" style={{ color: 'var(--text)' }}>
              {user.following}
            </span>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Following
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

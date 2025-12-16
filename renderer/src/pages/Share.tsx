import { useState } from 'react'
import { ArrowLeft, Link as LinkIcon, Lock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Collaborator {
  id: string
  name: string
  email: string
  avatar?: string
  role: string
}

export function Share() {
  const navigate = useNavigate()

  // Local state for share settings
  const [accessType, setAccessType] = useState<'invite-only' | 'link' | 'public'>('invite-only')
  const [allowEditing, setAllowEditing] = useState(false)
  const [allowDownloads, setAllowDownloads] = useState(true)
  const [requirePassword, setRequirePassword] = useState(false)
  const [isPrivate, setIsPrivate] = useState(false)

  // Mock collaborators - in real app this would come from the backend
  const [collaborators] = useState<Collaborator[]>([
    {
      id: '1',
      name: 'You',
      email: 'you@example.com',
      role: 'owner',
    },
  ])

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <Button variant="ghost" className="mb-6 gap-2 rounded-apple" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--text)' }}>
          Share & Collaborate
        </h1>
        <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>
          Manage access and permissions for this project
        </p>

        <div className="space-y-6">
          {/* Who Has Access */}
          <Card>
            <CardHeader>
              <CardTitle>Who has access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {collaborators.map((collab) => (
                <div key={collab.id} className="flex items-center gap-4">
                  <Avatar>
                    <AvatarImage src={collab.avatar} alt={collab.name} />
                    <AvatarFallback>
                      {collab.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium" style={{ color: 'var(--text)' }}>
                      {collab.name}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {collab.email}
                    </p>
                  </div>
                  <span className="text-sm capitalize" style={{ color: 'var(--text-secondary)' }}>
                    {collab.role}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Access Type */}
          <Card>
            <CardHeader>
              <CardTitle>Access Type</CardTitle>
            </CardHeader>
            <CardContent>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between rounded-apple">
                    <span className="capitalize">{accessType.replace('-', ' ')}</span>
                    <LinkIcon className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-full">
                  <DropdownMenuItem onClick={() => setAccessType('invite-only')}>
                    Invite Only
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setAccessType('link')}>
                    Anyone with Link
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setAccessType('public')}>
                    Public
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardContent>
          </Card>

          {/* Permissions */}
          <Card>
            <CardHeader>
              <CardTitle>Permissions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium" style={{ color: 'var(--text)' }}>
                    Allow editing
                  </p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Collaborators can edit tracks
                  </p>
                </div>
                <Switch checked={allowEditing} onCheckedChange={setAllowEditing} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium" style={{ color: 'var(--text)' }}>
                    Allow downloads
                  </p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Users can download tracks
                  </p>
                </div>
                <Switch checked={allowDownloads} onCheckedChange={setAllowDownloads} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium" style={{ color: 'var(--text)' }}>
                    Require password
                  </p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Add password protection
                  </p>
                </div>
                <Switch checked={requirePassword} onCheckedChange={setRequirePassword} />
              </div>
            </CardContent>
          </Card>

          {/* Privacy */}
          <Card className="border-red-200 dark:border-red-900">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Lock className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="font-medium text-red-600 dark:text-red-400">
                      Make project private
                    </p>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      Only you can access this project
                    </p>
                  </div>
                </div>
                <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
              </div>
            </CardContent>
          </Card>

          {/* Invite Button */}
          <Button className="w-full rounded-apple" size="lg">
            Invite Collaborators
          </Button>
        </div>
      </div>
    </div>
  )
}

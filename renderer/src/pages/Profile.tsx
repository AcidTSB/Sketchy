import { useState, useRef, useEffect } from 'react'
import {
  User,
  LogOut,
  Save,
  Camera,
  MapPin,
  Link as LinkIcon,
  Calendar,
  Music,
  Folder,
  Play,
  Settings,
  Edit2,
  X,
  Mic,
  Bell,
  Shield,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useUserStore, getAvatarUrl } from '@/store/userStore'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { recordingService, type AudioDevice } from '@/services/recordingService'

export function Profile() {
  const {
    currentUser,
    settings,
    updateProfile,
    updateSettings,
    uploadAvatar,
    logout,
    fetchUser, // <-- Thêm fetchUser action
  } = useUserStore()
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    bio: currentUser?.bio || '',
    location: currentUser?.location || '',
    website: currentUser?.website || '',
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Audio device states
  const [inputDevices, setInputDevices] = useState<AudioDevice[]>([])
  const [selectedInputDevice, setSelectedInputDevice] = useState<string>('default')
  const [micLevel, setMicLevel] = useState(0)
  const [isTesting, setIsTesting] = useState(false)
  const micTestIntervalRef = useRef<number | null>(null)
  const [sampleRate, setSampleRate] = useState<44100 | 48000 | 96000>(48000)
  const [channels, setChannels] = useState<1 | 2>(2)
  const [storageUsed, setStorageUsed] = useState<number>(0)

  // Fetch user data from database on mount
  useEffect(() => {
    fetchUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Calculate storage used from all projects
  useEffect(() => {
    const calculateStorage = async () => {
      try {
        const { data: projects } = await window.electronAPI.getProjects()
        if (projects) {
          let totalBytes = 0
          for (const project of projects) {
            const { data: tracks } = await window.electronAPI.getTracks(project.id)
            if (tracks) {
              for (const track of tracks) {
                const { data: versions } = await window.electronAPI.getFileVersions(track.id)
                if (versions) {
                  totalBytes += versions.reduce((sum, v) => sum + (v.sizeBytes || 0), 0)
                }
              }
            }
          }
          setStorageUsed(Math.round(totalBytes / (1024 * 1024)))
        }
      } catch (error) {
        console.error('Failed to calculate storage:', error)
      }
    }
    calculateStorage()
  }, [currentUser])

  // Load audio devices on mount
  useEffect(() => {
    loadAudioDevices()

    // Load saved settings
    const savedSettings = recordingService.getSettings()
    setSelectedInputDevice(savedSettings.inputDeviceId)
    setSampleRate(savedSettings.sampleRate)
    setChannels(savedSettings.channels)

    return () => {
      stopMicTest()
    }
  }, [])

  const loadAudioDevices = async () => {
    try {
      const inputs = await recordingService.getInputDevices()
      setInputDevices(inputs)
    } catch (error) {
      console.error('Failed to load audio devices:', error)
    }
  }

  const handleInputDeviceChange = (deviceId: string) => {
    setSelectedInputDevice(deviceId)
    recordingService.updateSettings({ inputDeviceId: deviceId })
  }

  const startMicTest = async () => {
    // Stop any existing test first
    stopMicTest()

    // Start new test
    setIsTesting(true)
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
    }
    setMicLevel(0)
    setIsTesting(false)
  }

  if (!currentUser) return null

  const handleSave = () => {
    updateProfile(editForm)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditForm({
      name: currentUser.name,
      email: currentUser.email,
      bio: currentUser.bio || '',
      location: currentUser.location || '',
      website: currentUser.website || '',
    })
    setIsEditing(false)
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      await uploadAvatar(file)
    } catch (error) {
      console.error('Failed to upload avatar:', error)
    }
  }

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      logout()
    }
  }

  const handleDeleteAccount = async () => {
    const confirmed = confirm(
      'Are you sure you want to delete your account? This action cannot be undone. All your projects, tracks, and data will be permanently deleted.'
    )

    if (!confirmed) return

    const doubleConfirm = confirm('This is your last warning! Type your email to confirm deletion.')

    if (!doubleConfirm) return

    try {
      // Call delete account API
      const result = await window.electronAPI.deleteAccount(parseInt(currentUser.id))

      if (result.success) {
        alert('Account deleted successfully')
        // Clear all state
        logout()
        // Reload app to ensure clean state
        window.location.href = '/login'
      } else {
        alert('Failed to delete account: ' + (result.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Delete account error:', error)
      alert('Failed to delete account. Please try again.')
    }
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    })
  }

  return (
    <div className="min-h-screen py-8" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>
            Profile
          </h1>
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="gap-2 rounded-apple"
            style={{ color: 'var(--text)' }}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>

        {/* Profile Header Card */}
        <Card className="mb-6 rounded-apple-xl">
          <CardContent className="pt-6 pb-6 px-6 mt-4">
            {/* Top Row: Avatar + Info + Edit Button */}
            <div className="flex items-center gap-6 mb-6">
              {/* Avatar */}
              <div className="relative group flex-shrink-0">
                <Avatar className="h-32 w-32">
                  <AvatarImage src={getAvatarUrl(currentUser.avatar)} />
                  <AvatarFallback className="text-4xl font-bold">
                    {currentUser.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={handleAvatarClick}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center"
                >
                  <Camera className="h-6 w-6 text-white" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>

              {/* Profile Info */}
              <div className="flex-1 min-w-0 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>
                    {currentUser.name}
                  </h2>
                  <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                    {currentUser.email}
                  </p>

                  {/* Meta Info */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <div
                      className="flex items-center gap-1.5"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      <span className="text-xs">Joined {formatDate(currentUser.createdAt)}</span>
                    </div>
                    {currentUser.location && (
                      <div
                        className="flex items-center gap-1.5"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        <MapPin className="h-3.5 w-3.5" />
                        <span className="text-xs">{currentUser.location}</span>
                      </div>
                    )}
                    {currentUser.website && (
                      <a
                        href={currentUser.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                        style={{ color: 'var(--primary)' }}
                      >
                        <LinkIcon className="h-3.5 w-3.5" />
                        <span className="text-xs">Website</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Edit Button */}
                <Button
                  onClick={() => setIsEditing(!isEditing)}
                  variant="outline"
                  size="sm"
                  className="gap-2 rounded-apple flex-shrink-0"
                >
                  {isEditing ? (
                    <>
                      <X className="h-4 w-4" />
                      Cancel
                    </>
                  ) : (
                    <>
                      <Edit2 className="h-4 w-4" />
                      Edit Profile
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Bottom Row: Stats Full Width */}
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col items-center p-4 rounded-apple-lg surface-subtle hover:opacity-90 transition-opacity cursor-pointer">
                <Folder className="h-6 w-6 mb-2" style={{ color: 'var(--primary)' }} />
                <span
                  className="text-3xl font-bold leading-none mb-1.5"
                  style={{ color: 'var(--text)' }}
                >
                  {currentUser.totalProjects}
                </span>
                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Projects
                </p>
              </div>
              <div className="flex flex-col items-center p-4 rounded-apple-lg surface-subtle hover:opacity-90 transition-opacity cursor-pointer">
                <Music className="h-6 w-6 mb-2" style={{ color: 'var(--primary)' }} />
                <span
                  className="text-3xl font-bold leading-none mb-1.5"
                  style={{ color: 'var(--text)' }}
                >
                  {currentUser.totalTracks}
                </span>
                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Tracks
                </p>
              </div>
              <div className="flex flex-col items-center p-4 rounded-apple-lg surface-subtle hover:opacity-90 transition-opacity cursor-pointer">
                <Play className="h-6 w-6 mb-2" style={{ color: 'var(--primary)' }} />
                <span
                  className="text-3xl font-bold leading-none mb-1.5"
                  style={{ color: 'var(--text)' }}
                >
                  {currentUser.totalPlays.toLocaleString()}
                </span>
                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Plays
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="info" className="space-y-6">
          <TabsList className="rounded-apple">
            <TabsTrigger value="info" className="rounded-apple">
              <User className="h-4 w-4 mr-2" />
              Information
            </TabsTrigger>
            <TabsTrigger value="settings" className="rounded-apple">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Profile Information Tab */}
          <TabsContent value="info">
            <Card className="rounded-apple-xl">
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                      Full Name
                    </label>
                    <Input
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      disabled={!isEditing}
                      placeholder="Enter your name"
                      className="rounded-apple"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                      Email Address
                    </label>
                    <Input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      disabled={!isEditing}
                      placeholder="Enter your email"
                      className="rounded-apple"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                      Location
                    </label>
                    <Input
                      value={editForm.location}
                      onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                      disabled={!isEditing}
                      placeholder="City, Country"
                      className="rounded-apple"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                      Website
                    </label>
                    <Input
                      type="url"
                      value={editForm.website}
                      onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                      disabled={!isEditing}
                      placeholder="https://yourwebsite.com"
                      className="rounded-apple"
                    />
                  </div>
                </div>

                {isEditing && (
                  <div className="flex gap-3 pt-4">
                    <Button onClick={handleSave} className="gap-2 rounded-apple">
                      <Save className="h-4 w-4" />
                      Save Changes
                    </Button>
                    <Button variant="outline" onClick={handleCancel} className="rounded-apple">
                      Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <div className="space-y-6">
              {/* Audio Devices Settings */}
              <Card className="rounded-apple-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mic className="h-5 w-5" style={{ color: 'var(--keyColor)' }} />
                    Audio Devices
                  </CardTitle>
                  <CardDescription>
                    Configure audio devices for recording (Input only)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Input Device (Microphone) */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Mic className="h-4 w-4" style={{ color: 'var(--systemSecondary)' }} />
                      <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                        Microphone (Input)
                      </label>
                    </div>
                    <select
                      value={selectedInputDevice}
                      onChange={(e) => handleInputDeviceChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-apple surface-subtle transition-apple"
                      style={{ color: 'var(--text)', border: '1px solid var(--systemQuaternary)' }}
                    >
                      <option value="default">System Default</option>
                      {inputDevices.map((device) => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      🎙️ Áp dụng cho recording tracks mới
                    </p>

                    {/* Mic Test */}
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={isTesting ? stopMicTest : startMicTest}
                        className="rounded-apple"
                      >
                        {isTesting ? 'Stop Test' : 'Test Microphone'}
                      </Button>
                      <div
                        className="flex-1 h-3 rounded-full overflow-hidden"
                        style={{ backgroundColor: 'var(--systemQuaternary)' }}
                      >
                        <div
                          className="h-full transition-all duration-75"
                          style={{
                            width: `${micLevel * 100}%`,
                            backgroundColor:
                              micLevel > 0.8
                                ? '#ef4444'
                                : micLevel > 0.5
                                  ? '#eab308'
                                  : 'var(--keyColor)',
                            borderRadius: 'var(--radius-full)',
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Recording Quality */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                      Recording Quality
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          Sample Rate
                        </label>
                        <select
                          value={sampleRate}
                          onChange={(e) => {
                            const newValue = Number(e.target.value) as 44100 | 48000 | 96000
                            setSampleRate(newValue)
                            recordingService.updateSettings({
                              sampleRate: newValue,
                            })
                          }}
                          className="w-full px-3 py-2 rounded-apple surface-subtle mt-1"
                          style={{
                            color: 'var(--text)',
                            border: '1px solid var(--systemQuaternary)',
                          }}
                        >
                          <option value={44100}>44.1 kHz (CD)</option>
                          <option value={48000}>48 kHz (Standard)</option>
                          <option value={96000}>96 kHz (Hi-Res)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          Channels
                        </label>
                        <select
                          value={channels}
                          onChange={(e) => {
                            const newValue = Number(e.target.value) as 1 | 2
                            setChannels(newValue)
                            recordingService.updateSettings({
                              channels: newValue,
                            })
                          }}
                          className="w-full px-3 py-2 rounded-apple surface-subtle mt-1"
                          style={{
                            color: 'var(--text)',
                            border: '1px solid var(--systemQuaternary)',
                          }}
                        >
                          <option value={1}>Mono</option>
                          <option value={2}>Stereo</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Refresh Devices */}
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadAudioDevices}
                      className="rounded-apple"
                    >
                      Refresh Device List
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Appearance Settings */}
              <Card className="rounded-apple-xl">
                <CardHeader>
                  <CardTitle>Appearance</CardTitle>
                  <CardDescription>Customize how the app looks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                        Theme
                      </label>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Choose your preferred theme
                      </p>
                    </div>
                    <select
                      value={settings.theme}
                      onChange={(e) =>
                        updateSettings({ theme: e.target.value as 'light' | 'dark' | 'system' })
                      }
                      className="px-3 py-2 rounded-apple surface-subtle"
                      style={{ color: 'var(--text)' }}
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="system">System</option>
                    </select>
                  </div>
                </CardContent>
              </Card>

              {/* Audio Settings */}
              <Card className="rounded-apple-xl">
                <CardHeader>
                  <CardTitle>Audio Playback</CardTitle>
                  <CardDescription>Configure playback preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                        Default Quality
                      </label>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Preferred quality for exports and recording
                      </p>
                    </div>
                    <select
                      value={settings.defaultQuality}
                      onChange={(e) =>
                        updateSettings({
                          defaultQuality: e.target.value as 'low' | 'medium' | 'high',
                        })
                      }
                      className="px-3 py-2 rounded-apple surface-subtle"
                      style={{ color: 'var(--text)' }}
                    >
                      <option value="low">Low (96kbps)</option>
                      <option value="medium">Medium (192kbps)</option>
                      <option value="high">High (320kbps)</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                        Auto Play
                      </label>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Automatically play when selecting a track
                      </p>
                    </div>
                    <Switch
                      checked={settings.autoPlay}
                      onCheckedChange={(checked) => updateSettings({ autoPlay: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                        Crossfade
                      </label>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Smooth transition between tracks
                      </p>
                    </div>
                    <Switch
                      checked={settings.crossfade}
                      onCheckedChange={(checked) => updateSettings({ crossfade: checked })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Storage Settings */}
              <Card className="rounded-apple-xl">
                <CardHeader>
                  <CardTitle>Storage</CardTitle>
                  <CardDescription>Manage storage and auto-save settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                        Auto-save Interval
                      </label>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        How often to auto-save your work
                      </p>
                    </div>
                    <select
                      value={settings.autoSaveInterval}
                      onChange={(e) => updateSettings({ autoSaveInterval: Number(e.target.value) })}
                      className="px-3 py-2 rounded-apple surface-subtle"
                      style={{ color: 'var(--text)' }}
                    >
                      <option value="1">1 minute</option>
                      <option value="5">5 minutes</option>
                      <option value="10">10 minutes</option>
                      <option value="15">15 minutes</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                        Max Offline Storage
                      </label>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Maximum storage for offline files
                      </p>
                    </div>
                    <select
                      value={settings.maxOfflineStorage}
                      onChange={(e) =>
                        updateSettings({ maxOfflineStorage: Number(e.target.value) })
                      }
                      className="px-3 py-2 rounded-apple surface-subtle"
                      style={{ color: 'var(--text)' }}
                    >
                      <option value="250">250 MB</option>
                      <option value="500">500 MB</option>
                      <option value="1000">1 GB</option>
                      <option value="2000">2 GB</option>
                    </select>
                  </div>

                  <div className="p-4 rounded-apple surface-subtle">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                        Storage Used
                      </span>
                      <span className="text-sm font-bold" style={{ color: 'var(--primary)' }}>
                        {storageUsed} MB / {settings.maxOfflineStorage} MB
                      </span>
                    </div>
                    <div
                      className="h-2 rounded-full overflow-hidden"
                      style={{ backgroundColor: 'var(--surface)' }}
                    >
                      <div
                        className="h-full transition-all duration-300"
                        style={{
                          width: `${Math.min((storageUsed / settings.maxOfflineStorage) * 100, 100)}%`,
                          backgroundColor:
                            storageUsed > settings.maxOfflineStorage * 0.9
                              ? 'var(--error)'
                              : 'var(--primary)',
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notifications Settings */}
              <Card className="rounded-apple-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" style={{ color: 'var(--keyColor)' }} />
                    Notifications
                  </CardTitle>
                  <CardDescription>Manage notification preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                        Email Notifications
                      </label>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Receive updates via email
                      </p>
                    </div>
                    <Switch
                      checked={settings.emailNotifications}
                      onCheckedChange={(checked) => updateSettings({ emailNotifications: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                        Push Notifications
                      </label>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Get desktop notifications
                      </p>
                    </div>
                    <Switch
                      checked={settings.pushNotifications}
                      onCheckedChange={(checked) => {
                        updateSettings({ pushNotifications: checked })
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                        Collaboration Notifications
                      </label>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Alerts when collaborators make changes
                      </p>
                    </div>
                    <Switch
                      checked={settings.collaborationNotifications}
                      onCheckedChange={(checked) =>
                        updateSettings({ collaborationNotifications: checked })
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Privacy Settings */}
              <Card className="rounded-apple-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" style={{ color: 'var(--keyColor)' }} />
                    Privacy
                  </CardTitle>
                  <CardDescription>Control your privacy and visibility</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                        Profile Visibility
                      </label>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Who can see your profile
                      </p>
                    </div>
                    <select
                      value={settings.profileVisibility}
                      onChange={(e) =>
                        updateSettings({
                          profileVisibility: e.target.value as 'public' | 'private' | 'friends',
                        })
                      }
                      className="px-3 py-2 rounded-apple surface-subtle"
                      style={{ color: 'var(--text)' }}
                    >
                      <option value="public">Public</option>
                      <option value="friends">Friends Only</option>
                      <option value="private">Private</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                        Show Activity
                      </label>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Display your recent activity to others
                      </p>
                    </div>
                    <Switch
                      checked={settings.showActivity}
                      onCheckedChange={(checked) => updateSettings({ showActivity: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                        Show Statistics
                      </label>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Display your stats on profile
                      </p>
                    </div>
                    <Switch
                      checked={settings.showStats}
                      onCheckedChange={(checked) => updateSettings({ showStats: checked })}
                    />
                  </div>

                  {/* Delete Account */}
                  <div className="pt-4 border-t border-red-500/20">
                    <div className="mb-3">
                      <label className="text-sm font-medium text-red-500">Danger Zone</label>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Once deleted, your account cannot be recovered
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      onClick={handleDeleteAccount}
                      className="w-full gap-2 rounded-apple bg-red-600 hover:bg-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Account Permanently
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

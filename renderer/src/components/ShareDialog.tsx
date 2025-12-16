import { useState, useEffect } from 'react'
import { Globe, Lock, Link as LinkIcon, Copy, Check, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useShareStore } from '@/store/shareStore'
import { toast } from 'sonner'

interface ShareDialogProps {
  isOpen: boolean
  onClose: () => void
  targetType: 'folder' | 'project' | 'track'
  targetId: string
  targetTitle: string
}

export function ShareDialog({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetTitle,
}: ShareDialogProps) {
  // Store hooks
  const { createShareLink, currentShareLink, loading, error, clearError } = useShareStore()

  const [isPublic, setIsPublic] = useState(false)
  const [password, setPassword] = useState('')
  const [copied, setCopied] = useState(false)
  const [webViewerUrl, setWebViewerUrl] = useState('')

  // Fetch web viewer URL from backend
  useEffect(() => {
    const fetchWebViewerUrl = async () => {
      const { data, success } = await window.electronAPI.getWebViewerUrl()
      if (success && data) {
        setWebViewerUrl(data)
      }
    }
    fetchWebViewerUrl()
  }, [])

  // Helper function to get icon based on target type
  const getTargetIcon = () => {
    switch (targetType) {
      case 'folder':
        return '📁'
      case 'project':
        return '🎵'
      case 'track':
        return '🎼'
      default:
        return '📄'
    }
  }

  // Reset state khi mở dialog mới
  useEffect(() => {
    if (isOpen) {
      clearError()
      setIsPublic(false)
      setPassword('')
    }
  }, [isOpen, targetId, clearError])

  // Xử lý tạo link share
  const handleTogglePublic = async (checked: boolean) => {
    setIsPublic(checked)
    if (checked && !currentShareLink) {
      const numericId = parseInt(targetId)

      // Map targetType sang tham số API
      const pId = targetType === 'project' ? numericId : undefined
      const tId = targetType === 'track' ? numericId : undefined

      const result = await createShareLink(pId, tId, password || undefined)
      if (result) {
        toast.success('Share link created successfully!')
      }
    }
  }

  // Tạo URL share thực tế
  const generatedUrl =
    currentShareLink && webViewerUrl
      ? `${webViewerUrl}/share/${currentShareLink.token}`
      : 'Generating...'

  const handleCopyLink = () => {
    if (!currentShareLink) return
    navigator.clipboard.writeText(generatedUrl)
    setCopied(true)
    toast.success('Link copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{getTargetIcon()}</span>
            Share {targetType}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Target Info */}
          <div className="surface-subtle rounded-apple-lg p-4 bg-muted/50">
            <p className="text-sm font-medium truncate">{targetTitle}</p>
            <p className="text-xs mt-1 text-muted-foreground">
              {targetType === 'project' && 'All tracks inside this project will be shared'}
              {targetType === 'track' && 'Only this track will be shared'}
            </p>
          </div>

          {/* Public/Private Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isPublic ? (
                <Globe className="h-5 w-5 text-green-600" />
              ) : (
                <Lock className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">{isPublic ? 'Public Access' : 'Private'}</p>
                <p className="text-sm text-muted-foreground">
                  {isPublic ? 'Anyone with the link can view' : 'Only you can access'}
                </p>
              </div>
            </div>
            <Switch checked={isPublic} onCheckedChange={handleTogglePublic} disabled={loading} />
          </div>

          {/* Share Link & Settings (Hiển thị khi Public) */}
          {isPublic && (
            <div className="animate-in fade-in slide-in-from-top-2 space-y-4">
              {loading ? (
                <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Generating link...
                </div>
              ) : error ? (
                <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                  {error}
                </div>
              ) : (
                <>
                  {/* Link Display */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Share link</label>
                    <div className="flex gap-2">
                      <div className="flex flex-1 min-w-0 px-3 py-2 bg-muted rounded text-sm flex items-center gap-2 font-mono overflow-hidden">
                        <LinkIcon className="h-4 w-4 flex-shrink-0 opacity-50" />
                        <span className="flex-1 break-all text-sm">{generatedUrl}</span>
                      </div>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={handleCopyLink}
                        className="flex-shrink-0"
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Optional Password Setting */}
                  <div className="border-t pt-4 space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Set Password (Optional)</p>
                          <p className="text-xs text-muted-foreground">Protect this link</p>
                        </div>
                      </div>
                      <Input
                        type="password"
                        placeholder="Enter password..."
                        className="h-9 text-sm"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Note: Create a new link to apply password protection
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 border-t pt-4">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

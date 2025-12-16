import { useUserStore } from '@/store/userStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Mail, Loader2, LogOut } from 'lucide-react'
import { useState } from 'react'
import { useNotifications } from '@/hooks/useNotifications'

export function VerificationGuard({ children }: { children: React.ReactNode }) {
  const { currentUser, logout, fetchUser } = useUserStore()
  const notifications = useNotifications()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  // 1. If no user (not logged in) -> Pass through (let Router handle redirect to Login)
  if (!currentUser) {
    return <>{children}</>
  }

  // 2. If already verified -> Pass through (Show App)
  if (currentUser.emailVerified) {
    return <>{children}</>
  }

  // 3. If not verified -> BLOCK and show OTP input screen
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()

    if (code.length !== 6) {
      notifications.error('Invalid Code', 'Please enter a 6-digit code')
      return
    }

    setLoading(true)
    try {
      // Call backend API to verify OTP
      const response = await fetch('http://localhost:45678/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentUser.email, code: code }),
      })

      const result = await response.json()

      if (result.success) {
        notifications.success('Success', 'Account verified!')
        setCode('')
        // Refresh user data to update emailVerified status
        await fetchUser()
      } else {
        notifications.error('Failed', result.error || 'Invalid verification code')
      }
    } catch (error) {
      console.error('Verification error:', error)
      notifications.error('Error', 'Connection failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    try {
      const result = await window.electronAPI.resendVerificationEmail(currentUser.email)
      if (result.success) {
        notifications.success('Email Sent', 'A new code has been sent to your email.')
      } else {
        notifications.error('Error', result.error || 'Failed to send email')
      }
    } catch (error) {
      notifications.error('Error', 'Failed to send email')
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--bg)' }}
    >
      <Card className="w-full max-w-md rounded-apple-xl text-center">
        <CardHeader>
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
            <Mail className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Enter Verification Code</CardTitle>
          <CardDescription>
            We sent a 6-digit code to <strong>{currentUser.email}</strong>
            <br />
            <br />
            Open your email on any device to get the code.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <Input
              className="text-center text-3xl tracking-[0.5em] h-14 rounded-apple font-mono font-bold"
              placeholder="000000"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              autoFocus
              disabled={loading}
            />

            <Button
              type="submit"
              className="w-full rounded-apple h-11"
              disabled={loading || code.length < 6}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify Account'
              )}
            </Button>
          </form>

          <div className="mt-6 flex justify-between items-center text-sm">
            <Button variant="ghost" size="sm" onClick={handleResend} disabled={loading}>
              Resend Code
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => logout()}
              className="text-red-500 hover:text-red-600"
              disabled={loading}
            >
              <LogOut className="mr-1 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

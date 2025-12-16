import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function VerifyEmail() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Invalid verification link')
      return
    }

    verifyEmail(token)
  }, [token])

  const verifyEmail = async (token: string) => {
    try {
      let result

      // Check if running inside Electron app
      if (window.electronAPI?.verifyEmail) {
        result = await window.electronAPI.verifyEmail(token)
      } else {
        // Running in browser - call HTTP endpoint
        const response = await fetch(`http://localhost:45678/api/verify-email?token=${token}`)
        result = await response.json()
      }

      if (result.success) {
        setStatus('success')
        setMessage(result.message || 'Email verified successfully!')
      } else {
        setStatus('error')
        setMessage(result.error || 'Verification failed')
      }
    } catch (error) {
      console.error('Verification error:', error)
      setStatus('error')
      setMessage('Failed to verify email. Please make sure the app is running and try again.')
    }
  }

  const handleContinue = () => {
    navigate('/login')
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--bg)' }}
    >
      <Card className="w-full max-w-md rounded-apple-xl">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            {status === 'loading' && <Loader2 className="h-8 w-8 animate-spin text-white" />}
            {status === 'success' && <CheckCircle className="h-8 w-8 text-white" />}
            {status === 'error' && <XCircle className="h-8 w-8 text-white" />}
          </div>
          <CardTitle className="text-2xl">
            {status === 'loading' && 'Verifying Email...'}
            {status === 'success' && 'Email Verified!'}
            {status === 'error' && 'Verification Failed'}
          </CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent>
          {status === 'success' && (
            <Button onClick={handleContinue} className="w-full rounded-apple">
              Continue to Login
            </Button>
          )}
          {status === 'error' && (
            <Button onClick={handleContinue} variant="outline" className="w-full rounded-apple">
              Back to Login
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

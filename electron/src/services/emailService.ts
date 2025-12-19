import nodemailer from 'nodemailer'
import { log } from '../utils/logger'

// Email configuration
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || 'your-email@gmail.com',
    pass: process.env.SMTP_PASS || 'your-app-password',
  },
}

// Create reusable transporter
const transporter = nodemailer.createTransport(SMTP_CONFIG)

// Verify connection configuration
transporter.verify((error) => {
  if (error) {
    log.error({ error }, 'SMTP connection verification failed')
  } else {
    log.info('SMTP server is ready to send emails')
  }
})

export interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

/**
 * Send email verification link
 */
export async function sendVerificationEmail(
  email: string,
  name: string,
  token: string
): Promise<void> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; }
        .content { padding: 40px 30px; }
        .otp-box { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-size: 48px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 30px; margin: 30px 0; border-radius: 12px; font-family: 'Courier New', monospace; }
        .instruction { background: #f0f4ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
        .footer { text-align: center; padding: 30px; color: #666; font-size: 13px; background: #f9f9f9; }
        .warning { color: #e53e3e; font-size: 14px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 28px;">🎵 Welcome to Sketchy!</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Sketchy</p>
        </div>
        <div class="content">
          <p style="font-size: 16px;">Hi <strong>${name}</strong>,</p>
          <p>Thank you for signing up! Please use the verification code below to activate your account:</p>
          
          <div class="otp-box">${token}</div>
          
          <div class="instruction">
            <h3 style="margin-top: 0; color: #667eea;">📱 How to verify (works on any device):</h3>
            <ol style="margin: 10px 0; padding-left: 20px;">
              <li>Open the Sketchy app on your computer</li>
              <li>Enter this 6-digit code: <strong>${token}</strong></li>
              <li>Click "Verify Account"</li>
            </ol>
            <p style="margin-bottom: 0;"><strong>✨ You can read this email on your phone and enter the code on your computer!</strong></p>
          </div>
          
          <p style="font-size: 14px; color: #666;">This code will expire in <strong>24 hours</strong>.</p>
          <p class="warning">⚠️ If you didn't create an account, please ignore this email.</p>
        </div>
        <div class="footer">
          <p style="margin: 0;">© ${new Date().getFullYear()} Sketchy</p>
          <p style="margin: 5px 0 0 0; font-size: 12px;">This is an automated email, please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `

  const text = `
Welcome to Sketchy!

Hi ${name},

Thank you for signing up! Please use this verification code to activate your account:

CODE: ${token}

How to verify:
1. Open the Sketchy app on your computer
2. Enter this 6-digit code: ${token}
3. Click "Verify Account"

You can read this email on your phone and enter the code on your computer!

This code will expire in 24 hours.

If you didn't create an account, you can safely ignore this email.

---
© ${new Date().getFullYear()} Sketchy - Audio Project Manager
  `

  try {
    const info = await transporter.sendMail({
      from: `"Sketchy" <${SMTP_CONFIG.auth.user}>`,
      to: email,
      subject: 'Verify Your Email - Sketchy',
      html,
      text,
    })

    log.info({ messageId: info.messageId, to: email }, 'Verification email sent')
  } catch (error) {
    log.error({ error, email }, 'Failed to send verification email')
    throw new Error('Failed to send verification email')
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  name: string,
  token: string
): Promise<void> {
  const resetUrl = `sketchy://reset-password?token=${token}`
  const httpUrl = `http://localhost:5173/reset-password?token=${token}`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #f5576c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Password Reset Request</h1>
        </div>
        <div class="content">
          <p>Hi <strong>${name}</strong>,</p>
          <p>We received a request to reset your password. Click the button below to reset it:</p>
          <p style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </p>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; background: white; padding: 10px; border-radius: 5px;">
            ${httpUrl}
          </p>
          <p>This link will expire in <strong>1 hour</strong>.</p>
          <p><strong>If you didn't request a password reset, please ignore this email.</strong></p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Sketchy</p>
          <p>This is an automated email, please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `

  const text = `
Password Reset Request

Hi ${name},

We received a request to reset your password. Click the link below to reset it:

${httpUrl}

This link will expire in 1 hour.

If you didn't request a password reset, please ignore this email.

---
© ${new Date().getFullYear()} Sketchy - Audio Project Manager
  `

  try {
    const info = await transporter.sendMail({
      from: `"Sketchy" <${SMTP_CONFIG.auth.user}>`,
      to: email,
      subject: 'Password Reset - Sketchy',
      html,
      text,
    })

    log.info({ messageId: info.messageId, to: email }, 'Password reset email sent')
  } catch (error) {
    log.error({ error, email }, 'Failed to send password reset email')
    throw new Error('Failed to send password reset email')
  }
}

/**
 * Send generic email
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    const info = await transporter.sendMail({
      from: `"Sketchy" <${SMTP_CONFIG.auth.user}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    })

    log.info({ messageId: info.messageId, to: options.to }, 'Email sent')
  } catch (error) {
    log.error({ error, to: options.to }, 'Failed to send email')
    throw new Error('Failed to send email')
  }
}

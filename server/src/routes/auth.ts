import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { OAuth2Client } from 'google-auth-library'
import { google } from 'googleapis'
import prisma from '../lib/prisma'
import { signToken } from '../lib/jwt'
import { requireAuth } from '../middleware/auth'

const router = Router()

const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
)

const GOOGLE_SCOPES = [
  'openid',
  'email',
  'profile',
]

const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
]

// POST /auth/register
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { email, password, name } = req.body
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' })
    return
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    res.status(409).json({ error: 'Email already in use' })
    return
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: { email, passwordHash, name },
  })

  res.json({ token: signToken(user.id), user: safeUser(user) })
})

// POST /auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' })
    return
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !user.passwordHash) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }

  res.json({ token: signToken(user.id), user: safeUser(user) })
})

// GET /auth/google
router.get('/google', (_req: Request, res: Response) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: GOOGLE_SCOPES,
    prompt: 'consent',
  })
  res.redirect(url)
})

// GET /auth/google/callback
router.get('/google/callback', async (req: Request, res: Response): Promise<void> => {
  const { code } = req.query
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'

  if (!code) {
    res.redirect(`${frontendUrl}?auth_error=missing_code`)
    return
  }

  const state = req.query.state as string | undefined

  try {
    const { tokens } = await oauth2Client.getToken(code as string)
    oauth2Client.setCredentials(tokens)

    // Calendar connect callback (state = "calendar:userId")
    if (state?.startsWith('calendar:')) {
      const userId = state.replace('calendar:', '')
      await prisma.user.update({
        where: { id: userId },
        data: {
          googleAccessToken: tokens.access_token ?? undefined,
          googleRefreshToken: tokens.refresh_token ?? undefined,
        },
      })
      res.redirect(`${frontendUrl}?calendar_connected=1`)
      return
    }

    // Login callback
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
    const { data } = await oauth2.userinfo.get()

    if (!data.email) {
      res.redirect(`${frontendUrl}?auth_error=no_email`)
      return
    }

    const user = await prisma.user.upsert({
      where: { email: data.email },
      update: {
        googleId: data.id ?? undefined,
        googleAccessToken: tokens.access_token ?? undefined,
        googleRefreshToken: tokens.refresh_token ?? undefined,
        name: data.name ?? undefined,
      },
      create: {
        email: data.email,
        googleId: data.id ?? undefined,
        googleAccessToken: tokens.access_token ?? undefined,
        googleRefreshToken: tokens.refresh_token ?? undefined,
        name: data.name ?? undefined,
      },
    })

    const token = signToken(user.id)
    res.redirect(`${frontendUrl}?token=${token}`)
  } catch (err: any) {
    const message = err?.response?.data?.error_description || err?.message || 'unknown'
    console.error('Google OAuth error:', message, err)
    res.redirect(`${frontendUrl}?auth_error=${encodeURIComponent(message)}`)
  }
})

// GET /auth/me
router.get('/me', requireAuth, (req: Request, res: Response) => {
  res.json({ user: safeUser((req as any).user) })
})

// GET /auth/google/calendar — pide permiso de Calendar (paso separado)
// Acepta token via query param porque es un redirect del browser
router.get('/google/calendar', async (req: Request, res: Response): Promise<void> => {
  const token = req.query.token as string | undefined
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'

  if (!token) {
    res.redirect(`${frontendUrl}?auth_error=missing_token`)
    return
  }

  try {
    const { verifyToken } = await import('../lib/jwt')
    const { sub: userId } = verifyToken(token)

    const calendarOAuth = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )
    const url = calendarOAuth.generateAuthUrl({
      access_type: 'offline',
      scope: CALENDAR_SCOPES,
      prompt: 'consent',
      state: `calendar:${userId}`,
    })
    res.redirect(url)
  } catch {
    res.redirect(`${frontendUrl}?auth_error=invalid_token`)
  }
})

function safeUser(user: any) {
  const { passwordHash, googleAccessToken, googleRefreshToken, ...safe } = user
  return { ...safe, calendarConnected: !!googleAccessToken }
}

export default router

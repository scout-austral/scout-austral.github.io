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

  try {
    const { tokens } = await oauth2Client.getToken(code as string)
    oauth2Client.setCredentials(tokens)

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
  } catch (err) {
    console.error('Google OAuth error:', err)
    res.redirect(`${frontendUrl}?auth_error=oauth_failed`)
  }
})

// GET /auth/me
router.get('/me', requireAuth, (req: Request, res: Response) => {
  res.json({ user: safeUser((req as any).user) })
})

function safeUser(user: any) {
  const { passwordHash, googleAccessToken, googleRefreshToken, ...safe } = user
  return safe
}

export default router

import { Router, Request, Response } from 'express'
import { OAuth2Client } from 'google-auth-library'
import { google } from 'googleapis'
import prisma from '../lib/prisma'
import { requireAuth } from '../middleware/auth'

const router = Router()

function makeOAuthClient(user: any) {
  const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  )
  client.setCredentials({
    access_token: user.calendarAccessToken,
    refresh_token: user.calendarRefreshToken,
  })
  return client
}

async function refreshIfNeeded(client: OAuth2Client, userId: string) {
  const credentials = client.credentials
  if (credentials.access_token) {
    const stored = await prisma.user.findUnique({ where: { id: userId }, select: { calendarAccessToken: true } })
    if (stored && credentials.access_token !== stored.calendarAccessToken) {
      await prisma.user.update({
        where: { id: userId },
        data: { calendarAccessToken: credentials.access_token },
      })
    }
  }
}

// GET /calendar/events — próximos eventos del usuario
router.get('/events', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user

  if (!user.calendarConnected || !user.calendarRefreshToken) {
    res.status(409).json({ error: 'Calendar is not connected' })
    return
  }

  const client = makeOAuthClient(user)

  try {
    const calendar = google.calendar({ version: 'v3', auth: client })
    const { data } = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    })

    await refreshIfNeeded(client, user.id)

    res.json({
      events: (data.items ?? []).map((event) => ({
        id: event.id,
        title: event.summary ?? 'Sin titulo',
        start: event.start?.dateTime ?? event.start?.date ?? null,
        end: event.end?.dateTime ?? event.end?.date ?? null,
      })),
    })
  } catch (error) {
    console.error('Google Calendar error:', error)
    res.status(500).json({ error: 'Could not load calendar events' })
  }
})

// POST /calendar/events — agenda un partido en el calendario del usuario
router.post('/events', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user

  if (!user.calendarConnected || !user.calendarRefreshToken) {
    res.status(409).json({ error: 'Calendar not connected' })
    return
  }

  const { summary, description, startTime, endTime, location } = req.body as {
    summary: string
    description?: string
    startTime: string
    endTime: string
    location?: string
  }

  if (!summary || !startTime || !endTime) {
    res.status(400).json({ error: 'summary, startTime y endTime son requeridos' })
    return
  }

  const client = makeOAuthClient(user)

  try {
    const calendar = google.calendar({ version: 'v3', auth: client })
    const { data } = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary,
        description,
        location,
        start: { dateTime: startTime },
        end: { dateTime: endTime },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 60 },
            { method: 'popup', minutes: 15 },
          ],
        },
      },
    })

    await refreshIfNeeded(client, user.id)

    res.json({ eventId: data.id, eventUrl: data.htmlLink })
  } catch (error: any) {
    const googleStatus = error?.response?.status ?? error?.status
    const googleError = error?.response?.data?.error ?? error?.message ?? 'unknown'
    console.error('Calendar event create error:', { googleStatus, googleError, error: error?.response?.data })

    if (googleStatus === 403 || googleStatus === 401) {
      await prisma.user.update({
        where: { id: user.id },
        data: { calendarConnected: false },
      }).catch(() => {})
      const msg = googleStatus === 403
        ? 'Permiso de escritura no disponible. Reconectá tu Google Calendar.'
        : 'Sesión de Calendar expirada. Reconectá tu Google Calendar.'
      res.status(googleStatus).json({ error: googleStatus === 403 ? 'insufficient_scope' : 'token_expired', message: msg })
      return
    }
    res.status(500).json({ error: 'calendar_error', message: googleError })
  }
})

export default router

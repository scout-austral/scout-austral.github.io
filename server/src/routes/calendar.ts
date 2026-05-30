import { Router, Request, Response } from 'express'
import { OAuth2Client } from 'google-auth-library'
import { google } from 'googleapis'
import prisma from '../lib/prisma'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.get('/events', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user

  if (!user.calendarConnected || !user.calendarRefreshToken) {
    res.status(409).json({ error: 'Calendar is not connected' })
    return
  }

  const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  )

  client.setCredentials({
    access_token: user.calendarAccessToken,
    refresh_token: user.calendarRefreshToken,
  })

  try {
    const calendar = google.calendar({ version: 'v3', auth: client })
    const { data } = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    })

    const credentials = client.credentials
    if (credentials.access_token && credentials.access_token !== user.calendarAccessToken) {
      await prisma.user.update({
        where: { id: user.id },
        data: { calendarAccessToken: credentials.access_token },
      })
    }

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

export default router

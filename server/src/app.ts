import express from 'express'
import cors from 'cors'
import authRouter from './routes/auth'
import calendarRouter from './routes/calendar'
import recommendationsRouter from './routes/recommendations'
import profileRouter from './routes/profile'

export function createApp() {
  const app = express()
  app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }))
  app.use(express.json())
  app.use('/auth', authRouter)
  app.use('/calendar', calendarRouter)
  app.use('/recommendations', recommendationsRouter)
  app.use('/profile', profileRouter)
  app.get('/health', (_req, res) => res.json({ status: 'ok' }))
  return app
}

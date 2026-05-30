import express from 'express'
import cors from 'cors'
import authRouter from './routes/auth'
import calendarRouter from './routes/calendar'

export function createApp() {
  const app = express()
  app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }))
  app.use(express.json())
  app.use('/auth', authRouter)
  app.use('/calendar', calendarRouter)
  app.get('/health', (_req, res) => res.json({ status: 'ok' }))
  return app
}

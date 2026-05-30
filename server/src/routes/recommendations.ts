import { Router, Request, Response } from 'express'
import { generateMatchJustification } from '../lib/gemini'

const router = Router()

type Category = 'must_watch' | 'worth_watching' | 'highlights_only'
const CATEGORIES: Category[] = ['must_watch', 'worth_watching', 'highlights_only']

// POST /recommendations/justify
// Enriquece la justificación de un partido con Gemini. Best-effort: el frontend
// hace fallback a la justificación local si esto falla o no está disponible.
router.post('/justify', async (req: Request, res: Response): Promise<void> => {
  const { homeTeam, awayTeam, group, matchDate, category, userProfile, scoreBreakdown } = req.body

  if (!homeTeam || !awayTeam || !CATEGORIES.includes(category)) {
    res.status(400).json({ error: 'homeTeam, awayTeam y category válidos son requeridos' })
    return
  }
  if (!process.env.GEMINI_API_KEY) {
    res.status(503).json({ error: 'Gemini no está configurado en el servidor' })
    return
  }

  try {
    const justification = await generateMatchJustification({
      homeTeam,
      awayTeam,
      group: group ?? '',
      matchDate: matchDate ?? '',
      category,
      userProfile: {
        favoriteTeams: userProfile?.favoriteTeams ?? [],
        favoritePlayers: userProfile?.favoritePlayers ?? [],
        availableAt: Boolean(userProfile?.availableAt),
      },
      scoreBreakdown: scoreBreakdown ?? {},
    })
    res.json({ justification })
  } catch (err) {
    console.error('Error generando justificación con Gemini:', err)
    res.status(502).json({ error: 'No se pudo generar la justificación' })
  }
})

export default router

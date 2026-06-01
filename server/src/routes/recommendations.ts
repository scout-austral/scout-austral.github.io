import { Router, Request, Response } from 'express'
import { generateMatchJustification, elicitProfileFromText } from '../lib/gemini'

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

// POST /recommendations/elicit
// Elicitación bayesiana asistida por LLM: traduce una descripción en lenguaje natural
// del usuario a los priors del modelo (importancia por factor) + perfil. Best-effort:
// el frontend hace fallback al cuestionario si esto falla o no está disponible.
router.post('/elicit', async (req: Request, res: Response): Promise<void> => {
  const { text } = req.body as { text?: string }

  if (!text || typeof text !== 'string' || text.trim().length < 3) {
    res.status(400).json({ error: 'Se requiere una descripción de al menos 3 caracteres' })
    return
  }
  if (!process.env.GEMINI_API_KEY) {
    res.status(503).json({ error: 'El asistente de IA no está configurado en el servidor' })
    return
  }

  try {
    const profile = await elicitProfileFromText(text.slice(0, 1000))
    res.json(profile)
  } catch (err) {
    console.error('Error en elicitación con Gemini:', err)
    res.status(502).json({ error: 'No se pudo interpretar la descripción' })
  }
})

export default router

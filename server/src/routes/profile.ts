import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma'
import { requireAuth } from '../middleware/auth'

const router = Router()

// GET /profile — devuelve el perfil guardado del usuario
router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user
  res.json({ perfil: user.profile ?? null })
})

// PUT /profile — guarda el perfil completo
router.put('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user
  const { perfil } = req.body

  if (!perfil || typeof perfil !== 'object') {
    res.status(400).json({ error: 'perfil requerido' })
    return
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { profile: perfil },
  })

  res.json({ ok: true })
})

export default router

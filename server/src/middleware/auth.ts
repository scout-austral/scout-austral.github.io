import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../lib/jwt'
import prisma from '../lib/prisma'

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const token = header.slice(7)
    const { sub } = verifyToken(token)
    const user = await prisma.user.findUnique({ where: { id: sub } })
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
    (req as any).user = user
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}

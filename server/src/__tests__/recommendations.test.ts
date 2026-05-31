import request from 'supertest'

jest.mock('../lib/gemini', () => ({
  generateMatchJustification: jest.fn().mockResolvedValue('Justificación generada por IA.'),
}))

process.env.GEMINI_API_KEY = 'test-key'

import { createApp } from '../app'

const app = createApp()

const bodyValido = {
  homeTeam: 'Argentina',
  awayTeam: 'Algeria',
  group: 'J',
  matchDate: '2026-06-16',
  category: 'must_watch',
  userProfile: { favoriteTeams: ['Argentina'], favoritePlayers: ['Lionel Messi'], availableAt: true },
  scoreBreakdown: { equipo: 0.34 },
}

describe('POST /recommendations/justify', () => {
  it('devuelve 400 si faltan campos requeridos', async () => {
    const res = await request(app).post('/recommendations/justify').send({ homeTeam: 'Argentina' })
    expect(res.status).toBe(400)
  })

  it('devuelve 400 si la categoría no es válida', async () => {
    const res = await request(app)
      .post('/recommendations/justify')
      .send({ ...bodyValido, category: 'otra' })
    expect(res.status).toBe(400)
  })

  it('devuelve 200 con la justificación cuando el body es válido', async () => {
    const res = await request(app).post('/recommendations/justify').send(bodyValido)
    expect(res.status).toBe(200)
    expect(res.body.justification).toBe('Justificación generada por IA.')
  })
})

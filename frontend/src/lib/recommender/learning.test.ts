import { describe, it, expect } from 'vitest'
import { partidos } from '@/data'
import { aplicarFeedback, posteriorConFeedback } from './learning'
import { priorsDesdePerfil } from './weights'
import type { FeatureVector, Perfil } from './types'

const base = priorsDesdePerfil(undefined)

const perfil: Perfil = {
  equiposFavoritos: [{ codigo: 'ARG', prioridad: 1 }],
  jugadoresFavoritos: ['Lionel Messi'],
  franjas: [],
  zonaHoraria: 'America/Argentina/Buenos_Aires',
  tolerancia: 'media',
  perfilFan: 'casual',
  scheduledMatches: {},
  feedbacks: [],
}

// Baseline en cero => saliencia = features crudas (test determinístico).
const baselineCero: FeatureVector = {
  equipo: 0,
  jugador: 0,
  estrellas: 0,
  competitividad: 0,
  grupo_muerte: 0,
  jornada3: 0,
  rivalidad: 0,
  ultimo_baile: 0,
}

const argAlg = partidos.find((p) => p.local === 'ARG' && p.visitante === 'ALG')!

describe('aplicarFeedback', () => {
  it('👍 sube la media de los factores presentes y baja su σ', () => {
    const post = aplicarFeedback(base, perfil, { partidoId: argAlg.id, gusto: true }, baselineCero)
    expect(post.equipo.mu).toBeGreaterThan(base.equipo.mu)
    expect(post.equipo.sigma).toBeLessThan(base.equipo.sigma)
  })

  it('👎 con motivo "horario" no toca los pesos (es disponibilidad)', () => {
    const post = aplicarFeedback(
      base,
      perfil,
      { partidoId: argAlg.id, gusto: false, motivo: 'horario' },
      baselineCero,
    )
    expect(post).toBe(base)
  })

  it('👎 con motivo "nivel" baja estrellas/competitividad y NO toca equipo', () => {
    const post = aplicarFeedback(
      base,
      perfil,
      { partidoId: argAlg.id, gusto: false, motivo: 'nivel' },
      baselineCero,
    )
    expect(post.estrellas.mu).toBeLessThan(base.estrellas.mu)
    expect(post.equipo.mu).toBe(base.equipo.mu) // protegido por el chip
  })

  it('asignación de crédito: ante un 👎 sin chip, el factor afirmado (σ chico) se mueve menos', () => {
    const post = aplicarFeedback(base, perfil, { partidoId: argAlg.id, gusto: false }, baselineCero)
    const dEquipo = Math.abs(post.equipo.mu - base.equipo.mu)
    const dEstrellas = Math.abs(post.estrellas.mu - base.estrellas.mu)
    // equipo está más activado pero su σ angosto lo protege: se mueve menos que estrellas.
    expect(dEstrellas).toBeGreaterThan(dEquipo)
  })
})

describe('posteriorConFeedback', () => {
  it('sin feedback devuelve el prior base', () => {
    expect(posteriorConFeedback(base, perfil, [])).toBe(base)
  })
  it('pliega varios feedbacks y deja medias en [0,1]', () => {
    const post = posteriorConFeedback(base, perfil, [
      { partidoId: argAlg.id, gusto: true },
      { partidoId: argAlg.id, gusto: false, motivo: 'nivel' },
    ])
    for (const k of Object.keys(post) as (keyof typeof post)[]) {
      expect(post[k].mu).toBeGreaterThanOrEqual(0)
      expect(post[k].mu).toBeLessThanOrEqual(1)
    }
  })
})

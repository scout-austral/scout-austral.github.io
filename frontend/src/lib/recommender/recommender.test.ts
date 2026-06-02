import { describe, it, expect } from 'vitest'
import { partidos } from '@/data'
import type { Partido } from '@/data/types'
import { fCompetitividad, fEquipo, fJugador, fRivalidad, fUltimoBaile } from './features'
import { encajeHorario } from './availability'
import { clasificar } from './classify'
import { scorePartido } from './score'
import { priorsDesdePerfil } from './weights'
import { evaluarPrecision, recomendar } from './index'
import type { Feedback, Perfil } from './types'

const partido = (over: Partial<Partido>): Partido => ({
  id: 'TST',
  grupo: 'J',
  jornada: 1,
  local: 'ARG',
  visitante: 'ALG',
  fecha: '2026-06-16',
  hora_local: '20:00',
  utc_offset: 'UTC-5',
  kickoff_utc: '2026-06-17T01:00:00Z',
  sede: 'x',
  ciudad: 'Kansas City',
  pais: 'USA',
  capacidad: 0,
  ...over,
})

const perfilArg: Perfil = {
  equiposFavoritos: [{ codigo: 'ARG', prioridad: 1 }],
  jugadoresFavoritos: ['Lionel Messi'],
  franjas: [],
  zonaHoraria: 'America/Argentina/Buenos_Aires',
  tolerancia: 'media',
  perfilFan: 'total',
  scheduledMatches: {},
  feedbacks: [],
}

describe('features', () => {
  it('fEquipo: 1.0 si juega el favorito de prioridad 1', () => {
    expect(fEquipo(partido({}), perfilArg)).toBe(1)
  })
  it('fEquipo: 0 si no juega ningún favorito', () => {
    expect(fEquipo(partido({ local: 'BRA', visitante: 'MAR' }), perfilArg)).toBe(0)
  })
  it('fJugador: detecta a Messi en un partido de Argentina', () => {
    expect(fJugador(partido({}), perfilArg)).toBeGreaterThan(0)
    expect(fJugador(partido({ local: 'BRA', visitante: 'MAR' }), perfilArg)).toBe(0)
  })
  it('fCompetitividad: alta cuando los rankings están cerca, baja cuando hay brecha', () => {
    const parejo = fCompetitividad(partido({ local: 'ARG', visitante: 'ESP' })) // gap 1
    const dispar = fCompetitividad(partido({ local: 'ARG', visitante: 'ALG' })) // gap grande
    expect(parejo).toBeGreaterThan(0.9)
    expect(dispar).toBeLessThan(parejo)
  })
  it('fRivalidad: storyline curado (FRA-SEN, revancha 2002) muy alto; derbi de confederación moderado', () => {
    const curado = fRivalidad(partido({ local: 'FRA', visitante: 'SEN' }))
    const derbi = fRivalidad(partido({ local: 'FRA', visitante: 'NOR' })) // ambos UEFA, sin storyline
    const nada = fRivalidad(partido({ local: 'ARG', visitante: 'ALG' })) // confeds distintas
    expect(curado).toBeGreaterThan(0.9)
    expect(derbi).toBeGreaterThan(0)
    expect(derbi).toBeLessThan(curado)
    expect(nada).toBe(0)
  })
  it('fUltimoBaile: 1.0 si juega una leyenda (Messi en ARG), 0 si no hay ninguna', () => {
    expect(fUltimoBaile(partido({ local: 'ARG', visitante: 'ALG' }))).toBe(1)
    expect(fUltimoBaile(partido({ local: 'MEX', visitante: 'RSA' }))).toBe(0)
  })
})

describe('encajeHorario', () => {
  // Apertura: MEX vs RSA, 2026-06-11T19:00:00Z -> 16:00 jueves en Buenos Aires.
  const apertura = partidos.find((p) => p.local === 'MEX' && p.visitante === 'RSA')!

  it('bueno cuando la hora cae dentro de una franja', () => {
    const perfil: Perfil = { ...perfilArg, franjas: [{ dia: 4, desde: 14, hasta: 18 }] }
    expect(encajeHorario(apertura, perfil)).toBe('bueno')
  })
  it('complejo cuando está cerca y la tolerancia alcanza', () => {
    const perfil: Perfil = {
      ...perfilArg,
      tolerancia: 'alta', // margen 3h; 16:00 está a 2h de [18,20]
      franjas: [{ dia: 4, desde: 18, hasta: 20 }],
    }
    expect(encajeHorario(apertura, perfil)).toBe('complejo')
  })
  it('imposible cuando está lejos y la tolerancia no alcanza', () => {
    const perfil: Perfil = {
      ...perfilArg,
      tolerancia: 'baja',
      franjas: [{ dia: 4, desde: 21, hasta: 23 }],
    }
    expect(encajeHorario(apertura, perfil)).toBe('imposible')
  })
  it('bueno por defecto cuando no hay franjas declaradas', () => {
    expect(encajeHorario(apertura, perfilArg)).toBe('bueno')
  })
})

describe('clasificar', () => {
  const σbaja = 0.04
  it('Imperdible: alta afinidad + buen horario + score confiable', () => {
    expect(clasificar(0.7, σbaja, 'bueno', 'casual')).toBe('imperdible')
  })
  it('Vale la pena: alta afinidad pero horario complejo', () => {
    expect(clasificar(0.7, σbaja, 'complejo', 'casual')).toBe('vale_la_pena')
  })
  it('Vale la pena: afinidad media', () => {
    expect(clasificar(0.4, σbaja, 'bueno', 'casual')).toBe('vale_la_pena')
  })
  it('Resumen: baja afinidad y score confiable', () => {
    expect(clasificar(0.2, σbaja, 'bueno', 'casual')).toBe('resumen')
  })
  it('Resumen: horario imposible aunque la afinidad sea alta', () => {
    expect(clasificar(0.9, σbaja, 'imposible', 'casual')).toBe('resumen')
  })

  // Incertidumbre alimentando "Vale la pena":
  it('DEMOTE: alta afinidad pero σ grande no llega a Imperdible', () => {
    expect(clasificar(0.7, 0.2, 'bueno', 'casual')).toBe('vale_la_pena')
  })
  it('PROMOTE: afinidad bajo el corte medio pero μ+σ lo alcanza → apuesta', () => {
    expect(clasificar(0.3, 0.1, 'bueno', 'casual')).toBe('vale_la_pena')
    // misma afinidad con score confiable se queda en Resumen
    expect(clasificar(0.3, 0.02, 'bueno', 'casual')).toBe('resumen')
  })
})

describe('priors e incertidumbre', () => {
  it('priorsDesdePerfil sin calibración usa los pesos por defecto', () => {
    const p = priorsDesdePerfil(undefined)
    expect(p.equipo.mu).toBeCloseTo(0.3)
    expect(p.competitividad.sigma).toBeGreaterThan(p.equipo.sigma)
  })
  it('priorsDesdePerfil con calibración normaliza medias a suma 1 y reduce σ', () => {
    const imp = { equipo: 50, jugador: 50, estrellas: 0, competitividad: 0, grupo_muerte: 0, jornada3: 0 }
    const p = priorsDesdePerfil(imp)
    const suma = Object.values(p).reduce((a, b) => a + b.mu, 0)
    expect(suma).toBeCloseTo(1)
    expect(p.equipo.mu).toBeCloseTo(0.5)
    expect(p.equipo.sigma).toBeLessThan(0.04) // σ reducido por calibrar
  })
  it('scorePartido devuelve incertidumbre > 0', () => {
    const r = scorePartido(partido({}), perfilArg)
    expect(r.incertidumbre).toBeGreaterThan(0)
  })
})

describe('recomendar', () => {
  it('evalúa los 72 partidos y los ordena por afinidad desc', () => {
    const r = recomendar(perfilArg)
    expect(r).toHaveLength(72)
    for (let i = 1; i < r.length; i++) {
      expect(r[i - 1].afinidad).toBeGreaterThanOrEqual(r[i].afinidad)
    }
  })

  it('para un hincha argentino, un partido de Argentina queda Imperdible', () => {
    const r = recomendar(perfilArg)
    const argMatch = r.find((e) => e.partido.local === 'ARG' || e.partido.visitante === 'ARG')!
    expect(argMatch.categoria).toBe('imperdible')
    expect(argMatch.factores[0].factor).toBe('equipo')
  })

  it('TODOS los partidos del equipo favorito son Imperdibles (aunque el rival sea flojo)', () => {
    const r = recomendar(perfilArg) // sin franjas → encaje siempre "bueno"
    const argMatches = r.filter((e) => e.partido.local === 'ARG' || e.partido.visitante === 'ARG')
    expect(argMatches.length).toBeGreaterThan(0)
    for (const m of argMatches) expect(m.categoria).toBe('imperdible')
  })
})

describe('evaluarPrecision', () => {
  const base = priorsDesdePerfil(undefined)
  const argMatch = recomendar(perfilArg).find(
    (e) => e.partido.local === 'ARG' || e.partido.visitante === 'ARG',
  )!

  it('no hay feedback → accuracy 0 y total 0', () => {
    const p = evaluarPrecision(base, perfilArg, [])
    expect(p.total).toBe(0)
    expect(p.accuracy).toBe(0)
  })
  it('cuenta un acierto cuando el 👍 coincide con una predicción positiva', () => {
    const fbs: Feedback[] = [{ partidoId: argMatch.partido.id, gusto: true }]
    const p = evaluarPrecision(base, perfilArg, fbs)
    expect(p.total).toBe(1)
    expect(p.aciertos).toBe(1)
    expect(p.accuracy).toBe(1)
  })
  it('los 👎 por "horario" no entran en la métrica (es disponibilidad, no afinidad)', () => {
    const fbs: Feedback[] = [
      { partidoId: argMatch.partido.id, gusto: false, motivo: 'horario' },
    ]
    const p = evaluarPrecision(base, perfilArg, fbs)
    expect(p.total).toBe(0)
  })
})

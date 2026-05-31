// Extractores de features de un partido, todos normalizados a [0, 1].
// Funciones puras sobre los datos locales (@/data) y el perfil del usuario.

import { equipoPorCodigo, equipos, jugadores } from '@/data'
import type { Partido } from '@/data/types'
import type { FeatureVector, Perfil } from './types'

const clamp01 = (x: number): number => Math.max(0, Math.min(1, x))

/** Fuerza de una selección a partir del ranking FIFA (≈ concentración de figuras). */
function fuerza(rankingFifa: number): number {
  return clamp01(1 - (rankingFifa - 1) / 50)
}

function rankingDe(codigo: string): number {
  return equipoPorCodigo[codigo]?.ranking_fifa ?? 50
}

// --- Estadísticas por grupo, precomputadas una vez ---
interface StatsGrupo {
  fuerzaPromedio: number
  paridad: number
}

const statsPorGrupo: Record<string, StatsGrupo> = (() => {
  const porGrupo: Record<string, number[]> = {}
  for (const e of equipos) {
    ;(porGrupo[e.grupo] ??= []).push(fuerza(e.ranking_fifa))
  }
  const out: Record<string, StatsGrupo> = {}
  for (const [grupo, fuerzas] of Object.entries(porGrupo)) {
    const fuerzaPromedio = fuerzas.reduce((a, b) => a + b, 0) / fuerzas.length
    const paridad = 1 - (Math.max(...fuerzas) - Math.min(...fuerzas))
    out[grupo] = { fuerzaPromedio, paridad: clamp01(paridad) }
  }
  return out
})()

// --- Índice nombre de jugador -> código de selección ---
const seleccionPorJugador: Record<string, string> = (() => {
  const out: Record<string, string> = {}
  for (const j of jugadores) out[j.nombre] = j.seleccion
  return out
})()

/** Peso por prioridad de equipo favorito: 1° = 1.0, 2° = 0.85, 3° = 0.70… */
function pesoPrioridad(prioridad: number): number {
  return clamp01(1 - 0.15 * (prioridad - 1))
}

export function fEquipo(partido: Partido, perfil: Perfil): number {
  let mejor = 0
  for (const fav of perfil.equiposFavoritos) {
    if (fav.codigo === partido.local || fav.codigo === partido.visitante) {
      mejor = Math.max(mejor, pesoPrioridad(fav.prioridad))
    }
  }
  return mejor
}

export function fJugador(partido: Partido, perfil: Perfil): number {
  let count = 0
  for (const nombre of perfil.jugadoresFavoritos) {
    const sel = seleccionPorJugador[nombre]
    if (sel === partido.local || sel === partido.visitante) count++
  }
  if (count === 0) return 0
  return clamp01(0.7 + 0.3 * (count - 1))
}

export function fEstrellas(partido: Partido): number {
  return (fuerza(rankingDe(partido.local)) + fuerza(rankingDe(partido.visitante))) / 2
}

export function fCompetitividad(partido: Partido): number {
  const gap = Math.abs(rankingDe(partido.local) - rankingDe(partido.visitante))
  return clamp01(1 - gap / 30)
}

export function fGrupoMuerte(partido: Partido): number {
  const s = statsPorGrupo[partido.grupo]
  if (!s) return 0
  // Fuerte Y parejo: la fuerza domina, la paridad la potencia.
  return clamp01(s.fuerzaPromedio * (0.4 + 0.6 * s.paridad))
}

export function fJornada3(partido: Partido): number {
  if (partido.jornada === 3) return 1
  if (partido.jornada === 2) return 0.25
  return 0
}

/** Vector de features completo de un partido para un perfil dado. */
export function features(partido: Partido, perfil: Perfil): FeatureVector {
  return {
    equipo: fEquipo(partido, perfil),
    jugador: fJugador(partido, perfil),
    estrellas: fEstrellas(partido),
    competitividad: fCompetitividad(partido),
    grupo_muerte: fGrupoMuerte(partido),
    jornada3: fJornada3(partido),
  }
}

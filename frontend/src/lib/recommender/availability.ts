// Encaje del horario de un partido con la disponibilidad del usuario.
// Convierte kickoff_utc a la zona del usuario y lo cruza con sus franjas.

import type { Partido } from '@/data/types'
import { partesEnZona } from '../datetime'
import type { Encaje, Franja, Perfil, Tolerancia } from './types'

/** Margen (en horas) que la tolerancia agrega alrededor de las franjas. */
const MARGEN_TOLERANCIA: Record<Tolerancia, number> = {
  baja: 0,
  media: 1.5,
  alta: 3,
}

/**
 * Distancia (en horas) de una hora a una franja; 0 si está dentro.
 * El día es circular (24h): un kickoff a las 00:00 está a 0h del fin de una franja
 * que termina a las 24 (la "noche"), no a 18h del comienzo. Así un partido de
 * medianoche no es automáticamente imposible para quien declara disponibilidad nocturna.
 */
function distanciaAFranja(hora: number, franja: Franja): number {
  if (hora >= franja.desde && hora < franja.hasta) return 0
  const circular = (a: number, b: number) => {
    const d = Math.abs(a - b)
    return Math.min(d, 24 - d)
  }
  return Math.min(circular(hora, franja.desde), circular(hora, franja.hasta))
}

export function encajeHorario(partido: Partido, perfil: Perfil): Encaje {
  // Sin franjas declaradas: no penalizamos disponibilidad.
  if (perfil.franjas.length === 0) return 'bueno'

  const { diaSemana, hora } = partesEnZona(partido.kickoff_utc, perfil.zonaHoraria)
  const franjasDelDia = perfil.franjas.filter((f) => f.dia === diaSemana)
  if (franjasDelDia.length === 0) return 'imposible'

  const distMin = Math.min(...franjasDelDia.map((f) => distanciaAFranja(hora, f)))
  if (distMin === 0) return 'bueno'

  const margen = MARGEN_TOLERANCIA[perfil.tolerancia]
  return distMin <= margen ? 'complejo' : 'imposible'
}

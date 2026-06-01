// Storylines / "morbo" de cada cruce de la fase de grupos: un factor de interés que
// NO se desprende del ranking FIFA. Combina dos señales:
//   1. Rivalidades curadas a mano (revanchas, clásicos, reediciones de eliminaciones).
//   2. Derbi de confederación: dos selecciones de la misma confederación se conocen
//      de las eliminatorias y arrastran orgullo regional → interés extra base.
//
// La clave es independiente del orden de los equipos (se ordenan alfabéticamente).

import { equipoPorCodigo } from './index'

interface Storyline {
  /** Intensidad del morbo ∈ [0, 1]. */
  intensidad: number
  /** Texto para la justificación, ej. "revancha de 2002". */
  etiqueta: string
}

/** Clave canónica e independiente del orden para un par de selecciones. */
function clavePar(a: string, b: string): string {
  return [a, b].sort().join('|')
}

// Rivalidades/storylines verificadas contra el fixture real de la fase de grupos.
const STORYLINES: Record<string, Storyline> = {
  [clavePar('FRA', 'SEN')]: {
    intensidad: 0.95,
    etiqueta: 'revancha del shock de 2002, cuando Senegal venció a Francia en el debut',
  },
  [clavePar('ENG', 'CRO')]: {
    intensidad: 0.9,
    etiqueta: 'reedición de la semifinal de Rusia 2018',
  },
  [clavePar('ESP', 'URU')]: {
    intensidad: 0.7,
    etiqueta: 'duelo de escuelas: la Furia contra la Garra charrúa',
  },
  [clavePar('NED', 'SWE')]: {
    intensidad: 0.55,
    etiqueta: 'choque de potencias europeas con historia mundialista',
  },
}

/** Interés extra base cuando ambas selecciones son de la misma confederación. */
const DERBI_CONFEDERACION = 0.35

export interface RivalidadInfo {
  intensidad: number
  etiqueta: string | null
}

/**
 * Devuelve la intensidad de rivalidad/morbo del cruce y su descripción.
 * Toma el máximo entre el storyline curado y el derbi de confederación.
 */
export function rivalidadDe(local: string, visitante: string): RivalidadInfo {
  const curado = STORYLINES[clavePar(local, visitante)]
  if (curado) return { intensidad: curado.intensidad, etiqueta: curado.etiqueta }

  const confLocal = equipoPorCodigo[local]?.confederacion
  const confVisit = equipoPorCodigo[visitante]?.confederacion
  if (confLocal && confLocal === confVisit) {
    return { intensidad: DERBI_CONFEDERACION, etiqueta: `derbi de la ${confLocal}` }
  }

  return { intensidad: 0, etiqueta: null }
}

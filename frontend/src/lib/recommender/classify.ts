// Clasificación en las tres categorías, incorporando la incertidumbre del score.
//
// La incertidumbre alimenta "Vale la pena" en dos direcciones:
//  - DEMOTE: una afinidad alta pero POCO confiable (σ grande) no llega a Imperdible.
//  - PROMOTE: una afinidad media-baja cuyo límite optimista (μ + σ) alcanza el corte
//    medio es una "apuesta que podría valer" → Vale la pena en vez de Resumen.

import type { Categoria, Encaje, PerfilFan } from './types'

interface Umbrales {
  alto: number
  medio: number
}

/** Un fan "total" tiene la vara más baja → más Imperdibles. */
const UMBRALES: Record<PerfilFan, Umbrales> = {
  casual: { alto: 0.6, medio: 0.35 },
  total: { alto: 0.5, medio: 0.3 },
}

/** Corte de afinidad a partir del cual el modelo predice que un partido "le va a gustar". */
export function umbralPositivo(perfilFan: PerfilFan): number {
  return UMBRALES[perfilFan].medio
}

// Por encima de este σ consideramos el score "poco confiable" (demote a Vale la pena).
// Recalibrado para 8 factores: sumar features independientes eleva el σ total del
// score, así que el umbral acompaña ese piso más alto de incertidumbre agregada.
const TAU_SIGMA = 0.16

export function clasificar(
  afinidad: number,
  incertidumbre: number,
  encaje: Encaje,
  perfilFan: PerfilFan,
): Categoria {
  // Horario imposible: a lo sumo el resumen.
  if (encaje === 'imposible') return 'resumen'

  const { alto, medio } = UMBRALES[perfilFan]
  const optimista = afinidad + incertidumbre

  if (afinidad >= alto) {
    // Alta afinidad: Imperdible solo si el horario acompaña Y el score es confiable.
    if (encaje === 'bueno' && incertidumbre <= TAU_SIGMA) return 'imperdible'
    return 'vale_la_pena'
  }

  // Media, o "podría valer la pena" porque el límite optimista alcanza el corte medio.
  if (afinidad >= medio || optimista >= medio) return 'vale_la_pena'

  return 'resumen'
}

/** Nivel de confianza legible a partir del desvío del score. */
export function nivelConfianza(incertidumbre: number): 'alta' | 'media' | 'baja' {
  if (incertidumbre <= TAU_SIGMA * 0.6) return 'alta'
  if (incertidumbre <= TAU_SIGMA) return 'media'
  return 'baja'
}

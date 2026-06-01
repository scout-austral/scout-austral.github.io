// Métrica de validación del modelo: ¿qué tan bien predijo el modelo COLD-START
// (los priors derivados del onboarding, ANTES de aprender del feedback) lo que al
// usuario efectivamente le gustó o no?
//
// Para cada partido calificado:
//   predicción = afinidad_base ≥ umbral  →  "le va a gustar"
//   acierto    = predicción coincide con el 👍/👎 real
//
// Usamos los priors BASE (no el posterior) para evitar fuga de información: medir con
// los mismos pesos que el feedback ya ajustó sería trampa. Los 👎 por "horario" se
// excluyen: no son un error del modelo de afinidad sino de disponibilidad.

import { partidos } from '@/data'
import { umbralPositivo } from './classify'
import { scorePartido } from './score'
import type { Feedback, FeatureKey, Perfil } from './types'
import type { Prior } from './weights'

export interface PrecisionModelo {
  /** Cantidad de partidos calificados que entran en la métrica. */
  total: number
  /** Cuántos predijo correctamente. */
  aciertos: number
  /** aciertos / total ∈ [0, 1]; 0 si no hay datos. */
  accuracy: number
}

const partidoPorId: Record<string, (typeof partidos)[number]> = Object.fromEntries(
  partidos.map((p) => [p.id, p]),
)

export function evaluarPrecision(
  basePriors: Record<FeatureKey, Prior>,
  perfil: Perfil,
  feedbacks: Feedback[],
): PrecisionModelo {
  const umbral = umbralPositivo(perfil.perfilFan)
  let total = 0
  let aciertos = 0

  for (const fb of feedbacks) {
    // Un 👎 por horario no juzga la afinidad del modelo.
    if (!fb.gusto && fb.motivo === 'horario') continue
    const partido = partidoPorId[fb.partidoId]
    if (!partido) continue

    const { afinidad } = scorePartido(partido, perfil, basePriors)
    const prediccion = afinidad >= umbral
    if (prediccion === fb.gusto) aciertos++
    total++
  }

  return { total, aciertos, accuracy: total > 0 ? aciertos / total : 0 }
}

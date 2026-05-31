// Aprendizaje por feedback: actualiza el posterior de los pesos con cada 👍/👎.
//
// Update bayesiano conjugado (filtro de Kalman diagonal) sobre el vector de pesos:
//   ŷ = Σ μ_k f_k            (afinidad predicha)
//   e = y - ŷ                (error de predicción; y = 1 si gustó, 0 si no)
//   S = Σ a_k² σ_k² + R      (varianza de la innovación; R = ruido de observación)
//   g_k = σ_k² a_k / S       (ganancia)
//   μ_k ← μ_k + g_k e
//   σ_k² ← σ_k² (1 − g_k a_k)
//
// ASIGNACIÓN DE CRÉDITO — para no castigar lo que el usuario afirmó (p. ej. su equipo
// favorito ante un 👎 a un partido suyo aburrido), usamos tres mecanismos:
//   (a) σ angosto en lo afirmado → ganancia chica → casi no se mueve.
//   (b) saliencia por SORPRESA: a_k = max(0, f_k − f̄_k), la desviación del factor
//       respecto del "promedio de la dieta" del usuario. Lo que está siempre presente
//       (f̄ alto) aporta poca info y casi no recibe crédito/culpa.
//   (c) chip "¿qué no te gustó?": restringe el update a los factores del motivo
//       ('horario' no toca pesos: es disponibilidad, no afinidad).

import { partidos } from '@/data'
import { features } from './features'
import type { FeatureKey, FeatureVector, Feedback, MotivoDislike, Perfil } from './types'
import { DEFAULT_WEIGHTS, type Prior } from './weights'

const FEATURE_KEYS = Object.keys(DEFAULT_WEIGHTS) as FeatureKey[]

/** Ruido de observación: mayor = aprendizaje más gradual. */
const R = 0.25
/** Tamaño de la "dieta" (cuántos partidos top definen el promedio de referencia). */
const K_DIETA = 12

/** Qué factores ajusta cada motivo de 👎 (null = no toca pesos). */
const FACTORES_POR_MOTIVO: Record<MotivoDislike, FeatureKey[] | null> = {
  horario: null, // es disponibilidad, no afinidad
  nivel: ['estrellas', 'competitividad', 'grupo_muerte', 'jornada3'],
  sin_interes: ['equipo', 'jugador'],
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x))

const partidoPorId: Record<string, (typeof partidos)[number]> = Object.fromEntries(
  partidos.map((p) => [p.id, p]),
)

/** Promedio de features sobre la "dieta" del usuario (sus K partidos de mayor afinidad). */
export function featuresBaseline(
  perfil: Perfil,
  priors: Record<FeatureKey, Prior>,
): FeatureVector {
  const scored = partidos
    .map((p) => {
      const f = features(p, perfil)
      const af = FEATURE_KEYS.reduce((s, k) => s + priors[k].mu * f[k], 0)
      return { f, af }
    })
    .sort((a, b) => b.af - a.af)
    .slice(0, K_DIETA)

  const base = Object.fromEntries(FEATURE_KEYS.map((k) => [k, 0])) as FeatureVector
  for (const { f } of scored) for (const k of FEATURE_KEYS) base[k] += f[k]
  for (const k of FEATURE_KEYS) base[k] /= scored.length || 1
  return base
}

/** Aplica un feedback al prior y devuelve el posterior actualizado. */
export function aplicarFeedback(
  prior: Record<FeatureKey, Prior>,
  perfil: Perfil,
  fb: Feedback,
  baseline: FeatureVector,
): Record<FeatureKey, Prior> {
  const partido = partidoPorId[fb.partidoId]
  if (!partido) return prior
  // Un 👎 por "horario" no dice nada sobre la afinidad → no toca pesos.
  if (!fb.gusto && fb.motivo === 'horario') return prior

  const targets = !fb.gusto && fb.motivo ? FACTORES_POR_MOTIVO[fb.motivo] : null
  const f = features(partido, perfil)
  const yhat = FEATURE_KEYS.reduce((s, k) => s + prior[k].mu * f[k], 0)
  const e = (fb.gusto ? 1 : 0) - yhat

  const a = Object.fromEntries(
    FEATURE_KEYS.map((k) => {
      let s = Math.max(0, f[k] - baseline[k])
      if (targets && !targets.includes(k)) s = 0
      return [k, s]
    }),
  ) as Record<FeatureKey, number>

  const S = FEATURE_KEYS.reduce((acc, k) => acc + a[k] ** 2 * prior[k].sigma ** 2, R)

  const next = {} as Record<FeatureKey, Prior>
  for (const k of FEATURE_KEYS) {
    const v = prior[k].sigma ** 2
    const g = (v * a[k]) / S
    const mu = clamp01(prior[k].mu + g * e)
    const vNew = v * (1 - g * a[k])
    next[k] = { mu, sigma: Math.sqrt(Math.max(vNew, 1e-6)) }
  }
  return next
}

/** Pliega toda la secuencia de feedback sobre el prior base. */
export function posteriorConFeedback(
  base: Record<FeatureKey, Prior>,
  perfil: Perfil,
  feedbacks: Feedback[],
): Record<FeatureKey, Prior> {
  if (feedbacks.length === 0) return base
  const baseline = featuresBaseline(perfil, base)
  let prior = base
  for (const fb of feedbacks) prior = aplicarFeedback(prior, perfil, fb, baseline)
  return prior
}

export interface AprendizajeFactor {
  factor: FeatureKey
  delta: number
}

/** Variación de las medias (posterior − base), ordenada por magnitud, para mostrar "qué aprendió". */
export function aprendizaje(
  base: Record<FeatureKey, Prior>,
  posterior: Record<FeatureKey, Prior>,
): AprendizajeFactor[] {
  return FEATURE_KEYS.map((k) => ({ factor: k, delta: posterior[k].mu - base[k].mu }))
    .filter((d) => Math.abs(d.delta) > 0.005)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
}

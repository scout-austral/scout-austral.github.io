// Pesos del modelo de afinidad como PRIORS bayesianos: cada peso es w_k ~ Normal(μ_k, σ_k²).
// - μ_k: media. Por defecto la del diseño; si el usuario calibra, se elicita de sus sliders.
// - σ_k: incertidumbre del peso. Refleja cuán seguros estamos a priori de ese factor
//   (la "competitividad" es un factor no obvio → más incierto que "equipo favorito").
//   Calibrar el perfil reduce σ (el usuario nos dio información → más confianza).

import type { FeatureKey, Weights } from './types'

/** Medias por defecto (suman 1 → afinidad ∈ [0, 1] con features ∈ [0, 1]). */
export const DEFAULT_WEIGHTS: Weights = {
  equipo: 0.34,
  jugador: 0.18,
  estrellas: 0.16,
  competitividad: 0.16,
  grupo_muerte: 0.08,
  jornada3: 0.08,
}

/** Desvío estándar a priori de cada peso (mayor = más incierto). */
export const DEFAULT_SIGMA: Record<FeatureKey, number> = {
  equipo: 0.04,
  jugador: 0.05,
  estrellas: 0.09,
  competitividad: 0.11,
  grupo_muerte: 0.1,
  jornada3: 0.08,
}

/** Factor por el que se reduce σ cuando el usuario calibra sus preferencias. */
const CALIBRACION_SHRINK = 0.5

export interface Prior {
  mu: number
  sigma: number
}

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  equipo: 'Equipo favorito',
  jugador: 'Jugador favorito',
  estrellas: 'Figuras en cancha',
  competitividad: 'Partido parejo',
  grupo_muerte: 'Grupo de la muerte',
  jornada3: 'Fecha decisiva',
}

const FEATURE_KEYS = Object.keys(DEFAULT_WEIGHTS) as FeatureKey[]

/**
 * Construye los priors a partir de la importancia opcional elicitada del usuario.
 * Si `importancia` está presente (sliders 0–100 de todos los factores), las medias se
 * normalizan a partir de ahí y σ se reduce (el usuario nos dio información). Si no, se
 * usan las medias y σ por defecto del diseño.
 */
export function priorsDesdePerfil(
  importancia?: Partial<Record<FeatureKey, number>>,
): Record<FeatureKey, Prior> {
  const calibrado = importancia != null && FEATURE_KEYS.some((k) => importancia[k] != null)

  // Medias
  let mu: Record<FeatureKey, number>
  if (calibrado) {
    const crudos = FEATURE_KEYS.map((k) => Math.max(0, importancia?.[k] ?? 0))
    const total = crudos.reduce((a, b) => a + b, 0) || 1
    mu = Object.fromEntries(
      FEATURE_KEYS.map((k, i) => [k, crudos[i] / total]),
    ) as Record<FeatureKey, number>
  } else {
    mu = { ...DEFAULT_WEIGHTS }
  }

  // Sigmas
  const shrink = calibrado ? CALIBRACION_SHRINK : 1
  return Object.fromEntries(
    FEATURE_KEYS.map((k) => [k, { mu: mu[k], sigma: DEFAULT_SIGMA[k] * shrink }]),
  ) as Record<FeatureKey, Prior>
}

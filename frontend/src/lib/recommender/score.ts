// Score de afinidad bayesiano: media μ y desvío σ propagados desde los priors de los pesos.
//   afinidad  μ(m) = Σ_k μ_k · f_k(m)
//   varianza  Var(m) = Σ_k f_k(m)² · σ_k²     (pesos independientes)
//   incertidumbre = √Var(m)
// La incertidumbre crece cuando el score se apoya en factores inciertos (σ alto).

import { equipoPorCodigo } from '@/data'
import type { Partido } from '@/data/types'
import { features } from './features'
import type { FactorClave, FeatureKey, FeatureVector, Perfil } from './types'
import { DEFAULT_WEIGHTS, FEATURE_LABELS, priorsDesdePerfil, type Prior } from './weights'

export interface ScoreResult {
  /** Media de la afinidad ∈ [0, 1]. */
  afinidad: number
  /** Desvío estándar de la afinidad (incertidumbre del score). */
  incertidumbre: number
  factores: FactorClave[]
}

const FEATURE_KEYS = Object.keys(DEFAULT_WEIGHTS) as FeatureKey[]

function etiquetaFactor(factor: FeatureKey, partido: Partido, perfil: Perfil): string {
  const local = equipoPorCodigo[partido.local]?.nombre ?? partido.local
  const visit = equipoPorCodigo[partido.visitante]?.nombre ?? partido.visitante
  switch (factor) {
    case 'equipo': {
      const fav = perfil.equiposFavoritos.find(
        (f) => f.codigo === partido.local || f.codigo === partido.visitante,
      )
      const nombre = fav ? (equipoPorCodigo[fav.codigo]?.nombre ?? fav.codigo) : ''
      return `Juega ${nombre} (tu favorito)`
    }
    case 'jugador':
      return 'Juega una de tus figuras favoritas'
    case 'estrellas':
      return 'Partido con figuras de primer nivel'
    case 'competitividad':
      return `Duelo parejo entre ${local} y ${visit}`
    case 'grupo_muerte':
      return `Grupo ${partido.grupo}: fuerte y parejo`
    case 'jornada3':
      return 'Fecha decisiva del grupo'
    default:
      return FEATURE_LABELS[factor]
  }
}

export function scorePartido(
  partido: Partido,
  perfil: Perfil,
  priors: Record<FeatureKey, Prior> = priorsDesdePerfil(perfil.importancia),
): ScoreResult {
  const fv: FeatureVector = features(partido, perfil)

  let afinidad = 0
  let varianza = 0
  const factores: FactorClave[] = []
  for (const k of FEATURE_KEYS) {
    const f = fv[k]
    const contribucion = priors[k].mu * f
    afinidad += contribucion
    varianza += (f * priors[k].sigma) ** 2
    if (contribucion > 0) {
      factores.push({ factor: k, etiqueta: etiquetaFactor(k, partido, perfil), contribucion })
    }
  }

  factores.sort((a, b) => b.contribucion - a.contribucion)
  return { afinidad, incertidumbre: Math.sqrt(varianza), factores }
}

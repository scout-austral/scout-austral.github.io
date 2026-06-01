// Orquestación del motor: Perfil + datos locales -> partidos evaluados y clasificados.

import { partidos } from '@/data'
import { partesEnZona } from '../datetime'
import { encajeHorario } from './availability'
import { clasificar } from './classify'
import { fEquipo, fJugador } from './features'
import { justificacionLocal } from './justify'
import { scorePartido } from './score'
import { priorsDesdePerfil, type Prior } from './weights'
import type { Categoria, FeatureKey, PartidoEvaluado, Perfil } from './types'

export * from './types'
export { DEFAULT_WEIGHTS, DEFAULT_SIGMA, FEATURE_LABELS, priorsDesdePerfil } from './weights'
export type { Prior } from './weights'
export { nivelConfianza, umbralPositivo } from './classify'
export { evaluarPrecision, type PrecisionModelo } from './accuracy'
export { justificacionLocal } from './justify'
export {
  aplicarFeedback,
  aprendizaje,
  featuresBaseline,
  posteriorConFeedback,
  type AprendizajeFactor,
} from './learning'

/** Evalúa todos los partidos para un perfil y los devuelve ordenados por afinidad. */
export function recomendar(
  perfil: Perfil,
  priors: Record<FeatureKey, Prior> = priorsDesdePerfil(perfil.importancia),
): PartidoEvaluado[] {
  const evaluados = partidos.map((partido): PartidoEvaluado => {
    const { afinidad, incertidumbre, factores } = scorePartido(partido, perfil, priors)
    const encaje = encajeHorario(partido, perfil)
    // "Favorito fuerte": juega un equipo top-3 del usuario o uno de sus jugadores.
    const esFavorito = fEquipo(partido, perfil) >= 0.7 || fJugador(partido, perfil) >= 0.7
    const categoria = clasificar(afinidad, incertidumbre, encaje, perfil.perfilFan, esFavorito)
    const { etiqueta } = partesEnZona(partido.kickoff_utc, perfil.zonaHoraria)
    return {
      partido,
      afinidad,
      incertidumbre,
      encaje,
      categoria,
      factores,
      horaUsuario: etiqueta,
    }
  })

  evaluados.sort((a, b) => b.afinidad - a.afinidad)
  return evaluados
}

/** Texto explicativo de un partido evaluado (justificación local). */
export function justificar(evaluado: PartidoEvaluado): string {
  return justificacionLocal(evaluado.categoria, evaluado.encaje, evaluado.factores)
}

/** Agrupa los partidos evaluados por categoría (preservando el orden por afinidad). */
export function agruparPorCategoria(
  evaluados: PartidoEvaluado[],
): Record<Categoria, PartidoEvaluado[]> {
  const grupos: Record<Categoria, PartidoEvaluado[]> = {
    imperdible: [],
    vale_la_pena: [],
    resumen: [],
  }
  for (const e of evaluados) grupos[e.categoria].push(e)
  return grupos
}

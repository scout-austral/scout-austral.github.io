// Estado del feedback del usuario.
// Los feedbacks viven en perfil.feedbacks → se sincronizan con la DB via useProfile.
// No se usa localStorage: el aislamiento por usuario y la persistencia los maneja la DB.

import { useCallback, useMemo } from 'react'
import {
  aprendizaje,
  evaluarPrecision,
  posteriorConFeedback,
  priorsDesdePerfil,
  type AprendizajeFactor,
  type Feedback,
  type FeatureKey,
  type MotivoDislike,
  type Perfil,
  type PrecisionModelo,
  type Prior,
} from '@/lib/recommender'

export function useFeedback(perfil: Perfil, actualizarPerfil: (cambios: Partial<Perfil>) => void) {
  const feedbacks = perfil.feedbacks ?? []

  const basePrior = useMemo(
    () => priorsDesdePerfil(perfil.importancia),
    [perfil.importancia],
  )

  const priors = useMemo<Record<FeatureKey, Prior>>(
    () => posteriorConFeedback(basePrior, perfil, feedbacks),
    [basePrior, perfil, feedbacks],
  )

  const deltas = useMemo<AprendizajeFactor[]>(
    () => aprendizaje(basePrior, priors),
    [basePrior, priors],
  )

  const precision = useMemo<PrecisionModelo>(
    () => evaluarPrecision(basePrior, perfil, feedbacks),
    [basePrior, perfil, feedbacks],
  )

  const porPartido = useMemo(() => {
    const m = new Map<string, Feedback>()
    for (const f of feedbacks) m.set(f.partidoId, f)
    return m
  }, [feedbacks])

  const registrar = useCallback(
    (partidoId: string, gusto: boolean, motivo?: MotivoDislike) => {
      const next = [
        ...(perfil.feedbacks ?? []).filter((f) => f.partidoId !== partidoId),
        { partidoId, gusto, motivo },
      ]
      actualizarPerfil({ feedbacks: next })
    },
    [perfil.feedbacks, actualizarPerfil],
  )

  const quitar = useCallback(
    (partidoId: string) => {
      actualizarPerfil({
        feedbacks: (perfil.feedbacks ?? []).filter((f) => f.partidoId !== partidoId),
      })
    },
    [perfil.feedbacks, actualizarPerfil],
  )

  const reset = useCallback(() => {
    actualizarPerfil({ feedbacks: [] })
  }, [actualizarPerfil])

  return { feedbacks, priors, deltas, precision, porPartido, registrar, quitar, reset }
}

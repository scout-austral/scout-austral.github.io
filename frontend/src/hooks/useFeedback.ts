// Estado del feedback del usuario, persistido en localStorage.
// Deriva el posterior de los pesos (priors base + feedback) y qué aprendió el modelo.
import { useCallback, useEffect, useMemo, useState } from 'react'
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

const STORAGE_KEY = 'scout_feedback'

function cargar(): Feedback[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Feedback[]
  } catch {
    /* ignore */
  }
  return []
}

export function useFeedback(perfil: Perfil) {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>(cargar)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(feedbacks))
    } catch {
      /* ignore */
    }
  }, [feedbacks])

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

  // Precisión del modelo cold-start (priors base) contra el feedback real del usuario.
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
      setFeedbacks((prev) => [
        ...prev.filter((f) => f.partidoId !== partidoId),
        { partidoId, gusto, motivo },
      ])
    },
    [],
  )

  const quitar = useCallback((partidoId: string) => {
    setFeedbacks((prev) => prev.filter((f) => f.partidoId !== partidoId))
  }, [])

  const reset = useCallback(() => setFeedbacks([]), [])

  return { feedbacks, priors, deltas, precision, porPartido, registrar, quitar, reset }
}

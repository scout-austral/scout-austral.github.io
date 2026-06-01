// Cliente best-effort para la elicitación bayesiana asistida por LLM (vía el server).
// Traduce una descripción libre del usuario a los priors del modelo. Devuelve null ante
// cualquier problema (server caído, sin API key, offline) → el llamador hace fallback al
// cuestionario manual.

import type { FeatureKey, PerfilFan, Tolerancia } from '@/lib/recommender/types'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export interface ElicitResult {
  importancia: Partial<Record<FeatureKey, number>>
  perfilFan: PerfilFan
  tolerancia: Tolerancia
  /** Nombres de selecciones detectados (a matchear contra el dataset en el cliente). */
  equipos: string[]
  /** Nombres de jugadores detectados (a matchear contra el dataset en el cliente). */
  jugadores: string[]
}

export async function elicitarPerfil(text: string): Promise<ElicitResult | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/recommendations/elicit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as ElicitResult
    if (!data || typeof data.importancia !== 'object') return null
    return data
  } catch {
    return null
  }
}

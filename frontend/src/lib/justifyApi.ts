// Cliente best-effort para enriquecer la justificación con Gemini (vía el server).
// Devuelve null ante cualquier problema (server caído, sin API key, offline) → el
// llamador hace fallback a la justificación local.

import { equipoPorCodigo } from '@/data'
import type { Categoria, PartidoEvaluado, Perfil } from '@/lib/recommender/types'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

const CATEGORIA_API: Record<Categoria, 'must_watch' | 'worth_watching' | 'highlights_only'> = {
  imperdible: 'must_watch',
  vale_la_pena: 'worth_watching',
  resumen: 'highlights_only',
}

export async function justificarConGemini(
  evaluado: PartidoEvaluado,
  perfil: Perfil,
): Promise<string | null> {
  const { partido, factores, encaje, categoria, horaUsuario } = evaluado
  const body = {
    homeTeam: equipoPorCodigo[partido.local]?.nombre ?? partido.local,
    awayTeam: equipoPorCodigo[partido.visitante]?.nombre ?? partido.visitante,
    group: partido.grupo,
    matchDate: `${partido.fecha} (${horaUsuario})`,
    category: CATEGORIA_API[categoria],
    userProfile: {
      favoriteTeams: perfil.equiposFavoritos.map(
        (f) => equipoPorCodigo[f.codigo]?.nombre ?? f.codigo,
      ),
      favoritePlayers: perfil.jugadoresFavoritos,
      availableAt: encaje === 'bueno',
    },
    scoreBreakdown: Object.fromEntries(
      factores.map((f) => [f.factor, Number(f.contribucion.toFixed(3))]),
    ),
  }

  try {
    const res = await fetch(`${API_BASE_URL}/recommendations/justify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { justification?: string }
    return data.justification?.trim() || null
  } catch {
    return null
  }
}

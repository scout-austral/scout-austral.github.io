import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

export async function generateMatchJustification(params: {
  homeTeam: string
  awayTeam: string
  group: string
  matchDate: string
  category: 'must_watch' | 'worth_watching' | 'highlights_only'
  userProfile: {
    favoriteTeams: string[]
    favoritePlayers: string[]
    availableAt: boolean
  }
  scoreBreakdown: Record<string, number>
}): Promise<string> {
  const categoryLabel = {
    must_watch: 'Imperdible',
    worth_watching: 'Vale la pena',
    highlights_only: 'Para ver el resumen',
  }[params.category]

  const prompt = `Eres un analista de fútbol para la Copa del Mundo 2026.
Generá una justificación breve (2-3 oraciones) en español para por qué el partido ${params.homeTeam} vs ${params.awayTeam} (Grupo ${params.group}, ${params.matchDate}) fue clasificado como "${categoryLabel}" para este usuario.

Perfil del usuario:
- Equipos favoritos: ${params.userProfile.favoriteTeams.join(', ') || 'ninguno especificado'}
- Jugadores favoritos: ${params.userProfile.favoritePlayers.join(', ') || 'ninguno especificado'}
- Disponible en ese horario: ${params.userProfile.availableAt ? 'sí' : 'no'}

Factores de scoring: ${JSON.stringify(params.scoreBreakdown)}

Sé específico y mencioná los factores más relevantes. No uses markdown.`

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
  })

  return response.text ?? ''
}

// ─── Elicitación bayesiana asistida por LLM ─────────────────────────────────────
// El LLM NO recomienda: solo traduce una descripción en lenguaje natural del usuario
// a los PRIORS del modelo (importancia 0–100 por factor) + perfil de fan, tolerancia
// horaria y equipos/jugadores mencionados. El motor bayesiano explicable hace el resto.

export interface ElicitedProfile {
  importancia: Record<string, number>
  perfilFan: 'casual' | 'total'
  tolerancia: 'baja' | 'media' | 'alta'
  equipos: string[]
  jugadores: string[]
}

const FEATURES_DESC: { key: string; desc: string }[] = [
  { key: 'equipo', desc: 'que juegue una selección de la que es hincha' },
  { key: 'jugador', desc: 'seguir a jugadores puntuales' },
  { key: 'estrellas', desc: 'ver figuras/cracks de primer nivel en cancha' },
  { key: 'competitividad', desc: 'partidos parejos y reñidos (no goleadas anunciadas)' },
  { key: 'grupo_muerte', desc: 'grupos durísimos y abiertos donde cualquiera puede quedar afuera' },
  { key: 'jornada3', desc: 'la última fecha del grupo, donde se define la clasificación' },
  { key: 'rivalidad', desc: 'clásicos, revanchas y morbo histórico entre selecciones' },
  { key: 'ultimo_baile', desc: 'ver a un ídolo (Messi, Cristiano, Modrić…) en su probable último Mundial' },
]

/** Extrae ``` ```json fences ``` ``` y parsea el primer objeto JSON del texto. */
function parseJsonLoose(raw: string): any {
  let s = raw.trim()
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) s = fence[1].trim()
  const start = s.indexOf('{')
  const end = s.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('No JSON object in LLM response')
  return JSON.parse(s.slice(start, end + 1))
}

const clamp100 = (x: unknown): number => {
  const n = typeof x === 'number' ? x : Number(x)
  if (!Number.isFinite(n)) return 50
  return Math.max(0, Math.min(100, Math.round(n)))
}

export async function elicitProfileFromText(text: string): Promise<ElicitedProfile> {
  const factores = FEATURES_DESC.map((f) => `  - "${f.key}": ${f.desc}`).join('\n')

  const prompt = `Sos un asistente que arma el PERFIL de un hincha para un recomendador de partidos del Mundial 2026, a partir de cómo se describe en sus palabras.

Descripción del usuario:
"""${text}"""

Tenés que estimar cuánto le importa cada factor, en una escala 0–100 (0 = no le importa nada, 100 = es central para él). Los factores son:
${factores}

Además, inferí:
- "perfilFan": "total" si suena a fanático que quiere ver todo, "casual" si es selectivo.
- "tolerancia": "alta" si vería partidos a cualquier horario, "media" si depende, "baja" si el horario le importa mucho.
- "equipos": nombres de selecciones que menciona como favoritas (en español o inglés, ej. "Argentina", "Brazil"). [] si no menciona.
- "jugadores": nombres de jugadores que menciona seguir. [] si no menciona.

Respondé SOLO con un objeto JSON válido, sin texto adicional ni markdown, con esta forma exacta:
{"importancia":{"equipo":0,"jugador":0,"estrellas":0,"competitividad":0,"grupo_muerte":0,"jornada3":0,"rivalidad":0,"ultimo_baile":0},"perfilFan":"casual","tolerancia":"media","equipos":[],"jugadores":[]}`

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
  })

  const parsed = parseJsonLoose(response.text ?? '')

  const importancia: Record<string, number> = {}
  for (const { key } of FEATURES_DESC) importancia[key] = clamp100(parsed?.importancia?.[key])

  const perfilFan = parsed?.perfilFan === 'total' ? 'total' : 'casual'
  const tolerancia = ['baja', 'media', 'alta'].includes(parsed?.tolerancia)
    ? parsed.tolerancia
    : 'media'
  const equipos = Array.isArray(parsed?.equipos)
    ? parsed.equipos.filter((x: unknown) => typeof x === 'string').slice(0, 8)
    : []
  const jugadores = Array.isArray(parsed?.jugadores)
    ? parsed.jugadores.filter((x: unknown) => typeof x === 'string').slice(0, 8)
    : []

  return { importancia, perfilFan, tolerancia, equipos, jugadores }
}

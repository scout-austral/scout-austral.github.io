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
- Equipos favoritos: ${params.favoriteTeams.join(', ') || 'ninguno especificado'}
- Jugadores favoritos: ${params.favoritePlayers.join(', ') || 'ninguno especificado'}
- Disponible en ese horario: ${params.availableAt ? 'sí' : 'no'}

Factores de scoring: ${JSON.stringify(params.scoreBreakdown)}

Sé específico y mencioná los factores más relevantes. No uses markdown.`

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
  })

  return response.text ?? ''
}

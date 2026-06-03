// Capa de LLM: OpenAI para justificación de partidos y elicitación bayesiana del perfil.
// Mantiene las mismas firmas que el módulo gemini.ts anterior para que las rutas no cambien.

import OpenAI from 'openai'

function getClient(): OpenAI {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
}

// ─── Justificación de partido ─────────────────────────────────────────────────

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

  const prompt = `Sos un analista de fútbol para la Copa del Mundo 2026.
Generá una justificación breve (2-3 oraciones) en español para por qué el partido ${params.homeTeam} vs ${params.awayTeam} (Grupo ${params.group}, ${params.matchDate}) fue clasificado como "${categoryLabel}" para este usuario.

Perfil del usuario:
- Equipos favoritos: ${params.userProfile.favoriteTeams.join(', ') || 'ninguno especificado'}
- Jugadores favoritos: ${params.userProfile.favoritePlayers.join(', ') || 'ninguno especificado'}
- Disponible en ese horario: ${params.userProfile.availableAt ? 'sí' : 'no'}

Factores de scoring: ${JSON.stringify(params.scoreBreakdown)}

Sé específico y mencioná los factores más relevantes. No uses markdown.`

  const client = getClient()
  const res = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 200,
    temperature: 0.7,
  })

  return res.choices[0]?.message?.content?.trim() ?? ''
}

// ─── Elicitación bayesiana asistida por LLM ────────────────────────────────────

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

const JUGADORES_POR_SELECCION = `Argentina: Lionel Messi, Lautaro Martínez, Julián Álvarez
Portugal: Cristiano Ronaldo, Bruno Fernandes, Rafael Leão
Francia: Kylian Mbappé, Aurélien Tchouaméni, Ousmane Dembélé
España: Lamine Yamal, Rodri, Pedri
Brasil: Vinícius Júnior, Rodrygo, Raphinha
Alemania: Jamal Musiala, Florian Wirtz, Kai Havertz
Inglaterra: Jude Bellingham, Harry Kane, Bukayo Saka
Países Bajos: Virgil van Dijk, Cody Gakpo, Frenkie de Jong
Bélgica: Kevin De Bruyne, Jeremy Doku, Romelu Lukaku
Croacia: Luka Modrić, Joško Gvardiol, Mateo Kovačić
Uruguay: Federico Valverde, Darwin Núñez, Ronald Araújo
Colombia: Luis Díaz, James Rodríguez, Jhon Durán
Noruega: Erling Haaland, Martin Ødegaard, Alexander Sørloth
Marruecos: Achraf Hakimi, Brahim Díaz, Hakim Ziyech
Turquía: Arda Güler, Hakan Çalhanoğlu, Kenan Yıldız
México: Edson Álvarez, Santiago Giménez, Raúl Jiménez
EEUU: Christian Pulisic, Weston McKennie, Gio Reyna
Japón: Takefusa Kubo, Kaoru Mitoma, Wataru Endō
Suiza: Granit Xhaka, Manuel Akanji, Breel Embolo
Senegal: Sadio Mané, Nicolas Jackson, Pape Matar Sarr
Egipto: Mohamed Salah, Omar Marmoush, Mohamed Elneny
Ecuador: Moisés Caicedo, Enner Valencia, Pervis Estupiñán
Suecia: Alexander Isak, Viktor Gyökeres, Dejan Kulusevski
Austria: David Alaba, Marcel Sabitzer, Marko Arnautović
Canadá: Alphonso Davies, Jonathan David, Tajon Buchanan
Corea del Sur: Son Heung-min, Kim Min-jae, Lee Kang-in
Australia: Mathew Ryan, Jackson Irvine, Riley McGree
Irán: Mehdi Taremi, Alireza Jahanbakhsh, Sardar Azmoun
Bosnia: Edin Džeko, Sead Kolašinac, Ermedin Demirović
Argelia: Riyad Mahrez, Amine Gouiri, Ismaël Bennacer
Ghana: Antoine Semenyo, Thomas Partey, Jordan Ayew
Paraguay: Miguel Almirón, Antonio Sanabria, Julio Enciso
Arabia Saudita: Salem Al-Dawsari, Firas Al-Buraikan, Saud Abdulhamid
Escocia: Scott McTominay, Andrew Robertson, John McGinn
Túnez: Hannibal Mejbri, Ellyes Skhiri, Aïssa Laïdouni
Rep. Checa: Patrik Schick, Tomáš Souček, Adam Hložek
Sudáfrica: Lyle Foster, Teboho Mokoena, Ronwen Williams
Iraq: Aymen Hussein, Zidane Iqbal, Mohanad Ali
Jordania: Musa Al-Taamari, Yazan Al-Naimat, Ali Olwan
Qatar: Akram Afif, Almoez Ali, Boualem Khoukhi
DR Congo: Chancel Mbemba, Yoane Wissa, Cédric Bakambu
Panamá: José Córdoba, Adalberto Carrasquilla, Ismael Díaz
Uzbekistán: Eldor Shomurodov, Abdukodir Khusanov, Jaloliddin Masharipov
Cabo Verde: Ryan Mendes, Logan Costa, Garry Rodrigues
Haití: Duckens Nazon, Jean-Ricner Bellegarde, Johny Placide
Curazao: Tahith Chong, Juninho Bacuna, Eloy Room
Costa de Marfil: Franck Kessié, Simon Adingra, Amad Diallo
Nueva Zelanda: Chris Wood, Marko Stamenić, Joe Bell`

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

  const systemPrompt = `Sos un asistente experto en fútbol que arma el PERFIL de un hincha para un recomendador de partidos del Mundial 2026. Respondés SOLO con JSON válido, sin texto adicional.`

  const userPrompt = `El dataset del sistema tiene exactamente ESTAS figuras por selección (son las únicas que podés devolver en "jugadores"):
${JUGADORES_POR_SELECCION}

Descripción del usuario:
"""${text}"""

TU TAREA:

1. RESOLVÉ clubs a jugadores del Mundial: si el usuario menciona un club (ej. "soy de River", "sigo al Real Madrid"), usá tu conocimiento del fútbol actual para identificar qué jugadores del plantel ACTUAL de ese club están en la lista de arriba y clasifican para el Mundial 2026. Solo incluí los que aparezcan EXACTAMENTE en la lista de arriba.

2. RESOLVÉ apodos SIEMPRE antes de buscar en la lista:
   - "bicho", "el bicho", "CR7", "cr7", "cristiano", "ronaldo" → "Cristiano Ronaldo"
   - "pulga", "la pulga", "leo", "messi", "lionel" → "Lionel Messi"
   - "yamal", "lamine" → "Lamine Yamal"
   - "mbappé", "kylian" → "Kylian Mbappé"
   - "haaland", "erling" → "Erling Haaland"
   Luego verificá que el nombre resuelto aparezca EXACTAMENTE en la lista de arriba. Si está, incluiló; si no, ignoralo.

3. ESTIMÁ la importancia de cada factor 0–100:
${factores}
   IMPORTANTE: si el usuario menciona jugadores específicos (aunque sea por apodo), "jugador" debe ser ≥ 70. Si menciona un equipo favorito, "equipo" debe ser ≥ 60.

4. INFERÍ:
- "perfilFan": "total" si suena a fanático, "casual" si es selectivo.
- "tolerancia": "alta" si vería partidos a cualquier horario, "media" si depende, "baja" si el horario importa mucho.
- "equipos": selecciones mencionadas como favoritas (nombres en español). [] si no hay.
- "jugadores": SOLO nombres que aparezcan EXACTAMENTE en la lista de arriba. [] si no hay match.

Respondé SOLO con este JSON (sin markdown):
{"importancia":{"equipo":0,"jugador":0,"estrellas":0,"competitividad":0,"grupo_muerte":0,"jornada3":0,"rivalidad":0,"ultimo_baile":0},"perfilFan":"casual","tolerancia":"media","equipos":[],"jugadores":[]}`

  const client = getClient()
  const res = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 400,
    temperature: 0.2,
    response_format: { type: 'json_object' },
  })

  const raw = res.choices[0]?.message?.content ?? ''
  const parsed = parseJsonLoose(raw)

  const importancia: Record<string, number> = {}
  for (const { key } of FEATURES_DESC) importancia[key] = clamp100(parsed?.importancia?.[key])

  const perfilFan = parsed?.perfilFan === 'total' ? 'total' : 'casual'
  const tolerancia = ['baja', 'media', 'alta'].includes(parsed?.tolerancia) ? parsed.tolerancia : 'media'
  const equipos = Array.isArray(parsed?.equipos)
    ? parsed.equipos.filter((x: unknown) => typeof x === 'string').slice(0, 8)
    : []
  const jugadores = Array.isArray(parsed?.jugadores)
    ? parsed.jugadores.filter((x: unknown) => typeof x === 'string').slice(0, 8)
    : []

  return { importancia, perfilFan, tolerancia, equipos, jugadores }
}

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
  sin_cubrir: string[]
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

  const systemPrompt = `Sos un experto en fútbol mundial. Tu tarea es leer la descripción de un hincha y extraer un perfil estructurado para un recomendador de partidos del Mundial 2026.

REGLAS ABSOLUTAS — nunca las violes:

A. ALIAS DE JUGADORES (aplicalos ANTES de cualquier interpretación):
   "bicho" | "el bicho" | "CR7" | "cr7" | "cristiano" | "ronaldo" → "Cristiano Ronaldo" (NUNCA es Yamal)
   "pulga" | "la pulga" | "leo" | "messi" | "el 10" → "Lionel Messi"
   "yamal" | "lamine" | "el niño" → "Lamine Yamal"
   "mbappé" | "kylian" | "kyky" → "Kylian Mbappé"
   "haaland" | "erling" → "Erling Haaland"
   "modric" | "modrić" | "luka" → "Luka Modrić"
   "vini" | "viní" | "vinicius" → "Vinícius Júnior"
   "bellingham" | "jude" → "Jude Bellingham"
   "salah" | "mo salah" → "Mohamed Salah"
   "son" | "heung-min" → "Son Heung-min"
   Ejemplo correcto: "el bicho yamal y messi" → [Cristiano Ronaldo, Lamine Yamal, Lionel Messi]

B. CLUBS → JUGADORES (resolvé siempre clubs a jugadores del Mundial que estén en la lista):
   Real Madrid / Madrid → Vinícius Júnior, Kylian Mbappé, Jude Bellingham, Luka Modrić, Rodrygo, Federico Valverde, Aurélien Tchouaméni
   Barcelona / Barça → Lamine Yamal, Pedri, Raphinha, Ronald Araújo
   Manchester City / City → Kevin De Bruyne, Rodri, Manuel Akanji, Erling Haaland
   Liverpool → Mohamed Salah, Virgil van Dijk, Cody Gakpo, Darwin Núñez, Luis Díaz
   Arsenal → Bukayo Saka, Martin Ødegaard
   Bayern Munich / Bayern → Jamal Musiala, Alphonso Davies, Harry Kane
   PSG → Ousmane Dembélé, Achraf Hakimi
   Inter Milan / Inter → Lautaro Martínez, Mehdi Taremi
   Atletico Madrid / Atleti → Julián Álvarez
   Chelsea → Nicolas Jackson, Moisés Caicedo
   Al-Nassr → Cristiano Ronaldo
   River Plate / River → Julián Álvarez
   Boca Juniors / Boca → (ninguno relevante en lista)
   Juventus / Juve → (ninguno relevante en lista)
   Si el club no está arriba, usá tu conocimiento del fútbol para identificar sus jugadores en la LISTA DE JUGADORES del Mundial.
   IMPORTANTE: solo incluí jugadores que aparezcan EXACTAMENTE en la lista dada en el userPrompt.

C. IMPORTANCIA — valores 0-100, OBLIGATORIOS:
   - Menciona jugador por nombre/apodo → "jugador" ≥ 75
   - Menciona equipo favorito explícito → "equipo" ≥ 65
   - "No me pierdo a X" / "fan número 1" / "fanático" → "jugador" o "equipo" ≥ 85
   - "Últimas leyendas" / "último baile" / "despedida" / "retiro" → "ultimo_baile" ≥ 80
   - "Partidos parejos" / "emocionantes" / "no se sabe quién gana" → "competitividad" ≥ 70
   - "Clásicos" / "revanchas" / "morbo" / "historia" → "rivalidad" ≥ 70
   - "Grupos de la muerte" / "grupos difíciles" → "grupo_muerte" ≥ 70
   - "Última fecha" / "jornada decisiva" → "jornada3" ≥ 70
   - "Estrellas" / "cracks" / "lo mejor del mundo" → "estrellas" ≥ 65

D. ÚLTIMO BAILE: Si "ultimo_baile" ≥ 70, agregá "Luka Modrić" en "jugadores" (es el ícono del último baile junto a Messi y CR7), a menos que ya esté.

E. SIN_CUBRIR: listá SOLO las keys que el texto NO mencionó ni permite inferir. Si el usuario no dijo nada sobre horarios → ponés "tolerancia". Si no habló de partidos parejos → "competitividad". Si no mencionó si le interesan los grupos duros → "grupo_muerte". Etc. No pongas una key si la podés inferir razonablemente. SOLO estas keys válidas: equipo, jugador, estrellas, competitividad, grupo_muerte, jornada3, rivalidad, ultimo_baile, tolerancia.

F. PERFILFAN: "total" si usa palabras como "fanático", "no me pierdo nada", "fan número 1", "vivo el fútbol". "casual" para el resto.

G. TOLERANCIA: "alta" si dice que vería a cualquier hora o no le importa el horario. "baja" si menciona que el horario es importante. "media" por defecto o si es ambiguo. Si no lo menciona → incluí "tolerancia" en sin_cubrir.

Respondés EXCLUSIVAMENTE con JSON válido, sin markdown, sin texto adicional.`

  const userPrompt = `LISTA DE JUGADORES EN EL DATASET (solo podés devolver estos nombres exactos en "jugadores"):
${JUGADORES_POR_SELECCION}

Descripción del hincha:
"""${text}"""

Devolvé este JSON completado (sin markdown, sin texto extra):
{"importancia":{"equipo":0,"jugador":0,"estrellas":0,"competitividad":0,"grupo_muerte":0,"jornada3":0,"rivalidad":0,"ultimo_baile":0},"perfilFan":"casual","tolerancia":"media","equipos":[],"jugadores":[],"sin_cubrir":[]}`

  const client = getClient()
  const res = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 500,
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

  const VALID_KEYS = new Set([...FEATURES_DESC.map(f => f.key), 'tolerancia'])
  const sin_cubrir = Array.isArray(parsed?.sin_cubrir)
    ? parsed.sin_cubrir.filter((x: unknown) => typeof x === 'string' && VALID_KEYS.has(x as string))
    : []

  return { importancia, perfilFan, tolerancia, equipos, jugadores, sin_cubrir }
}

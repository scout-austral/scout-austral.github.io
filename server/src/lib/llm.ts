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

  const teamsInMatch = [params.homeTeam, params.awayTeam]
  const relevantPlayers = params.userProfile.favoritePlayers.filter(p => {
    // Solo mencionar jugadores que EFECTIVAMENTE jueguen en este partido
    // (verificar por selección - los jugadores favoritos del perfil tienen su selección)
    return false // se filtra en el prompt con instrucción explícita
  })

  const prompt = `Sos un analista de fútbol para la Copa del Mundo 2026.
Generá una justificación breve (2-3 oraciones) en español para por qué el partido ${params.homeTeam} vs ${params.awayTeam} (Grupo ${params.group}, ${params.matchDate}) fue clasificado como "${categoryLabel}" para este usuario.

Perfil del usuario:
- Equipos favoritos: ${params.userProfile.favoriteTeams.join(', ') || 'ninguno especificado'}
- Jugadores favoritos del usuario: ${params.userProfile.favoritePlayers.join(', ') || 'ninguno'}
- Disponible en ese horario: ${params.userProfile.availableAt ? 'sí' : 'no'}

Factores de scoring: ${JSON.stringify(params.scoreBreakdown)}

REGLAS IMPORTANTES:
- Solo mencioná jugadores que EFECTIVAMENTE jueguen en ${params.homeTeam} o ${params.awayTeam}. NO menciones jugadores favoritos del usuario si no juegan en este partido específico.
- Si los equipos favoritos del usuario no juegan en este partido, explicá por qué el partido igual es relevante (calidad táctica, competitividad, narrativa histórica, etc.).
- No uses markdown. Sé directo y específico.`

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
  franjas: { dia: number; desde: number; hasta: number }[]
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

const JUGADORES_POR_SELECCION = `Argentina: Lionel Messi, Lautaro Martínez, Julián Álvarez, Ángel Di María, Nahuel Molina, Gonzalo Montiel, Franco Armani, Rodrigo De Paul, Alexis Mac Allister, Paulo Dybala, Enzo Fernández, Lisandro Martínez, Cristian Romero, Nicolás Tagliafico, Giovani Lo Celso
Portugal: Cristiano Ronaldo, Bruno Fernandes, Rafael Leão, Rúben Dias, João Cancelo, Bernardo Silva, Gonçalo Ramos, Diogo Jota, João Félix, Nuno Mendes
Francia: Kylian Mbappé, Aurélien Tchouaméni, Ousmane Dembélé, Mike Maignan, Theo Hernández, Eduardo Camavinga, Marcus Thuram, Randal Kolo Muani, Bradley Barcola
España: Lamine Yamal, Rodri, Pedri, Unai Simón, Dani Carvajal, Alejandro Grimaldo, Gavi, Mikel Merino, Nico Williams, Ferran Torres, Dani Olmo
Brasil: Vinícius Júnior, Rodrygo, Raphinha, Alisson Becker, Éder Militão, Marquinhos, Casemiro, Lucas Paquetá, Endrick, Gabriel Martinelli
Alemania: Jamal Musiala, Florian Wirtz, Kai Havertz, Manuel Neuer, Antonio Rüdiger, Joshua Kimmich, Leroy Sané, Thomas Müller
Inglaterra: Jude Bellingham, Harry Kane, Bukayo Saka, Jordan Pickford, Kyle Walker, John Stones, Declan Rice, Phil Foden, Marcus Rashford, Trent Alexander-Arnold
Países Bajos: Virgil van Dijk, Cody Gakpo, Frenkie de Jong, Bart Verbruggen, Denzel Dumfries, Memphis Depay, Tijjani Reijnders
Bélgica: Kevin De Bruyne, Jeremy Doku, Romelu Lukaku
Croacia: Luka Modrić, Joško Gvardiol, Mateo Kovačić, Dominik Livaković, Andrej Kramarić, Lovro Majer
Uruguay: Federico Valverde, Darwin Núñez, Ronald Araújo, José María Giménez, Mathías Olivera, Rodrigo Bentancur, Facundo Pellistri, Maximiliano Araújo
Colombia: Luis Díaz, James Rodríguez, Jhon Durán, Davinson Sánchez, Jefferson Lerma, Luis Sinisterra, Daniel Muñoz
Noruega: Erling Haaland, Martin Ødegaard, Alexander Sørloth
Marruecos: Achraf Hakimi, Brahim Díaz, Hakim Ziyech
Turquía: Arda Güler, Hakan Çalhanoğlu, Kenan Yıldız
México: Edson Álvarez, Santiago Giménez, Raúl Jiménez
EEUU: Christian Pulisic, Weston McKennie, Gio Reyna
Japón: Takefusa Kubo, Kaoru Mitoma, Wataru Endō
Suiza: Granit Xhaka, Manuel Akanji, Breel Embolo
Senegal: Sadio Mané, Nicolas Jackson, Pape Matar Sarr
Egipto: Mohamed Salah, Omar Marmoush, Mohamed Elneny
Ecuador: Moisés Caicedo, Enner Valencia, Pervis Estupiñán, Piero Hincapié, Jeremy Sarmiento
Paraguay: Miguel Almirón, Antonio Sanabria, Julio Enciso, Gustavo Gómez, Robert Rojas, Ramón Sosa
Suecia: Alexander Isak, Viktor Gyökeres, Dejan Kulusevski
Austria: David Alaba, Marcel Sabitzer, Marko Arnautović
Canadá: Alphonso Davies, Jonathan David, Tajon Buchanan
Corea del Sur: Son Heung-min, Kim Min-jae, Lee Kang-in
Australia: Mathew Ryan, Jackson Irvine, Riley McGree
Irán: Mehdi Taremi, Alireza Jahanbakhsh, Sardar Azmoun
Bosnia: Edin Džeko, Sead Kolašinac, Ermedin Demirović
Argelia: Riyad Mahrez, Amine Gouiri, Ismaël Bennacer
Ghana: Antoine Semenyo, Thomas Partey, Jordan Ayew
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

B. REGIONES → SELECCIONES: Si el usuario menciona una región o confederación, agregá todas las selecciones relevantes en "equipos":
   "sudamericanos" / "CONMEBOL" / "sudamérica" → Argentina, Brasil, Uruguay, Colombia, Ecuador, Paraguay
   "europeos" / "UEFA" / "europa" → España, Francia, Alemania, Inglaterra, Portugal, Croacia, Países Bajos, Bélgica
   "africanos" / "CAF" / "áfrica" → Marruecos, Senegal, Egipto, Ghana, DR Congo, Costa de Marfil, Argelia
   "asiáticos" / "AFC" → Japón, Corea del Sur, Irán, Arabia Saudita, Australia
   "CONCACAF" / "centroamérica" / "norteamérica" → México, EEUU, Canadá, Panamá
   Ejemplo: "sigo equipos sudamericanos" → equipos: [Argentina, Brasil, Uruguay, Colombia, Ecuador, Paraguay]

C. CLUBS → JUGADORES (resolvé siempre clubs a jugadores del Mundial que estén en la lista):
   Real Madrid / Madrid → Vinícius Júnior, Kylian Mbappé, Jude Bellingham, Luka Modrić, Rodrygo, Federico Valverde, Aurélien Tchouaméni
   Barcelona / Barça → Lamine Yamal, Pedri, Raphinha, Ronald Araújo
   Manchester City / City → Kevin De Bruyne, Rodri, Manuel Akanji, Erling Haaland
   Liverpool → Mohamed Salah, Virgil van Dijk, Cody Gakpo, Darwin Núñez, Luis Díaz
   Arsenal → Bukayo Saka, Martin Ødegaard
   Bayern Munich / Bayern → Jamal Musiala, Alphonso Davies, Harry Kane
   PSG → Ousmane Dembélé, Achraf Hakimi
   Inter Milan / Inter → Lautaro Martínez, Mehdi Taremi
   Atletico Madrid / Atleti → Julián Álvarez, Nahuel Molina
   Inter Miami → Rodrigo De Paul, Lionel Messi
   Chelsea → Nicolas Jackson, Moisés Caicedo
   Al-Nassr → Cristiano Ronaldo
   River Plate / River → Gonzalo Montiel, Julián Álvarez (si en lista), Franco Armani
   Boca Juniors / Boca → usá tu conocimiento del plantel actual
   Juventus / Juve → usá tu conocimiento del plantel actual
   Si el club no está arriba, usá tu conocimiento general del fútbol para mapear sus jugadores a la lista del Mundial.
   IMPORTANTE: solo incluí jugadores que aparezcan EXACTAMENTE en la lista dada en el userPrompt.

D_EXTRA. CUALQUIER INPUT: el usuario puede describirse de muchas formas. Interpretá el CONTEXTO y la INTENCIÓN:
   - "paladar negro" → valora fútbol táctico/competitivo → competitividad ≥ 75, rivalidad ≥ 65
   - "vivo el fútbol" / "fanático de fanáticos" → perfilFan: "total"
   - "veo todo" / "no me pierdo nada" → tolerancia: "alta", perfilFan: "total"
   - "los clásicos" / "los derbis" → rivalidad ≥ 75
   - "grupos difíciles" / "grupos de fuego" → grupo_muerte ≥ 75
   - "la última fecha" / "el partido que define" → jornada3 ≥ 75
   - "las estrellas" / "los mejores del mundo" → estrellas ≥ 70
   - "hincha de X" / "soy de X" → equipo ≥ 80, ese equipo en "equipos"
   Nunca devuelvas 0 en todas las importancias. Si podés inferir algo, hazlo.

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

H. FRANJAS DE DISPONIBILIDAD — MUY IMPORTANTE:
   Si el usuario menciona CUÁNDO puede ver partidos, inferí las franjas disponibles.
   Formato: array de {dia, desde, hasta} donde:
     - dia: 0=domingo, 1=lunes, 2=martes, 3=miércoles, 4=jueves, 5=viernes, 6=sábado
     - Slots disponibles: mañana={desde:8,hasta:12}, tarde={desde:12,hasta:18}, noche={desde:18,hasta:24}

   Reglas de inferencia:
   - "a la mañana no puedo" → incluir tarde+noche para TODOS los días (0-6)
   - "solo tarde y noche" → incluir tarde+noche para todos los días
   - "solo lunes por la mañana" → solo {dia:1,desde:8,hasta:12}
   - "días de semana a la tarde" → dias 1-5, slot tarde (12-18)
   - "sábado y domingo mañana tarde y noche" → dia 0 y 6, los 3 slots
   - "días de semana solo tarde, fin de semana todo" → dias 1-5 tarde; dias 0,6 los 3 slots
   - "no puedo a la mañana" + sin restricción de días → tarde+noche, todos los días (0-6)
   - Si no menciona horarios → franjas: [] (sin restricción = puede a cualquier hora)
   - Si solo dice "no puedo a la mañana" sin aclarar días → asumí todos los días

   Ejemplos completos:
   "a la mañana no puedo ver ningún partido" →
     [{dia:0,desde:12,hasta:18},{dia:0,desde:18,hasta:24},{dia:1,desde:12,hasta:18},{dia:1,desde:18,hasta:24},...para dias 2-6 igual]
   "solo lunes por la mañana puedo ver" →
     [{dia:1,desde:8,hasta:12}]
   "días de semana solo a la tarde" →
     [{dia:1,desde:12,hasta:18},{dia:2,desde:12,hasta:18},{dia:3,desde:12,hasta:18},{dia:4,desde:12,hasta:18},{dia:5,desde:12,hasta:18}]

Respondés EXCLUSIVAMENTE con JSON válido, sin markdown, sin texto adicional.`

  const userPrompt = `LISTA DE JUGADORES EN EL DATASET (solo podés devolver estos nombres exactos en "jugadores"):
${JUGADORES_POR_SELECCION}

Descripción del hincha:
"""${text}"""

Devolvé este JSON completado (sin markdown, sin texto extra):
{"importancia":{"equipo":0,"jugador":0,"estrellas":0,"competitividad":0,"grupo_muerte":0,"jornada3":0,"rivalidad":0,"ultimo_baile":0},"perfilFan":"casual","tolerancia":"media","equipos":[],"jugadores":[],"sin_cubrir":[],"franjas":[]}`

  const client = getClient()
  const res = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 900,
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

  const VALID_DIAS = new Set([0,1,2,3,4,5,6])
  const VALID_DESDE = new Set([8,12,18])
  const VALID_HASTA = new Set([12,18,24])
  const franjas = Array.isArray(parsed?.franjas)
    ? parsed.franjas.filter((f: unknown) =>
        f && typeof f === 'object' &&
        VALID_DIAS.has((f as any).dia) &&
        VALID_DESDE.has((f as any).desde) &&
        VALID_HASTA.has((f as any).hasta)
      ).slice(0, 42) // max 7 días × 3 slots
    : []

  return { importancia, perfilFan, tolerancia, equipos, jugadores, sin_cubrir, franjas }
}

# Scout - Tu tiempo, tu Mundial ⚽🤖

https://github.com/user-attachments/assets/93456614-497d-4fef-ac66-536a69e0821e

Scout analiza el **perfil de un usuario** (equipos y jugadores favoritos,
disponibilidad horaria, gustos) y clasifica los **72 partidos de la fase de grupos del Mundial
2026** en tres categorías, **justificando** cada decisión:

- **Imperdible** — indispensables por relevancia y afinidad.
- **Vale la pena** — interesantes pero no cruciales, o en horarios complejos.
- **Para ver el resumen** — de bajo interés para el perfil, o en horarios imposibles.

> **Demo en vivo:** https://scout-austral.github.io/

> **Informe metodológico:** [`docs/informe-metodologico.md`](docs/informe-metodologico.md)

---

## Arquitectura

```
scout/
├── frontend/            App React + Vite (el motor de recomendación vive acá, client-side)
│   ├── src/lib/recommender/   Motor: features, pesos bayesianos, scoring, clasificación, aprendizaje
│   ├── src/data/              Dataset estático (fixture, equipos, jugadores) + datos curados
│   ├── src/components/        UI (onboarding, resultados, tarjetas de partido, perfil)
│   └── src/hooks/             Estado de perfil y feedback (persistencia local + API)
├── server/              API Express opcional (perfil en DB, Google Calendar, justificación con GPT)
└── docs/                Informe metodológico
```

El **frontend es autosuficiente**: con solo `frontend/` corriendo, el sistema clasifica y justifica
los 72 partidos. El **server es opcional** y agrega: login con Google, persistencia del perfil en
base de datos, agendar partidos en Google Calendar y redacción enriquecida de la justificación con
IA. Si el server no está disponible, la app degrada con elegancia a la justificación local.

---

## El modelo en una pantalla

Cada partido `m` se describe con **8 features** normalizadas a `[0,1]`. La afinidad es una suma
ponderada **bayesiana**: cada peso es `w_k ~ Normal(μ_k, σ_k²)`, así que el score lleva su propia
incertidumbre:

```
afinidad      μ(m) = Σ_k μ_k · f_k(m)
incertidumbre σ(m) = √( Σ_k f_k(m)² · σ_k² )
```

La **incertidumbre** se usa en la clasificación (un score alto pero poco confiable no llega a
Imperdible; un score medio cuyo límite optimista `μ+σ` cruza el corte se promueve a "Vale la pena",
estilo *upper confidence bound*). Cada 👍/👎 actualiza el posterior de los pesos con un **filtro de
Kalman diagonal**, con asignación de crédito para no castigar lo que el usuario afirmó.

Detalle matemático completo en el [informe metodológico](docs/informe-metodologico.md).

---

## Features y su justificación

Las features son el corazón de la **creatividad analítica**: buscan capturar el interés de un
partido **más allá del ranking FIFA**.

| Feature | Qué mide | Por qué (justificación) |
|---|---|---|
| `equipo` | Juega una selección favorita (ponderada por prioridad 1°, 2°, …) | El predictor más fuerte de que alguien quiere ver un partido es que juegue *su* equipo. |
| `jugador` | Juega un jugador favorito del usuario | Mucha gente sigue figuras puntuales por encima de selecciones; eleva sus partidos aunque su país no sea favorito. |
| `estrellas` | Concentración de talento (fuerza FIFA promedio de ambos) | Proxy de "partidazo": dos potencias atraen al hincha neutral. |
| `competitividad` | Paridad por cercanía de ranking | **Factor no obvio:** un duelo parejo emociona más que una goleada anunciada, independientemente del nivel absoluto. |
| `grupo_muerte` | El grupo es fuerte **y** parejo a la vez | **Factor no obvio:** mide el drama estructural del grupo (varios candidatos, todo abierto), que ningún ranking individual refleja. |
| `jornada3` | Cercanía a la fecha decisiva del grupo | La última fecha define clasificados: sube la tensión y lo que está en juego. |
| `rivalidad` | Morbo del cruce: rivalidad histórica curada **o** derbi de confederación | **Factor no obvio:** revanchas y clásicos (p. ej. *Francia–Senegal*, revancha del shock de 2002) tienen un atractivo emocional que el ranking ignora por completo. |
| `ultimo_baile` | Una leyenda disputa (probablemente) su **último** Mundial | **Factor no obvio:** ver a Messi, Cristiano o Modrić despedirse atrae incluso al espectador casual; es interés histórico-emocional, no deportivo. |

`competitividad`, `grupo_muerte`, `rivalidad` y `ultimo_baile` son precisamente los **factores no
evidentes** que premia la consigna: cuantifican *paridad*, *drama de grupo*, *morbo* y *narrativa
histórica* por encima de la métrica tradicional de nivel.

### Datos curados de los factores narrativos

- **Rivalidades** (`frontend/src/data/rivalidades.ts`): lista verificada contra el fixture real
  (Francia–Senegal, Inglaterra–Croacia como reedición de la semi 2018, España–Uruguay, …), más un
  piso de "derbi de confederación" cuando ambas selecciones comparten confederación (orgullo
  regional / se conocen de las eliminatorias).
- **Último baile** (`frontend/src/data/ultimoBaile.ts`): figuras que con alta probabilidad juegan su
  último Mundial, con intensidad según lo icónico de la despedida (Messi y Cristiano = 1.0).

---

## Cómo se elicita el perfil

Hay **dos formas** de armar el perfil, y ambas terminan en lo mismo: fijar los **priors** del modelo.

**a) Elicitación asistida por LLM (opcional).** En la bienvenida, el usuario describe en una frase qué
tipo de hincha es ("soy de Argentina, no me pierdo a Messi, me copan los clásicos…") y un LLM (GPT)
traduce ese texto a los priors: importancia 0–100 por factor, perfil de fan,
tolerancia y equipos/jugadores mencionados (que el cliente matchea contra el dataset). **El LLM no
recomienda nada** —eso lo hace el modelo bayesiano explicable—, solo *elicita el prior* desde lenguaje
natural. Si el server/LLM no está disponible, esta opción simplemente no aparece y se usa el cuestionario.

**b) Cuestionario** de **8 preguntas de un toque**. Cada respuesta elicita los priors (las medias
`μ_k`) y, al calibrar, **reduce la incertidumbre** `σ_k` a la mitad (el usuario nos dio información ⇒
más confianza):

1. **Equipos favoritos** (con prioridad) → `equipo`
2. **Jugadores favoritos** → `jugador`
3. **Tipo de hincha** (total / selectivo) → `perfilFan` (corre los umbrales) + refuerzo de `equipo`
4. **Figuras vs. paridad** → reparte `estrellas` ↔ `competitividad`
5. **Ansiedad por la fecha decisiva** → `jornada3`
6. **Grupos de la muerte** → `grupo_muerte`
7. **Apetito por la historia/morbo** → `rivalidad` + `ultimo_baile`
8. **Tolerancia a horarios molestos** → `tolerancia` (afecta el encaje horario)

Todo es ajustable después desde **Perfil** (sliders por factor, disponibilidad horaria, zona
horaria, tolerancia, perfil de fan).

---

## Disponibilidad horaria

Se convierte `kickoff_utc` a la zona horaria del usuario (con `Intl`, sin dependencias) y se cruza
con sus franjas declaradas: dentro de una franja → **bueno**; cerca (según tolerancia) →
**complejo**; lejos → **imposible** (cae a Resumen). Sin franjas, se asume disponibilidad total.

---

## Aprendizaje y validación (rigor metodológico)

- **Aprende de tu feedback:** cada 👍/👎 reajusta los pesos (Kalman diagonal). El chip *"¿qué no te
  gustó?"* permite atribuir el disgusto (horario / nivel / no me interesaba) y dirige el update solo
  a los factores correctos. La UI muestra **qué aprendió** el modelo con barras de magnitud por factor.
- **Métrica de precisión visible:** el panel reporta *"el modelo acertó X de N partidos que
  calificaste (Y %)"*. Se mide con los **priors cold-start** (los del onboarding, **antes** de
  aprender) contra el feedback real, evitando fuga de información; los 👎 por horario se excluyen
  (son disponibilidad, no un error de afinidad). Es la **métrica de éxito** del modelo.
- **Suite de tests** (`vitest`, 35 casos): fija features, conversión de zona horaria, umbrales de
  clasificación, rol de la incertidumbre, asignación de crédito del aprendizaje, los factores
  narrativos nuevos y el cálculo de precisión.

---

## Funcionalidades extra de la demo

- **Justificación con IA (opcional):** redacción natural de por qué un partido cae en su categoría,
  vía IA en el server; con fallback a la justificación local si no hay servidor.
- **Agendar en Google Calendar:** un click crea el evento del partido (con recordatorios). Se
  **persiste por usuario en la base de datos**, así un partido no se puede agendar dos veces y el
  estado sobrevive a recargas y cambios de sesión.
- **Login con Google + perfil en DB:** el perfil y el feedback se sincronizan con la cuenta.

---

## Cómo ejecutar

### Frontend (suficiente para la demo)

Requisitos: Node.js 20.19+ o 22.12+ y npm.

```bash
cd frontend
npm install
npm run dev        # servidor de desarrollo (Vite)
```

Otros comandos:

```bash
npm run build      # typecheck (tsc -b) + build de producción a dist/
npm run preview    # sirve el build de producción localmente
npm run test       # corre la suite de tests (vitest)
npm run lint       # ESLint
```

### Server (opcional: Calendar, perfil en DB, justificación IA)

```bash
cd server
npm install
# Configurar .env: DATABASE_URL, GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI, OPENAI_API_KEY, JWT_SECRET
npx prisma migrate deploy
npm run dev
```

El frontend apunta al server con `VITE_API_URL` (si no se define, usa `http://localhost:3000`).

> **Nota Google Calendar:** la API de Google Calendar debe estar habilitada en el proyecto de
> Google Cloud y el usuario debe figurar como *test user* mientras la pantalla de consentimiento
> esté en modo *Testing*.

---

## Dataset

Versionado en el repo y generado por `frontend/scripts/build_data.py` a `frontend/src/data/`:

- **Fixture, equipos y sedes:** *openfootball/world-cup* (72 partidos, 48 selecciones, 16 estadios),
  cada partido con `kickoff_utc` ISO, sede, ciudad y zona horaria.
- **Ranking FIFA y figuras** (hasta 3 por selección): verificados por búsqueda web (mayo 2026).
- **Datos curados** de rivalidades y "último baile" (ver sección de features).

El generador valida: 72 partidos (6 por grupo, 24 por jornada), round-robin correcto, integridad
referencial y la regla FIFA de fecha 3 simultánea en los 12 grupos.

---

## Stack

React · TypeScript · Vite · Tailwind CSS · Vitest — (server: Express · Prisma · Google APIs · GPT)

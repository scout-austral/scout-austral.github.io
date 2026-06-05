# Scout: Informe Metodológico

**Competencia "Tu tiempo, tu Mundial"** - Facultad de Ingeniería, Universidad Austral (Junio 2026)

**Integrantes:** Juan Decoud, Julián Ritondale, Mateo Ritondale, Fernando Santisi

**Demo:** https://scout-austral.github.io 
**Repositorio:** https://github.com/scout-austral/scout-austral.github.io

---

## 1. Resumen ejecutivo

Scout es un sistema de recomendación de partidos del Mundial 2026 que clasifica los 72 encuentros de la fase de grupos en tres categorías: **Imperdible**, **Vale la pena** y **Para ver el resumen**, a partir del perfil de cada usuario.

El problema central es que los partidos aún no se jugaron: no existe verdad de campo que permita entrenar un modelo supervisado clásico. Esta restricción motivó una arquitectura de **elicitación bayesiana de preferencias**: en lugar de aprender de datos históricos etiquetados, el sistema estima la función de utilidad del usuario mediante preguntas informativas, representa esa incertidumbre como distribuciones sobre los pesos, y la propaga al score final para guiar la clasificación y el aprendizaje online.

El sistema se apoya en **8 features por partido**, cuatro de las cuales no son derivables del ranking FIFA (*competitividad*, *grupo de la muerte*, *rivalidad histórica*, *último baile de una leyenda*). La elicitación admite dos modalidades intercambiables: un cuestionario de 8 preguntas, o una descripción en lenguaje natural procesada por un LLM que la traduce automáticamente a los priors del modelo. La demo es pública, funciona sin login y muestra la justificación de cada recomendación junto con la precisión del modelo contra el feedback real del usuario.

---

## 2. Problema y datos

**Objetivo:** dado el perfil de un usuario (afinidad declarada y disponibilidad horaria), recomendar qué partidos de la fase de grupos del Mundial 2026 vale la pena ver y justificar cada decisión.

La restricción central es la **ausencia de datos etiquetados**: ningún usuario ha marcado previamente qué partidos le resultaron imperdibles, y los partidos aún no ocurrieron. Esto descarta el aprendizaje supervisado clásico y motiva una heurística explicable con pesos bayesianos y aprendizaje online por feedback.

**Dataset** (estático, versionado en `frontend/src/data/`, generado por `build_data.py`):

- **Fixture y sedes:** 72 partidos de grupos, 48 selecciones, 16 estadios. Cada partido incluye `kickoff_utc` en formato ISO.
- **Ranking FIFA y figuras:** hasta 15 jugadores por selección (218 en total), verificados en mayo–junio 2026.
- **Rivalidades curadas** (`rivalidades.ts`): storylines verificados contra el fixture real (Francia–Senegal revancha de 2002, Inglaterra–Croacia reedición de la semifinal de 2018, entre otros) más un piso automático para derbis de confederación.
- **Último baile** (`ultimoBaile.ts`): figuras en probable último Mundial con intensidad por iconicidad (Messi y Cristiano Ronaldo = 1.0).

El generador valida automáticamente: 72 partidos, round-robin correcto, integridad referencial y la regla FIFA de fecha 3 simultánea en los 12 grupos.

---

## 3. Arquitectura del sistema

```
ELICITACIÓN DEL PERFIL
  Texto libre --> LLM (gpt-4o) ───┐
                                  |--> Priors (μ_k, σ_k)
  Cuestionario 8 preguntas ───────┘
            │
            |
CÁLCULO DE FEATURES
  f(m) = [equipo, jugador, estrellas, competitividad,
           grupo_muerte, jornada3, rivalidad, ultimo_baile]
  Cada feature normalizada a [0, 1]
            │
            |
MODELO DE AFINIDAD BAYESIANO
  μ(m) = Σ_k  μ_k · f_k(m)
  σ(m) = √( Σ_k  f_k(m)² · σ_k² )
            │
            |
DISPONIBILIDAD HORARIA
  kickoff_utc → zona horaria usuario → franja declarada
  Resultado: bueno / complejo / imposible
            │
            |
CLASIFICACIÓN
  (μ, σ, encaje_horario, esFavorito)
  → Imperdible / Vale la pena / Para ver el resumen
            │
            |
FEEDBACK Y APRENDIZAJE ONLINE
  👍/👎 del usuario -> Filtro de Kalman diagonal
  Actualiza (μ_k, σ_k²) -> recalcula clasificación
```

**Arquitectura técnica:** la aplicación es completamente client-side (React + TypeScript + Vite), desplegable en GitHub Pages sin backend. Un servidor opcional (Express + OpenAI) enriquece las justificaciones con lenguaje natural; si no está disponible, se usa la justificación local (degradación elegante).

---

## 4. Por qué elicitación bayesiana de preferencias

Las alternativas clásicas tienen limitaciones serias en este contexto:

- **Filtrado colaborativo:** requiere historial de muchos usuarios sobre los mismos ítems. No hay historial del Mundial 2026 y los Mundiales anteriores son eventos demasiado espaciados para transferir preferencias.
- **Reglas fijas:** asignar pesos iguales ignora que para un hincha de Argentina el factor `equipo` vale 10 veces más que `rivalidad`, mientras que para un espectador neutral puede ser al revés.
- **Encuesta exhaustiva:** preguntar por cada combinación de factores es costoso y frustrante.

La **elicitación bayesiana** modela los pesos como variables aleatorias con distribuciones de probabilidad, hace preguntas informativas (las que más reducen la incertidumbre sobre la función de utilidad) y actualiza las distribuciones con cada respuesta.

La incertidumbre se usa activamente en la clasificación:
- **Demote:** un score alto pero con σ grande no alcanza "Imperdible" (no hay suficiente confianza).
- **Promote (UCB):** un score medio cuyo intervalo optimista μ+σ supera el umbral se promueve a "Vale la pena".

Este enfoque funciona con cero datos históricos, requiere pocas preguntas, es explicable y mejora con el uso sin requerir reentrenamiento.

---

## 5. Features del partido

Ocho factores, cada uno normalizado a [0, 1]. La fuerza de un equipo se convierte desde su ranking con `fuerza(r) = clamp(1 − (r−1)/50, 0, 1)`.

| Feature | Fórmula / Valores | Justificación |
|---|---|---|
| `equipo` | `1 − 0.15·(prioridad−1)` si juega favorito; 0 si no | Factor más determinante: la razón principal para elegir un partido es que juegue el equipo propio. |
| `jugador` | `0.7 + 0.3·(n−1)` con n = favoritos presentes; 0 si ninguno | Muchos hinchas siguen figuras puntuales por encima de selecciones. |
| `estrellas` | `(fuerza(local) + fuerza(visitante)) / 2` | Calibre promedio de los dos equipos; captura el interés del hincha neutral. |
| `competitividad` | `clamp(1 − dist/30, 0, 1)` con dist = diferencia de ranking | Partidos parejos generan incertidumbre de resultado: el drama que hace emocionante un partido. |
| `grupo_muerte` | `fuerzaProm · (0.4 + 0.6·paridad)` | Drama estructural del grupo: no solo equipos fuertes, sino parejos entre sí. |
| `jornada3` | j3 = 1.0 · j2 = 0.25 · j1 = 0 | La tercera fecha se juega simultáneamente; cada resultado puede cambiar el cuadro completo. |
| `rivalidad` | Intensidad del storyline curado o piso por derbi | Historia entre selecciones que el ranking ignora (ej. Francia–Senegal revancha de 2002). |
| `ultimo_baile` | Intensidad por iconicidad (Messi, CR7 = 1.0); 0 si no aplica | Ver a una figura histórica por última vez trasciende el resultado deportivo. |

Los cuatro últimos (**competitividad**, **grupo_muerte**, **rivalidad**, **ultimo_baile**) son los que van más allá del ranking FIFA y diferencian este sistema de un simple ordenamiento por nivel.

---

## 6. Modelo de afinidad bayesiano

### 6.1 Formulación

Cada peso es una variable aleatoria `w_k ~ Normal(μ_k, σ_k²)`. El score y su incertidumbre se propagan analíticamente:

```
μ(m)   = Σ_k  μ_k · f_k(m)
σ(m)   = √( Σ_k  f_k(m)² · σ_k² )
```

### 6.2 Priors por defecto

| Factor | μ | σ | Justificación |
|---|---|---|---|
| `equipo` | 0.30 | 0.04 | Factor dominante universal; σ baja porque es la preferencia más robusta. |
| `jugador` | 0.16 | 0.05 | Segundo más fuerte; σ ligeramente mayor porque no todos siguen figuras. |
| `estrellas` | 0.14 | 0.09 | Importa al espectador neutral; σ alta por heterogeneidad entre perfiles. |
| `competitividad` | 0.14 | 0.11 | Alta incertidumbre: algunos prefieren partidos parejos, otros prefieren ver ganar cómodamente. |
| `grupo_muerte` | 0.07 | 0.10 | Factor táctico/experto; el más polarizante entre perfiles. |
| `jornada3` | 0.07 | 0.08 | Contexto de urgencia real pero no domina sobre afinidad por equipos. |
| `rivalidad` | 0.06 | 0.10 | Magnético para quien conoce la historia; irrelevante para el hincha casual. |
| `ultimo_baile` | 0.06 | 0.09 | Similar a rivalidad: atractivo narrativo con alta variabilidad entre perfiles. |

Las medias suman exactamente 1, por lo que `μ(m) ∈ [0, 1]` cuando todas las features están al máximo: la afinidad es una proporción directamente interpretable.

### 6.3 Elicitación del prior

**a) Cuestionario de 8 preguntas.** Cada pregunta mapea la respuesta a uno o más factores (equipos favoritos → `equipo`; tipo de hincha → `perfilFan`; apetito por la historia → `rivalidad` + `ultimo_baile`; etc.). Responder **reduce σ a la mitad** en los factores sobre los que el usuario se pronunció.

**b) Asistida por LLM (opcional).** El usuario describe en lenguaje natural qué tipo de hincha es. gpt-4o traduce esa descripción a importancia 0–100 por factor, perfil fan, tolerancia y disponibilidad. Resuelve apodos ("la pulga" → Messi), clubes a jugadores del Mundial (Real Madrid → Vinícius + Mbappé + Bellingham) y regiones a selecciones ("sudamericanos" → ARG, BRA, URU, COL, ECU, PAR). El LLM **no recomienda ni clasifica**: únicamente convierte texto a priors.

---

## 7. Disponibilidad horaria y clasificación

**Disponibilidad:** se convierte `kickoff_utc` a la zona horaria del usuario con `Intl.DateTimeFormat` y se mide el solapamiento con las franjas declaradas:

- Dentro de franja → **bueno**
- Fuera, a ≤ margen de tolerancia → **complejo** (baja = 0 h, media = 1.5 h, alta = 3 h)
- Más lejos → **imposible**

Un partido imposible cae a Resumen independientemente de su afinidad: no importa cuánto le guste al usuario si no puede verlo.

**Clasificación.** Los umbrales varían según el perfil declarado (`casual`: alto = 0.6, medio = 0.35; `total`: alto = 0.5, medio = 0.3), con un umbral de incertidumbre `τ_σ = 0.16`. La lógica opera en cascada con cuatro reglas ordenadas por prioridad:

1. **Filtro duro de horario:** si el partido cae en horario imposible, va directamente a Resumen sin importar la afinidad.
2. **Override por favorito:** si juega el equipo o jugador favorito del usuario (señal fuerte), el partido es Imperdible cuando el horario acompaña, o Vale la pena si el horario es incómodo. Esta regla domina sobre el score lineal para evitar que, por ejemplo, Argentina contra un rival de bajo ranking quede degradado.
3. **Score con control de incertidumbre:** si μ supera el umbral alto, el partido es Imperdible siempre que el encaje horario sea bueno y σ sea pequeño (hay confianza suficiente); de lo contrario es Vale la pena.
4. **Criterio UCB:** si μ supera el umbral medio, o si el límite optimista μ+σ lo supera, el partido es Vale la pena. Esto promueve partidos sobre los que todavía hay incertidumbre pero cuyo potencial de interés es real.

---

## 8. Aprendizaje online y validación

### 8.1 Aprendizaje por feedback

Cada 👍/👎 actualiza el posterior de los pesos con un filtro de Kalman diagonal (`R = 0.25`):

```
ŷ = Σ μ_k f_k
e = y − ŷ
S = Σ a_k² σ_k² + R
g_k = σ_k² · a_k / S
μ_k ← μ_k + g_k · e
σ_k² ← σ_k² · (1 − g_k · a_k)
```

La **saliencia por sorpresa** `a_k = max(0, f_k − f̄_k)` asigna crédito solo a lo que destaca en ese partido respecto al promedio del usuario: lo que siempre está presente aporta poca información nueva. La σ angosta en factores afirmados genera ganancia pequeña, por lo que esos pesos casi no se mueven. Un chip "¿qué no te gustó?" permite atribución directa al factor responsable.

### 8.2 Validación

Sin verdad de campo previa, la validación combina tres enfoques:

**Precisión sobre feedback real (visible en la UI).** Para cada partido calificado con 👍/👎, se mide si el modelo cold-start (priors del onboarding, antes de aprender) lo había predicho correctamente. Se reporta como *"acertó X de N (Y%)"*. Los 👎 por horario se excluyen. Implementado en `accuracy.ts`.

**Suite de tests (vitest, 36 casos).** Fija el comportamiento esperado en: cálculo de features, conversión de zona horaria, umbrales de clasificación, rol de la incertidumbre, asignación de crédito del aprendizaje y cálculo de precisión.

**Escenarios de validez aparente.** Un hincha argentino obtiene los partidos de Argentina como Imperdibles; un partido imposible cae a Resumen; una jornada 3 de grupo de la muerte se promueve frente a una jornada 1 entre equipos de nivel similar; un hincha que califica negativamente varios partidos con alta `estrellas` ve ese peso reducirse.

---

## 9. Limitaciones y extensiones

**Limitaciones conocidas.** El dataset de ranking y planteles corresponde a la mejor información disponible a junio 2026 (218 jugadores verificados); variaciones de último momento (lesiones, convocatorias) no se reflejan automáticamente. La disponibilidad se evalúa por día/franja y no modela partidos que crucen medianoche entre días. Las rivalidades curadas dependen de que el cruce exista en el fixture de grupos.

**Extensiones posibles.** Incorporar clubes seguidos como variable adicional; actualizaciones dinámicas de resultados una vez comenzado el torneo; extensión del modelo a fases eliminatorias; y un estudio con usuarios reales para calibrar umbrales y pesos a priori. La infraestructura de auth, persistencia de perfil y agenda en Google Calendar ya está construida como base para estas extensiones.

---

*Repositorio público con código fuente, dataset e instrucciones de ejecución en: https://github.com/scout-austral/scout-austral.github.io*
# Scout — Informe metodológico

Competencia **"Tu tiempo, tu Mundial"** · Facultad de Ingeniería, Universidad Austral.

> Borrador técnico que sirve de insumo para el informe PDF (máx. 8 páginas). Todos los valores,
> fórmulas y umbrales coinciden con el código en `frontend/src/lib/recommender/`.

## 1. Problema y objetivo

Dado el **perfil de un usuario** (afinidad + disponibilidad), recomendar qué partidos de la
**fase de grupos del Mundial 2026** (72 encuentros) ver, clasificándolos en tres categorías y
**justificando** cada decisión:

- **Imperdible:** indispensables por relevancia y afinidad.
- **Vale la pena:** interesantes pero no cruciales, o en horarios complejos.
- **Para ver el resumen:** de bajo interés para el perfil, o en horarios imposibles.

Restricción central: **no hay datos etiquetados** (los partidos no se jugaron y nadie marcó qué es
"imperdible"). Esto descarta un modelo supervisado y motiva una **heurística explicable** con una capa
**bayesiana** para los pesos y el aprendizaje.

## 2. Datos y fuentes

Dataset estático, versionado en el repo (`frontend/scripts/sources/` → generado a
`frontend/src/data/` por `frontend/scripts/build_data.py`):

- **Fixture, equipos y sedes:** dataset *openfootball/world-cup* (72 partidos de grupos, 48 selecciones,
  16 estadios). Cada partido trae `kickoff_utc` (instante UTC ISO), sede, ciudad y zona horaria.
- **Ranking FIFA y figuras** (hasta 3 por selección): verificados por búsqueda web (mayo 2026) y unidos
  por código FIFA.

Validaciones automáticas del generador: 72 partidos (6 por grupo, 24 por jornada), round-robin correcto,
integridad referencial, y la regla FIFA de **fecha 3 simultánea** en los 12 grupos.

## 3. Arquitectura

App **estática client-side** (React + Vite) desplegable en GitHub Pages: todo el motor corre en el
navegador sobre los JSON locales, sin backend obligatorio. Un servidor opcional (Express + Gemini)
enriquece la redacción de la justificación; si no está, se usa la justificación local (degradación elegante).

## 4. Variables del perfil (inputs)

| Variable | Descripción |
|---|---|
| Equipos favoritos | Con **prioridad** (1°, 2°, …) |
| Jugadores favoritos | Figuras seguidas (suben sus partidos aunque su selección no sea favorita) |
| Disponibilidad | Franjas por día (mañana/tarde/noche) |
| Zona horaria | IANA; default = la del navegador |
| Tolerancia | Cuánto estira lo "mirable" fuera de las franjas |
| Perfil fan | `casual` / `total`: corre los umbrales de clasificación |
| Calibración (opcional) | Importancia 0–100 por factor → fija medias de los priors y aumenta la confianza |

## 5. Features del partido

Seis factores normalizados a [0, 1]. Con `fuerza(r) = clamp(1 − (r−1)/50, 0, 1)` sobre el ranking FIFA `r`:

| Feature | Fórmula |
|---|---|
| `equipo` | `1 − 0.15·(prioridad−1)` si juega un favorito; 0 si no |
| `jugador` | `0.7 + 0.3·(n−1)` con `n` = favoritos presentes (0 si ninguno) |
| `estrellas` | `(fuerza(local) + fuerza(visitante)) / 2` |
| `competitividad` | `clamp(1 − |rank_local − rank_visitante| / 30, 0, 1)` |
| `grupo_muerte` | `fuerzaProm · (0.4 + 0.6·paridad)`, `paridad = 1 − (max − min)` de fuerzas del grupo |
| `jornada3` | jornada 3 → 1; jornada 2 → 0.25; jornada 1 → 0 |

`competitividad` y `grupo_muerte` son los factores **no obvios más allá del ranking FIFA** que premia la
competencia: capturan la *paridad* (partido emocionante) por encima del nivel absoluto.

## 6. Modelo de afinidad (bayesiano)

Cada peso es una variable aleatoria `w_k ~ Normal(μ_k, σ_k²)`. La afinidad y su incertidumbre se propagan:

```
afinidad  μ(m) = Σ_k μ_k · f_k(m)
varianza  Var(m) = Σ_k f_k(m)² · σ_k²
incertidumbre(m) = √Var(m)
```

**Priors por defecto** (medias suman 1 → afinidad ∈ [0,1]):

| Factor | μ | σ |
|---|---|---|
| equipo | 0.34 | 0.04 |
| jugador | 0.18 | 0.05 |
| estrellas | 0.16 | 0.09 |
| competitividad | 0.16 | 0.11 |
| grupo_muerte | 0.08 | 0.10 |
| jornada3 | 0.08 | 0.08 |

σ refleja la **confianza a priori**: alta en lo que el usuario afirma (equipo/jugador), menor en factores
inferidos (competitividad). **Calibrar** el perfil redefine las medias (normalizadas) y reduce σ a la mitad.

## 7. Disponibilidad

Se convierte `kickoff_utc` a la zona horaria del usuario (`Intl.DateTimeFormat`, sin dependencias) y se mide
el solapamiento con sus franjas:

- Dentro de una franja → **bueno**.
- Fuera, pero a ≤ *margen de tolerancia* → **complejo**.
- Más lejos → **imposible**.

Margen por tolerancia: `baja = 0 h`, `media = 1.5 h`, `alta = 3 h`. Sin franjas declaradas, se asume
disponibilidad (no penaliza).

## 8. Clasificación

Combina `(μ, σ, encaje)`. Umbrales por perfil fan: `casual {alto 0.6, medio 0.35}`,
`total {alto 0.5, medio 0.3}`. Sea `τ_σ = 0.11` el corte de "score poco confiable":

```
si encaje == imposible            → Resumen
si μ ≥ alto:
    si encaje == bueno y σ ≤ τ_σ  → Imperdible
    si no                         → Vale la pena
si μ ≥ medio  o  (μ + σ) ≥ medio  → Vale la pena
si no                             → Resumen
```

La **incertidumbre alimenta "Vale la pena"** en dos sentidos: *demote* (afinidad alta pero σ grande no llega
a Imperdible) y *promote* (afinidad bajo el corte cuyo límite optimista `μ+σ` lo alcanza → "apuesta que
podría valer", criterio tipo *upper confidence bound*).

## 9. Aprendizaje por feedback

Cada 👍/👎 sobre un partido visto actualiza el **posterior** de los pesos con un update bayesiano conjugado
(filtro de Kalman diagonal), con `y = 1/0`, ruido de observación `R = 0.25`:

```
ŷ = Σ μ_k f_k ;  e = y − ŷ ;  S = Σ a_k² σ_k² + R
g_k = σ_k² a_k / S ;  μ_k ← μ_k + g_k·e ;  σ_k² ← σ_k²·(1 − g_k a_k)
```

**Asignación de crédito** (para no castigar lo afirmado ante un 👎 a, p. ej., un partido aburrido del
equipo favorito):

1. **σ angosto** en lo afirmado → ganancia chica → casi no se mueve.
2. **Saliencia por sorpresa:** `a_k = max(0, f_k − f̄_k)`, desviación respecto del promedio de la "dieta"
   del usuario (sus K=12 partidos de mayor afinidad). Lo que está *siempre presente* aporta poca información.
3. **Chip "¿qué no te gustó?":** atribución directa — `horario` no toca pesos (es disponibilidad);
   `nivel` ajusta estrellas/competitividad/grupo/jornada; `no me interesaba` ajusta equipo/jugador.

El posterior se obtiene plegando todo el feedback sobre el prior base (replay), de modo que respeta también
la calibración. La UI muestra **qué aprendió** el modelo (qué factores subieron/bajaron).

## 10. Justificación

- **Local (siempre):** se arma a partir de los factores con mayor contribución y el encaje horario.
- **IA (opcional):** `POST /recommendations/justify` (server) llama a Gemini con los mismos factores; ante
  error/offline se hace fallback a la local. La demo pública funciona sin servidor.

## 11. Validación / métrica de éxito

Sin verdad de campo, la validación es de **consistencia y validez aparente**:

- **Suite de tests** (`vitest`, 30 casos) que fija el comportamiento esperado: features, conversión de zona
  horaria, umbrales de clasificación, rol de la incertidumbre y asignación de crédito del aprendizaje.
- **Escenarios de validez aparente:** p. ej. un hincha argentino obtiene los partidos de Argentina como
  Imperdibles; un partido en horario imposible cae a Resumen.
- **Métrica propuesta para estudio con usuarios:** *precisión@k* sobre los partidos que el usuario
  efectivamente declara que mirará, y mejora de esa precisión a medida que da feedback (curva de aprendizaje).

## 12. Limitaciones y extensiones

- Datos de un evento futuro: ranking y planteles son los mejores disponibles a mayo 2026; algunos clubes de
  jugadores quedaron sin verificar.
- La disponibilidad se evalúa por día/franja; no modela partidos que cruzan medianoche entre días.
- **Extensiones:** rivalidades y clubes seguidos, actualizaciones dinámicas de resultados, fases
  eliminatorias, sincronización del perfil/feedback en la cuenta del usuario (ya hay auth + Google), y
  estudio con usuarios para calibrar umbrales y pesos.

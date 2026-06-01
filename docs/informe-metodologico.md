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

Ocho factores normalizados a [0, 1]. Con `fuerza(r) = clamp(1 − (r−1)/50, 0, 1)` sobre el ranking FIFA `r`:

| Feature | Fórmula |
|---|---|
| `equipo` | `1 − 0.15·(prioridad−1)` si juega un favorito; 0 si no |
| `jugador` | `0.7 + 0.3·(n−1)` con `n` = favoritos presentes (0 si ninguno) |
| `estrellas` | `(fuerza(local) + fuerza(visitante)) / 2` |
| `competitividad` | `clamp(1 − dist/30, 0, 1)`, con `dist = abs(rank_local − rank_visitante)` |
| `grupo_muerte` | `fuerzaProm · (0.4 + 0.6·paridad)`, `paridad = 1 − (max − min)` de fuerzas del grupo |
| `jornada3` | jornada 3 → 1; jornada 2 → 0.25; jornada 1 → 0 |
| `rivalidad` | `max(`storyline curado`,` derbi de confederación `)`; 0 si ninguno |
| `ultimo_baile` | intensidad de la leyenda más icónica en (probable) último Mundial; 0 si no juega ninguna |

`competitividad`, `grupo_muerte`, `rivalidad` y `ultimo_baile` son los factores **no obvios más allá del
ranking FIFA** que premia la competencia: capturan la *paridad* (partido emocionante), el *drama de grupo*,
el *morbo* del cruce (rivalidades históricas y derbis regionales) y la *narrativa* de ver a un ídolo
despedirse, por encima del nivel absoluto.

**Datos curados** (`frontend/src/data/`): `rivalidades.ts` lista cruces con storyline verificados contra el
fixture (p. ej. Francia–Senegal, revancha de 2002; Inglaterra–Croacia, semifinal de 2018) más un piso por
derbi de confederación; `ultimoBaile.ts` lista figuras en probable último Mundial con su intensidad
(Messi, Cristiano = 1.0).

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
| equipo | 0.30 | 0.04 |
| jugador | 0.16 | 0.05 |
| estrellas | 0.14 | 0.09 |
| competitividad | 0.14 | 0.11 |
| grupo_muerte | 0.07 | 0.10 |
| jornada3 | 0.07 | 0.08 |
| rivalidad | 0.06 | 0.10 |
| ultimo_baile | 0.06 | 0.09 |

σ refleja la **confianza a priori**: alta en lo que el usuario afirma (equipo/jugador), menor en factores
inferidos o "no obvios" (competitividad, rivalidad, último baile). **Calibrar** el perfil redefine las medias
(normalizadas) y reduce σ a la mitad.

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
`total {alto 0.5, medio 0.3}`. Sea `τ_σ = 0.16` el corte de "score poco confiable" (recalibrado para 8
factores: sumar features independientes eleva el σ agregado del score):

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
   `nivel` ajusta estrellas/competitividad/grupo/jornada/rivalidad; `no me interesaba` ajusta
   equipo/jugador/último-baile.

El posterior se obtiene plegando todo el feedback sobre el prior base (replay), de modo que respeta también
la calibración. La UI muestra **qué aprendió** el modelo (qué factores subieron/bajaron).

## 10. Justificación

- **Local (siempre):** se arma a partir de los factores con mayor contribución y el encaje horario.
- **IA (opcional):** `POST /recommendations/justify` (server) llama a Gemini con los mismos factores; ante
  error/offline se hace fallback a la local. La demo pública funciona sin servidor.

## 11. Validación / métrica de éxito

Sin verdad de campo, la validación combina una **métrica de precisión sobre el feedback del usuario** con
**consistencia y validez aparente**:

- **Precisión del modelo (implementada y visible en la UI):** para cada partido que el usuario calificó
  con 👍/👎, se mide si el modelo **cold-start** (los priors derivados del onboarding, *antes* de aprender)
  lo había predicho correctamente (`afinidad ≥ umbral` ⇔ "le gusta"). Se reporta como *"acertó X de N
  (Y %)"*. Usar los priors base —no el posterior— evita la fuga de información de medir con los mismos
  pesos que el feedback ya ajustó; los 👎 por horario se excluyen (son disponibilidad, no afinidad).
  Implementación en `frontend/src/lib/recommender/accuracy.ts`.
- **Suite de tests** (`vitest`, 35 casos) que fija el comportamiento esperado: features (incluidos
  rivalidad y último baile), conversión de zona horaria, umbrales de clasificación, rol de la
  incertidumbre, asignación de crédito del aprendizaje y el cálculo de precisión.
- **Escenarios de validez aparente:** p. ej. un hincha argentino obtiene los partidos de Argentina como
  Imperdibles; un partido en horario imposible cae a Resumen.
- **Curva de aprendizaje:** la app expone *qué aprendió* el modelo (movimiento de cada peso con el
  feedback), de modo que la mejora de la precisión a medida que el usuario califica es observable.

## 12. Limitaciones y extensiones

- Datos de un evento futuro: ranking y planteles son los mejores disponibles a mayo 2026; algunos clubes de
  jugadores quedaron sin verificar.
- La disponibilidad se evalúa por día/franja; no modela partidos que cruzan medianoche entre días.
- Las rivalidades curadas dependen de que el cruce exista en el fixture de grupos; la cobertura crece con
  cada storyline agregado.
- **Extensiones:** clubes seguidos, actualizaciones dinámicas de resultados, fases eliminatorias y estudio
  con usuarios para calibrar umbrales y pesos. (El perfil/feedback ya se sincronizan con la cuenta vía auth +
  Google, y los partidos agendados se persisten en la base de datos.)

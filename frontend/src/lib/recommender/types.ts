// Tipos del motor de recomendación de Scout.
// El motor es client-side y puro: toma un Perfil + los datos locales (@/data) y
// devuelve los partidos clasificados con su justificación.

import type { Partido } from '@/data/types'

/** Día de la semana: 0 = domingo … 6 = sábado (consistente con Date.getDay). */
export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6

/** Franja horaria disponible del usuario, en su zona horaria. Horas decimales 0–24. */
export interface Franja {
  dia: DiaSemana
  /** Hora de inicio, 0–24 (ej. 20 = 20:00, 20.5 = 20:30). */
  desde: number
  /** Hora de fin, 0–24. */
  hasta: number
}

/** Tolerancia a horarios molestos: cuánto "estira" lo mirable fuera de las franjas. */
export type Tolerancia = 'baja' | 'media' | 'alta'

/** Perfil de fanático: modula qué tan estrictos son los cortes de clasificación. */
export type PerfilFan = 'casual' | 'total'

/** Equipo favorito con prioridad (1 = máxima). */
export interface EquipoFavorito {
  codigo: string
  prioridad: number
}

/** Perfil del usuario que alimenta el motor. */
export interface Perfil {
  equiposFavoritos: EquipoFavorito[]
  /** Nombres de jugadores favoritos (match contra jugadores.json). */
  jugadoresFavoritos: string[]
  franjas: Franja[]
  /** Zona horaria IANA del usuario, ej. "America/Argentina/Buenos_Aires". */
  zonaHoraria: string
  tolerancia: Tolerancia
  perfilFan: PerfilFan
  /**
   * Calibración opcional: importancia 0–100 que el usuario asigna a cada factor.
   * Si está presente, fija las medias de los priors y aumenta la confianza (σ menor).
   */
  importancia?: Partial<Record<FeatureKey, number>>
  /** Partidos ya agendados en Google Calendar: matchId → eventUrl. */
  scheduledMatches: Record<string, string>
  /** Historial de feedback del usuario, persistido en DB (no en localStorage). */
  feedbacks: Feedback[]
}

/** Factores de afinidad que pondera el modelo. */
export type FeatureKey =
  | 'equipo'
  | 'jugador'
  | 'estrellas'
  | 'competitividad'
  | 'grupo_muerte'
  | 'jornada3'
  | 'rivalidad'
  | 'ultimo_baile'

/** Vector de features de un partido, cada uno normalizado a [0, 1]. */
export type FeatureVector = Record<FeatureKey, number>

/** Pesos del modelo (Fase 1: determinísticos). */
export type Weights = Record<FeatureKey, number>

/** Encaje del horario del partido con la disponibilidad del usuario. */
export type Encaje = 'bueno' | 'complejo' | 'imposible'

/** Las tres categorías que pide la competencia. */
export type Categoria = 'imperdible' | 'vale_la_pena' | 'resumen'

/** Motivo opcional de un 👎: el chip "¿qué no te gustó?". */
export type MotivoDislike = 'horario' | 'nivel' | 'sin_interes'

/** Feedback del usuario sobre un partido que miró. */
export interface Feedback {
  partidoId: string
  gusto: boolean
  /** Solo para 👎: a qué atribuir el disgusto. */
  motivo?: MotivoDislike
}

/** Contribución de un factor al score, para construir la justificación. */
export interface FactorClave {
  factor: FeatureKey
  /** Texto legible, ej. "Juega Argentina (tu favorito)". */
  etiqueta: string
  /** Cuánto aportó al score de afinidad (peso × feature). */
  contribucion: number
}

/** Partido ya evaluado por el motor. */
export interface PartidoEvaluado {
  partido: Partido
  /** Score de afinidad ∈ [0, 1]. */
  afinidad: number
  /** Incertidumbre del score (0 en Fase 1; >0 con priors en Fase 2). */
  incertidumbre: number
  encaje: Encaje
  categoria: Categoria
  /** Factores ordenados por contribución, para justificar. */
  factores: FactorClave[]
  /** Hora de inicio en la zona horaria del usuario, ej. "sáb 20:00". */
  horaUsuario: string
}

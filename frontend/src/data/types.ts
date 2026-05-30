// Tipos del dominio de Scout (Mundial 2026, fase de grupos).
// El dataset se genera con frontend/scripts/build_data.py -> frontend/src/data/*.json

export type Grupo = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L'
export type Jornada = 1 | 2 | 3
export type Posicion = 'GK' | 'DF' | 'MF' | 'FW'
export type Confederacion = 'UEFA' | 'CONMEBOL' | 'CONCACAF' | 'CAF' | 'AFC' | 'OFC'
export type Pais = 'USA' | 'Mexico' | 'Canada'

export interface Equipo {
  /** Código FIFA de 3 letras, ej. "ARG" */
  codigo: string
  nombre: string
  grupo: Grupo
  confederacion: Confederacion
  /** Continente de la confederación, ej. "South America" */
  continente: string
  /** Emoji de la bandera, ej. "🇦🇷" */
  bandera: string
  /** Posición en el ranking FIFA (menor = mejor) */
  ranking_fifa: number
}

export interface Jugador {
  nombre: string
  /** Código FIFA de la selección a la que pertenece */
  seleccion: string
  /** Club actual; null si no se pudo verificar */
  club: string | null
  posicion: Posicion
  es_figura: boolean
}

export interface Partido {
  /** Identificador estable, ej. "M01" */
  id: string
  grupo: Grupo
  jornada: Jornada
  /** Código FIFA del equipo local */
  local: string
  /** Código FIFA del equipo visitante */
  visitante: string
  /** Fecha en la sede, formato YYYY-MM-DD */
  fecha: string
  /** Hora de inicio en la sede, formato HH:MM (24h) */
  hora_local: string
  /** Offset UTC de la sede en esa fecha, ej. "UTC-6" */
  utc_offset: string
  /** Instante de inicio en UTC (ISO 8601), fuente de verdad para conversiones */
  kickoff_utc: string
  sede: string
  ciudad: string
  pais: Pais
  /** Capacidad del estadio */
  capacidad: number
}

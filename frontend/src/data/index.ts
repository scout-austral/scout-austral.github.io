// Loader tipado del dataset. Vite importa los JSON de forma nativa.
import type { Equipo, Jugador, Partido } from './types'
import equiposJson from './equipos.json'
import jugadoresJson from './jugadores.json'
import partidosJson from './partidos.json'

export type { Equipo, Jugador, Partido } from './types'

export const equipos = equiposJson as Equipo[]
export const jugadores = jugadoresJson as Jugador[]
export const partidos = partidosJson as Partido[]

/** Índice de equipos por código FIFA, para lookups rápidos. */
export const equipoPorCodigo: Record<string, Equipo> = Object.fromEntries(
  equipos.map((e) => [e.codigo, e]),
)

/** Figuras agrupadas por código de selección. */
export const figurasPorSeleccion: Record<string, Jugador[]> = jugadores.reduce(
  (acc, j) => {
    ;(acc[j.seleccion] ??= []).push(j)
    return acc
  },
  {} as Record<string, Jugador[]>,
)

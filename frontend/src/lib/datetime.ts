// Conversión de zonas horarias usando Intl (sin dependencias externas).
// La fuente de verdad de cada partido es `kickoff_utc` (instante ISO en UTC);
// acá lo proyectamos a la zona horaria elegida por el usuario.

import type { DiaSemana } from './recommender/types'

const WEEKDAY_INDEX: Record<string, DiaSemana> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
}

const DIAS_ES = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']

export interface PartesLocales {
  /** Día de la semana en la zona del usuario (0 = domingo). */
  diaSemana: DiaSemana
  /** Hora decimal local, ej. 20.5 = 20:30. */
  hora: number
  /** Etiqueta corta legible, ej. "sáb 20:30". */
  etiqueta: string
}

/**
 * Proyecta un instante UTC (ISO) a la zona horaria indicada y devuelve el día de
 * la semana, la hora decimal y una etiqueta legible — todo en esa zona.
 */
export function partesEnZona(kickoffUtc: string, zonaHoraria: string): PartesLocales {
  const fecha = new Date(kickoffUtc)

  const weekdayEn = new Intl.DateTimeFormat('en-US', {
    timeZone: zonaHoraria,
    weekday: 'short',
  }).format(fecha)
  const diaSemana = WEEKDAY_INDEX[weekdayEn] ?? 0

  // hourCycle 'h23' evita el "24:00" de medianoche.
  const partes = new Intl.DateTimeFormat('en-GB', {
    timeZone: zonaHoraria,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(fecha)

  const hh = Number(partes.find((p) => p.type === 'hour')?.value ?? '0')
  const mm = Number(partes.find((p) => p.type === 'minute')?.value ?? '0')
  const hora = hh + mm / 60

  // Día del mes + mes corto en la zona del usuario (ej. "11 jun"), para que la
  // etiqueta no sea ambigua entre fechas con el mismo día de semana.
  const fechaPartes = new Intl.DateTimeFormat('es', {
    timeZone: zonaHoraria,
    day: 'numeric',
    month: 'short',
  }).formatToParts(fecha)
  const dd = fechaPartes.find((p) => p.type === 'day')?.value ?? ''
  const mes = (fechaPartes.find((p) => p.type === 'month')?.value ?? '').replace('.', '')

  const horaStr = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
  const etiqueta = `${DIAS_ES[diaSemana]} ${dd} ${mes} · ${horaStr}`

  return { diaSemana, hora, etiqueta }
}

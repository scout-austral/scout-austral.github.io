import { describe, it, expect } from 'vitest'
import { partesEnZona } from './datetime'

describe('partesEnZona', () => {
  // Partido inaugural (M01): 2026-06-11 13:00 en Estadio Azteca (UTC-6) = 19:00 UTC.
  const inauguracion = '2026-06-11T19:00:00Z'

  it('proyecta a Buenos Aires (UTC-3)', () => {
    const r = partesEnZona(inauguracion, 'America/Argentina/Buenos_Aires')
    expect(r.hora).toBe(16)
    expect(r.diaSemana).toBe(4) // jueves
    expect(r.etiqueta).toBe('jue 11 jun · 16:00')
  })

  it('proyecta a Nueva York (EDT, UTC-4 en junio)', () => {
    const r = partesEnZona(inauguracion, 'America/New_York')
    expect(r.hora).toBe(15)
    expect(r.etiqueta).toBe('jue 11 jun · 15:00')
  })

  it('recupera la hora local original en la sede (Ciudad de México, UTC-6)', () => {
    const r = partesEnZona(inauguracion, 'America/Mexico_City')
    expect(r.hora).toBe(13)
  })

  it('maneja medias horas y cambio de día', () => {
    const r = partesEnZona('2026-06-12T00:30:00Z', 'UTC')
    expect(r.hora).toBe(0.5)
    expect(r.diaSemana).toBe(5) // viernes 12
    expect(r.etiqueta).toBe('vie 12 jun · 00:30')
  })
})

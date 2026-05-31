import type { DiaSemana, Franja, Perfil } from '@/lib/recommender/types'
import { Button } from '@/components/ui/button'

const DIAS: { dia: DiaSemana; label: string }[] = [
  { dia: 1, label: 'Lun' },
  { dia: 2, label: 'Mar' },
  { dia: 3, label: 'Mié' },
  { dia: 4, label: 'Jue' },
  { dia: 5, label: 'Vie' },
  { dia: 6, label: 'Sáb' },
  { dia: 0, label: 'Dom' },
]

const SLOTS = [
  { label: 'Mañana', desde: 8, hasta: 12 },
  { label: 'Tarde', desde: 12, hasta: 18 },
  { label: 'Noche', desde: 18, hasta: 24 },
]

interface Props {
  perfil: Perfil
  actualizar: (cambios: Partial<Perfil>) => void
}

export function FranjasFilter({ perfil, actualizar }: Props) {
  function toggleFranja(dia: DiaSemana, desde: number, hasta: number) {
    const existe = perfil.franjas.some(
      (f) => f.dia === dia && f.desde === desde && f.hasta === hasta,
    )
    const franjas: Franja[] = existe
      ? perfil.franjas.filter((f) => !(f.dia === dia && f.desde === desde && f.hasta === hasta))
      : [...perfil.franjas, { dia, desde, hasta }]
    actualizar({ franjas })
  }

  const franjaActiva = (dia: DiaSemana, desde: number, hasta: number) =>
    perfil.franjas.some((f) => f.dia === dia && f.desde === desde && f.hasta === hasta)

  const hay = perfil.franjas.length > 0

  return (
    <div className="franjas-filter">
      <div className="franjas-filter-header">
        <svg aria-hidden="true" className="franjas-filter-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span>Disponibilidad horaria</span>
        {hay && (
          <button
            type="button"
            className="franjas-filter-clear"
            onClick={() => actualizar({ franjas: [] })}
          >
            Limpiar
          </button>
        )}
      </div>
      <div className="franjas-grid">
        {DIAS.map(({ dia, label }) => (
          <div key={dia} className="franjas-row">
            <span className="franjas-dia">{label}</span>
            <div className="franjas-slots">
              {SLOTS.map((s) => (
                <Button
                  key={s.label}
                  type="button"
                  size="sm"
                  variant={franjaActiva(dia, s.desde, s.hasta) ? 'default' : 'outline'}
                  onClick={() => toggleFranja(dia, s.desde, s.hasta)}
                >
                  {s.label}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {!hay && (
        <p className="franjas-hint">Sin selección, se asume disponibilidad total.</p>
      )}
    </div>
  )
}

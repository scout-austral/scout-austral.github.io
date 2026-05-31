import type { DiaSemana, Franja, Perfil } from '@/lib/recommender/types'

const DIAS: { dia: DiaSemana; label: string }[] = [
  { dia: 1, label: 'Lun' },
  { dia: 2, label: 'Mar' },
  { dia: 3, label: 'Mié' },
  { dia: 4, label: 'Jue' },
  { dia: 5, label: 'Vie' },
  { dia: 6, label: 'Sáb' },
  { dia: 0, label: 'Dom' },
]

const SLOTS: { key: string; label: string; desde: number; hasta: number }[] = [
  { key: 'm', label: 'Mañana', desde: 8, hasta: 12 },
  { key: 't', label: 'Tarde', desde: 12, hasta: 18 },
  { key: 'n', label: 'Noche', desde: 18, hasta: 24 },
]

interface Props {
  perfil: Perfil
  actualizar: (cambios: Partial<Perfil>) => void
}

export function FranjasFilter({ perfil, actualizar }: Props) {
  function toggle(dia: DiaSemana, desde: number, hasta: number) {
    const ya = perfil.franjas.some(
      (f) => f.dia === dia && f.desde === desde && f.hasta === hasta,
    )
    const franjas: Franja[] = ya
      ? perfil.franjas.filter((f) => !(f.dia === dia && f.desde === desde && f.hasta === hasta))
      : [...perfil.franjas, { dia, desde, hasta }]
    actualizar({ franjas })
  }

  const activa = (dia: DiaSemana, desde: number, hasta: number) =>
    perfil.franjas.some((f) => f.dia === dia && f.desde === desde && f.hasta === hasta)

  const hayFranjas = perfil.franjas.length > 0

  return (
    <div className="ff-wrap">
      <div className="ff-head">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span>Disponibilidad</span>
        {hayFranjas && (
          <button type="button" className="ff-clear" onClick={() => actualizar({ franjas: [] })}>
            limpiar
          </button>
        )}
      </div>

      <div className="ff-grid">
        {DIAS.map(({ dia, label }) => (
          <div key={dia} className="ff-row">
            <span className="ff-dia">{label}</span>
            {SLOTS.map((s) => (
              <button
                key={s.key}
                type="button"
                className={`ff-slot${activa(dia, s.desde, s.hasta) ? ' ff-slot--on' : ''}`}
                onClick={() => toggle(dia, s.desde, s.hasta)}
                title={s.label}
              >
                {s.key.toUpperCase()}
              </button>
            ))}
          </div>
        ))}
      </div>

      <p className="ff-hint">M=Mañana · T=Tarde · N=Noche</p>
    </div>
  )
}

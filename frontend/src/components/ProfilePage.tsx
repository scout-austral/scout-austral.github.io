import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { equipos, jugadores } from '@/data'
import type {
  DiaSemana,
  FeatureKey,
  Franja,
  Perfil,
  PerfilFan,
  Tolerancia,
} from '@/lib/recommender/types'
import { DEFAULT_WEIGHTS, FEATURE_LABELS } from '@/lib/recommender'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// SVG icons — evitamos dependencias pesadas de emoji
function IconSkull() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
      <path d="M12 2a9 9 0 0 0-9 9c0 3.03 1.5 5.7 3.8 7.3V21a1 1 0 0 0 1 1h8.4a1 1 0 0 0 1-1v-2.7C19.5 16.7 21 14 21 11A9 9 0 0 0 12 2zm-2 14H8v-2h2v2zm0-4H8v-2h2v2zm4 4h-2v-2h2v2zm0-4h-2v-2h2v2z"/>
    </svg>
  )
}
function IconFlag() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
      <path d="M5 3h14l-3 5 3 5H5V3zm0 12v7H3V3h2v12z"/>
    </svg>
  )
}
function IconBolt() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
      <path d="M13 2L4.09 12.26a1 1 0 0 0 .74 1.66L11 14l-2 8 8.91-10.26a1 1 0 0 0-.74-1.66L11 10l2-8z"/>
    </svg>
  )
}
function IconStar() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  )
}

const FACTOR_CONFIG: Array<{
  key: FeatureKey
  label: string
  desc: string
  icon: React.ReactNode
}> = [
  {
    key: 'grupo_muerte',
    label: FEATURE_LABELS.grupo_muerte,
    desc: '¿Cuánto te obsesionan los grupos con varias selecciones fuertes?',
    icon: <IconSkull />,
  },
  {
    key: 'jornada3',
    label: FEATURE_LABELS.jornada3,
    desc: 'La última jornada de grupos, donde todo se define.',
    icon: <IconFlag />,
  },
  {
    key: 'competitividad',
    label: FEATURE_LABELS.competitividad,
    desc: '¿Preferís los partidos reñidos y con incertidumbre?',
    icon: <IconBolt />,
  },
  {
    key: 'estrellas',
    label: FEATURE_LABELS.estrellas,
    desc: 'Partidos con las figuras más importantes del Mundial.',
    icon: <IconStar />,
  },
]

// Mapeo botón 1-5 ↔ valor 0-100
const BTN_TO_VAL = [0, 25, 50, 75, 100]
function valToBtn(val: number): number {
  return BTN_TO_VAL.reduce(
    (closest, v, i) => (Math.abs(v - val) < Math.abs(BTN_TO_VAL[closest] - val) ? i : closest),
    2,
  )
}

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

const ZONAS = [
  'America/Argentina/Buenos_Aires',
  'America/Sao_Paulo',
  'America/Mexico_City',
  'America/Bogota',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/Madrid',
  'Europe/London',
  'UTC',
]

const IMPORTANCIA_DEFAULT = Object.fromEntries(
  (Object.keys(DEFAULT_WEIGHTS) as FeatureKey[]).map((k) => [k, Math.round(DEFAULT_WEIGHTS[k] * 100)]),
) as Record<FeatureKey, number>

const equiposOrdenados = [...equipos].sort((a, b) => a.nombre.localeCompare(b.nombre))
const jugadoresOrdenados = [...jugadores].sort((a, b) => a.nombre.localeCompare(b.nombre))

interface Props {
  perfil: Perfil
  actualizar: (cambios: Partial<Perfil>) => void
  reset: () => void
}

export function ProfilePage({ perfil, actualizar, reset }: Props) {
  const [addEquipo, setAddEquipo] = useState('')
  const [addJugador, setAddJugador] = useState('')

  const zonas = useMemo(
    () => Array.from(new Set([perfil.zonaHoraria, ...ZONAS])),
    [perfil.zonaHoraria],
  )

  const importancia: Record<FeatureKey, number> = {
    ...IMPORTANCIA_DEFAULT,
    ...perfil.importancia,
  }

  function setFactor(k: FeatureKey, btnIdx: number) {
    actualizar({ importancia: { ...importancia, [k]: BTN_TO_VAL[btnIdx] ?? 50 } })
  }

  function agregarEquipo(codigo: string) {
    if (!codigo || perfil.equiposFavoritos.some((e) => e.codigo === codigo)) return
    actualizar({
      equiposFavoritos: [
        ...perfil.equiposFavoritos,
        { codigo, prioridad: perfil.equiposFavoritos.length + 1 },
      ],
    })
  }

  function quitarEquipo(codigo: string) {
    actualizar({
      equiposFavoritos: perfil.equiposFavoritos
        .filter((e) => e.codigo !== codigo)
        .map((e, i) => ({ ...e, prioridad: i + 1 })),
    })
  }

  function agregarJugador(nombre: string) {
    if (!nombre || perfil.jugadoresFavoritos.includes(nombre)) return
    actualizar({ jugadoresFavoritos: [...perfil.jugadoresFavoritos, nombre] })
  }

  function quitarJugador(nombre: string) {
    actualizar({ jugadoresFavoritos: perfil.jugadoresFavoritos.filter((n) => n !== nombre) })
  }

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

  return (
    <div className="profile-page">
      {/* Selección favorita */}
      <section className="profile-section">
        <h3 className="profile-section-title">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
          </svg>
          Selecciones favoritas
        </h3>
        <p className="profile-section-hint">
          Agregá tu selección — cuanto más arriba, más peso en el score.
        </p>
        <Select
          value={addEquipo}
          onValueChange={(v: string) => { agregarEquipo(v); setAddEquipo('') }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Agregar selección…" />
          </SelectTrigger>
          <SelectContent>
            {equiposOrdenados.map((e) => (
              <SelectItem key={e.codigo} value={e.codigo}>
                {e.bandera} {e.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {perfil.equiposFavoritos.length > 0 && (
          <div className="profile-badges">
            {perfil.equiposFavoritos.map((fav) => {
              const e = equipos.find((x) => x.codigo === fav.codigo)
              return (
                <Badge key={fav.codigo} variant="secondary" className="gap-1">
                  <span className="opacity-60 text-xs">{fav.prioridad}°</span>
                  {e?.bandera} {e?.nombre}
                  <button type="button" onClick={() => quitarEquipo(fav.codigo)} aria-label="quitar">
                    <X className="size-3" />
                  </button>
                </Badge>
              )
            })}
          </div>
        )}
      </section>

      {/* Jugadores favoritos */}
      <section className="profile-section">
        <h3 className="profile-section-title">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
          </svg>
          Jugadores favoritos
        </h3>
        <Select
          value={addJugador}
          onValueChange={(v: string) => { agregarJugador(v); setAddJugador('') }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Agregar jugador…" />
          </SelectTrigger>
          <SelectContent>
            {jugadoresOrdenados.map((j) => (
              <SelectItem key={`${j.nombre}-${j.seleccion}`} value={j.nombre}>
                {j.nombre} · {j.seleccion}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {perfil.jugadoresFavoritos.length > 0 && (
          <div className="profile-badges">
            {perfil.jugadoresFavoritos.map((nombre) => (
              <Badge key={nombre} variant="secondary" className="gap-1">
                {nombre}
                <button type="button" onClick={() => quitarJugador(nombre)} aria-label="quitar">
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </section>

      {/* Preferencias 1-5 */}
      <section className="profile-section">
        <h3 className="profile-section-title">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path d="M3 18h6v-2H3v2zm0-5h12v-2H3v2zm0-7v2h18V6H3z"/>
          </svg>
          ¿Qué tipo de partidos priorizás?
        </h3>
        <p className="profile-section-hint">
          1 = no me importa · 5 = imprescindible
        </p>
        <div className="profile-factors">
          {FACTOR_CONFIG.map(({ key, label, desc, icon }) => {
            const val = importancia[key]
            const activeBtn = valToBtn(val)
            return (
              <div key={key} className="profile-factor">
                <div className="profile-factor-label">
                  <span className="profile-factor-icon">{icon}</span>
                  <div>
                    <span className="profile-factor-name">{label}</span>
                    <span className="profile-factor-desc">{desc}</span>
                  </div>
                </div>
                <div className="profile-factor-btns">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <button
                      key={i}
                      type="button"
                      className={`profile-factor-btn${activeBtn === i ? ' profile-factor-btn--active' : ''}`}
                      onClick={() => setFactor(key, i)}
                      aria-label={`${i + 1} de 5`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Disponibilidad */}
      <section className="profile-section">
        <h3 className="profile-section-title">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          Disponibilidad horaria
        </h3>
        <div className="profile-franjas">
          {DIAS.map(({ dia, label }) => (
            <div key={dia} className="profile-franja-row">
              <span className="profile-franja-dia">{label}</span>
              <div className="profile-franja-slots">
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
        <p className="profile-section-hint" style={{ marginTop: '0.5rem' }}>
          Sin selección, Scout asume disponibilidad total.
        </p>
      </section>

      {/* Ajustes */}
      <section className="profile-section">
        <h3 className="profile-section-title">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
          </svg>
          Configuración
        </h3>

        <div className="profile-config-row">
          <span className="profile-config-label">Zona horaria</span>
          <Select value={perfil.zonaHoraria} onValueChange={(v: string) => actualizar({ zonaHoraria: v })}>
            <SelectTrigger className="w-auto flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {zonas.map((z) => (
                <SelectItem key={z} value={z}>{z}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="profile-config-row">
          <span className="profile-config-label">Tolerancia horaria</span>
          <div className="flex gap-1">
            {(['baja', 'media', 'alta'] as Tolerancia[]).map((t) => (
              <Button
                key={t}
                type="button"
                size="sm"
                variant={perfil.tolerancia === t ? 'default' : 'outline'}
                onClick={() => actualizar({ tolerancia: t })}
                className="capitalize"
              >
                {t}
              </Button>
            ))}
          </div>
        </div>

        <div className="profile-config-row">
          <span className="profile-config-label">Perfil de fan</span>
          <div className="flex gap-1">
            {(['casual', 'total'] as PerfilFan[]).map((p) => (
              <Button
                key={p}
                type="button"
                size="sm"
                variant={perfil.perfilFan === p ? 'default' : 'outline'}
                onClick={() => actualizar({ perfilFan: p })}
                className="capitalize"
              >
                {p === 'casual' ? 'Casual' : 'Total'}
              </Button>
            ))}
          </div>
        </div>
      </section>

      <button type="button" className="profile-reset" onClick={reset}>
        Limpiar todo el perfil
      </button>
    </div>
  )
}

import { useState } from 'react'
import { X } from 'lucide-react'
import { equipos, jugadores } from '@/data'
import type { DiaSemana, FeatureKey, Franja, Perfil } from '@/lib/recommender/types'
import { DEFAULT_WEIGHTS } from '@/lib/recommender'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const QUIZ_QUESTIONS: Array<{
  key: FeatureKey
  pregunta: string
  izq: string
  der: string
  emoji: string
}> = [
  {
    key: 'grupo_muerte',
    pregunta: '¿Cuánto te obsesionan los grupos de la muerte?',
    izq: 'Me da igual',
    der: 'Los sigo todos',
    emoji: '💀',
  },
  {
    key: 'jornada3',
    pregunta: '¿La última jornada de grupos te pone ansioso?',
    izq: 'Para nada',
    der: 'No puedo dormir',
    emoji: '🎯',
  },
  {
    key: 'competitividad',
    pregunta: '¿Preferís partidos reñidos sobre figuras estelares?',
    izq: 'Quiero figuras',
    der: 'Dame drama',
    emoji: '⚡',
  },
  {
    key: 'estrellas',
    pregunta: '¿Priorizás los partidazos aunque sean de madrugada?',
    izq: 'Solo horarios cómodos',
    der: 'Me pongo un despertador',
    emoji: '⭐',
  },
]

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

const equiposOrdenados = [...equipos].sort((a, b) => a.nombre.localeCompare(b.nombre))
const jugadoresOrdenados = [...jugadores].sort((a, b) => a.nombre.localeCompare(b.nombre))

const IMPORTANCIA_DEFAULT = Object.fromEntries(
  (Object.keys(DEFAULT_WEIGHTS) as FeatureKey[]).map((k) => [k, Math.round(DEFAULT_WEIGHTS[k] * 100)]),
) as Record<FeatureKey, number>

interface Props {
  perfil: Perfil
  actualizar: (cambios: Partial<Perfil>) => void
}

export function perfilCompleto(perfil: Perfil): boolean {
  return (
    perfil.equiposFavoritos.length > 0 ||
    perfil.jugadoresFavoritos.length > 0 ||
    perfil.franjas.length > 0 ||
    perfil.importancia != null
  )
}

export function QuizSliders({ perfil, actualizar }: Props) {
  const [addEquipo, setAddEquipo] = useState('')
  const [addJugador, setAddJugador] = useState('')
  const [collapsed, setCollapsed] = useState(perfilCompleto(perfil))

  const importancia: Record<FeatureKey, number> = { ...IMPORTANCIA_DEFAULT, ...perfil.importancia }

  function setImportancia(k: FeatureKey, v: number) {
    actualizar({ importancia: { ...importancia, [k]: v } })
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

  const completo = perfilCompleto(perfil)

  return (
    <div className="quiz-sliders">
      <button
        type="button"
        className="quiz-header"
        onClick={() => setCollapsed((c) => !c)}
      >
        <div className="quiz-header-left">
          <span className="quiz-icon">🎮</span>
          <div>
            <h2 className="quiz-title">
              {completo ? 'Tus preferencias' : 'Personalizá tu experiencia'}
            </h2>
            {!completo && (
              <p className="quiz-subtitle">
                Contestá estas preguntas para que Scout clasifique los 72 partidos según vos
              </p>
            )}
          </div>
        </div>
        <span className="quiz-chevron">{collapsed ? '▸' : '▾'}</span>
      </button>

      {!collapsed && (
        <div className="quiz-body">
          {/* Equipo favorito */}
          <div className="quiz-section">
            <div className="quiz-section-label">
              <span>🏳️</span>
              <span>¿Qué selección hinchás?</span>
            </div>
            <Select
              value={addEquipo}
              onValueChange={(v: string) => {
                agregarEquipo(v)
                setAddEquipo('')
              }}
            >
              <SelectTrigger className="quiz-select">
                <SelectValue placeholder="Elegí una selección…" />
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
              <div className="quiz-badges">
                {perfil.equiposFavoritos.map((fav) => {
                  const e = equipos.find((x) => x.codigo === fav.codigo)
                  return (
                    <Badge key={fav.codigo} variant="secondary" className="gap-1">
                      <span className="opacity-60">{fav.prioridad}°</span>{' '}
                      {e?.bandera} {e?.nombre}
                      <button
                        type="button"
                        onClick={() => quitarEquipo(fav.codigo)}
                        aria-label="quitar"
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  )
                })}
              </div>
            )}
          </div>

          {/* Jugador favorito */}
          <div className="quiz-section">
            <div className="quiz-section-label">
              <span>⚽</span>
              <span>¿Seguís a algún jugador en particular?</span>
            </div>
            <Select
              value={addJugador}
              onValueChange={(v: string) => {
                agregarJugador(v)
                setAddJugador('')
              }}
            >
              <SelectTrigger className="quiz-select">
                <SelectValue placeholder="Buscá un jugador…" />
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
              <div className="quiz-badges">
                {perfil.jugadoresFavoritos.map((nombre) => (
                  <Badge key={nombre} variant="secondary" className="gap-1">
                    {nombre}
                    <button
                      type="button"
                      onClick={() => quitarJugador(nombre)}
                      aria-label="quitar"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Sliders de preferencias */}
          <div className="quiz-section">
            <div className="quiz-section-label">
              <span>🎚️</span>
              <span>¿Qué tipo de partidos te mueven el piso?</span>
            </div>
            <div className="quiz-sliders-list">
              {QUIZ_QUESTIONS.map(({ key, pregunta, izq, der, emoji }) => (
                <div key={key} className="quiz-slider-item">
                  <div className="quiz-slider-header">
                    <span className="quiz-slider-emoji">{emoji}</span>
                    <span className="quiz-slider-pregunta">{pregunta}</span>
                    <span className="quiz-slider-val">{importancia[key]}</span>
                  </div>
                  <Slider
                    value={[importancia[key]]}
                    min={0}
                    max={100}
                    step={5}
                    onValueChange={(vals: number[]) => setImportancia(key, vals[0] ?? 0)}
                  />
                  <div className="quiz-slider-labels">
                    <span>{izq}</span>
                    <span>{der}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Disponibilidad horaria */}
          <div className="quiz-section">
            <div className="quiz-section-label">
              <span>🕐</span>
              <span>¿Cuándo podés ver partidos?</span>
            </div>
            <div className="quiz-franjas">
              {DIAS.map(({ dia, label }) => (
                <div key={dia} className="quiz-franja-row">
                  <span className="quiz-franja-dia">{label}</span>
                  <div className="quiz-franja-slots">
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
              <p className="quiz-franjas-hint">
                Sin selección, Scout asume que estás disponible siempre.
              </p>
            </div>
          </div>

          {completo && (
            <button
              type="button"
              className="quiz-collapse-btn"
              onClick={() => setCollapsed(true)}
            >
              Listo, ver mis recomendaciones ↑
            </button>
          )}
        </div>
      )}
    </div>
  )
}

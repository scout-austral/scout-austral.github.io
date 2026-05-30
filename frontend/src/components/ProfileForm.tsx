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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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

const equiposOrdenados = [...equipos].sort((a, b) => a.nombre.localeCompare(b.nombre))
const jugadoresOrdenados = [...jugadores].sort((a, b) => a.nombre.localeCompare(b.nombre))

const FEATURE_KEYS = Object.keys(DEFAULT_WEIGHTS) as FeatureKey[]
const IMPORTANCIA_DEFAULT = Object.fromEntries(
  FEATURE_KEYS.map((k) => [k, Math.round(DEFAULT_WEIGHTS[k] * 100)]),
) as Record<FeatureKey, number>

interface Props {
  perfil: Perfil
  actualizar: (cambios: Partial<Perfil>) => void
}

export function ProfileForm({ perfil, actualizar }: Props) {
  const [addEquipo, setAddEquipo] = useState('')
  const [addJugador, setAddJugador] = useState('')
  const [showCalib, setShowCalib] = useState(false)

  const importancia: Record<FeatureKey, number> = { ...IMPORTANCIA_DEFAULT, ...perfil.importancia }
  function setImportancia(k: FeatureKey, v: number) {
    actualizar({ importancia: { ...importancia, [k]: v } })
  }

  const zonas = useMemo(
    () => Array.from(new Set([perfil.zonaHoraria, ...ZONAS])),
    [perfil.zonaHoraria],
  )

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
    <Card>
      <CardHeader>
        <CardTitle>Tu perfil</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Equipos favoritos */}
        <div className="space-y-2">
          <Label>Equipos favoritos</Label>
          <Select value={addEquipo} onValueChange={(v) => { agregarEquipo(v); setAddEquipo('') }}>
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
          <div className="flex flex-wrap gap-2">
            {perfil.equiposFavoritos.map((fav) => {
              const e = equipos.find((x) => x.codigo === fav.codigo)
              return (
                <Badge key={fav.codigo} variant="secondary" className="gap-1">
                  <span className="opacity-60">{fav.prioridad}°</span> {e?.bandera} {e?.nombre}
                  <button type="button" onClick={() => quitarEquipo(fav.codigo)} aria-label="quitar">
                    <X className="size-3" />
                  </button>
                </Badge>
              )
            })}
          </div>
        </div>

        {/* Jugadores favoritos */}
        <div className="space-y-2">
          <Label>Jugadores favoritos</Label>
          <Select value={addJugador} onValueChange={(v) => { agregarJugador(v); setAddJugador('') }}>
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
          <div className="flex flex-wrap gap-2">
            {perfil.jugadoresFavoritos.map((nombre) => (
              <Badge key={nombre} variant="secondary" className="gap-1">
                {nombre}
                <button type="button" onClick={() => quitarJugador(nombre)} aria-label="quitar">
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        {/* Disponibilidad */}
        <div className="space-y-2">
          <Label>Disponibilidad horaria</Label>
          <div className="space-y-1">
            {DIAS.map(({ dia, label }) => (
              <div key={dia} className="flex items-center gap-2">
                <span className="w-9 text-sm text-muted-foreground">{label}</span>
                <div className="flex gap-1">
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
          <p className="text-xs text-muted-foreground">
            Sin selección, se asume que estás disponible siempre.
          </p>
        </div>

        {/* Zona horaria */}
        <div className="space-y-2">
          <Label>Zona horaria</Label>
          <Select value={perfil.zonaHoraria} onValueChange={(v) => actualizar({ zonaHoraria: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {zonas.map((z) => (
                <SelectItem key={z} value={z}>
                  {z}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tolerancia */}
        <div className="space-y-2">
          <Label>Tolerancia a horarios molestos</Label>
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

        {/* Perfil fan */}
        <div className="space-y-2">
          <Label>Perfil de fanático</Label>
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
                {p}
              </Button>
            ))}
          </div>
        </div>

        {/* Calibración (opcional) */}
        <div className="space-y-2">
          <button
            type="button"
            className="text-sm text-muted-foreground underline-offset-2 hover:underline"
            onClick={() => setShowCalib((s) => !s)}
          >
            {showCalib ? '▾' : '▸'} Calibrar importancia de factores (avanzado)
          </button>
          {showCalib && (
            <div className="space-y-3 rounded-md border border-border p-3">
              <p className="text-xs text-muted-foreground">
                Ajustá cuánto pesa cada factor. Calibrar aumenta la confianza del modelo
                (menos partidos quedan como "apuesta").
              </p>
              {FEATURE_KEYS.map((k) => (
                <div key={k} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>{FEATURE_LABELS[k]}</span>
                    <span className="text-muted-foreground">{importancia[k]}</span>
                  </div>
                  <Slider
                    value={[importancia[k]]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={(vals) => setImportancia(k, vals[0] ?? 0)}
                  />
                </div>
              ))}
              {perfil.importancia && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => actualizar({ importancia: undefined })}
                >
                  Restablecer
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

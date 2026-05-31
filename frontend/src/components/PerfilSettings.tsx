import { useMemo } from 'react'
import type { FeatureKey, Perfil, PerfilFan, Tolerancia } from '@/lib/recommender/types'
import { DEFAULT_WEIGHTS, FEATURE_LABELS } from '@/lib/recommender'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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

const FEATURE_KEYS = Object.keys(DEFAULT_WEIGHTS) as FeatureKey[]
const IMPORTANCIA_DEFAULT = Object.fromEntries(
  FEATURE_KEYS.map((k) => [k, Math.round(DEFAULT_WEIGHTS[k] * 100)]),
) as Record<FeatureKey, number>

interface Props {
  perfil: Perfil
  actualizar: (cambios: Partial<Perfil>) => void
  reset: () => void
}

export function PerfilSettings({ perfil, actualizar, reset }: Props) {
  const zonas = useMemo(
    () => Array.from(new Set([perfil.zonaHoraria, ...ZONAS])),
    [perfil.zonaHoraria],
  )

  const importancia: Record<FeatureKey, number> = { ...IMPORTANCIA_DEFAULT, ...perfil.importancia }

  function setImportancia(k: FeatureKey, v: number) {
    actualizar({ importancia: { ...importancia, [k]: v } })
  }

  return (
    <div className="perfil-settings">
      <div className="perfil-settings-header">
        <h2 className="perfil-settings-title">Configuración avanzada</h2>
        <button
          type="button"
          className="perfil-settings-reset"
          onClick={reset}
        >
          Limpiar todo
        </button>
      </div>

      <div className="perfil-settings-body">
        {/* Zona horaria */}
        <div className="perfil-field">
          <Label>Zona horaria</Label>
          <Select value={perfil.zonaHoraria} onValueChange={(v: string) => actualizar({ zonaHoraria: v })}>
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
        <div className="perfil-field">
          <Label>Tolerancia a horarios molestos</Label>
          <p className="perfil-field-hint">
            ¿Cuánto "estirás" los horarios fuera de tu disponibilidad?
          </p>
          <div className="perfil-field-buttons">
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
        <div className="perfil-field">
          <Label>Perfil de fanático</Label>
          <p className="perfil-field-hint">
            Define qué tan estrictos son los cortes de clasificación.
          </p>
          <div className="perfil-field-buttons">
            {(['casual', 'total'] as PerfilFan[]).map((p) => (
              <Button
                key={p}
                type="button"
                size="sm"
                variant={perfil.perfilFan === p ? 'default' : 'outline'}
                onClick={() => actualizar({ perfilFan: p })}
                className="capitalize"
              >
                {p === 'casual' ? 'Casual 🙂' : 'Fanático total 🔥'}
              </Button>
            ))}
          </div>
        </div>

        {/* Calibración avanzada */}
        <div className="perfil-field">
          <Label>Calibración de factores</Label>
          <p className="perfil-field-hint">
            Ajustá el peso de cada factor. Calibrar aumenta la confianza del modelo.
          </p>
          <div className="perfil-calib">
            {FEATURE_KEYS.map((k) => (
              <div key={k} className="perfil-calib-item">
                <div className="perfil-calib-header">
                  <span>{FEATURE_LABELS[k]}</span>
                  <span className="perfil-calib-val">{importancia[k]}</span>
                </div>
                <Slider
                  value={[importancia[k]]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={(vals: number[]) => setImportancia(k, vals[0] ?? 0)}
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
                Restablecer pesos
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

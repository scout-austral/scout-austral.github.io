import { useMemo, useState } from 'react'
import { ListFilter, Target, TrendingDown, TrendingUp } from 'lucide-react'
import { agruparPorCategoria, recomendar, FEATURE_LABELS } from '@/lib/recommender'
import type {
  AprendizajeFactor,
  Categoria,
  Feedback,
  FeatureKey,
  MotivoDislike,
  Perfil,
  PrecisionModelo,
  Prior,
} from '@/lib/recommender'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MatchCard } from './MatchCard'

const ORDEN: { cat: Categoria; label: string }[] = [
  { cat: 'imperdible', label: 'Imperdibles' },
  { cat: 'vale_la_pena', label: 'Vale la pena' },
  { cat: 'resumen', label: 'Resumen' },
]

interface Props {
  perfil: Perfil
  priors: Record<FeatureKey, Prior>
  porPartido: Map<string, Feedback>
  deltas: AprendizajeFactor[]
  precision: PrecisionModelo
  calendarConnected: boolean
  isLoggedIn: boolean
  scheduledMatches: Record<string, string>
  registrar: (partidoId: string, gusto: boolean, motivo?: MotivoDislike) => void
  quitar: (partidoId: string) => void
  resetFeedback: () => void
  onCalendarDisconnected?: () => void
  onScheduled?: (matchId: string, eventUrl: string) => void
}

function Aprendizaje({
  deltas,
  precision,
  onReset,
}: {
  deltas: AprendizajeFactor[]
  precision: PrecisionModelo
  onReset: () => void
}) {
  if (deltas.length === 0 && precision.total === 0) return null

  const maxAbs = Math.max(...deltas.map((d) => Math.abs(d.delta)), 0.0001)
  const pct = Math.round(precision.accuracy * 100)

  return (
    <div className="mb-4 rounded-md border border-border bg-muted/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium">Cómo está aprendiendo el modelo</span>
        <Button type="button" size="sm" variant="ghost" className="h-6 text-xs" onClick={onReset}>
          Reiniciar
        </Button>
      </div>

      {/* Métrica de validación: precisión del modelo cold-start vs. feedback real */}
      {precision.total > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded bg-background/60 px-2 py-1.5 text-xs">
          <Target className="size-3.5 text-sky-500" />
          <span>
            El modelo acertó <strong>{precision.aciertos} de {precision.total}</strong> partidos que
            calificaste <span className="text-muted-foreground">({pct}% de precisión)</span>
          </span>
        </div>
      )}

      {/* Visualización del aprendizaje: cuánto se movió cada factor con tu feedback */}
      {deltas.length > 0 && (
        <ul className="space-y-1.5">
          {deltas.map((d) => (
            <li key={d.factor} className="flex items-center gap-2 text-xs">
              {d.delta > 0 ? (
                <TrendingUp className="size-3.5 shrink-0 text-emerald-500" />
              ) : (
                <TrendingDown className="size-3.5 shrink-0 text-rose-500" />
              )}
              <span className="w-36 shrink-0">
                {d.delta > 0 ? 'Te importa más' : 'Te importa menos'}:{' '}
                <strong>{FEATURE_LABELS[d.factor]}</strong>
              </span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                <span
                  className={`block h-full rounded-full ${d.delta > 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                  style={{ width: `${Math.round((Math.abs(d.delta) / maxAbs) * 100)}%` }}
                />
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function Results({
  perfil,
  priors,
  porPartido,
  deltas,
  precision,
  calendarConnected,
  isLoggedIn,
  scheduledMatches,
  registrar,
  quitar,
  resetFeedback,
  onCalendarDisconnected,
  onScheduled,
}: Props) {
  const [orden, setOrden] = useState<'afinidad' | 'fecha'>('afinidad')

  const grupos = useMemo(() => {
    const base = agruparPorCategoria(recomendar(perfil, priors))
    if (orden === 'fecha') {
      const sorted = (cat: Categoria) =>
        [...base[cat]].sort(
          (a, b) =>
            new Date(a.partido.kickoff_utc).getTime() -
            new Date(b.partido.kickoff_utc).getTime(),
        )
      return {
        imperdible: sorted('imperdible'),
        vale_la_pena: sorted('vale_la_pena'),
        resumen: sorted('resumen'),
      }
    }
    return base
  }, [perfil, priors, orden])

  return (
    <div>
      <Aprendizaje deltas={deltas} precision={precision} onReset={resetFeedback} />
      <Tabs defaultValue="imperdible" className="w-full">
        <TabsList className="w-full">
          {ORDEN.map(({ cat, label }) => (
            <TabsTrigger key={cat} value={cat} className="flex-1">
              {label} ({grupos[cat].length})
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="mt-2 flex items-center justify-end gap-1.5">
          <ListFilter className="size-3.5 text-muted-foreground" />
          {(['afinidad', 'fecha'] as const).map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => setOrden(o)}
              className={`rounded-full px-2.5 py-0.5 text-xs transition-colors ${
                orden === o
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {o === 'afinidad' ? 'Más afinidad' : 'Por fecha'}
            </button>
          ))}
        </div>
        {ORDEN.map(({ cat }) => (
          <TabsContent key={cat} value={cat} className="space-y-3">
            {grupos[cat].length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No hay partidos en esta categoría con tu perfil actual.
              </p>
            ) : (
              grupos[cat].map((e) => (
                <MatchCard
                  key={e.partido.id}
                  evaluado={e}
                  perfil={perfil}
                  feedback={porPartido.get(e.partido.id)}
                  calendarConnected={calendarConnected}
                  isLoggedIn={isLoggedIn}
                  scheduledMatches={scheduledMatches}
                  onFeedback={(gusto, motivo) => registrar(e.partido.id, gusto, motivo)}
                  onClear={() => quitar(e.partido.id)}
                  onCalendarDisconnected={onCalendarDisconnected}
                  onScheduled={onScheduled}
                />
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

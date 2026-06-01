import { useMemo } from 'react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { agruparPorCategoria, recomendar, FEATURE_LABELS } from '@/lib/recommender'
import type {
  AprendizajeFactor,
  Categoria,
  Feedback,
  FeatureKey,
  MotivoDislike,
  Perfil,
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
  calendarConnected: boolean
  registrar: (partidoId: string, gusto: boolean, motivo?: MotivoDislike) => void
  quitar: (partidoId: string) => void
  resetFeedback: () => void
  onCalendarDisconnected?: () => void
}

function Aprendizaje({ deltas, onReset }: { deltas: AprendizajeFactor[]; onReset: () => void }) {
  if (deltas.length === 0) return null
  return (
    <div className="mb-4 rounded-md border border-border bg-muted/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium">Qué aprendí de tu feedback</span>
        <Button type="button" size="sm" variant="ghost" className="h-6 text-xs" onClick={onReset}>
          Reiniciar
        </Button>
      </div>
      <ul className="space-y-1">
        {deltas.map((d) => (
          <li key={d.factor} className="flex items-center gap-2 text-xs">
            {d.delta > 0 ? (
              <TrendingUp className="size-3.5 text-emerald-500" />
            ) : (
              <TrendingDown className="size-3.5 text-rose-500" />
            )}
            <span>
              {d.delta > 0 ? 'Te importa más' : 'Te importa menos'}:{' '}
              <strong>{FEATURE_LABELS[d.factor]}</strong>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Results({
  perfil,
  priors,
  porPartido,
  deltas,
  calendarConnected,
  registrar,
  quitar,
  resetFeedback,
  onCalendarDisconnected,
}: Props) {
  const grupos = useMemo(
    () => agruparPorCategoria(recomendar(perfil, priors)),
    [perfil, priors],
  )

  return (
    <div>
      <Aprendizaje deltas={deltas} onReset={resetFeedback} />
      <Tabs defaultValue="imperdible" className="w-full">
        <TabsList className="w-full">
          {ORDEN.map(({ cat, label }) => (
            <TabsTrigger key={cat} value={cat} className="flex-1">
              {label} ({grupos[cat].length})
            </TabsTrigger>
          ))}
        </TabsList>
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
                  onFeedback={(gusto, motivo) => registrar(e.partido.id, gusto, motivo)}
                  onClear={() => quitar(e.partido.id)}
                  onCalendarDisconnected={onCalendarDisconnected}
                />
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

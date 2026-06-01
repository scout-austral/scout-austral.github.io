import { useState } from 'react'
import { Check, Loader2, Sparkles, ThumbsDown, ThumbsUp } from 'lucide-react'
import { equipoPorCodigo } from '@/data'
import { justificar, nivelConfianza } from '@/lib/recommender'
import type {
  Categoria,
  Feedback,
  MotivoDislike,
  PartidoEvaluado,
  Perfil,
} from '@/lib/recommender/types'
import { FEATURE_LABELS } from '@/lib/recommender'
import { justificarConGemini } from '@/lib/justifyApi'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
const TOKEN_KEY = 'scout_auth_token'

const CATEGORIA_META: Record<Categoria, { label: string; clase: string }> = {
  imperdible: { label: 'Imperdible', clase: 'bg-emerald-600 text-white' },
  vale_la_pena: { label: 'Vale la pena', clase: 'bg-amber-500 text-black' },
  resumen: { label: 'Para ver el resumen', clase: 'bg-slate-600 text-white' },
}

const MOTIVOS: { motivo: MotivoDislike; label: string }[] = [
  { motivo: 'horario', label: 'El horario' },
  { motivo: 'nivel', label: 'El nivel de juego' },
  { motivo: 'sin_interes', label: 'No me interesaba' },
]

function CalendarIcon({ size = 14 }: { size?: number }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width={size} height={size}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="13" height="13">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function Equipo({ codigo }: { codigo: string }) {
  const e = equipoPorCodigo[codigo]
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-lg">{e?.bandera}</span>
      {e?.nombre ?? codigo}
    </span>
  )
}

interface Props {
  evaluado: PartidoEvaluado
  perfil: Perfil
  feedback?: Feedback
  calendarConnected: boolean
  scheduledMatches: Record<string, string>
  onFeedback: (gusto: boolean, motivo?: MotivoDislike) => void
  onClear: () => void
  onCalendarDisconnected?: () => void
  onScheduled?: (matchId: string, eventUrl: string) => void
}

export function MatchCard({ evaluado, perfil, feedback, calendarConnected, scheduledMatches, onFeedback, onClear, onCalendarDisconnected, onScheduled }: Props) {
  const { partido, factores, categoria, horaUsuario, afinidad } = evaluado
  const meta = CATEGORIA_META[categoria]
  const maxContrib = Math.max(...factores.map((f) => f.contribucion), 0.0001)

  const existingUrl = scheduledMatches[partido.id] ?? null
  const [aiText, setAiText] = useState<string | null>(null)
  const [estadoIA, setEstadoIA] = useState<'idle' | 'cargando' | 'error'>('idle')
  const [calendarState, setCalendarState] = useState<'idle' | 'loading' | 'done' | 'error' | 'reconnect'>(
    existingUrl ? 'done' : 'idle',
  )
  const [calendarUrl, setCalendarUrl] = useState<string | null>(existingUrl)

  async function mejorarConIA() {
    setEstadoIA('cargando')
    const t = await justificarConGemini(evaluado, perfil)
    if (t) { setAiText(t); setEstadoIA('idle') }
    else setEstadoIA('error')
  }

  async function agendarEnCalendar() {
    setCalendarState('loading')
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) { setCalendarState('error'); return }

    // El partido dura ~2 horas
    const start = new Date(partido.kickoff_utc)
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000)

    const localTeam = equipoPorCodigo[partido.local]
    const awayTeam = equipoPorCodigo[partido.visitante]
    const summary = `${localTeam?.bandera ?? ''} ${localTeam?.nombre ?? partido.local} vs ${awayTeam?.bandera ?? ''} ${awayTeam?.nombre ?? partido.visitante} | Mundial 2026`
    const description = [
      `Grupo ${partido.grupo} · Jornada ${partido.jornada}`,
      `Estadio: ${partido.sede}`,
      `Ciudad: ${partido.ciudad}, ${partido.pais}`,
      `Capacidad: ${partido.capacidad.toLocaleString()} personas`,
    ].join('\n')

    try {
      const res = await fetch(`${API_BASE_URL}/calendar/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          summary,
          description,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          location: `${partido.sede}, ${partido.ciudad}`,
        }),
      })
      const data = (await res.json()) as { eventUrl?: string; error?: string }
      if (res.ok && data.eventUrl) {
        setCalendarUrl(data.eventUrl)
        setCalendarState('done')
        onScheduled?.(partido.id, data.eventUrl)
      } else if (res.status === 403 || res.status === 401) {
        setCalendarState('reconnect')
        onCalendarDisconnected?.()
      } else {
        setCalendarState('error')
      }
    } catch {
      setCalendarState('error')
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="font-medium">
            <Equipo codigo={partido.local} /> <span className="text-muted-foreground">vs</span>{' '}
            <Equipo codigo={partido.visitante} />
          </div>
          <Badge className={meta.clase}>{meta.label}</Badge>
        </div>

        <div className="text-xs text-muted-foreground">
          Grupo {partido.grupo} · Fecha {partido.jornada} · {horaUsuario} · {partido.ciudad}
        </div>

        <div className="space-y-1">
          <p className="text-sm">{aiText ?? justificar(evaluado)}</p>
          <div className="flex items-center gap-2">
            {aiText ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <Sparkles className="size-3" /> Explicado con IA
              </span>
            ) : (
              <button
                type="button"
                onClick={mejorarConIA}
                disabled={estadoIA === 'cargando'}
                className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                {estadoIA === 'cargando' ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
                Mejorar con IA
              </button>
            )}
            {estadoIA === 'error' && (
              <span className="text-[10px] text-muted-foreground">IA no disponible</span>
            )}
          </div>
        </div>

        {factores.length > 0 && (
          <div className="space-y-1">
            {factores.slice(0, 4).map((f) => (
              <div key={f.factor} className="flex items-center gap-2 text-xs">
                <span className="w-32 shrink-0 text-muted-foreground">{FEATURE_LABELS[f.factor]}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded bg-muted">
                  <div className="h-full rounded bg-primary" style={{ width: `${(f.contribucion / maxContrib) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="text-[10px] text-muted-foreground">
            afinidad {(afinidad * 100).toFixed(0)}% · confianza {nivelConfianza(evaluado.incertidumbre)}
          </div>
          <div className="flex items-center gap-1.5">
            {/* Botón Agendar en Calendar */}
            {calendarState === 'done' ? (
              <a
                href={calendarUrl ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="mc-cal-btn mc-cal-btn--done"
                title="Ver en Google Calendar"
              >
                <CheckIcon />
                <span>Agendado</span>
              </a>
            ) : calendarState === 'reconnect' ? (
              <a
                href={`${API_BASE_URL}/auth/google/calendar?token=${localStorage.getItem('scout_auth_token') ?? ''}`}
                className="mc-cal-btn mc-cal-btn--reconnect"
                title="Reconectá tu calendario para poder agendar"
              >
                <CalendarIcon />
                <span>Reconectar</span>
              </a>
            ) : calendarConnected ? (
              <button
                type="button"
                className="mc-cal-btn"
                disabled={calendarState === 'loading'}
                onClick={agendarEnCalendar}
                title="Agendar en Google Calendar"
              >
                {calendarState === 'loading' ? (
                  <Loader2 className="animate-spin" style={{ width: 13, height: 13 }} />
                ) : (
                  <CalendarIcon />
                )}
                <span>{calendarState === 'error' ? 'Reintentar' : 'Agendar'}</span>
              </button>
            ) : (
              <a
                href={`${API_BASE_URL}/auth/google/calendar?token=${localStorage.getItem('scout_auth_token') ?? ''}`}
                className="mc-cal-btn mc-cal-btn--connect"
                title="Conectar Google Calendar para agendar"
              >
                <CalendarIcon />
                <span>Conectar</span>
              </a>
            )}

            {/* Feedback */}
            <Button
              type="button"
              size="icon"
              variant={feedback?.gusto === true ? 'default' : 'outline'}
              className="size-7"
              aria-label="Me gustó"
              onClick={() => (feedback?.gusto === true ? onClear() : onFeedback(true))}
            >
              <ThumbsUp className="size-3.5" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant={feedback?.gusto === false ? 'default' : 'outline'}
              className="size-7"
              aria-label="No me gustó"
              onClick={() => (feedback?.gusto === false ? onClear() : onFeedback(false))}
            >
              <ThumbsDown className="size-3.5" />
            </Button>
          </div>
        </div>

        {feedback?.gusto === false && (
          <div className="flex flex-wrap items-center gap-1 border-t border-border pt-2">
            <span className="text-xs text-muted-foreground">¿Qué no te gustó?</span>
            {MOTIVOS.map(({ motivo, label }) => {
              const activo = feedback.motivo === motivo
              return (
                <Button
                  key={motivo}
                  type="button"
                  size="sm"
                  variant={activo ? 'default' : 'outline'}
                  className="h-6 gap-1 px-2 text-xs"
                  onClick={() => onFeedback(false, activo ? undefined : motivo)}
                >
                  {activo && <Check className="size-3" />}
                  {label}
                </Button>
              )
            })}
            {feedback.motivo && (
              <span className="text-xs text-emerald-600">✓ anotado, lo tengo en cuenta</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

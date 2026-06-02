import { useState } from 'react'
import { Loader2, Sparkles, ThumbsDown, ThumbsUp, Check } from 'lucide-react'
import { equipoPorCodigo } from '@/data'
import { TeamFlag } from '@/components/TeamFlag'
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

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
const TOKEN_KEY = 'scout_auth_token'

const CATEGORIA_META: Record<Categoria, { label: string; mod: string }> = {
  imperdible:   { label: 'IMPERDIBLE',      mod: 'mc-imperdible' },
  vale_la_pena: { label: 'VALE LA PENA',    mod: 'mc-vale' },
  resumen:      { label: 'AL RESUMEN',      mod: 'mc-resumen' },
}

const MOTIVOS: { motivo: MotivoDislike; label: string }[] = [
  { motivo: 'horario',    label: 'El horario' },
  { motivo: 'nivel',      label: 'El nivel de juego' },
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

interface Props {
  evaluado: PartidoEvaluado
  perfil: Perfil
  feedback?: Feedback
  calendarConnected: boolean
  isLoggedIn: boolean
  scheduledMatches: Record<string, string>
  onFeedback: (gusto: boolean, motivo?: MotivoDislike) => void
  onClear: () => void
  onCalendarDisconnected?: () => void
  onScheduled?: (matchId: string, eventUrl: string) => void
}

export function MatchCard({
  evaluado, perfil, feedback, calendarConnected, isLoggedIn,
  scheduledMatches, onFeedback, onClear, onCalendarDisconnected, onScheduled,
}: Props) {
  const { partido, factores, categoria, horaUsuario, afinidad } = evaluado
  const meta = CATEGORIA_META[categoria]

  const localEquipo  = equipoPorCodigo[partido.local]
  const awayEquipo   = equipoPorCodigo[partido.visitante]

  const existingUrl = scheduledMatches[partido.id] ?? null
  const [aiText, setAiText]         = useState<string | null>(null)
  const [estadoIA, setEstadoIA]     = useState<'idle' | 'cargando' | 'error'>('idle')
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

    const start = new Date(partido.kickoff_utc)
    const end   = new Date(start.getTime() + 2 * 60 * 60 * 1000)
    const summary = `${localEquipo?.bandera ?? ''} ${localEquipo?.nombre ?? partido.local} vs ${awayEquipo?.bandera ?? ''} ${awayEquipo?.nombre ?? partido.visitante} | Mundial 2026`
    const description = [
      `Grupo ${partido.grupo} · Jornada ${partido.jornada}`,
      `Estadio: ${partido.sede}`,
      `Ciudad: ${partido.ciudad}, ${partido.pais}`,
    ].join('\n')

    try {
      const res = await fetch(`${API_BASE_URL}/calendar/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ summary, description, startTime: start.toISOString(), endTime: end.toISOString(), location: `${partido.sede}, ${partido.ciudad}` }),
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

  const topFactors = factores.slice(0, 3)

  return (
    <article className={`mc ${meta.mod}`}>
      {/* ── Header: categoría + meta ── */}
      <div className="mc-head">
        <span className="mc-cat-label">{meta.label}</span>
        <span className="mc-head-meta">
          Grupo {partido.grupo} · J{partido.jornada} · {partido.ciudad}
        </span>
      </div>

      {/* ── Match row: local — hora — visitante ── */}
      <div className="mc-match">
        <div className="mc-side mc-side--home">
          <TeamFlag code={partido.local} className="mc-flag-lg" />
          <span className="mc-team-name">{localEquipo?.nombre ?? partido.local}</span>
        </div>

        <div className="mc-center">
          <span className="mc-hora">{horaUsuario}</span>
          <span className="mc-vsep">VS</span>
        </div>

        <div className="mc-side mc-side--away">
          <span className="mc-team-name">{awayEquipo?.nombre ?? partido.visitante}</span>
          <TeamFlag code={partido.visitante} className="mc-flag-lg" />
        </div>
      </div>

      {/* ── Razón ── */}
      <p className="mc-reason">{aiText ?? justificar(evaluado)}</p>

      {/* ── Factors como tags ── */}
      {topFactors.length > 0 && (
        <div className="mc-tags">
          {topFactors.map((f) => (
            <span key={f.factor} className="mc-tag">{FEATURE_LABELS[f.factor]}</span>
          ))}
          <span className="mc-tag mc-tag--dim">{(afinidad * 100).toFixed(0)}% afinidad · {nivelConfianza(evaluado.incertidumbre)}</span>
        </div>
      )}

      {/* ── Footer: IA + calendar + feedback ── */}
      <div className="mc-footer">
        <div className="mc-footer-left">
          {aiText ? (
            <span className="mc-ia-done">
              <Sparkles size={11} /> Explicado con IA
            </span>
          ) : (
            <button
              type="button"
              className="mc-ia-btn"
              onClick={mejorarConIA}
              disabled={estadoIA === 'cargando'}
            >
              {estadoIA === 'cargando'
                ? <Loader2 size={11} className="mc-spin" />
                : <Sparkles size={11} />}
              {estadoIA === 'error' ? 'IA no disponible' : 'Ampliar con IA'}
            </button>
          )}
        </div>

        <div className="mc-footer-right">
          {/* Calendar */}
          {calendarState === 'done' ? (
            <a href={calendarUrl ?? undefined} target="_blank" rel="noopener noreferrer" className="mc-cal-btn mc-cal-btn--done">
              <Check size={12} /> Agendado
            </a>
          ) : calendarState === 'reconnect' ? (
            <a href={`${API_BASE_URL}/auth/google/calendar?token=${localStorage.getItem(TOKEN_KEY) ?? ''}`} className="mc-cal-btn mc-cal-btn--warn">
              <CalendarIcon /> Reconectar
            </a>
          ) : calendarConnected ? (
            <button type="button" className="mc-cal-btn" disabled={calendarState === 'loading'} onClick={agendarEnCalendar}>
              {calendarState === 'loading' ? <Loader2 size={12} className="mc-spin" /> : <CalendarIcon />}
              {calendarState === 'error' ? 'Reintentar' : 'Agendar'}
            </button>
          ) : !isLoggedIn ? (
            <a className="mc-cal-btn mc-cal-btn--ghost" href={`${API_BASE_URL}/auth/google`}>
              <CalendarIcon /> Iniciar sesión
            </a>
          ) : (
            <a className="mc-cal-btn mc-cal-btn--ghost" href={`${API_BASE_URL}/auth/google/calendar?token=${localStorage.getItem(TOKEN_KEY) ?? ''}`}>
              <CalendarIcon /> Conectar
            </a>
          )}

          {/* Feedback */}
          <button
            type="button"
            className={`mc-fb-btn${feedback?.gusto === true ? ' mc-fb-btn--on' : ''}`}
            aria-label="Me gustó"
            onClick={() => feedback?.gusto === true ? onClear() : onFeedback(true)}
          >
            <ThumbsUp size={13} />
          </button>
          <button
            type="button"
            className={`mc-fb-btn${feedback?.gusto === false ? ' mc-fb-btn--on' : ''}`}
            aria-label="No me gustó"
            onClick={() => feedback?.gusto === false ? onClear() : onFeedback(false)}
          >
            <ThumbsDown size={13} />
          </button>
        </div>
      </div>

      {/* ── Motivos dislike ── */}
      {feedback?.gusto === false && (
        <div className="mc-motivos">
          <span className="mc-motivos-label">¿Qué no te gustó?</span>
          {MOTIVOS.map(({ motivo, label }) => {
            const activo = feedback.motivo === motivo
            return (
              <button
                key={motivo}
                type="button"
                className={`mc-motivo-btn${activo ? ' mc-motivo-btn--on' : ''}`}
                onClick={() => onFeedback(false, activo ? undefined : motivo)}
              >
                {activo && <Check size={11} />} {label}
              </button>
            )
          })}
          {feedback.motivo && <span className="mc-motivos-ok">✓ anotado</span>}
        </div>
      )}
    </article>
  )
}

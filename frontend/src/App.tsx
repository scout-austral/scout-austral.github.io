import { useEffect, useState } from 'react'
import type { ComponentType } from 'react'
import {
  FaFutbol,
  FaHome,
  FaRegCalendarAlt,
  FaRegUser,
  FaTable,
} from 'react-icons/fa'
import flagAr from 'flag-icons/flags/4x3/ar.svg'
import flagAt from 'flag-icons/flags/4x3/at.svg'
import flagAu from 'flag-icons/flags/4x3/au.svg'
import flagBa from 'flag-icons/flags/4x3/ba.svg'
import flagBe from 'flag-icons/flags/4x3/be.svg'
import flagBr from 'flag-icons/flags/4x3/br.svg'
import flagCa from 'flag-icons/flags/4x3/ca.svg'
import flagCd from 'flag-icons/flags/4x3/cd.svg'
import flagCh from 'flag-icons/flags/4x3/ch.svg'
import flagCi from 'flag-icons/flags/4x3/ci.svg'
import flagCo from 'flag-icons/flags/4x3/co.svg'
import flagCv from 'flag-icons/flags/4x3/cv.svg'
import flagCw from 'flag-icons/flags/4x3/cw.svg'
import flagCz from 'flag-icons/flags/4x3/cz.svg'
import flagDe from 'flag-icons/flags/4x3/de.svg'
import flagDz from 'flag-icons/flags/4x3/dz.svg'
import flagEc from 'flag-icons/flags/4x3/ec.svg'
import flagEg from 'flag-icons/flags/4x3/eg.svg'
import flagEs from 'flag-icons/flags/4x3/es.svg'
import flagFr from 'flag-icons/flags/4x3/fr.svg'
import flagGbEng from 'flag-icons/flags/4x3/gb-eng.svg'
import flagGbSct from 'flag-icons/flags/4x3/gb-sct.svg'
import flagGh from 'flag-icons/flags/4x3/gh.svg'
import flagHt from 'flag-icons/flags/4x3/ht.svg'
import flagHr from 'flag-icons/flags/4x3/hr.svg'
import flagIq from 'flag-icons/flags/4x3/iq.svg'
import flagIr from 'flag-icons/flags/4x3/ir.svg'
import flagJo from 'flag-icons/flags/4x3/jo.svg'
import flagJp from 'flag-icons/flags/4x3/jp.svg'
import flagKr from 'flag-icons/flags/4x3/kr.svg'
import flagMa from 'flag-icons/flags/4x3/ma.svg'
import flagMx from 'flag-icons/flags/4x3/mx.svg'
import flagNl from 'flag-icons/flags/4x3/nl.svg'
import flagNo from 'flag-icons/flags/4x3/no.svg'
import flagNz from 'flag-icons/flags/4x3/nz.svg'
import flagPa from 'flag-icons/flags/4x3/pa.svg'
import flagPt from 'flag-icons/flags/4x3/pt.svg'
import flagPy from 'flag-icons/flags/4x3/py.svg'
import flagQa from 'flag-icons/flags/4x3/qa.svg'
import flagSa from 'flag-icons/flags/4x3/sa.svg'
import flagSe from 'flag-icons/flags/4x3/se.svg'
import flagSn from 'flag-icons/flags/4x3/sn.svg'
import flagTn from 'flag-icons/flags/4x3/tn.svg'
import flagTr from 'flag-icons/flags/4x3/tr.svg'
import flagUs from 'flag-icons/flags/4x3/us.svg'
import flagUy from 'flag-icons/flags/4x3/uy.svg'
import flagUz from 'flag-icons/flags/4x3/uz.svg'
import flagZa from 'flag-icons/flags/4x3/za.svg'
import { equipos, partidos } from './data'
import type { Grupo } from './data/types'
import './App.css'
import { useProfile } from '@/hooks/useProfile'
import { useFeedback } from '@/hooks/useFeedback'
import { Results } from '@/components/Results'
import { FranjasFilter } from '@/components/FranjasFilter'
import { ProfilePage } from '@/components/ProfilePage'
import { OnboardingFlow } from '@/components/OnboardingFlow'
import type { Perfil } from '@/lib/recommender/types'

function needsOnboarding(perfil: Perfil): boolean {
  if (localStorage.getItem('scout_onboarding_done')) return false
  return perfil.equiposFavoritos.length === 0 && !perfil.importancia
}

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
const TOKEN_KEY = 'scout_auth_token'

type Page = 'inicio' | 'fixture' | 'calendario' | 'perfil'

type User = {
  id: string
  email: string
  name?: string | null
  calendarConnected: boolean
}

const navItems: Array<{
  page: Page
  label: string
  href: string
  icon: ComponentType<{ 'aria-hidden'?: boolean }>
}> = [
  { page: 'inicio', label: 'Inicio', href: '/', icon: FaHome },
  { page: 'fixture', label: 'Fixture', href: '/fixture', icon: FaTable },
  { page: 'calendario', label: 'Calendario', href: '/calendario', icon: FaRegCalendarAlt },
  { page: 'perfil', label: 'Perfil', href: '/perfil', icon: FaRegUser },
]

const flagByTeamCode: Record<string, string> = {
  ALG: flagDz,
  ARG: flagAr,
  AUS: flagAu,
  AUT: flagAt,
  BEL: flagBe,
  BIH: flagBa,
  BRA: flagBr,
  CAN: flagCa,
  CIV: flagCi,
  COD: flagCd,
  COL: flagCo,
  CPV: flagCv,
  CRO: flagHr,
  CUW: flagCw,
  CZE: flagCz,
  ECU: flagEc,
  EGY: flagEg,
  ENG: flagGbEng,
  ESP: flagEs,
  FRA: flagFr,
  GER: flagDe,
  GHA: flagGh,
  HAI: flagHt,
  IRN: flagIr,
  IRQ: flagIq,
  JOR: flagJo,
  JPN: flagJp,
  KOR: flagKr,
  KSA: flagSa,
  MAR: flagMa,
  MEX: flagMx,
  NED: flagNl,
  NOR: flagNo,
  NZL: flagNz,
  PAN: flagPa,
  PAR: flagPy,
  POR: flagPt,
  QAT: flagQa,
  RSA: flagZa,
  SCO: flagGbSct,
  SEN: flagSn,
  SUI: flagCh,
  SWE: flagSe,
  TUN: flagTn,
  TUR: flagTr,
  URU: flagUy,
  USA: flagUs,
  UZB: flagUz,
}

const grupos = Array.from(new Set(equipos.map((equipo) => equipo.grupo))).sort() as Grupo[]

function TeamFlag({ code }: { code: string }) {
  const flagSrc = flagByTeamCode[code]
  if (!flagSrc) return <span className="flag-fallback">{code}</span>
  return <img alt="" aria-hidden="true" className="team-flag" src={flagSrc} />
}

function getPageFromPath(): Page {
  const path = window.location.pathname
  if (path.startsWith('/fixture')) return 'fixture'
  if (path.startsWith('/calendario')) return 'calendario'
  if (path.startsWith('/perfil')) return 'perfil'
  return 'inicio'
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M21.6 12.23c0-.74-.07-1.45-.19-2.13H12v4.03h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.32 2.98-7.43Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.7 0 4.97-.9 6.62-2.34l-3.24-2.51c-.9.6-2.04.95-3.38.95-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A10 10 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.41 13.98a6 6 0 0 1 0-3.96V7.43H3.07a10 10 0 0 0 0 9.14l3.34-2.59Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.9c1.47 0 2.8.51 3.84 1.5l2.86-2.86A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.43l3.34 2.59C7.2 7.66 9.4 5.9 12 5.9Z"
        fill="#EA4335"
      />
    </svg>
  )
}

function FieldLines({ side }: { side: 'left' | 'right' }) {
  const isLeft = side === 'left'
  const W = 88
  const H = 520
  const vx = isLeft ? 1.5 : W - 1.5
  const penaltyTop = 160
  const penaltyBot = 360
  const areaLen = 72
  const spotY = (penaltyTop + penaltyBot) / 2
  const spotX = isLeft ? vx + 52 : vx - 52
  return (
    <svg
      aria-hidden="true"
      className={`field-lines field-lines--${side}`}
      fill="none"
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      width={W}
    >
      <line stroke="white" strokeOpacity="0.18" strokeWidth="1.5" x1={vx} x2={vx} y1={0} y2={H} />
      <line stroke="white" strokeOpacity="0.18" strokeWidth="1.5"
        x1={vx} x2={isLeft ? vx + areaLen : vx - areaLen} y1={penaltyTop} y2={penaltyTop} />
      <line stroke="white" strokeOpacity="0.18" strokeWidth="1.5"
        x1={vx} x2={isLeft ? vx + areaLen : vx - areaLen} y1={penaltyBot} y2={penaltyBot} />
      <line stroke="white" strokeOpacity="0.18" strokeWidth="1.5"
        x1={isLeft ? vx + areaLen : vx - areaLen}
        x2={isLeft ? vx + areaLen : vx - areaLen}
        y1={penaltyTop} y2={penaltyBot} />
      <circle cx={spotX} cy={spotY} r={2.5} fill="white" fillOpacity="0.25" />
    </svg>
  )
}

function App() {
  const [page, setPage] = useState<Page>(getPageFromPath)
  const [user, setUser] = useState<User | null>(null)
  const [authChecked, setAuthChecked] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return !params.get('token') && !localStorage.getItem(TOKEN_KEY)
  })
  const [authError] = useState(() => {
    const err = new URLSearchParams(window.location.search).get('auth_error')
    return err ? `Error: ${decodeURIComponent(err)}` : ''
  })

  const { perfil, actualizar, reset: resetPerfil } = useProfile()
  const { priors, deltas, porPartido, registrar, quitar, reset: resetFeedback } =
    useFeedback(perfil)

  useEffect(() => {
    const onPopState = () => setPage(getPageFromPath())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tokenFromGoogle = params.get('token')

    if (params.get('auth_error')) {
      window.history.replaceState({}, '', window.location.pathname)
    }

    if (tokenFromGoogle) {
      localStorage.setItem(TOKEN_KEY, tokenFromGoogle)
      window.history.replaceState({}, '', window.location.pathname)
    }

    const calendarJustConnected = !!params.get('calendar_connected')
    if (calendarJustConnected) {
      window.history.replaceState({}, '', window.location.pathname)
    }

    const token = tokenFromGoogle ?? localStorage.getItem(TOKEN_KEY)
    if (!token) return

    fetch(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        if (!response.ok) {
          localStorage.removeItem(TOKEN_KEY)
          return
        }
        const data = (await response.json()) as { user: User }
        setUser(data.user)
      })
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setAuthChecked(true))
  }, [])

  function navigate(href: string, nextPage: Page) {
    window.history.pushState({}, '', href)
    setPage(nextPage)
  }

  function signOut() {
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
    navigate('/', 'inicio')
  }

  function connectCalendar() {
    const token = localStorage.getItem(TOKEN_KEY)
    window.location.href = `${API_BASE_URL}/auth/google/calendar?token=${token}`
  }

  return (
    <main className="page">
      <FieldLines side="left" />
      <FieldLines side="right" />
      <header className="topbar">
        <a className="brand" href="/">
          <FaFutbol aria-hidden="true" />
          <span>SCOUT</span>
        </a>
        {authChecked && user && (
          <nav className="primary-nav" aria-label="Navegacion principal">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <a
                  aria-current={page === item.page ? 'page' : undefined}
                  href={item.href}
                  key={item.page}
                  onClick={(event) => {
                    event.preventDefault()
                    navigate(item.href, item.page)
                  }}
                >
                  <Icon aria-hidden />
                  {item.label}
                </a>
              )
            })}
          </nav>
        )}
        <nav className="user-actions" aria-label="Cuenta">
          {!authChecked ? null : user ? (
            <>
              {!user.calendarConnected && (
                <button className="calendar-button" type="button" onClick={connectCalendar}>
                  <FaRegCalendarAlt aria-hidden="true" />
                  Conectar Calendar
                </button>
              )}
              <button className="sign-out-button" type="button" onClick={signOut}>
                Cerrar sesion
              </button>
            </>
          ) : (
            <a className="google-nav-button" href={`${API_BASE_URL}/auth/google`}>
              <GoogleIcon />
              Entrar con Google
            </a>
          )}
        </nav>
      </header>

      {authError && <p className="auth-error">{authError}</p>}

      {!authChecked ? null : user && needsOnboarding(perfil) ? (
        <OnboardingFlow
          actualizar={actualizar}
          onDone={() => { /* re-render automático via actualizar() */ }}
        />
      ) : !authChecked ? null : user ? (
        <AppPage
          page={page}
          user={user}
          perfil={perfil}
          actualizar={actualizar}
          resetPerfil={resetPerfil}
          priors={priors}
          deltas={deltas}
          porPartido={porPartido}
          registrar={registrar}
          quitar={quitar}
          resetFeedback={resetFeedback}
          calendarConnected={user.calendarConnected}
        />
      ) : (
        <LandingPage perfil={perfil} actualizar={actualizar} />
      )}
    </main>
  )
}

function LandingPage(_: { perfil: Perfil; actualizar: (cambios: Partial<Perfil>) => void }) {
  return (
    <section className="content-shell landing-page">
      <div className="landing-hero">
        <FaFutbol className="landing-hero-icon" aria-hidden="true" />
        <h1 className="landing-title">Tu tiempo, tu Mundial.</h1>
        <p className="landing-subtitle">
          Scout clasifica los 72 partidos del Mundial 2026 según tu afinidad y disponibilidad.
          Iniciá sesión para ver tus recomendaciones personalizadas.
        </p>
        <a className="google-nav-button landing-cta" href={`${API_BASE_URL}/auth/google`}>
          <GoogleIcon />
          Entrar con Google
        </a>
      </div>
    </section>
  )
}

function AppPage({
  page,
  user,
  perfil,
  actualizar,
  resetPerfil,
  priors,
  deltas,
  porPartido,
  registrar,
  quitar,
  resetFeedback,
  calendarConnected,
}: {
  page: Page
  user: User
  perfil: Perfil
  actualizar: (cambios: Partial<Perfil>) => void
  resetPerfil: () => void
  priors: Parameters<typeof Results>[0]['priors']
  deltas: Parameters<typeof Results>[0]['deltas']
  porPartido: Parameters<typeof Results>[0]['porPartido']
  registrar: Parameters<typeof Results>[0]['registrar']
  quitar: Parameters<typeof Results>[0]['quitar']
  resetFeedback: Parameters<typeof Results>[0]['resetFeedback']
  calendarConnected: boolean
}) {
  if (page === 'fixture') return <FixturePage />
  if (page === 'calendario') return <CalendarPage />

  if (page === 'perfil') {
    return (
      <section className="content-shell">
        <div className="section-heading">
          <h1>{user.name ?? user.email}</h1>
        </div>
        <ProfilePage perfil={perfil} actualizar={actualizar} reset={resetPerfil} />
      </section>
    )
  }

  // Inicio
  const sinEquipo = perfil.equiposFavoritos.length === 0
  return (
    <section className="content-shell">
      <div className="inicio-layout">
        <div className="inicio-results">
          {sinEquipo && (
            <div className="inicio-hint">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
              Agregá tu selección favorita en{' '}
              <button
                type="button"
                className="inicio-hint-link"
                onClick={() => {
                  window.history.pushState({}, '', '/perfil')
                  window.dispatchEvent(new PopStateEvent('popstate'))
                }}
              >
                Perfil
              </button>{' '}
              para ver imperdibles personalizados.
            </div>
          )}
          <Results
            perfil={perfil}
            priors={priors}
            porPartido={porPartido}
            deltas={deltas}
            calendarConnected={calendarConnected}
            registrar={registrar}
            quitar={quitar}
            resetFeedback={resetFeedback}
          />
        </div>
        <aside className="inicio-sidebar">
          <FranjasFilter perfil={perfil} actualizar={actualizar} />
        </aside>
      </div>
    </section>
  )
}

// ─── Knockout bracket data ───────────────────────────────────────────────────

type BMatch = { id: string; home: string; away: string }

const SLOT_H = 96

const L_R32: BMatch[] = [
  { id: 'M49', home: '1A', away: '2B' },
  { id: 'M50', home: '1C', away: '2D' },
  { id: 'M51', home: '1E', away: '2F' },
  { id: 'M52', home: '1G', away: '2H' },
  { id: 'M53', home: '1I', away: '2J' },
  { id: 'M54', home: '1K', away: '2L' },
  { id: 'M55', home: '3°', away: '3°' },
  { id: 'M56', home: '3°', away: '3°' },
]
const L_R16: BMatch[] = [
  { id: 'M65', home: 'G M49', away: 'G M50' },
  { id: 'M66', home: 'G M51', away: 'G M52' },
  { id: 'M67', home: 'G M53', away: 'G M54' },
  { id: 'M68', home: 'G M55', away: 'G M56' },
]
const L_QF: BMatch[] = [
  { id: 'M73', home: 'G M65', away: 'G M66' },
  { id: 'M74', home: 'G M67', away: 'G M68' },
]
const L_SF: BMatch[] = [{ id: 'M77', home: 'G M73', away: 'G M74' }]

const R_R32: BMatch[] = [
  { id: 'M57', home: '2A', away: '1B' },
  { id: 'M58', home: '2C', away: '1D' },
  { id: 'M59', home: '2E', away: '1F' },
  { id: 'M60', home: '2G', away: '1H' },
  { id: 'M61', home: '2I', away: '1J' },
  { id: 'M62', home: '2K', away: '1L' },
  { id: 'M63', home: '3°', away: '3°' },
  { id: 'M64', home: '3°', away: '3°' },
]
const R_R16: BMatch[] = [
  { id: 'M69', home: 'G M57', away: 'G M58' },
  { id: 'M70', home: 'G M59', away: 'G M60' },
  { id: 'M71', home: 'G M61', away: 'G M62' },
  { id: 'M72', home: 'G M63', away: 'G M64' },
]
const R_QF: BMatch[] = [
  { id: 'M75', home: 'G M69', away: 'G M70' },
  { id: 'M76', home: 'G M71', away: 'G M72' },
]
const R_SF: BMatch[] = [{ id: 'M78', home: 'G M75', away: 'G M76' }]

const FINAL_MATCH: BMatch = { id: 'M79', home: 'G M77', away: 'G M78' }
const THIRD_MATCH: BMatch = { id: 'M80', home: 'P M77', away: 'P M78' }

const LEFT_ROUNDS = [
  { label: '32avos', matches: L_R32 },
  { label: 'Octavos', matches: L_R16 },
  { label: 'Cuartos', matches: L_QF },
  { label: 'Semis', matches: L_SF },
]

const RIGHT_ROUNDS = [
  { label: 'Semis', matches: R_SF },
  { label: 'Cuartos', matches: R_QF },
  { label: 'Octavos', matches: R_R16 },
  { label: '32avos', matches: R_R32 },
]

function BCard({ match, third = false }: { match: BMatch; third?: boolean }) {
  return (
    <div className={`b-card${third ? ' b-card--third' : ''}`}>
      <span className="b-id">{match.id}</span>
      <div className="b-team">{match.home}</div>
      <div className="b-divider" />
      <div className="b-team">{match.away}</div>
    </div>
  )
}

function BCol({
  round,
  totalH,
  side,
  last,
}: {
  round: { label: string; matches: BMatch[] }
  totalH: number
  side: 'left' | 'right'
  last: boolean
}) {
  const slotH = totalH / round.matches.length
  return (
    <div className="b-col">
      <div className="b-col-label">{round.label}</div>
      <div className="b-slots" style={{ height: totalH }}>
        {round.matches.map((match) => (
          <div
            key={match.id}
            className={`b-slot b-slot--${side}${last ? ' b-slot--last' : ''}`}
            style={{ height: slotH }}
          >
            <BCard match={match} />
          </div>
        ))}
      </div>
    </div>
  )
}

function KnockoutBracket() {
  const totalH = 8 * SLOT_H
  return (
    <div className="b-wrap">
      <div className="b-half b-half--left">
        {LEFT_ROUNDS.map((round, i) => (
          <BCol
            key={round.label + 'L'}
            round={round}
            totalH={totalH}
            side="left"
            last={i === LEFT_ROUNDS.length - 1}
          />
        ))}
      </div>
      <div className="b-center" style={{ height: totalH + 22 }}>
        <div className="b-center-inner">
          <div className="b-col-label">Final</div>
          <BCard match={FINAL_MATCH} />
          <div className="b-col-label b-col-label--gap">3er Puesto</div>
          <BCard match={THIRD_MATCH} third />
        </div>
      </div>
      <div className="b-half b-half--right">
        {RIGHT_ROUNDS.map((round, i) => (
          <BCol
            key={round.label + 'R'}
            round={round}
            totalH={totalH}
            side="right"
            last={i === 0}
          />
        ))}
      </div>
    </div>
  )
}

// ─── FixturePage ──────────────────────────────────────────────────────────────

function FixturePage() {
  const [tab, setTab] = useState<'grupos' | 'eliminatorias'>('grupos')
  const [selectedGroup, setSelectedGroup] = useState<Grupo | null>(null)
  const selectedMatches = selectedGroup
    ? partidos.filter((partido) => partido.grupo === selectedGroup)
    : []

  return (
    <section className="content-shell">
      <div className="section-heading">
        <h1>Fixture</h1>
      </div>

      <div className="fixture-tabs">
        <button
          className={`fixture-tab${tab === 'grupos' ? ' fixture-tab--active' : ''}`}
          type="button"
          onClick={() => setTab('grupos')}
        >
          Grupos
        </button>
        <button
          className={`fixture-tab${tab === 'eliminatorias' ? ' fixture-tab--active' : ''}`}
          type="button"
          onClick={() => setTab('eliminatorias')}
        >
          Eliminatorias
        </button>
      </div>

      {tab === 'grupos' && (
        <>
          <div className="groups-grid">
            {grupos.map((grupo) => {
              const groupTeams = equipos.filter((equipo) => equipo.grupo === grupo)
              return (
                <button
                  className="group-card"
                  key={grupo}
                  type="button"
                  onClick={() => setSelectedGroup(grupo)}
                >
                  <span className="group-title">Grupo {grupo}</span>
                  <span className="group-team-list">
                    {groupTeams.map((equipo) => (
                      <span className="group-team-mini" key={equipo.codigo}>
                        <TeamFlag code={equipo.codigo} />
                        {equipo.codigo}
                      </span>
                    ))}
                  </span>
                </button>
              )
            })}
          </div>

          {selectedGroup && (
            <div
              className="modal-backdrop"
              role="presentation"
              onClick={() => setSelectedGroup(null)}
            >
              <section
                aria-labelledby="group-modal-title"
                aria-modal="true"
                className="group-modal"
                role="dialog"
                onClick={(event) => event.stopPropagation()}
              >
                <header className="group-modal-header">
                  <div>
                    <h2 id="group-modal-title">Grupo {selectedGroup}</h2>
                  </div>
                  <button type="button" onClick={() => setSelectedGroup(null)}>
                    Cerrar
                  </button>
                </header>
                <div className="group-matches">
                  {selectedMatches.map((partido) => (
                    <article className="group-match" key={partido.id}>
                      <div className="match-teams">
                        <span>
                          <TeamFlag code={partido.local} />
                          {partido.local}
                        </span>
                        <strong>vs</strong>
                        <span>
                          <TeamFlag code={partido.visitante} />
                          {partido.visitante}
                        </span>
                      </div>
                      <div className="match-meta">
                        {partido.fecha} · {partido.hora_local} · {partido.sede}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          )}
        </>
      )}

      {tab === 'eliminatorias' && <KnockoutBracket />}
    </section>
  )
}

// ─── CalendarPage ─────────────────────────────────────────────────────────────

const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTHS_ES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
]

function getKnockoutLabel(dateStr: string): string | null {
  const [y, m, d] = dateStr.split('-').map(Number)
  if (y !== 2026) return null
  if (m === 6 && d >= 27) return 'Octavos de final'
  if (m === 7 && d <= 2) return 'Octavos de final'
  if (m === 7 && d >= 4 && d <= 7) return 'Cuartos de final'
  if (m === 7 && d >= 9 && d <= 15) return 'Semifinales'
  if (m === 7 && d === 18) return 'Tercer puesto'
  if (m === 7 && d === 19) return 'Final'
  return null
}

function generateCalendarDays(): string[] {
  const days: string[] = []
  for (let m = 6; m <= 7; m++) {
    const startD = m === 6 ? 11 : 1
    const endD = m === 6 ? 30 : 19
    for (let d = startD; d <= endD; d++) {
      days.push(`2026-0${m}-${String(d).padStart(2, '0')}`)
    }
  }
  return days
}

const CALENDAR_DAYS = generateCalendarDays()

function CalendarPage() {
  const [selectedDay, setSelectedDay] = useState(CALENDAR_DAYS[0])

  const matchesByDate = partidos.reduce<Record<string, typeof partidos>>(
    (acc, partido) => {
      const key = partido.fecha
      if (!acc[key]) acc[key] = []
      acc[key].push(partido)
      return acc
    },
    {},
  )

  const dayMatches = matchesByDate[selectedDay] ?? []
  const knockoutLabel = getKnockoutLabel(selectedDay)
  const [, m, d] = selectedDay.split('-').map(Number)
  const date = new Date(2026, m - 1, d)
  const fullLabel = `${['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][date.getDay()]} ${d} ${['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][m - 1]} 2026`

  return (
    <section className="cal-page">
      <div className="cal-strip-wrap">
        <div className="cal-strip">
          {CALENDAR_DAYS.map((dateStr) => {
            const [, dm, dd] = dateStr.split('-').map(Number)
            const dt = new Date(2026, dm - 1, dd)
            const dow = DAYS_ES[dt.getDay()]
            return (
              <button
                key={dateStr}
                className={`cal-day-btn${dateStr === selectedDay ? ' cal-day-btn--active' : ''}`}
                type="button"
                onClick={() => setSelectedDay(dateStr)}
              >
                <span className="cal-day-dow">{dow}</span>
                <span className="cal-day-num">{dd} {MONTHS_ES[dm - 1]}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="cal-content content-shell">
        <h2 className="cal-day-title">{fullLabel}</h2>

        {dayMatches.length > 0 && (
          <div className="cal-matches">
            {dayMatches.map((partido) => (
              <article className="cal-match-card" key={partido.id}>
                <div className="cal-match-meta">Fase de grupos · Grupo {partido.grupo}</div>
                <div className="cal-match-row">
                  <span className="cal-team cal-team--home">
                    {partido.local}
                    <TeamFlag code={partido.local} />
                  </span>
                  <span className="cal-time">{partido.hora_local}</span>
                  <span className="cal-team cal-team--away">
                    <TeamFlag code={partido.visitante} />
                    {partido.visitante}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}

        {knockoutLabel && dayMatches.length === 0 && (
          <div className="cal-matches">
            <article className="cal-match-card">
              <div className="cal-match-meta">{knockoutLabel}</div>
              <div className="cal-match-row">
                <span className="cal-team cal-team--home">Por definir</span>
                <span className="cal-time">—</span>
                <span className="cal-team cal-team--away">Por definir</span>
              </div>
            </article>
          </div>
        )}

        {dayMatches.length === 0 && !knockoutLabel && (
          <p className="cal-empty">Sin partidos programados</p>
        )}
      </div>
    </section>
  )
}

export default App

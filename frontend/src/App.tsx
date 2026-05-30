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
  {
    page: 'fixture',
    label: 'Fixture',
    href: '/fixture',
    icon: FaTable,
  },
  {
    page: 'calendario',
    label: 'Calendario',
    href: '/calendario',
    icon: FaRegCalendarAlt,
  },
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

  if (!flagSrc) {
    return <span className="flag-fallback">{code}</span>
  }

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
  const vx = isLeft ? 1 : W - 1
  const hLines = [
    { y: 130, len: 70 },
    { y: 190, len: 38 },
    { y: 330, len: 38 },
    { y: 390, len: 70 },
  ]
  return (
    <svg
      aria-hidden="true"
      className={`field-lines field-lines--${side}`}
      fill="none"
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      width={W}
    >
      <line stroke="white" strokeOpacity="0.12" strokeWidth="1" x1={vx} x2={vx} y1={0} y2={H} />
      {hLines.map(({ y, len }) => (
        <line
          key={y}
          stroke="white"
          strokeOpacity="0.12"
          strokeWidth="1"
          x1={vx}
          x2={isLeft ? vx + len : vx - len}
          y1={y}
          y2={y}
        />
      ))}
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

    if (params.get('calendar_connected')) {
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
                <button
                  className="calendar-button"
                  type="button"
                  onClick={connectCalendar}
                >
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
      {!authChecked ? null : user ? (
        <AppPage page={page} user={user} />
      ) : (
        <Landing />
      )}
    </main>
  )
}

function Landing() {
  return null
}

function AppPage({
  page,
  user,
}: {
  page: Page
  user: User
}) {
  if (page === 'fixture') {
    return <FixturePage />
  }

  if (page === 'calendario') {
    return <CalendarPage />
  }

  if (page === 'perfil') {
    return (
      <section className="content-shell">
        <div className="section-heading">
          <h1>{user.name ?? user.email}</h1>
        </div>
      </section>
    )
  }

  return (
    <section className="content-shell">
      <div className="section-heading">
        <h1>Bienvenido.</h1>
      </div>
    </section>
  )
}

// ─── Knockout bracket data ───────────────────────────────────────────────────

const R32_MATCHES = [
  { id: 'M49', home: '1A', away: '2B' },
  { id: 'M50', home: '1C', away: '2D' },
  { id: 'M51', home: '1E', away: '2F' },
  { id: 'M52', home: '1G', away: '2H' },
  { id: 'M53', home: '1I', away: '2J' },
  { id: 'M54', home: '1K', away: '2L' },
  { id: 'M55', home: '3°', away: '3°' },
  { id: 'M56', home: '3°', away: '3°' },
  { id: 'M57', home: '2A', away: '1B' },
  { id: 'M58', home: '2C', away: '1D' },
  { id: 'M59', home: '2E', away: '1F' },
  { id: 'M60', home: '2G', away: '1H' },
  { id: 'M61', home: '2I', away: '1J' },
  { id: 'M62', home: '2K', away: '1L' },
  { id: 'M63', home: '3°', away: '3°' },
  { id: 'M64', home: '3°', away: '3°' },
]

function buildRound(
  prevIds: string[],
  startId: number,
  prefix = 'G',
): Array<{ id: string; home: string; away: string }> {
  const matches = []
  for (let i = 0; i < prevIds.length; i += 2) {
    matches.push({
      id: `M${startId + i / 2}`,
      home: `G ${prevIds[i]}`,
      away: `G ${prevIds[i + 1]}`,
    })
  }
  return matches
}

const R16_MATCHES = buildRound(
  R32_MATCHES.map((m) => m.id),
  65,
)
const QF_MATCHES = buildRound(
  R16_MATCHES.map((m) => m.id),
  73,
)
const SF_MATCHES = buildRound(
  QF_MATCHES.map((m) => m.id),
  77,
)
const FINAL_MATCHES = [
  { id: 'M79', home: `G ${SF_MATCHES[0].id}`, away: `G ${SF_MATCHES[1].id}` },
]
const THIRD_PLACE = [
  { id: 'M80', home: `P ${SF_MATCHES[0].id}`, away: `P ${SF_MATCHES[1].id}` },
]

const BRACKET_ROUNDS = [
  { label: 'Octavos', matches: R32_MATCHES },
  { label: 'Cuartos de final', matches: R16_MATCHES },
  { label: 'Semifinales', matches: QF_MATCHES },
  { label: 'Final', matches: [...FINAL_MATCHES, ...THIRD_PLACE] },
]

// ─── KnockoutBracket ─────────────────────────────────────────────────────────

function BracketMatchCard({
  matchId,
  home,
  away,
  isThirdPlace = false,
}: {
  matchId: string
  home: string
  away: string
  isThirdPlace?: boolean
}) {
  return (
    <div className={`bracket-match${isThirdPlace ? ' bracket-match--third' : ''}`}>
      <span className="bracket-match-id">{matchId}</span>
      <div className="bracket-slot">{home}</div>
      <div className="bracket-divider" />
      <div className="bracket-slot">{away}</div>
    </div>
  )
}

function KnockoutBracket() {
  return (
    <div className="bracket-scroll">
      <div className="bracket-container">
        {BRACKET_ROUNDS.map((round, roundIdx) => {
          const isFinalRound = roundIdx === BRACKET_ROUNDS.length - 1
          return (
            <div className="bracket-round" key={round.label}>
              <div className="bracket-round-label">{round.label}</div>
              <div className={`bracket-round-matches${isFinalRound ? ' bracket-round-matches--final' : ''}`}>
                {round.matches.map((match, matchIdx) => {
                  const isThirdPlace = isFinalRound && matchIdx === 1
                  return (
                    <div
                      className={`bracket-match-wrapper${isFinalRound ? ' bracket-match-wrapper--final' : ''}`}
                      key={match.id}
                    >
                      <BracketMatchCard
                        matchId={match.id}
                        home={match.home}
                        away={match.away}
                        isThirdPlace={isThirdPlace}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
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

function formatDayHeader(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const dow = DAYS_ES[date.getDay()]
  const mon = MONTHS_ES[m - 1]
  return `${dow} ${d} ${mon}`
}

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
  // June 11 → July 19, 2026
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
  const matchesByDate = partidos.reduce<Record<string, typeof partidos>>(
    (acc, partido) => {
      const key = partido.fecha
      if (!acc[key]) acc[key] = []
      acc[key].push(partido)
      return acc
    },
    {},
  )

  return (
    <section className="content-shell">
      <div className="section-heading">
        <h1>Calendario</h1>
      </div>

      <div className="calendar-list">
        {CALENDAR_DAYS.map((dateStr) => {
          const groupMatches = matchesByDate[dateStr] ?? []
          const knockoutLabel = getKnockoutLabel(dateStr)
          const hasContent = groupMatches.length > 0 || knockoutLabel !== null

          return (
            <div className="calendar-day" key={dateStr}>
              <div className="calendar-day-header">
                {formatDayHeader(dateStr)}
              </div>

              {groupMatches.length > 0 && groupMatches.map((partido) => (
                <article className="calendar-match-item" key={partido.id}>
                  <div className="calendar-match-teams">
                    <span className="calendar-match-team">
                      <TeamFlag code={partido.local} />
                      {partido.local}
                    </span>
                    <span className="calendar-match-vs">vs</span>
                    <span className="calendar-match-team">
                      <TeamFlag code={partido.visitante} />
                      {partido.visitante}
                    </span>
                  </div>
                  <div className="calendar-match-meta">
                    {partido.hora_local} · {partido.sede}
                  </div>
                </article>
              ))}

              {knockoutLabel && groupMatches.length === 0 && (
                <article className="calendar-match-item calendar-match-item--knockout">
                  <div className="calendar-match-round">{knockoutLabel}</div>
                  <div className="calendar-match-teams">
                    <span className="calendar-match-tbd">Por definir</span>
                    <span className="calendar-match-vs">vs</span>
                    <span className="calendar-match-tbd">Por definir</span>
                  </div>
                </article>
              )}

              {!hasContent && (
                <p className="calendar-no-matches">Sin partidos programados</p>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default App

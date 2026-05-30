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

function FixturePage() {
  const [selectedGroup, setSelectedGroup] = useState<Grupo | null>(null)
  const selectedMatches = selectedGroup
    ? partidos.filter((partido) => partido.grupo === selectedGroup)
    : []

  return (
    <section className="content-shell">
      <div className="section-heading">
        <h1>Fixture</h1>
      </div>

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
    </section>
  )
}

function CalendarPage() {
  return (
    <section className="content-shell">
      <div className="section-heading">
        <h1>Calendario</h1>
      </div>
    </section>
  )
}

export default App

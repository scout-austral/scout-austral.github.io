import { useEffect, useState } from 'react'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
const TOKEN_KEY = 'scout_auth_token'

type User = {
  id: string
  email: string
  name?: string | null
  calendarConnected: boolean
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

function CalendarIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 16H5V10h14v10ZM5 8V6h14v2H5Z" />
    </svg>
  )
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [authError] = useState(() => {
    const err = new URLSearchParams(window.location.search).get('auth_error')
    return err ? `Error: ${decodeURIComponent(err)}` : ''
  })

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tokenFromGoogle = params.get('token')

    if (params.get('auth_error')) {
      window.history.replaceState({}, '', window.location.pathname)
      return
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
  }, [])

  function signOut() {
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
  }

  function connectCalendar() {
    const token = localStorage.getItem(TOKEN_KEY)
    window.location.href = `${API_BASE_URL}/auth/google/calendar?token=${token}`
  }

  return (
    <main className="page">
      <header className="topbar">
        <a className="brand" href="/">
          Scout
        </a>
        <nav>
          {user ? (
            <>
              {!user.calendarConnected && (
                <button className="calendar-button" type="button" onClick={connectCalendar}>
                  <CalendarIcon />
                  Conectar Calendar
                </button>
              )}
              {user.calendarConnected && (
                <span className="calendar-connected">
                  <CalendarIcon />
                  Calendar conectado
                </span>
              )}
              <span className="user-label">{user.name ?? user.email}</span>
              <button className="nav-link" type="button" onClick={signOut}>
                Cerrar sesión
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
    </main>
  )
}

export default App

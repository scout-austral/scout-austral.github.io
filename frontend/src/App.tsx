import { useEffect, useState } from 'react'
import './App.css'
import { useProfile } from '@/hooks/useProfile'
import { useFeedback } from '@/hooks/useFeedback'
import { ProfileForm } from '@/components/ProfileForm'
import { Results } from '@/components/Results'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
const TOKEN_KEY = 'scout_auth_token'

type User = {
  id: string
  email: string
  name?: string | null
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
  const { perfil, actualizar, reset: resetPerfil } = useProfile()
  const { priors, deltas, porPartido, registrar, quitar, reset: resetFeedback } =
    useFeedback(perfil)
  const [user, setUser] = useState<User | null>(null)
  const [authError] = useState(() =>
    new URLSearchParams(window.location.search).get('auth_error')
      ? 'No se pudo iniciar sesion con Google. Intenta de nuevo.'
      : '',
  )

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

    const token = tokenFromGoogle ?? localStorage.getItem(TOKEN_KEY)
    if (!token) {
      return
    }

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

  return (
    <main className="page">
      <header className="topbar">
        <a className="brand" href="/">
          Scout
        </a>
        <nav>
          {user ? (
            <>
              <span className="user-label">{user.name ?? user.email}</span>
              <button className="nav-link" type="button" onClick={signOut}>
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

      <section className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Tu tiempo, tu Mundial</h1>
          <p className="text-sm text-muted-foreground">
            Cargá tu perfil y Scout clasifica los 72 partidos de la fase de grupos del Mundial
            2026 en <strong>Imperdible</strong>, <strong>Vale la pena</strong> y{' '}
            <strong>Para ver el resumen</strong> — según tu afinidad y tu disponibilidad.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-[360px_1fr]">
          <div className="md:sticky md:top-6 md:self-start">
            <ProfileForm perfil={perfil} actualizar={actualizar} reset={resetPerfil} />
          </div>
        <div>
          <h2 className="mb-3 text-lg font-semibold">Tus recomendaciones</h2>
          <Results
            perfil={perfil}
            priors={priors}
            porPartido={porPartido}
            deltas={deltas}
            registrar={registrar}
            quitar={quitar}
            resetFeedback={resetFeedback}
          />
        </div>
        </div>
      </section>
    </main>
  )
}

export default App

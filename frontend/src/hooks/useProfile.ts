import { useCallback, useEffect, useRef, useState } from 'react'
import type { Perfil } from '@/lib/recommender/types'

export const PROFILE_STORAGE_KEY = 'scout_perfil'
const STORAGE_KEY = PROFILE_STORAGE_KEY
const TOKEN_KEY = 'scout_auth_token'
const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

function zonaHorariaDelBrowser(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Argentina/Buenos_Aires'
  } catch {
    return 'America/Argentina/Buenos_Aires'
  }
}

export function perfilInicial(): Perfil {
  return {
    equiposFavoritos: [],
    jugadoresFavoritos: [],
    franjas: [],
    zonaHoraria: zonaHorariaDelBrowser(),
    tolerancia: 'media',
    perfilFan: 'casual',
    scheduledMatches: {},
    feedbacks: [],
  }
}

function cargarLocal(): Perfil {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...perfilInicial(), ...(JSON.parse(raw) as Partial<Perfil>) }
  } catch { /* ignore */ }
  return perfilInicial()
}

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function useProfile() {
  const [perfil, setPerfil] = useState<Perfil>(cargarLocal)
  const [apiLoaded, setApiLoaded] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Persist to localStorage
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(perfil)) } catch { /* ignore */ }
  }, [perfil])

  // Load from API on mount (if logged in AND token was already in localStorage)
  useEffect(() => {
    const token = getToken()
    if (!token) { setApiLoaded(true); return }

    fetch(`${API_BASE_URL}/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (r) => {
        if (!r.ok) return
        const data = (await r.json()) as { perfil: Partial<Perfil> | null }
        if (data.perfil) {
          const merged = { ...perfilInicial(), ...data.perfil }
          setPerfil(merged)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
        }
      })
      .catch(() => {})
      .finally(() => setApiLoaded(true))
  }, [])

  // Carga explícita desde servidor — llamar cuando el token llega por URL (Google OAuth)
  // Prioriza el perfil guardado en servidor sobre cualquier perfil guest local
  const reloadFromServer = useCallback(async (token: string) => {
    try {
      const r = await fetch(`${API_BASE_URL}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!r.ok) return
      const data = (await r.json()) as { perfil: Partial<Perfil> | null }
      if (data.perfil) {
        // Usuario existente: su perfil del servidor tiene prioridad total
        const merged = { ...perfilInicial(), ...data.perfil }
        setPerfil(merged)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
      }
      // Si data.perfil es null → usuario nuevo → el perfil guest local se conserva y se sube
      setApiLoaded(true)
    } catch { /* ignore */ }
  }, [])

  // Save to API with debounce (only after initial load)
  useEffect(() => {
    if (!apiLoaded) return
    const token = getToken()
    if (!token) return

    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      fetch(`${API_BASE_URL}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ perfil }),
      }).catch(() => {})
    }, 800)

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [perfil, apiLoaded])

  const actualizar = useCallback((cambios: Partial<Perfil>) => {
    setPerfil((p) => ({ ...p, ...cambios }))
  }, [])

  const reset = useCallback(() => setPerfil(perfilInicial()), [])

  return { perfil, setPerfil, actualizar, reset, reloadFromServer }
}

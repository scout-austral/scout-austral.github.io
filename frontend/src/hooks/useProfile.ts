// Estado del perfil del usuario, persistido en localStorage.
import { useCallback, useEffect, useState } from 'react'
import type { Perfil } from '@/lib/recommender/types'

const STORAGE_KEY = 'scout_perfil'

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
  }
}

function cargar(): Perfil {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...perfilInicial(), ...(JSON.parse(raw) as Partial<Perfil>) }
  } catch {
    /* ignore */
  }
  return perfilInicial()
}

export function useProfile() {
  const [perfil, setPerfil] = useState<Perfil>(cargar)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(perfil))
    } catch {
      /* ignore */
    }
  }, [perfil])

  const actualizar = useCallback((cambios: Partial<Perfil>) => {
    setPerfil((p) => ({ ...p, ...cambios }))
  }, [])

  const reset = useCallback(() => setPerfil(perfilInicial()), [])

  return { perfil, setPerfil, actualizar, reset }
}

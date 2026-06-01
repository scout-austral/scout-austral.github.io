// "Último baile": figuras que con toda probabilidad disputan su ÚLTIMO Mundial.
// Es un factor de interés emocional/histórico que ningún ranking captura: ver a una
// leyenda despedirse del torneo atrae incluso al hincha neutral.
//
// La intensidad refleja cuán icónica es la despedida. El nombre debe coincidir
// exactamente con `jugadores.json` (campo `nombre`).

interface Leyenda {
  nombre: string
  /** Código FIFA de su selección. */
  seleccion: string
  /** Cuán icónica es la despedida ∈ [0, 1]. */
  intensidad: number
}

export const LEYENDAS_ULTIMO_BAILE: Leyenda[] = [
  { nombre: 'Lionel Messi', seleccion: 'ARG', intensidad: 1.0 },
  { nombre: 'Cristiano Ronaldo', seleccion: 'POR', intensidad: 1.0 },
  { nombre: 'Luka Modrić', seleccion: 'CRO', intensidad: 0.85 },
  { nombre: 'Kevin De Bruyne', seleccion: 'BEL', intensidad: 0.7 },
  { nombre: 'Mohamed Salah', seleccion: 'EGY', intensidad: 0.65 },
  { nombre: 'Edin Džeko', seleccion: 'BIH', intensidad: 0.6 },
  { nombre: 'Sadio Mané', seleccion: 'SEN', intensidad: 0.55 },
  { nombre: 'James Rodríguez', seleccion: 'COL', intensidad: 0.5 },
  { nombre: 'Granit Xhaka', seleccion: 'SUI', intensidad: 0.45 },
]

/** Índice por código de selección → leyendas que la integran. */
export const leyendasPorSeleccion: Record<string, Leyenda[]> = LEYENDAS_ULTIMO_BAILE.reduce(
  (acc, l) => {
    ;(acc[l.seleccion] ??= []).push(l)
    return acc
  },
  {} as Record<string, Leyenda[]>,
)

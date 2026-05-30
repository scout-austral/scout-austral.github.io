// Justificación local (siempre disponible, offline) a partir de los factores que
// pesaron y el encaje horario. En la Fase 4 se podrá enriquecer con Gemini.

import type { Categoria, Encaje, FactorClave } from './types'

const CATEGORIA_LEAD: Record<Categoria, string> = {
  imperdible: 'Imperdible',
  vale_la_pena: 'Vale la pena',
  resumen: 'Para ver el resumen',
}

/** Une frases en español natural: "a", "a y b", "a, b y c". */
function unir(frases: string[]): string {
  if (frases.length === 0) return ''
  if (frases.length === 1) return frases[0]
  return `${frases.slice(0, -1).join(', ')} y ${frases[frases.length - 1]}`
}

export function justificacionLocal(
  categoria: Categoria,
  encaje: Encaje,
  factores: FactorClave[],
): string {
  const lead = CATEGORIA_LEAD[categoria]
  const motivos = unir(factores.slice(0, 2).map((f) => f.etiqueta.toLowerCase()))

  if (categoria === 'resumen') {
    if (encaje === 'imposible') {
      return `${lead}: te queda en un horario imposible según tu disponibilidad.`
    }
    return motivos
      ? `${lead}: ${motivos}, pero no es prioritario para tu perfil.`
      : `${lead}: bajo interés para tu perfil.`
  }

  let texto = motivos ? `${lead}: ${motivos}.` : `${lead}.`
  if (encaje === 'complejo') {
    texto += ' El horario es algo incómodo, pero puede valer la pena.'
  } else if (categoria === 'imperdible') {
    texto += ' Además, te queda bien de horario.'
  }
  return texto
}

// Bandera SVG de cada selección (flag-icons), compartida por el fixture, el calendario
// y las tarjetas de partido para que todas usen el mismo set de banderas.

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

export const flagByTeamCode: Record<string, string> = {
  ALG: flagDz, ARG: flagAr, AUS: flagAu, AUT: flagAt, BEL: flagBe, BIH: flagBa,
  BRA: flagBr, CAN: flagCa, CIV: flagCi, COD: flagCd, COL: flagCo, CPV: flagCv,
  CRO: flagHr, CUW: flagCw, CZE: flagCz, ECU: flagEc, EGY: flagEg, ENG: flagGbEng,
  ESP: flagEs, FRA: flagFr, GER: flagDe, GHA: flagGh, HAI: flagHt, IRN: flagIr,
  IRQ: flagIq, JOR: flagJo, JPN: flagJp, KOR: flagKr, KSA: flagSa, MAR: flagMa,
  MEX: flagMx, NED: flagNl, NOR: flagNo, NZL: flagNz, PAN: flagPa, PAR: flagPy,
  POR: flagPt, QAT: flagQa, RSA: flagZa, SCO: flagGbSct, SEN: flagSn, SUI: flagCh,
  SWE: flagSe, TUN: flagTn, TUR: flagTr, URU: flagUy, USA: flagUs, UZB: flagUz,
}

export function TeamFlag({ code, className = 'team-flag' }: { code: string; className?: string }) {
  const flagSrc = flagByTeamCode[code]
  if (!flagSrc) return <span className="flag-fallback">{code}</span>
  return <img alt="" aria-hidden="true" className={className} src={flagSrc} />
}

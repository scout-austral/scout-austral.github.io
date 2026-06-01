import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { equipos, jugadores } from '@/data'
import type { FeatureKey, Perfil, Tolerancia } from '@/lib/recommender/types'
import { Badge } from '@/components/ui/badge'

// ─── Tipos internos ───────────────────────────────────────────────────────────

interface Answers {
  equipos: string[]
  jugadores: string[]
  fanLevel: 'total' | 'casual' | null   // → perfilFan + boost en equipo
  pairwise: 'stars' | 'competitive' | null
  jornada3: number | null
  grupoMuerte: number | null
  tolerancia: Tolerancia | null          // → tolerancia horaria
}

function buildImportancia(a: Answers): Partial<Record<FeatureKey, number>> {
  const fanBoost = a.fanLevel === 'total' ? 10 : 0
  return {
    equipo:         a.equipos.length > 0   ? 82 + fanBoost : 12,
    jugador:        a.jugadores.length > 0 ? 72 : 8,
    estrellas:      a.pairwise === 'stars'       ? 82 : a.pairwise === 'competitive' ? 32 : 50,
    competitividad: a.pairwise === 'competitive' ? 82 : a.pairwise === 'stars'       ? 32 : 50,
    jornada3:       a.jornada3    ?? 50,
    grupo_muerte:   a.grupoMuerte ?? 50,
  }
}

const equiposOrdenados = [...equipos].sort((a, b) => a.nombre.localeCompare(b.nombre))
const jugadoresOrdenados = [...jugadores].sort((a, b) => a.nombre.localeCompare(b.nombre))

// ─── SearchCombo inline ───────────────────────────────────────────────────────

interface ComboItem { value: string; label: string }

function SearchCombo({ placeholder, items, onSelect, exclude }: {
  placeholder: string
  items: ComboItem[]
  onSelect: (v: string) => void
  exclude: string[]
}) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)

  const filtered = useMemo(() => {
    if (!q.trim()) return []
    const lq = q.toLowerCase()
    return items.filter(i => !exclude.includes(i.value) && i.label.toLowerCase().includes(lq)).slice(0, 10)
  }, [q, items, exclude])

  return (
    <div className="ob-sc">
      <input
        className="ob-sc-input"
        type="text"
        placeholder={placeholder}
        value={q}
        autoComplete="off"
        onChange={e => { setQ(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && filtered.length > 0 && (
        <div className="ob-sc-list">
          {filtered.map(item => (
            <button key={item.value} type="button" className="ob-sc-item" onMouseDown={() => { onSelect(item.value); setQ(''); setOpen(false) }}>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function IconStar() {
  return <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
}
function IconBolt() {
  return <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28"><path d="M13 2L4.09 12.26a1 1 0 0 0 .74 1.66L11 14l-2 8 8.91-10.26a1 1 0 0 0-.74-1.66L11 10l2-8z"/></svg>
}
function IconFire() {
  return <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M12 23C6.5 23 2 18.5 2 13c0-3.5 2-6.5 5-8-0.5 1.5 0 3 1 4 0-3 2-6 5-7-1 3 1 5 3 6.5C17.5 9.5 18 8 18 8s2 2 2 5c0 5.5-4 10-8 10z"/></svg>
}
function IconClock() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
}
function IconSkull() {
  return <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M12 2a9 9 0 0 0-9 9c0 3.03 1.5 5.7 3.8 7.3V21a1 1 0 0 0 1 1h8.4a1 1 0 0 0 1-1v-2.7C19.5 16.7 21 14 21 11A9 9 0 0 0 12 2zm-2 14H8v-2h2v2zm0-4H8v-2h2v2zm4 4h-2v-2h2v2zm0-4h-2v-2h2v2z"/></svg>
}
function IconMoon() {
  return <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
}

// ─── OnboardingFlow ───────────────────────────────────────────────────────────

// Pasos: 1 Equipos | 2 Jugadores | 3 FanLevel | 4 Pairwise | 5 Jornada | 6 GrupoMuerte | 7 Tolerancia
const TOTAL_STEPS = 7

interface Props {
  actualizar: (c: Partial<Perfil>) => void
  onDone: () => void
}

export function OnboardingFlow({ actualizar, onDone }: Props) {
  const [step, setStep] = useState(0) // 0=welcome, 1-7=preguntas, 8=done
  const [dir, setDir] = useState(1)
  const [answers, setAnswers] = useState<Answers>({
    equipos: [],
    jugadores: [],
    fanLevel: null,
    pairwise: null,
    jornada3: null,
    grupoMuerte: null,
    tolerancia: null,
  })

  function go(n: number) {
    setDir(n > step ? 1 : -1)
    setStep(n)
  }

  function next() { go(step + 1) }
  function back() { if (step > 1) go(step - 1) }

  function addEquipo(codigo: string) {
    if (answers.equipos.includes(codigo)) return
    setAnswers(a => ({ ...a, equipos: [...a.equipos, codigo] }))
  }
  function removeEquipo(codigo: string) {
    setAnswers(a => ({ ...a, equipos: a.equipos.filter(e => e !== codigo) }))
  }
  function addJugador(nombre: string) {
    if (answers.jugadores.includes(nombre)) return
    setAnswers(a => ({ ...a, jugadores: [...a.jugadores, nombre] }))
  }
  function removeJugador(nombre: string) {
    setAnswers(a => ({ ...a, jugadores: a.jugadores.filter(j => j !== nombre) }))
  }

  function finish() {
    const importancia = buildImportancia(answers)
    const equiposFavoritos = answers.equipos.map((codigo, i) => ({ codigo, prioridad: i + 1 }))
    const jugadoresFavoritos = answers.jugadores
    const perfilFan = answers.fanLevel === 'total' ? 'total' : 'casual'
    const tolerancia: Tolerancia = answers.tolerancia ?? 'media'
    actualizar({ equiposFavoritos, jugadoresFavoritos, importancia, perfilFan, tolerancia })
    localStorage.setItem('scout_onboarding_done', '1')
    onDone()
  }

  return (
    <div className="ob-overlay">
      {/* Header */}
      <div className="ob-top">
        <span className="ob-brand">Scout</span>
        {step > 0 && step < 8 && (
          <div className="ob-dots">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <span key={i} className={`ob-dot${i < step ? ' ob-dot--done' : i + 1 === step ? ' ob-dot--active' : ''}`} />
            ))}
          </div>
        )}
        {step > 0 && step < 8 && (
          <button type="button" className="ob-skip" onClick={finish}>
            Saltar todo
          </button>
        )}
      </div>

      {/* Content */}
      <div className="ob-body" key={step} style={{ '--dir': dir } as React.CSSProperties}>
        {step === 0 && <WelcomeStep onStart={() => go(1)} />}
        {step === 1 && (
          <Step1Equipo
            answers={answers}
            onAdd={addEquipo}
            onRemove={removeEquipo}
            onNext={next}
            onSkip={next}
          />
        )}
        {step === 2 && (
          <Step2Jugador
            answers={answers}
            onAdd={addJugador}
            onRemove={removeJugador}
            onNext={next}
            onSkip={next}
          />
        )}
        {step === 3 && (
          <Step3FanLevel
            selected={answers.fanLevel}
            onSelect={v => { setAnswers(a => ({ ...a, fanLevel: v })); next() }}
            onBack={back}
          />
        )}
        {step === 4 && (
          <Step4Pairwise
            selected={answers.pairwise}
            onSelect={v => { setAnswers(a => ({ ...a, pairwise: v })); next() }}
            onBack={back}
          />
        )}
        {step === 5 && (
          <Step5Jornada
            selected={answers.jornada3}
            onSelect={v => { setAnswers(a => ({ ...a, jornada3: v })); next() }}
            onBack={back}
          />
        )}
        {step === 6 && (
          <Step6GrupoMuerte
            selected={answers.grupoMuerte}
            onSelect={v => { setAnswers(a => ({ ...a, grupoMuerte: v })); next() }}
            onBack={back}
          />
        )}
        {step === 7 && (
          <Step7Tolerancia
            selected={answers.tolerancia}
            onSelect={v => { setAnswers(a => ({ ...a, tolerancia: v })); go(8) }}
            onBack={back}
          />
        )}
        {step === 8 && <DoneStep onFinish={finish} />}
      </div>

      {/* Back nav */}
      {step > 1 && step < 8 && (
        <button type="button" className="ob-back-btn" onClick={back} aria-label="Volver">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}
    </div>
  )
}

// ─── Steps ────────────────────────────────────────────────────────────────────

function WelcomeStep({ onStart }: { onStart: () => void }) {
  return (
    <div className="ob-step ob-step--center">
      <div className="ob-welcome-icon">
        <svg viewBox="0 0 24 24" fill="currentColor" width="40" height="40" opacity="0.9">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
        </svg>
      </div>
      <h1 className="ob-welcome-title">Bienvenido a Scout.</h1>
      <p className="ob-welcome-sub">
        7 preguntas rápidas y te armo una guía personal de los 72 partidos del Mundial 2026.
        <br />Sin relleno. Solo lo que vale la pena para vos.
      </p>
      <button type="button" className="ob-cta" onClick={onStart}>
        Empezar
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  )
}

function Step1Equipo({ answers, onAdd, onRemove, onNext, onSkip }: {
  answers: Answers
  onAdd: (v: string) => void
  onRemove: (v: string) => void
  onNext: () => void
  onSkip: () => void
}) {
  const equipoItems = useMemo(() =>
    equiposOrdenados.map(e => ({ value: e.codigo, label: `${e.bandera} ${e.nombre}` })),
    [],
  )

  return (
    <div className="ob-step">
      <p className="ob-step-num">1 de 7</p>
      <h2 className="ob-question">¿Con qué selección vas?</h2>
      <p className="ob-hint">Podés agregar varias, ordenadas por prioridad.</p>

      <div className="ob-input-zone">
        <SearchCombo
          placeholder="Buscar selección…"
          items={equipoItems}
          onSelect={onAdd}
          exclude={answers.equipos}
        />
        {answers.equipos.length > 0 && (
          <div className="ob-badges">
            {answers.equipos.map((cod, i) => {
              const e = equipos.find(x => x.codigo === cod)
              return (
                <Badge key={cod} variant="secondary" className="gap-1 text-sm py-1 px-2">
                  <span className="opacity-50 text-xs">{i + 1}°</span>
                  {e?.bandera} {e?.nombre}
                  <button type="button" onClick={() => onRemove(cod)} aria-label="quitar">
                    <X className="size-3" />
                  </button>
                </Badge>
              )
            })}
          </div>
        )}
      </div>

      <div className="ob-actions">
        <button type="button" className="ob-cta" onClick={onNext} disabled={answers.equipos.length === 0}>
          Continuar
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
        <button type="button" className="ob-link" onClick={onSkip}>
          No sigo a ninguna en particular
        </button>
      </div>
    </div>
  )
}

function Step2Jugador({ answers, onAdd, onRemove, onNext, onSkip }: {
  answers: Answers
  onAdd: (v: string) => void
  onRemove: (v: string) => void
  onNext: () => void
  onSkip: () => void
}) {
  const jugadorItems = useMemo(() =>
    jugadoresOrdenados.map(j => ({ value: j.nombre, label: `${j.nombre} · ${j.seleccion}` })),
    [],
  )

  return (
    <div className="ob-step">
      <p className="ob-step-num">2 de 7</p>
      <h2 className="ob-question">¿Seguís a algún jugador en particular?</h2>
      <p className="ob-hint">Cuando juegue, lo priorizamos para vos.</p>

      <div className="ob-input-zone">
        <SearchCombo
          placeholder="Buscar jugador…"
          items={jugadorItems}
          onSelect={onAdd}
          exclude={answers.jugadores}
        />
        {answers.jugadores.length > 0 && (
          <div className="ob-badges">
            {answers.jugadores.map(nombre => (
              <Badge key={nombre} variant="secondary" className="gap-1 text-sm py-1 px-2">
                {nombre}
                <button type="button" onClick={() => onRemove(nombre)} aria-label="quitar">
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="ob-actions">
        <button type="button" className="ob-cta" onClick={onNext} disabled={answers.jugadores.length === 0}>
          Continuar
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
        <button type="button" className="ob-link" onClick={onSkip}>
          Soy más de equipos
        </button>
      </div>
    </div>
  )
}

function Step3FanLevel({ selected, onSelect }: {
  selected: 'total' | 'casual' | null
  onSelect: (v: 'total' | 'casual') => void
  onBack?: () => void
}) {
  return (
    <div className="ob-step">
      <p className="ob-step-num">3 de 7</p>
      <h2 className="ob-question">¿Cómo sos como hincha del fútbol?</h2>

      <div className="ob-cards">
        <button
          type="button"
          className={`ob-card${selected === 'total' ? ' ob-card--selected' : ''}`}
          onClick={() => onSelect('total')}
        >
          <div className="ob-card-icon"><IconFire /></div>
          <span className="ob-card-title">Fanático total</span>
          <span className="ob-card-desc">Busco ver todo lo que puedo. El fútbol organiza mi semana.</span>
        </button>
        <button
          type="button"
          className={`ob-card${selected === 'casual' ? ' ob-card--selected' : ''}`}
          onClick={() => onSelect('casual')}
        >
          <div className="ob-card-icon"><IconStar /></div>
          <span className="ob-card-title">Hincha selectivo</span>
          <span className="ob-card-desc">Me engancho con lo que realmente vale. No veo todo.</span>
        </button>
      </div>
    </div>
  )
}

function Step4Pairwise({ selected, onSelect }: {
  selected: 'stars' | 'competitive' | null
  onSelect: (v: 'stars' | 'competitive') => void
  onBack?: () => void
}) {
  return (
    <div className="ob-step">
      <p className="ob-step-num">4 de 7</p>
      <h2 className="ob-question">Esta noche tenés libre. Elegís:</h2>

      <div className="ob-cards">
        <button
          type="button"
          className={`ob-card${selected === 'stars' ? ' ob-card--selected' : ''}`}
          onClick={() => onSelect('stars')}
        >
          <div className="ob-card-icon"><IconStar /></div>
          <span className="ob-card-title">Las figuras estelares</span>
          <span className="ob-card-desc">Messi, Mbappé, Vinicius. Los mejores en un mismo partido.</span>
        </button>
        <button
          type="button"
          className={`ob-card${selected === 'competitive' ? ' ob-card--selected' : ''}`}
          onClick={() => onSelect('competitive')}
        >
          <div className="ob-card-icon"><IconBolt /></div>
          <span className="ob-card-title">El infarto colectivo</span>
          <span className="ob-card-desc">Cuatro selecciones con chances. Nadie sabe quién clasifica.</span>
        </button>
      </div>
    </div>
  )
}

function Step5Jornada({ selected, onSelect }: {
  selected: number | null
  onSelect: (v: number) => void
  onBack?: () => void
}) {
  const options = [
    { val: 90, icon: <IconFire />, label: 'Me pone muy ansioso', desc: 'Quiero verlos todos, aunque sean a las 3 AM.' },
    { val: 55, icon: <IconClock />, label: 'Los sigo, sin obsesionarme', desc: 'Si puedo y el horario acompaña, los miro.' },
    { val: 15, icon: null, label: 'No me cambia nada', desc: 'Un partido es un partido, sea jornada 1 o 3.' },
  ]

  return (
    <div className="ob-step">
      <p className="ob-step-num">5 de 7</p>
      <h2 className="ob-question">Última jornada de grupos. Todo se define. ¿Cómo te ponés?</h2>

      <div className="ob-options">
        {options.map(o => (
          <button
            key={o.val}
            type="button"
            className={`ob-option${selected === o.val ? ' ob-option--selected' : ''}`}
            onClick={() => onSelect(o.val)}
          >
            {o.icon && <span className="ob-option-icon">{o.icon}</span>}
            <div>
              <span className="ob-option-label">{o.label}</span>
              <span className="ob-option-desc">{o.desc}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function Step6GrupoMuerte({ selected, onSelect }: {
  selected: number | null
  onSelect: (v: number) => void
  onBack?: () => void
}) {
  const options = [
    { val: 85, icon: <IconSkull />, label: 'Son los más interesantes de todos', desc: 'Cualquiera puede ganar o quedar afuera. Puro drama.' },
    { val: 50, icon: null, label: 'Los miro, pero sin prioridad', desc: 'Si hay algo mejor programado, lo elijo primero.' },
    { val: 20, icon: null, label: 'Me centro en mi equipo', desc: 'Me importa lo que pase con la selección que sigo.' },
  ]

  return (
    <div className="ob-step">
      <p className="ob-step-num">6 de 7</p>
      <h2 className="ob-question">¿Cómo te llevás con los grupos de la muerte?</h2>

      <div className="ob-options">
        {options.map(o => (
          <button
            key={o.val}
            type="button"
            className={`ob-option${selected === o.val ? ' ob-option--selected' : ''}`}
            onClick={() => onSelect(o.val)}
          >
            {o.icon && <span className="ob-option-icon">{o.icon}</span>}
            <div>
              <span className="ob-option-label">{o.label}</span>
              <span className="ob-option-desc">{o.desc}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function Step7Tolerancia({ selected, onSelect }: {
  selected: Tolerancia | null
  onSelect: (v: Tolerancia) => void
  onBack?: () => void
}) {
  const options: { val: Tolerancia; icon: React.ReactNode; label: string; desc: string }[] = [
    { val: 'alta',  icon: <IconFire />,  label: 'Sí, siempre encuentro la manera',    desc: 'El horario no me frena si el partido vale la pena.' },
    { val: 'media', icon: <IconClock />, label: 'Depende cuánto valga la pena',        desc: 'Si el horario es muy malo, lo miro al otro día.' },
    { val: 'baja',  icon: <IconMoon />,  label: 'No, el horario me importa mucho',     desc: 'Los partidos de madrugada quedan directamente afuera.' },
  ]

  return (
    <div className="ob-step">
      <p className="ob-step-num">7 de 7</p>
      <h2 className="ob-question">Un partido clave se juega a las 2 AM. ¿Lo mirás?</h2>

      <div className="ob-options">
        {options.map(o => (
          <button
            key={o.val}
            type="button"
            className={`ob-option${selected === o.val ? ' ob-option--selected' : ''}`}
            onClick={() => onSelect(o.val)}
          >
            {o.icon && <span className="ob-option-icon">{o.icon}</span>}
            <div>
              <span className="ob-option-label">{o.label}</span>
              <span className="ob-option-desc">{o.desc}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function DoneStep({ onFinish }: { onFinish: () => void }) {
  return (
    <div className="ob-step ob-step--center">
      <div className="ob-done-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
          <circle cx="12" cy="12" r="10" />
          <polyline points="7 13 10 16 17 9" />
        </svg>
      </div>
      <h2 className="ob-welcome-title">Ya sé lo que buscás.</h2>
      <p className="ob-welcome-sub">
        Clasificamos los 72 partidos del Mundial según tus preferencias.
        <br />Podés ajustar todo desde tu perfil cuando quieras.
      </p>
      <button type="button" className="ob-cta" onClick={onFinish}>
        Ver mis recomendaciones
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  )
}

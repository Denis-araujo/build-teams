import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'

type Cfg = { teamCount: number; teamSize: number }

type Props = {
  open: boolean
  paidCount: number
  initial: Cfg
  lockedCount: number
  hasTeams: boolean
  onConfirm(cfg: Cfg): void
  onClose(): void
}

const PRESETS: [number, number][] = [[2, 6], [2, 4], [3, 4]]
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

export function summaryText(n: number, teams: number, size: number, locked: number, hasTeams: boolean): string {
  const slots = teams * size
  const lk =
    hasTeams && locked
      ? ` ${locked} ${locked === 1 ? 'jogador travado será mantido.' : 'jogadores travados serão mantidos.'}`
      : ''
  if (n < teams) return `Marque pelo menos ${teams} jogadores como pagos (um por time).`
  if (n > slots) {
    const extra = n - slots
    return `${slots} vagas · ${extra} ${extra === 1 ? 'convocado fica' : 'convocados ficam'} como reserva.${lk}`
  }
  if (n === slots) return `${slots} vagas · todos os ${n} pagos jogam.${lk}`
  return `${n} pagos para ${slots} vagas · alguns times ficam com menos jogadores.${lk}`
}

function Stepper(props: {
  title: string
  hint: string
  value: number
  testId: string
  minusLabel: string
  plusLabel: string
  onChange(v: number): void
  min: number
  max: number
}) {
  const { title, hint, value, testId, minusLabel, plusLabel, onChange, min, max } = props
  return (
    <div className="stepper">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 15 }}>{title}</span>
        <span style={{ fontSize: 12, color: 'var(--color-neutral-400)' }}>{hint}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button type="button" className="btn btn-ghost btn-icon stepper-btn" aria-label={minusLabel} onClick={() => onChange(clamp(value - 1, min, max))}>
          −
        </button>
        <span data-testid={testId} style={{ minWidth: 32, textAlign: 'center', fontSize: 22, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
          {value}
        </span>
        <button type="button" className="btn btn-ghost btn-icon stepper-btn" aria-label={plusLabel} onClick={() => onChange(clamp(value + 1, min, max))}>
          +
        </button>
      </div>
    </div>
  )
}

function Dialog({ paidCount, initial, lockedCount, hasTeams, onConfirm, onClose }: Omit<Props, 'open'>) {
  const [teams, setTeams] = useState(initial.teamCount)
  const [size, setSize] = useState(initial.teamSize)
  const titleId = useId()
  const ref = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  // Foco entra no diálogo ao abrir e volta ao abridor ao fechar; Esc fecha.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    ref.current?.focus()
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      if (opener && opener.isConnected) opener.focus()
    }
  }, [])

  function trapTab(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'Tab' || !ref.current) return
    const items = Array.from(ref.current.querySelectorAll<HTMLElement>('button:not(:disabled)'))
    if (!items.length) return
    const first = items[0]
    const last = items[items.length - 1]
    const active = document.activeElement
    if (e.shiftKey && (active === first || active === ref.current)) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && active === last) {
      e.preventDefault()
      first.focus()
    }
  }

  const disabled = paidCount < teams
  return (
    <div className="modal-backdrop" data-testid="modal-backdrop" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="modal"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={trapTab}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h2 id={titleId} style={{ margin: 0, fontSize: 22, fontWeight: 500 }}>
            Montar times
          </h2>
          <span style={{ fontSize: 13, color: 'var(--color-neutral-400)' }}>{paidCount} pagaram</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {PRESETS.map(([t, z]) => (
            <button
              key={`${t}x${z}`}
              type="button"
              className="btn btn-ghost"
              style={{ fontSize: 13, padding: '4px 10px' }}
              onClick={() => {
                setTeams(t)
                setSize(z)
              }}
            >
              {`${t} times de ${z}`}
            </button>
          ))}
        </div>
        <Stepper title="Times" hint="de 2 a 8" value={teams} testId="teams-value" minusLabel="Menos times" plusLabel="Mais times" onChange={setTeams} min={2} max={8} />
        <Stepper title="Jogadores por time" hint="de 1 a 12" value={size} testId="size-value" minusLabel="Menos jogadores por time" plusLabel="Mais jogadores por time" onChange={setSize} min={1} max={12} />
        <div className="modal-summary">{summaryText(paidCount, teams, size, lockedCount, hasTeams)}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary" disabled={disabled} onClick={() => onConfirm({ teamCount: teams, teamSize: size })}>
            {hasTeams ? 'Sortear de novo' : 'Sortear'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function DrawModal({ open, ...rest }: Props) {
  // O estado interno nasce a cada abertura, então sempre parte de `initial`.
  return open ? <Dialog {...rest} /> : null
}

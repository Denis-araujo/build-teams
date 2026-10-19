import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'

type Cfg = { teamCount: number; teamSize: number }

type Props = {
  open: boolean
  paidCount: number
  /** Total de jogadores do elenco (subtítulo "N de M jogadores"). */
  total: number
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
  if (n < teams) return `Convoque pelo menos ${teams} jogadores (um por time).`
  if (n > slots) {
    const extra = n - slots
    return `${slots} vagas · ${extra} ${extra === 1 ? 'jogador fica' : 'jogadores ficam'} como reserva.${lk}`
  }
  if (n === slots) return `${slots} vagas · todos os ${n} jogadores jogam.${lk}`
  return `${n} jogadores para ${slots} vagas · alguns times ficam com menos jogadores.${lk}`
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
    <div className="flex items-center justify-between gap-3 px-[14px] py-3 not-first:border-t not-first:border-neutral-900">
      <div className="flex flex-col gap-[2px]">
        <span className="text-[14px]">{title}</span>
        <span className="text-[12px] text-neutral-400">{hint}</span>
      </div>
      <div className="flex items-center gap-[6px]">
        <button type="button" className="btn btn-ghost btn-icon size-[34px] text-[18px] bg-surface" aria-label={minusLabel} onClick={() => onChange(clamp(value - 1, min, max))}>
          −
        </button>
        <span data-testid={testId} className="min-w-[30px] text-center text-[20px] font-medium tabular-nums">
          {value}
        </span>
        <button type="button" className="btn btn-ghost btn-icon size-[34px] text-[18px] bg-surface" aria-label={plusLabel} onClick={() => onChange(clamp(value + 1, min, max))}>
          +
        </button>
      </div>
    </div>
  )
}

function Dialog({ paidCount, total, initial, lockedCount, hasTeams, onConfirm, onClose }: Omit<Props, 'open'>) {
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
  const slots = teams * size
  const fillPct = (Math.min(paidCount, slots) / Math.max(paidCount, slots, 1)) * 100
  const overPct = (paidCount > slots ? (paidCount - slots) / paidCount : 0) * 100
  return (
    <div className="fixed inset-0 z-50 bg-[rgba(23,35,57,0.45)] flex items-center justify-center p-4" data-testid="modal-backdrop" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="w-full max-w-[440px] max-h-full overflow-auto bg-surface rounded-lg shadow-lg p-6 flex flex-col gap-5 box-border"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={trapTab}
      >
        <div className="flex flex-col gap-1">
          <h2 id={titleId} className="m-0 text-[22px] font-medium tracking-[-0.01em]">
            Formato do jogo
          </h2>
          <span className="text-[13px] text-neutral-400">{paidCount} de {total} jogadores</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {PRESETS.map(([t, z]) => {
            const on = teams === t && size === z
            return (
              <button
                key={`${t}x${z}`}
                type="button"
                aria-pressed={on}
                className={
                  on
                    ? 'flex flex-col items-start gap-[2px] px-3 py-[10px] rounded-md border-0 text-left cursor-pointer text-text font-[inherit] shadow-[inset_0_0_0_2px_var(--navy)] bg-accent-900'
                    : 'flex flex-col items-start gap-[2px] px-3 py-[10px] rounded-md border-0 text-left cursor-pointer text-text font-[inherit] shadow-[inset_0_0_0_1px_var(--color-neutral-900)] bg-surface'
                }
                onClick={() => {
                  setTeams(t)
                  setSize(z)
                }}
              >
                <span aria-hidden="true" className="text-[18px] font-medium tabular-nums">{`${t} × ${z}`}</span>
                <span className="text-[12px] text-neutral-400">{`${t} times de ${z}`}</span>
              </button>
            )
          })}
        </div>
        <div className="flex flex-col rounded-md bg-bg">
          <Stepper title="Times" hint="de 2 a 8" value={teams} testId="teams-value" minusLabel="Menos times" plusLabel="Mais times" onChange={setTeams} min={2} max={8} />
          <Stepper title="Jogadores por time" hint="de 1 a 12" value={size} testId="size-value" minusLabel="Menos jogadores por time" plusLabel="Mais jogadores por time" onChange={setSize} min={1} max={12} />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex gap-[3px] h-2 rounded-full overflow-hidden bg-neutral-900">
            <div className="bg-navy transition-[width] duration-200" style={{ width: `${fillPct}%` }} />
            <div className="bg-gold transition-[width] duration-200" style={{ width: `${overPct}%` }} />
          </div>
          <span className="text-[13px] text-neutral-400 text-pretty">{summaryText(paidCount, teams, size, lockedCount, hasTeams)}</span>
        </div>
        <div className="flex justify-end gap-2">
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

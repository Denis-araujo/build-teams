import type { ReactNode } from 'react'
import { formatGameDate } from '../format'

const CALENDAR_PATH =
  'M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM72,48v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V80H48V48ZM208,208H48V96H208V208Z'

type Props = {
  /** 'YYYY-MM-DD' do jogo; null = estado vazio. */
  date: string | null
  /** Ações à direita (formulário do administrador); o Membro não passa nada. */
  children?: ReactNode
}

/** Cartão do jogo do v4 (brief 3.1d): visualização e vazio. Sem hora nem chip relativo ainda. */
export function GameCard({ date, children }: Props) {
  return (
    <section aria-label="Jogo" className="rounded-lg bg-surface px-[18px] py-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        {date ? (
          <div className="flex min-w-0 items-center gap-[14px]">
            <div
              aria-hidden="true"
              className="flex size-12 flex-none flex-col items-center justify-center rounded-md bg-navy leading-none text-navy-ink"
            >
              <span className="text-[10px] tracking-[0.08em] text-gold uppercase">
                {new Date(`${date}T12:00:00Z`)
                  .toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' })
                  .replace('.', '')}
              </span>
              <span className="mt-[3px] text-[20px] font-medium tabular-nums">{Number(date.split('-')[2])}</span>
            </div>
            <p className="m-0 min-w-0 text-[18px] font-medium tracking-[-0.01em]">{formatGameDate(date)}</p>
          </div>
        ) : (
          <div className="flex items-center gap-[14px]">
            <div
              aria-hidden="true"
              className="flex size-12 flex-none items-center justify-center rounded-md border border-dashed border-neutral-700 text-neutral-500"
            >
              <svg viewBox="0 0 256 256" width="20" height="20">
                <path fill="currentColor" d={CALENDAR_PATH} />
              </svg>
            </div>
            <p className="m-0 text-[15px] font-medium">Nenhum jogo marcado</p>
          </div>
        )}
        {children}
      </div>
    </section>
  )
}

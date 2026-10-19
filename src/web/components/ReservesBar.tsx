import type { HTMLAttributes, ReactNode } from 'react'
import type { Player } from '../../shared/types'
import { fmt } from '../lib/drawStats'

type Props = {
  reserves: string[]
  playersById: Map<string, Player>
  /** Ganchos para a Task 16b (soltar na barra, controles por reserva). */
  barProps?: HTMLAttributes<HTMLElement>
  renderChipExtras?: (player: Player) => ReactNode
  chipProps?: (player: Player) => HTMLAttributes<HTMLLIElement>
  /** Mostra a barra como alvo de soltar mesmo sem reservas (durante um arrasto). */
  showEmpty?: boolean
}

export function ReservesBar({ reserves, playersById, barProps, renderChipExtras, chipProps, showEmpty }: Props) {
  const members = reserves.flatMap((id) => {
    const p = playersById.get(id)
    return p ? [p] : []
  })
  if (!members.length && !showEmpty) return null
  return (
    <section
      aria-label="Reservas"
      {...barProps}
      className="flex flex-wrap items-center gap-x-3 gap-y-[10px] rounded-lg border border-dashed border-neutral-700 px-4 py-[14px] transition-shadow duration-[120ms]"
    >
      <h2 className="m-0 text-[12px] leading-[1.55] font-normal uppercase tracking-[0.06em] text-neutral-500">Reservas · {members.length}</h2>
      {!members.length && <span className="text-[13px] text-neutral-400">Solte aqui para mandar às reservas</span>}
      <ul className="m-0 flex list-none flex-wrap gap-[6px] p-0">
        {members.map((p) => (
          <li
            key={p.id}
            {...chipProps?.(p)}
            className="flex items-center gap-[6px] rounded-full bg-surface px-[10px] py-1 text-[13px] shadow-sm [&[draggable=true]]:cursor-grab"
          >
            <span>{p.name}</span>
            {typeof p.rating === 'number' && <span className="text-[12px] text-gold-ink tabular-nums">★ {fmt(p.rating)}</span>}
            {renderChipExtras?.(p)}
          </li>
        ))}
      </ul>
    </section>
  )
}

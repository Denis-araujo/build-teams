import type { HTMLAttributes, ReactNode } from 'react'
import type { Player } from '../../shared/types'

type Props = {
  reserves: string[]
  playersById: Map<string, Player>
  /** Ganchos para a Task 16b (soltar na barra, controles por reserva). */
  barProps?: HTMLAttributes<HTMLElement>
  renderChipExtras?: (player: Player) => ReactNode
}

export function ReservesBar({ reserves, playersById, barProps, renderChipExtras }: Props) {
  const members = reserves.flatMap((id) => {
    const p = playersById.get(id)
    return p ? [p] : []
  })
  if (!members.length) return null
  return (
    <section className="reserves" aria-label="Reservas" {...barProps}>
      <h2 style={{ margin: 0, fontSize: 12, fontWeight: 400, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-neutral-500)' }}>
        Reservas · {members.length}
      </h2>
      <ul className="plain-list" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {members.map((p) => (
          <li key={p.id} className="chip">
            {p.name}
            {renderChipExtras?.(p)}
          </li>
        ))}
      </ul>
    </section>
  )
}

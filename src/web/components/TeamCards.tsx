import type { HTMLAttributes, ReactNode } from 'react'
import type { Player } from '../../shared/types'
import { fmt, teamAverage, teamTotals } from '../lib/drawStats'
import { teamColor, teamInk, teamLetter } from '../lib/teamColors'

export type RowContext = { player: Player; teamIndex: number }

type Props = {
  teams: string[][]
  playersById: Map<string, Player>
  /** Ganchos para a Task 16b: controles por jogador, arrastar e soltar, sem mexer na estrutura. */
  renderRowExtras?: (ctx: RowContext) => ReactNode
  rowProps?: (ctx: RowContext) => HTMLAttributes<HTMLLIElement>
  cardProps?: (teamIndex: number) => HTMLAttributes<HTMLElement>
}

const STAR_PATH =
  'M234.29,114.85l-45,38.83L203,211.75a16.4,16.4,0,0,1-24.5,17.82L128,198.49,77.47,229.57A16.4,16.4,0,0,1,53,211.75l13.76-58.07-45-38.83A16.46,16.46,0,0,1,31.08,86l59-4.76,22.76-55.08a16.36,16.36,0,0,1,30.27,0l22.75,55.08,59,4.76a16.46,16.46,0,0,1,9.37,28.86Z'

/** Pílula de nota da linha do jogador (compartilhada com a visão do Membro). */
export function RatingPill({ rating }: { rating: number }) {
  return (
    <span
      role="img"
      aria-label={`${fmt(rating)} estrelas`}
      className="order-2 flex min-w-[44px] flex-none items-center justify-end gap-[3px] rounded-full bg-gold-tint px-[7px] py-[2px] text-xs font-medium text-gold-ink tabular-nums"
    >
      <svg viewBox="0 0 256 256" width="11" height="11" aria-hidden="true" className="text-gold">
        <path fill="currentColor" d={STAR_PATH} />
      </svg>
      {fmt(rating)}
    </span>
  )
}

export function TeamCards({ teams, playersById, renderRowExtras, rowProps, cardProps }: Props) {
  const ratings = new Map([...playersById].map(([id, p]) => [id, p.rating]))
  const totals = teamTotals(teams, ratings)
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(240px,100%),1fr))] gap-4">
      {teams.map((team, i) => {
        const members = team.flatMap((id) => {
          const p = playersById.get(id)
          return p ? [p] : []
        })
        const { style: cardStyle, ...card } = cardProps?.(i) ?? {}
        return (
          <section
            key={i}
            {...card}
            style={cardStyle}
            className="flex flex-col overflow-hidden rounded-lg bg-surface shadow-sm transition-shadow duration-[120ms]"
          >
            <div className="h-1" style={{ background: teamColor(i) }} />
            <div className="flex items-center justify-between gap-[10px] px-4 pt-[14px] pb-3">
              <div className="flex min-w-0 items-center gap-[10px]">
                <span
                  aria-hidden="true"
                  className="flex size-9 flex-none items-center justify-center rounded-md text-[17px] font-medium"
                  style={{ background: teamColor(i), color: teamInk(i) }}
                >
                  {teamLetter(i)}
                </span>
                <div className="flex min-w-0 flex-col gap-px">
                  <h2 className="m-0 text-base font-medium">Time {teamLetter(i)}</h2>
                  <span className="text-xs text-neutral-400">
                    {members.length} {members.length === 1 ? 'jogador' : 'jogadores'}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-px">
                <div className="flex items-center gap-1 text-[22px] font-medium tracking-[-0.01em] text-gold-ink tabular-nums">
                  <svg viewBox="0 0 256 256" width="15" height="15" aria-hidden="true" className="text-gold">
                    <path fill="currentColor" d={STAR_PATH} />
                  </svg>
                  <span>{fmt(totals[i])}</span>
                </div>
                <span className="text-xs text-neutral-400 tabular-nums">média {fmt(teamAverage(team, ratings))}</span>
              </div>
            </div>
            {members.length ? (
              <ul className="m-0 flex list-none flex-col px-2 pb-[10px]">
                {members.map((p, n) => {
                  const ctx = { player: p, teamIndex: i }
                  const rp = rowProps?.(ctx)
                  return (
                    <li
                      key={p.id}
                      {...rp}
                      className="flex flex-wrap items-center gap-2 rounded-sm border-t border-neutral-900 px-2 py-[7px] text-sm hover:bg-bg [&[draggable=true]]:cursor-grab"
                    >
                      <span className="w-4 flex-none text-xs text-neutral-500 tabular-nums">{n + 1}</span>
                      <span className="min-w-0 flex-1 truncate">{p.name}</span>
                      {typeof p.rating === 'number' && <RatingPill rating={p.rating} />}
                      {renderRowExtras?.(ctx)}
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="mx-2 mb-[10px] rounded-sm border border-dashed border-neutral-700 px-2 py-[14px] text-center text-[13px] text-neutral-500">
                Arraste jogadores para cá
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}

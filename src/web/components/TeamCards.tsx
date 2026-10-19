import type { HTMLAttributes, ReactNode } from 'react'
import type { Player } from '../../shared/types'
import { fmt, teamAverage, teamTotals } from '../lib/drawStats'
import { StarRating } from './StarRating'

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

export type RowContext = { player: Player; teamIndex: number }

type Props = {
  teams: string[][]
  playersById: Map<string, Player>
  /** Ganchos para a Task 16b: controles por jogador, arrastar e soltar, sem mexer na estrutura. */
  renderRowExtras?: (ctx: RowContext) => ReactNode
  rowProps?: (ctx: RowContext) => HTMLAttributes<HTMLLIElement>
  cardProps?: (teamIndex: number) => HTMLAttributes<HTMLElement>
}

const label = { fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-neutral-500)' } as const

export function TeamCards({ teams, playersById, renderRowExtras, rowProps, cardProps }: Props) {
  const ratings = new Map([...playersById].map(([id, p]) => [id, p.rating]))
  const totals = teamTotals(teams, ratings)
  return (
    <div className="team-grid">
      {teams.map((team, i) => {
        const members = team.flatMap((id) => {
          const p = playersById.get(id)
          return p ? [p] : []
        })
        return (
          <section key={i} className="team-card" {...cardProps?.(i)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={label}>
                {members.length} {members.length === 1 ? 'jogador' : 'jogadores'}
              </span>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 500 }}>Time {LETTERS[i] ?? i + 1}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--gold-ink)' }}>
                <svg viewBox="0 0 256 256" width="14" height="14" aria-hidden="true" style={{ color: 'var(--gold)' }}>
                  <path
                    fill="currentColor"
                    d="M234.29,114.85l-45,38.83L203,211.75a16.4,16.4,0,0,1-24.5,17.82L128,198.49,77.47,229.57A16.4,16.4,0,0,1,53,211.75l13.76-58.07-45-38.83A16.46,16.46,0,0,1,31.08,86l59-4.76,22.76-55.08a16.36,16.36,0,0,1,30.27,0l22.75,55.08,59,4.76a16.46,16.46,0,0,1,9.37,28.86Z"
                  />
                </svg>
                <span style={{ fontSize: 16, fontVariantNumeric: 'tabular-nums' }}>{fmt(totals[i])}</span>
                <span style={{ color: 'var(--color-neutral-400)' }}>média {fmt(teamAverage(team, ratings))}</span>
              </div>
            </div>
            <div className="gold-rule" />
            <ul className="plain-list" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {members.map((p) => {
                const ctx = { player: p, teamIndex: i }
                return (
                  <li
                    key={p.id}
                    {...rowProps?.(ctx)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 14, ...rowProps?.(ctx).style }}
                  >
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                    <StarRating value={p.rating} size={12} />
                    <span style={{ minWidth: 22, textAlign: 'right', fontSize: 12, color: 'var(--gold-ink)', fontVariantNumeric: 'tabular-nums' }}>{fmt(p.rating)}</span>
                    {renderRowExtras?.(ctx)}
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

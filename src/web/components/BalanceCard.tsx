import { averageSize, balanceTag, barShare, fmt, sizesEqual, spreadOf, teamAverage, teamTotals, type RatingById } from '../lib/drawStats'
import { teamColor, teamInk, teamLetter } from '../lib/teamColors'

type Props = {
  teams: string[][]
  ratingById: RatingById
}

const TAG_TONE = {
  good: 'bg-gold-tint text-gold-ink shadow-[inset_0_0_0_1px_var(--gold-soft)]',
  ok: 'bg-bg text-text',
  bad: 'bg-navy text-navy-ink',
} as const

/** Card "Equilíbrio" do v4 (brief 3.4): tag de 3 tons, diferença e barra com um segmento por time. Só com times e estrelas visíveis. */
export function BalanceCard({ teams, ratingById }: Props) {
  const equal = sizesEqual(teams, ratingById)
  const totals = teamTotals(teams, ratingById)
  const spread = spreadOf(teams, ratingById)
  const tag = balanceTag(spread, { allowHalf: true, sizesEqual: equal, avgSize: averageSize(teams, ratingById) })
  return (
    <section aria-label="Equilíbrio dos times" className="flex flex-col gap-3 rounded-lg bg-surface px-[18px] py-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex items-center gap-[10px]">
          <span className="text-xs tracking-[0.06em] text-neutral-500 uppercase">Equilíbrio</span>
          <span className={`rounded-full px-[9px] py-[3px] text-xs font-medium ${TAG_TONE[tag.tone]}`}>{tag.label}</span>
        </div>
        <span className="text-[13px] text-neutral-400 tabular-nums">
          {`Diferença ${fmt(spread)} ★${equal ? '' : ' na média por jogador'}`}
        </span>
      </div>
      <div data-testid="balance-bar" className="flex h-8 gap-[3px] overflow-hidden rounded-sm">
        {teams.map((team, i) => (
          <div
            key={i}
            className="flex min-w-0 items-center justify-between gap-[6px] px-[10px] text-[13px] font-medium tabular-nums transition-[flex-grow] duration-300"
            style={{
              flex: `${barShare(totals[i], teamAverage(team, ratingById), equal)} 1 0`,
              background: teamColor(i),
              color: teamInk(i),
            }}
          >
            <span>{teamLetter(i)}</span>
            <span>{`${fmt(totals[i])} ★`}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

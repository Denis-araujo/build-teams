import { GameCard } from '../components/GameCard'
import { SiteHeader } from '../components/SiteHeader'
import { RatingPill } from '../components/TeamCards'
import { StarRating } from '../components/StarRating'
import { teamColor, teamInk, teamLetter } from '../lib/teamColors'
import { usePublicGame } from '../hooks/usePublicGame'
import type { PublicGame } from '../../shared/types'

// Ícone "embaralhar" do aviso sem times (brief 3.4; `30.150l` do brief equivale a `30.15l`).
const SHUFFLE_PATH =
  'M237.66,178.34a8,8,0,0,1,0,11.32l-24,24a8,8,0,0,1-11.32-11.32L212.69,192H200.94a72.12,72.12,0,0,1-58.59-30.15l-41.72-58.4A56.1,56.1,0,0,0,55.06,80H32a8,8,0,0,1,0-16H55.06a72.12,72.12,0,0,1,58.59,30.15l41.72,58.4A56.1,56.1,0,0,0,200.94,176h11.75l-10.35-10.34a8,8,0,0,1,11.32-11.32Z'

const count = (n: number) => `${n} ${n === 1 ? 'jogador' : 'jogadores'}`

function Roster({ game }: { game: PublicGame }) {
  return (
    <section className="flex min-w-0 max-w-[380px] flex-[1_1_300px] flex-col overflow-hidden rounded-lg bg-surface shadow-sm">
      <div className="flex items-baseline justify-between gap-2 px-[18px] pt-[18px] pb-[10px]">
        <h2 className="m-0 text-[20px] font-medium tracking-[-0.01em]">Elenco</h2>
        <span className="text-[13px] text-neutral-400">{count(game.players.length)}</span>
      </div>
      <ul className="m-0 flex list-none flex-col px-2 pb-2">
        {game.players.map((p) => (
          <li key={p.id} className="flex items-center gap-[10px] border-t border-neutral-900 px-[10px] py-2">
            <span className="min-w-0 flex-1 text-sm">{p.name}</span>
            {p.rating !== undefined && <StarRating value={p.rating} size={15} />}
            <span
              className={`text-[11px] tracking-[0.04em] uppercase ${p.paid ? 'text-gold-ink' : 'text-neutral-500'}`}
            >
              {p.paid ? 'Pago' : 'Aguardando'}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function TeamCards({ game }: { game: PublicGame }) {
  const byId = new Map(game.players.map((p) => [p.id, p]))
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(240px,100%),1fr))] gap-4">
      {game.teams.map((team, i) => {
        const members = team.flatMap((id) => {
          const p = byId.get(id)
          return p ? [p] : []
        })
        return (
          <section key={i} className="flex flex-col overflow-hidden rounded-lg bg-surface shadow-sm">
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
                  <span className="text-xs text-neutral-400">{count(members.length)}</span>
                </div>
              </div>
            </div>
            <ul className="m-0 flex list-none flex-col px-2 pb-[10px]">
              {members.map((p, n) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center gap-2 rounded-sm border-t border-neutral-900 px-2 py-[7px] text-sm hover:bg-bg"
                >
                  <span className="w-4 flex-none text-xs text-neutral-500 tabular-nums">{n + 1}</span>
                  <span className="min-w-0 flex-1 truncate">{p.name}</span>
                  {typeof p.rating === 'number' && <RatingPill rating={p.rating} />}
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

export default function MemberPage() {
  const { game, loading, error } = usePublicGame()
  const hasTeams = !!game && game.teams.length > 0
  const byId = new Map((game?.players ?? []).map((p) => [p.id, p]))
  const reserves = (game?.reserves ?? []).flatMap((id) => {
    const p = byId.get(id)
    return p ? [p] : []
  })

  return (
    <div className="min-h-screen text-text bg-bg">
      <SiteHeader roleLabel="Membro" titleAsH1 />

      <main className="flex flex-wrap gap-[28px] px-[28px] pt-[24px] pb-[56px] items-start max-w-[1440px] mx-auto box-border">
        {!game ? (
          error ? (
            <p
              className="m-0 w-full rounded-lg bg-surface px-[28px] py-[40px] text-sm text-neutral-400 shadow-sm"
              role="status"
            >
              Não foi possível carregar a escalação. Tentando de novo…
            </p>
          ) : (
            !loading && (
              <div className="w-full">
                <GameCard date={null} />
              </div>
            )
          )
        ) : (
          <>
            <div className="flex min-w-0 flex-[3_1_520px] flex-col gap-5">
              <GameCard date={game.date} />
              {!hasTeams && (
                <div className="flex flex-col items-start gap-[14px] rounded-lg bg-surface px-[28px] py-[40px] shadow-sm">
                  <div
                    aria-hidden="true"
                    className="flex size-12 items-center justify-center rounded-md border border-dashed border-neutral-700 text-neutral-500"
                  >
                    <svg viewBox="0 0 256 256" width="22" height="22">
                      <path fill="currentColor" d={SHUFFLE_PATH} />
                    </svg>
                  </div>
                  <div className="flex max-w-[460px] flex-col gap-[6px]">
                    <span className="text-[20px] font-medium tracking-[-0.01em]">Os times ainda não foram sorteados</span>
                    <span className="text-sm text-neutral-400 text-pretty">
                      Assim que o organizador sortear, as escalações aparecem aqui.
                    </span>
                  </div>
                </div>
              )}
              {hasTeams && <TeamCards game={game} />}
              {hasTeams && reserves.length > 0 && (
                <section className="flex flex-wrap items-center gap-x-3 gap-y-[10px] rounded-lg border border-dashed border-neutral-700 px-4 py-[14px]">
                  <h2 className="m-0 text-xs font-normal uppercase tracking-[0.06em] text-neutral-500">Reservas</h2>
                  <ul className="m-0 flex list-none flex-wrap gap-[6px] p-0">
                    {reserves.map((p) => (
                      <li key={p.id} className="flex items-center gap-[6px] rounded-full bg-surface px-[10px] py-1 text-[13px] shadow-sm">
                        {p.name}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
            <Roster game={game} />
          </>
        )}
      </main>
    </div>
  )
}

import { formatDayLabel } from '../format'
import { BalanceCard } from '../components/BalanceCard'
import { GameCard } from '../components/GameCard'
import { Icon } from '../components/icons'
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
        <span className="text-[13px] text-neutral-400">{game.players.filter((p) => p.paid).length} de {game.players.length} jogadores</span>
      </div>
      <ul className="m-0 flex list-none flex-col px-2 pb-2">
        {game.players.map((p) => (
          <li
            key={p.id}
            className={`flex items-center gap-[10px] border-t border-neutral-900 px-[10px] py-2 ${p.paid ? '' : 'opacity-50'}`}
          >
            <span className="min-w-0 flex-1 text-sm">{p.name}</span>
            {!p.paid && <span className="text-[11px] tracking-[0.04em] uppercase text-neutral-500">fora</span>}
            {p.rating !== undefined && <StarRating value={p.rating} size={15} />}
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
  // Sorteio sem nenhum jogador conhecido alocado é o estado "ainda não sorteado".
  const hasTeams = !!game && game.teams.some((t) => t.some((id) => game.players.some((p) => p.id === id)))
  const noRoster = !!game && game.players.length === 0
  // As notas só chegam na resposta pública quando o organizador libera as estrelas.
  const ratingById = new Map(
    (game?.players ?? []).flatMap((p) => (typeof p.rating === 'number' ? [[p.id, p.rating] as const] : [])),
  )
  const byId = new Map((game?.players ?? []).map((p) => [p.id, p]))
  const reserves = (game?.reserves ?? []).flatMap((id) => {
    const p = byId.get(id)
    return p ? [p] : []
  })

  return (
    <div className="min-h-screen text-text bg-bg">
      <SiteHeader
        roleLabel="Membro"
        subtitle={game ? formatDayLabel(game.date, game.time) : error || loading ? undefined : 'Sem jogo marcado'}
      />

      {noRoster && game ? (
        <main className="box-border flex min-h-[calc(100vh-66px)] items-center justify-center px-5 py-12">
          <div className="flex w-full max-w-[520px] flex-col items-center gap-6 text-center">
            <div className="aspect-[4/3] w-full max-w-[360px]">
              <img
                src="/images/membro-elenco-vazio.webp"
                alt="Ilustração de uma jogadora de vôlei triste ao lado de uma bola, com a quadra vazia"
                width={720}
                height={540}
                loading="eager"
                className="block size-full rounded-[16px] object-cover"
              />
            </div>
            <div className="flex flex-col items-center gap-2">
              <h1 className="m-0 text-[26px] font-medium tracking-[-0.01em] text-balance">
                A lista de jogadores ainda está vazia
              </h1>
              <p className="m-0 max-w-[420px] text-[15px] text-neutral-400 text-pretty">
                O organizador ainda não cadastrou ninguém. Quando o elenco estiver pronto e os times forem sorteados, a escalação aparece aqui.
              </p>
            </div>
            <span className="flex items-center gap-2 rounded-full bg-surface px-[14px] py-2 text-[14px] shadow-sm">
              <span className="text-gold-ink">
                <Icon name="calendar" size={16} />
              </span>
              {`Próximo jogo: ${formatDayLabel(game.date, game.time)}`}
            </span>
          </div>
        </main>
      ) : (
      <main className="flex flex-wrap gap-[28px] px-[28px] pt-[24px] pb-[56px] items-start max-w-[1440px] mx-auto box-border">
        {!game && <h1 className="sr-only">Times</h1>}
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
                <GameCard game={null} />
              </div>
            )
          )
        ) : (
          <>
            <div className="flex min-w-0 flex-[3_1_520px] flex-col gap-5">
              <GameCard game={game} />
              <h1 className="m-0 text-[32px] font-medium tracking-[-0.02em]">Times</h1>
              {hasTeams && game.showStars && <BalanceCard teams={game.teams} ratingById={ratingById} />}
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
                  <h2 className="m-0 text-xs font-normal uppercase tracking-[0.06em] text-neutral-500">Reservas · {reserves.length}</h2>
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
      )}
    </div>
  )
}

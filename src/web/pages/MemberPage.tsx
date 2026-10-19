import { SiteHeader } from '../components/SiteHeader'
import { StarRating } from '../components/StarRating'
import { formatGameDate } from '../format'
import { usePublicGame } from '../hooks/usePublicGame'
import type { PublicGame } from '../../shared/types'

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

const label = {
  fontSize: 12,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--color-neutral-500)',
} as const

function Roster({ game }: { game: PublicGame }) {
  return (
    <section className="member-roster">
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 28, fontWeight: 500, letterSpacing: '-0.01em' }}>Elenco</h2>
        <span style={label}>
          {game.players.length} {game.players.length === 1 ? 'jogador' : 'jogadores'}
        </span>
      </div>
      <ul className="plain-list" style={{ display: 'flex', flexDirection: 'column' }}>
        {game.players.map((p) => (
          <li
            key={p.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 0',
              borderBottom: '1px solid var(--color-neutral-900)',
            }}
          >
            <span style={{ flex: 1, minWidth: 0, fontSize: 14 }}>{p.name}</span>
            {p.rating !== undefined && <StarRating value={p.rating} size={16} />}
            <span
              className="tag"
              style={{ color: p.paid ? 'var(--gold-ink)' : 'var(--color-neutral-500)' }}
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
    <div className="team-grid">
      {game.teams.map((team, i) => {
        const members = team.flatMap((id) => {
          const p = byId.get(id)
          return p ? [p] : []
        })
        return (
          <section key={i} className="team-card">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={label}>
                {members.length} {members.length === 1 ? 'jogador' : 'jogadores'}
              </span>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 500 }}>Time {LETTERS[i] ?? i + 1}</h2>
            </div>
            <div className="gold-rule" />
            <ul className="plain-list" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {members.map((p) => (
                <li
                  key={p.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 14 }}
                >
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {p.name}
                  </span>
                  {p.rating !== undefined && <StarRating value={p.rating} size={12} />}
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
            <p className="empty" role="status">
              Não foi possível carregar a escalação. Tentando de novo…
            </p>
          ) : (
            !loading && (
              <div className="empty">
                <span style={{ fontSize: 16 }}>Nenhum jogo marcado</span>
              </div>
            )
          )
        ) : (
          <>
            <section className="member-teams">
              <p style={{ margin: 0, fontSize: 28, fontWeight: 500, letterSpacing: '-0.01em' }}>
                {formatGameDate(game.date)}
              </p>
              {!hasTeams && (
                <div className="empty">
                  <span style={{ fontSize: 16 }}>Os times ainda não foram sorteados</span>
                  <span style={{ fontSize: 14, color: 'var(--color-neutral-400)' }}>
                    Assim que o organizador sortear, as escalações aparecem aqui.
                  </span>
                </div>
              )}
              {hasTeams && <TeamCards game={game} />}
              {hasTeams && reserves.length > 0 && (
                <section className="reserves">
                  <h2 style={{ ...label, margin: 0, fontWeight: 'inherit' }}>Reservas</h2>
                  <ul className="plain-list" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {reserves.map((p) => (
                      <li key={p.id} className="chip">
                        {p.name}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </section>
            <Roster game={game} />
          </>
        )}
      </main>
    </div>
  )
}

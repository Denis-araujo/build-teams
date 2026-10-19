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
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {game.players.map((p) => (
          <div
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
          </div>
        ))}
      </div>
    </section>
  )
}

function TeamCards({ game }: { game: PublicGame }) {
  const ratings = new Map(game.players.map((p) => [p.name, p.rating]))
  return (
    <div className="team-grid">
      {game.teams.map((team, i) => (
        <div key={i} className="team-card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={label}>
              {team.length} {team.length === 1 ? 'jogador' : 'jogadores'}
            </span>
            <span style={{ fontSize: 20, fontWeight: 500 }}>Time {LETTERS[i] ?? i + 1}</span>
          </div>
          <div className="gold-rule" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {team.map((name) => {
              const rating = ratings.get(name)
              return (
                <div
                  key={name}
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
                    {name}
                  </span>
                  {rating !== undefined && <StarRating value={rating} size={12} />}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function MemberPage() {
  const { game, loading } = usePublicGame()
  const hasTeams = !!game && game.teams.length > 0

  return (
    <div className="page">
      <nav className="nav">
        <div className="nav-brand">
          <svg viewBox="0 0 256 256" width="20" height="20" aria-hidden="true" style={{ color: 'var(--gold)', filter: 'drop-shadow(0 0 6px var(--gold-soft))' }}>
            <path
              fill="currentColor"
              d="M234.29,114.85l-45,38.83L203,211.75a16.4,16.4,0,0,1-24.5,17.82L128,198.49,77.47,229.57A16.4,16.4,0,0,1,53,211.75l13.76-58.07-45-38.83A16.46,16.46,0,0,1,31.08,86l59-4.76,22.76-55.08a16.36,16.36,0,0,1,30.27,0l22.75,55.08,59,4.76a16.46,16.46,0,0,1,9.37,28.86Z"
            />
          </svg>
          <span>Escalação</span>
        </div>
      </nav>

      <main className="main">
        {!game ? (
          !loading && (
            <div className="empty">
              <span style={{ fontSize: 16 }}>Nenhum jogo marcado</span>
            </div>
          )
        ) : (
          <>
            <section className="member-teams">
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 500, letterSpacing: '-0.01em' }}>
                {formatGameDate(game.date)}
              </h1>
              {!hasTeams && (
                <div className="empty">
                  <span style={{ fontSize: 16 }}>Os times ainda não foram sorteados</span>
                  <span style={{ fontSize: 14, color: 'var(--color-neutral-400)' }}>
                    Assim que o organizador sortear, as escalações aparecem aqui.
                  </span>
                </div>
              )}
              {hasTeams && <TeamCards game={game} />}
              {hasTeams && game.reserves.length > 0 && (
                <div className="reserves">
                  <span style={label}>Reservas</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {game.reserves.map((name) => (
                      <span key={name} className="chip">
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>
            <Roster game={game} />
          </>
        )}
      </main>
    </div>
  )
}

import { useRef, useState } from 'react'
import { api, HttpError, UnauthorizedError } from '../api'
import { drawTeams } from '../../shared/draw'
import type { Game, Player } from '../../shared/types'
import { averageSize, balanceTag, fmt, outsideCount, sizesEqual, spreadOf } from '../lib/drawStats'
import { DrawModal } from './DrawModal'
import { ReservesBar } from './ReservesBar'
import { TeamCards } from './TeamCards'

type Props = {
  game: Game | null
  players: Player[]
  onGameChange(game: Game | null): void
  onUnauthorized(): void
}

const DEFAULTS = { teamCount: 2, teamSize: 6 }

export function DrawArea({ game, players, onGameChange, onUnauthorized }: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inFlight = useRef(false)

  const draw = game?.draw ?? null
  const playersById = new Map(players.map((p) => [p.id, p]))
  const ratings = new Map(players.map((p) => [p.id, p.rating]))
  const paidSet = new Set(game?.paid ?? [])
  const paidPlayers = players.filter((p) => paidSet.has(p.id))
  const config = draw ? { teamCount: draw.teamCount, teamSize: draw.teamSize } : DEFAULTS
  const survivingLocks = Object.fromEntries(
    Object.entries(draw?.locks ?? {}).filter(([id, idx]) => paidSet.has(id) && playersById.has(id) && idx < config.teamCount),
  )
  const lockedCount = Object.keys(survivingLocks).length

  async function runDraw(cfg: { teamCount: number; teamSize: number }) {
    if (!game || inFlight.current) return
    inFlight.current = true
    setBusy(true)
    setError(null)
    try {
      const locks = Object.fromEntries(Object.entries(survivingLocks).filter(([, idx]) => idx < cfg.teamCount))
      const { teams, reserves } = drawTeams({
        players: paidPlayers.map((p) => ({ id: p.id, rating: p.rating })),
        teamCount: cfg.teamCount,
        teamSize: cfg.teamSize,
        locks,
        previousReserves: draw?.reserves ?? [],
      })
      // A tela só mostra o que o servidor aceitou.
      onGameChange(await api.saveDraw({ ...cfg, teams, reserves, locks }))
    } catch (e) {
      if (e instanceof UnauthorizedError) onUnauthorized()
      else setError(e instanceof HttpError && e.serverMessage ? e.serverMessage : 'Não foi possível salvar o sorteio. Tente de novo.')
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }

  const hasTeams = !!draw
  const sameSizes = draw ? sizesEqual(draw.teams, ratings) : true
  const spread = draw ? spreadOf(draw.teams, ratings) : 0
  const tag = draw
    ? balanceTag(spread, { allowHalf: true, sizesEqual: sameSizes, avgSize: averageSize(draw.teams, ratings) })
    : null
  const outside = draw && game ? outsideCount(game.paid, players, draw) : 0
  const cannotDraw = busy || paidPlayers.length < config.teamCount

  return (
    <section className="draw-area" aria-label="Times">
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 16, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 500, letterSpacing: '-0.01em' }}>Times</h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--color-neutral-400)' }}>
            {draw && tag ? (
              <>
                <span>
                  Diferença entre o mais forte e o mais fraco: {fmt(spread)} ★{sameSizes ? '' : ' (média por jogador)'}
                </span>
                <span className={`tag${tag.tone === 'good' ? ' tag-good' : ''}`}>{tag.label}</span>
              </>
            ) : (
              <span>Os times aparecem aqui depois do sorteio</span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: 'var(--color-neutral-400)' }}>
            {config.teamCount} times · {config.teamSize} por time
          </span>
          {draw && (
            <button
              type="button"
              className="btn btn-ghost"
              disabled={cannotDraw}
              aria-busy={busy}
              onClick={() => void runDraw(config)}
            >
              Sortear de novo{lockedCount ? ` (${lockedCount} ${lockedCount === 1 ? 'travado' : 'travados'})` : ''}
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary"
            disabled={!game || busy}
            aria-busy={busy}
            onClick={() => setModalOpen(true)}
          >
            Montar times
          </button>
        </div>
      </div>
      {!game && <span style={{ fontSize: 13, color: 'var(--color-neutral-500)' }}>Cadastre a data do jogo primeiro</span>}

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {!draw ? (
        <div className="empty">
          <span style={{ fontSize: 16 }}>Nenhum time montado ainda</span>
          <span style={{ fontSize: 14, color: 'var(--color-neutral-400)' }}>
            Marque quem pagou, clique em Montar times e escolha quantos times e quantos jogadores por time. As estrelas são distribuídas para os times ficarem o mais parelhos possível. Quem passar das vagas vira reserva.
          </span>
        </div>
      ) : (
        <>
          <TeamCards teams={draw.teams} playersById={playersById} />
          <ReservesBar reserves={draw.reserves} playersById={playersById} />
          {outside > 0 && (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--gold-ink)' }}>
              {outside} {outside === 1 ? 'pagou e ficou' : 'pagaram e ficaram'} de fora — sorteie de novo para incluir.
            </p>
          )}
        </>
      )}

      <DrawModal
        open={modalOpen}
        paidCount={paidPlayers.length}
        initial={config}
        lockedCount={lockedCount}
        hasTeams={hasTeams}
        onClose={() => setModalOpen(false)}
        onConfirm={(cfg) => {
          setModalOpen(false)
          void runDraw(cfg)
        }}
      />
    </section>
  )
}

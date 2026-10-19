import { useEffect, useRef, useState, type DragEvent } from 'react'
import { api, HttpError, UnauthorizedError } from '../api'
import { drawTeams } from '../../shared/draw'
import type { DrawState, Game, Player } from '../../shared/types'
import { averageSize, balanceTag, fmt, outsideCount, sizesEqual, spreadOf } from '../lib/drawStats'
import { canMoveToTeam, moveToReserves, moveToTeam, sanitizeLocks, swapPlayers, teamLetter, toggleLock } from '../lib/drawEdit'
import { CopyBar } from './CopyBar'
import { DrawModal } from './DrawModal'
import { ReservesBar } from './ReservesBar'
import { TeamCards } from './TeamCards'

type Props = {
  game: Game | null
  players: Player[]
  onGameChange(game: Game | null): void
  onUnauthorized(): void
}

const HIGHLIGHT = '0 0 0 1px var(--color-accent), 0 0 24px var(--color-accent-800)'
const LOCK_ON =
  'M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80ZM96,56a32,32,0,0,1,64,0V80H96ZM208,208H48V96H208V208Zm-68-56a12,12,0,1,1-12-12A12,12,0,0,1,140,152Z'
const LOCK_OFF =
  'M208,80H96V56a32,32,0,0,1,32-32c15.37,0,29.2,11,32.16,25.59a8,8,0,0,0,15.68-3.18C171.32,24.15,151.2,8,128,8A48.05,48.05,0,0,0,80,56V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80Zm0,128H48V96H208V208Zm-68-56a12,12,0,1,1-12-12A12,12,0,0,1,140,152Z'

const DEFAULTS = { teamCount: 2, teamSize: 6 }

export function DrawArea({ game, players, onGameChange, onUnauthorized }: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [over, setOver] = useState<number | 'reserves' | null>(null)
  const inFlight = useRef(false)
  const rootRef = useRef<HTMLElement>(null)
  const pendingFocus = useRef<{ id: string; control: 'lock' | 'move' } | null>(null)

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

  /** Toda mudança passa por aqui: sanear travas, salvar e só então mostrar o que o servidor devolveu. */
  async function persist(build: () => DrawState, focus?: { id: string; control: 'lock' | 'move' }) {
    if (!game || inFlight.current) return
    inFlight.current = true
    setBusy(true)
    setError(null)
    try {
      const next = build()
      // Transformação que não mudou nada (id que saiu do sorteio, reserva travada...): nada a salvar.
      if (draw && next === draw) return
      pendingFocus.current = focus ?? null
      onGameChange(await api.saveDraw(sanitizeLocks(next)))
    } catch (e) {
      pendingFocus.current = null
      if (e instanceof UnauthorizedError) onUnauthorized()
      else setError(e instanceof HttpError && e.serverMessage ? e.serverMessage : 'Não foi possível salvar o sorteio. Tente de novo.')
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }

  function runDraw(cfg: { teamCount: number; teamSize: number }) {
    return persist(() => {
      const locks = Object.fromEntries(Object.entries(survivingLocks).filter(([, idx]) => idx < cfg.teamCount))
      const { teams, reserves } = drawTeams({
        players: paidPlayers.map((p) => ({ id: p.id, rating: p.rating })),
        teamCount: cfg.teamCount,
        teamSize: cfg.teamSize,
        locks,
        previousReserves: draw?.reserves ?? [],
      })
      return { ...cfg, teams, reserves, locks }
    })
  }

  // O sorteio mudou por fora (pagamento, resposta do servidor): arrasto em andamento deixa de valer.
  useEffect(() => {
    setDragId(null)
    setOver(null)
  }, [game])

  // Depois de salvar, devolve o foco ao controle que originou a edição (o nó pode ter mudado de time).
  useEffect(() => {
    const target = pendingFocus.current
    if (!target) return
    pendingFocus.current = null
    const el = Array.from(rootRef.current?.querySelectorAll<HTMLElement>('[data-control]') ?? []).find(
      (n) => n.dataset.playerId === target.id && n.dataset.control === target.control,
    )
    el?.focus()
  }, [game])

  const locationOf = (id: string) => draw?.teams.findIndex((t) => t.includes(id)) ?? -1

  function moveTo(id: string, target: number | 'reserves', focus?: { id: string; control: 'lock' | 'move' }) {
    if (!draw || inFlight.current) return
    if (target === 'reserves') {
      if (draw.reserves.includes(id)) return
      void persist(() => moveToReserves(draw, id), focus)
      return
    }
    if (locationOf(id) === target) return
    const check = canMoveToTeam(draw, id, target)
    if (!check.ok) {
      setError(check.reason)
      return
    }
    void persist(() => moveToTeam(draw, id, target), focus)
  }

  function swap(a: string, b: string) {
    if (!draw || inFlight.current || a === b) return
    if (locationOf(a) < 0 && locationOf(b) < 0) return
    void persist(() => swapPlayers(draw, a, b))
  }

  const draggedId = (e: DragEvent) => dragId ?? e.dataTransfer?.getData('text/plain') ?? null
  const endDrag = () => {
    setDragId(null)
    setOver(null)
  }
  const dragStart = (id: string) => (e: DragEvent) => {
    if (busy) return
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
    setDragId(id)
  }
  const dropTarget = (target: number | 'reserves') => ({
    onDragOver: (e: DragEvent) => {
      if (!dragId || busy) return
      e.preventDefault()
      if (over !== target) setOver(target)
    },
    onDragLeave: (e: DragEvent) => {
      // relatedTarget nulo: mantém o destaque até soltar ou o dragend, para não piscar.
      const next = e.relatedTarget as Node | null
      if (next && !e.currentTarget.contains(next)) setOver((o) => (o === target ? null : o))
    },
    onDrop: (e: DragEvent) => {
      e.preventDefault()
      const id = draggedId(e)
      endDrag()
      if (id) moveTo(id, target)
    },
    style: over === target ? { boxShadow: HIGHLIGHT } : undefined,
  })
  const rowDrop = (targetId: string) => ({
    onDragOver: (e: DragEvent) => {
      if (dragId && dragId !== targetId && !busy) e.preventDefault()
    },
    onDrop: (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const id = draggedId(e)
      endDrag()
      if (id) swap(id, targetId)
    },
  })
  const draggable = (id: string) => ({
    draggable: !busy,
    onDragStart: dragStart(id),
    onDragEnd: endDrag,
    ...rowDrop(id),
  })

  function moveSelect(p: Player, teamIndex: number) {
    const current = teamIndex < 0 ? 'reserves' : String(teamIndex)
    return (
      <select
        className="move-select"
        aria-label={`Mover ${p.name} para`}
        aria-disabled={busy}
        data-player-id={p.id}
        data-control="move"
        value={current}
        onChange={(e) =>
          moveTo(p.id, e.target.value === 'reserves' ? 'reserves' : Number(e.target.value), { id: p.id, control: 'move' })
        }
      >
        {draw!.teams.map((t, i) => {
          const full = i !== teamIndex && t.length >= draw!.teamSize
          return (
            <option key={i} value={i} disabled={full}>
              Time {teamLetter(i)}
              {full ? ' (cheio)' : ''}
            </option>
          )
        })}
        <option value="reserves">Reservas</option>
      </select>
    )
  }

  const hasTeams = !!draw
  const hasPlaced = !!draw && [...draw.teams.flat(), ...draw.reserves].some((id) => playersById.has(id))
  const sameSizes = draw ? sizesEqual(draw.teams, ratings) : true
  const spread = draw ? spreadOf(draw.teams, ratings) : 0
  const tag = draw
    ? balanceTag(spread, { allowHalf: true, sizesEqual: sameSizes, avgSize: averageSize(draw.teams, ratings) })
    : null
  const outside = draw && game ? outsideCount(game.paid, players, draw) : 0
  const cannotDraw = busy || paidPlayers.length < config.teamCount

  return (
    <section ref={rootRef} className="draw-area" aria-label="Times" aria-busy={busy}>
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
          <TeamCards
            teams={draw.teams}
            playersById={playersById}
            cardProps={(i) => dropTarget(i)}
            rowProps={({ player }) => ({
              ...draggable(player.id),
              style: { flexWrap: 'wrap', opacity: dragId === player.id ? 0.5 : 1 },
            })}
            renderRowExtras={({ player, teamIndex }) => {
              const locked = draw.locks[player.id] === teamIndex
              return (
                <>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-pressed={locked}
                    aria-label={locked ? `Destravar ${player.name}` : `Travar ${player.name} neste time`}
                    aria-disabled={busy}
                    data-player-id={player.id}
                    data-control="lock"
                    style={{ color: locked ? 'var(--gold-ink)' : 'var(--color-neutral-500)' }}
                    onClick={() => void persist(() => toggleLock(draw, player.id), { id: player.id, control: 'lock' })}
                  >
                    <svg viewBox="0 0 256 256" width="14" height="14" aria-hidden="true">
                      <path fill="currentColor" d={locked ? LOCK_ON : LOCK_OFF} />
                    </svg>
                  </button>
                  {moveSelect(player, teamIndex)}
                </>
              )
            }}
          />
          <ReservesBar
            reserves={draw.reserves}
            playersById={playersById}
            showEmpty={dragId !== null}
            barProps={dropTarget('reserves')}
            chipProps={(p) => ({ ...draggable(p.id), style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', opacity: dragId === p.id ? 0.5 : 1 } })}
            renderChipExtras={(p) => moveSelect(p, -1)}
          />
          {game && hasPlaced && (
            <CopyBar
              date={game.date}
              teams={draw.teams.map((t) => t.flatMap((id) => playersById.get(id) ?? []))}
              reserves={draw.reserves.flatMap((id) => playersById.get(id) ?? [])}
            />
          )}
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

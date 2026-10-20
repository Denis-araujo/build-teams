import { useEffect, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { api, HttpError, UnauthorizedError } from '../api'
import { drawTeams } from '../../shared/draw'
import type { DrawState, Game, Player } from '../../shared/types'
import { outsideCount } from '../lib/drawStats'
import { canMoveToTeam, moveToReserves, moveToTeam, sanitizeLocks, swapPlayers, teamLetter, toggleLock } from '../lib/drawEdit'
import { BalanceCard } from './BalanceCard'
import { CopyBar } from './CopyBar'
import { DrawModal } from './DrawModal'
import { Icon } from './icons'
import { Onboarding } from './Onboarding'
import { ReservesBar } from './ReservesBar'
import { TeamCards } from './TeamCards'

type Props = {
  /** Cartão do jogo: primeiro filho da coluna "Times" (v4). */
  gameCard?: ReactNode
  game: Game | null
  players: Player[]
  onGameChange(game: Game | null): void
  /** Chamado quando o servidor diz que o jogo sumiu (404): a página recarrega os dados. */
  onStale?(): void
  onUnauthorized(): void
  /** Avisa a página quando um salvamento começa ou termina. */
  onBusyChange?(busy: boolean): void
  /** Uma chamada em lote (ex.: marcar todos) está em andamento fora daqui: bloqueia as edições. */
  externalBusy?: boolean
}

const HIGHLIGHT_TEAM = '0 0 0 2px var(--color-accent), 0 8px 24px rgba(36,54,90,0.18)'
const HIGHLIGHT_RESERVES = '0 0 0 2px var(--color-accent)'

const MOVE_SELECT =
  'order-3 h-[26px] w-[92px] cursor-pointer rounded-sm border-0 bg-surface px-1 text-[12px] text-text shadow-sm aria-disabled:cursor-not-allowed aria-disabled:opacity-50'
const LOCK_ON =
  'M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80ZM96,56a32,32,0,0,1,64,0V80H96ZM208,208H48V96H208V208Zm-68-56a12,12,0,1,1-12-12A12,12,0,0,1,140,152Z'
const LOCK_OFF =
  'M208,80H96V56a32,32,0,0,1,32-32c15.37,0,29.2,11,32.16,25.59a8,8,0,0,0,15.68-3.18C171.32,24.15,151.2,8,128,8A48.05,48.05,0,0,0,80,56V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80Zm0,128H48V96H208V208Zm-68-56a12,12,0,1,1-12-12A12,12,0,0,1,140,152Z'

const DEFAULTS = { teamCount: 2, teamSize: 6 }

export function DrawArea({ gameCard, game, players, onGameChange, onUnauthorized, onStale, onBusyChange, externalBusy = false }: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const blocked = busy || externalBusy
  useEffect(() => {
    onBusyChange?.(busy)
  }, [busy, onBusyChange])
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
    if (!game || inFlight.current || externalBusy) return
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
      else if (e instanceof HttpError && e.status === 404) {
        onStale?.()
        setError('O jogo mudou. A página foi atualizada.')
      }
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
    if (blocked) return
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
    setDragId(id)
  }
  const dropTarget = (target: number | 'reserves') => ({
    onDragOver: (e: DragEvent) => {
      if (!dragId || blocked) return
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
    style: over === target ? { boxShadow: target === 'reserves' ? HIGHLIGHT_RESERVES : HIGHLIGHT_TEAM } : undefined,
  })
  const rowDrop = (targetId: string) => ({
    onDragOver: (e: DragEvent) => {
      if (dragId && dragId !== targetId && !blocked) e.preventDefault()
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
    draggable: !blocked,
    onDragStart: dragStart(id),
    onDragEnd: endDrag,
    ...rowDrop(id),
  })

  function moveSelect(p: Player, teamIndex: number) {
    const current = teamIndex < 0 ? 'reserves' : String(teamIndex)
    return (
      <select
        className={MOVE_SELECT}
        aria-label={`Mover ${p.name} para`}
        aria-disabled={blocked}
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

  // Sorteio sem nenhum jogador alocado (listas vazias ou ids que saíram) é o estado vazio.
  const hasTeams = !!draw && draw.teams.some((t) => t.some((id) => playersById.has(id)))
  const hasPlaced = !!draw && [...draw.teams.flat(), ...draw.reserves].some((id) => playersById.has(id))
  const outside = draw && game ? outsideCount(game.paid, players, draw) : 0
  const cannotDraw = blocked || paidPlayers.length < config.teamCount

  return (
    <section
      ref={rootRef}
      className="flex min-w-0 flex-[3_1_520px] flex-col gap-5"
      aria-label="Times"
      aria-busy={blocked}
    >
      {gameCard}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="m-0 text-[32px] font-medium tracking-[-0.02em]">Times</h1>
          {hasTeams && (
            <span className="rounded-full bg-surface px-[10px] py-1 text-[13px] text-neutral-400 shadow-sm tabular-nums">
              {config.teamCount} times × {config.teamSize}
            </span>
          )}
        </div>
        {hasTeams && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn btn-ghost gap-[6px]"
              disabled={!game || blocked}
              aria-busy={blocked}
              onClick={() => setModalOpen(true)}
            >
              <Icon name="sliders" size={15} />
              Formato
            </button>
            <button
              type="button"
              className="btn btn-primary gap-[6px]"
              disabled={cannotDraw}
              aria-busy={blocked}
              onClick={() => void runDraw(config)}
            >
              <Icon name="shuffle" size={15} />
              Sortear de novo{lockedCount ? ` · ${lockedCount} ${lockedCount === 1 ? 'travado' : 'travados'}` : ''}
            </button>
          </div>
        )}
      </div>

      {error && (
        <p
          className="m-0 rounded-sm bg-gold-tint px-3 py-2 text-[13px] text-gold-ink shadow-[inset_0_0_0_1px_var(--gold-soft)]"
          role="alert"
        >
          {error}
        </p>
      )}

      {!hasTeams || !draw ? (
        <>
          <Onboarding
            marked={paidPlayers.length}
            total={players.length}
            hasGame={!!game}
            busy={blocked}
            onOpen={() => setModalOpen(true)}
          />
          {/* v4: a grade vazia dos times continua na coluna e soma um gap de 20px. */}
          <div aria-hidden="true" />
        </>
      ) : (
        <>
          <BalanceCard teams={draw.teams} ratingById={ratings} />
          <TeamCards
            teams={draw.teams}
            playersById={playersById}
            cardProps={(i) => dropTarget(i)}
            rowProps={({ player }) => ({
              ...draggable(player.id),
              style: { opacity: dragId === player.id ? 0.5 : 1 },
            })}
            renderRowExtras={({ player, teamIndex }) => {
              const locked = draw.locks[player.id] === teamIndex
              return (
                <>
                  <button
                    type="button"
                    className={`order-1 flex size-[26px] flex-none cursor-pointer items-center justify-center rounded-sm border-0 p-0 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 ${
                      locked ? 'bg-gold-tint text-gold-ink' : 'bg-transparent text-neutral-600'
                    }`}
                    aria-pressed={locked}
                    aria-label={locked ? `Destravar ${player.name}` : `Travar ${player.name} neste time`}
                    aria-disabled={blocked}
                    data-player-id={player.id}
                    data-control="lock"
                    title={locked ? `Destravar ${player.name}` : `Travar ${player.name} neste time`}
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
            chipProps={(p) => ({ ...draggable(p.id), style: { opacity: dragId === p.id ? 0.5 : 1 } })}
            renderChipExtras={(p) => moveSelect(p, -1)}
          />
          {game && hasPlaced && (
            <CopyBar
              date={game.date}
              time={game.time}
              teams={draw.teams.map((t) => t.flatMap((id) => playersById.get(id) ?? []))}
              reserves={draw.reserves.flatMap((id) => playersById.get(id) ?? [])}
            />
          )}
          <div className="flex flex-wrap gap-x-[18px] gap-y-[6px] text-[12px] text-neutral-500">
            <span>Arraste para trocar de time</span>
            <span>Cadeado mantém o jogador no time ao sortear de novo</span>
            {outside > 0 && (
              <span className="text-gold-ink">
                {outside} {outside === 1 ? 'jogador ficou' : 'jogadores ficaram'} de fora — sorteie de novo para incluir.
              </span>
            )}
          </div>
        </>
      )}

      <DrawModal
        open={modalOpen}
        paidCount={paidPlayers.length}
        total={players.length}
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

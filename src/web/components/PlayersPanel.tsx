import { useLayoutEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { api, HttpError, UnauthorizedError } from '../api'
import type { Game, Player } from '../../shared/types'
import { formatRating, StarRating } from './StarRating'

type Props = {
  players: Player[]
  game: Game | null
  onPlayersChange(players: Player[]): void
  onGameChange(game: Game | null): void
  /** Chamado quando o servidor diz que o jogo sumiu (404): a página recarrega os dados. */
  onStale?(): void
  onUnauthorized: () => void
  /** Rodapé do card (ex.: a configuração "Membro vê as estrelas"). */
  footer?: ReactNode
}

const DEFAULT_RATING = 3

function PlayerRow(props: {
  player: Player
  paid: boolean
  hasGame: boolean
  pending: boolean
  onTogglePaid(paid: boolean): void
  onRename(name: string): Promise<boolean>
  onRate(rating: number): void
  onRemove(): void
}) {
  const { player, paid, hasGame, pending, onTogglePaid, onRename, onRate, onRemove } = props
  const [draft, setDraft] = useState(player.name)
  // Acompanha o nome do servidor: se mudar (renomeado, recarregado), o campo segue.
  const [seen, setSeen] = useState(player.name)
  if (seen !== player.name) {
    setSeen(player.name)
    setDraft(player.name)
  }

  const committing = useRef(false)
  async function commit() {
    if (committing.current) return
    committing.current = true
    try {
      await doCommit()
    } finally {
      committing.current = false
    }
  }
  async function doCommit() {
    const name = draft.trim()
    if (name === player.name) {
      setDraft(player.name)
      return
    }
    if (!name || !(await onRename(name))) setDraft(player.name)
  }

  return (
    <div className={`flex items-center gap-[10px] px-[10px] py-[6px] rounded-sm hover:bg-bg ${hasGame && !paid ? 'opacity-[0.45]' : 'opacity-100'}`}
      data-testid={`player-${player.id}`}>
      <input
        type="checkbox"
        className="size-4 accent-[var(--navy)] cursor-pointer m-0 flex-none disabled:cursor-not-allowed"
        aria-label={`Pagou: ${player.name}`}
        checked={paid}
        disabled={!hasGame || pending}
        title={hasGame ? undefined : 'Cadastre a data do jogo primeiro'}
        onChange={(e) => onTogglePaid(e.target.checked)}
      />
      <input
        className="flex-1 min-w-0 bg-transparent border-0 text-text text-[14px] py-1 px-0 font-[inherit]"
        aria-label={`Nome de ${player.name}`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void commit()
          else if (e.key === 'Escape') setDraft(player.name)
        }}
      />
      <StarRating value={player.rating} onChange={onRate} size={18} />
      <span className="w-[26px] text-right text-[13px] font-medium text-gold-ink tabular-nums flex-none">
        {formatRating(player.rating)}
      </span>
      <button
        type="button"
        className="btn btn-ghost btn-icon w-[26px] h-[26px] text-neutral-500 flex-none"
        aria-label={`Remover ${player.name}`}
        onClick={onRemove}
      >
        <svg viewBox="0 0 256 256" width="13" height="13" aria-hidden="true">
          <path
            fill="currentColor"
            d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"
          />
        </svg>
      </button>
    </div>
  )
}

export function PlayersPanel({ players, game, onPlayersChange, onGameChange, onUnauthorized, onStale, footer }: Props) {
  const [name, setName] = useState('')
  const [rating, setRating] = useState(DEFAULT_RATING)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set())
  const inFlight = useRef(new Set<string>())
  const [bulk, setBulk] = useState(false)
  const bulkBusy = useRef(false)
  // Guarda o id do jogo para a confirmação sumir se o jogo mudar ou desaparecer.
  const [confirmingFor, setConfirmingFor] = useState<string | null>(null)
  const confirmingClear = confirmingFor !== null && game?.id === confirmingFor
  const clearBtn = useRef<HTMLButtonElement>(null)
  const allBtn = useRef<HTMLButtonElement>(null)
  const cancelBtn = useRef<HTMLButtonElement>(null)
  const [focusAll, setFocusAll] = useState(false)
  useLayoutEffect(() => {
    if (confirmingClear) cancelBtn.current?.focus()
  }, [confirmingClear])
  useLayoutEffect(() => {
    if (focusAll && !bulk) {
      allBtn.current?.focus()
      setFocusAll(false)
    }
  }, [focusAll, bulk])
  // Sempre a lista mais recente, para que respostas tardias não apliquem sobre uma lista velha.
  const latest = useRef(players)
  latest.current = players

  function fail(e: unknown, fallback: string, opts: { who?: string; useServerMessage?: boolean } = {}) {
    if (e instanceof UnauthorizedError) {
      onUnauthorized()
      return
    }
    const msg = opts.useServerMessage !== false && e instanceof HttpError && e.serverMessage ? e.serverMessage : fallback
    setError(opts.who ? `${opts.who}: ${msg}` : msg)
  }

  function applyPlayers(list: Player[]) {
    latest.current = list
    onPlayersChange(list)
  }

  // PATCHes do mesmo jogador entram numa fila (uma por vez); jogadores diferentes não se bloqueiam.
  const queues = useRef(new Map<string, Promise<unknown>>())
  const removing = useRef(new Set<string>())

  async function add(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || adding) return
    setAdding(true)
    setError(null)
    try {
      const created = await api.createPlayer({ name: trimmed, rating })
      applyPlayers([...latest.current, created].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')))
      setName('')
      setRating(DEFAULT_RATING)
    } catch (err) {
      fail(err, 'Não foi possível adicionar o jogador. Tente de novo.')
    } finally {
      setAdding(false)
    }
  }

  function update(id: string, patch: { name?: string; rating?: number }): Promise<boolean> {
    const who = latest.current.find((p) => p.id === id)?.name
    setError(null) // ao enfileirar, para que o erro de um pedido anterior não seja apagado por este
    const run = async (): Promise<boolean> => {
      try {
        const saved = await api.updatePlayer(id, patch)
        // Aplica só os campos deste pedido; o resto da linha pode ter sido mudado por outro.
        const changed: Partial<Player> = {}
        if (patch.name !== undefined) changed.name = saved.name
        if (patch.rating !== undefined) changed.rating = saved.rating
        applyPlayers(latest.current.map((p) => (p.id === id ? { ...p, ...changed } : p)))
        return true
      } catch (err) {
        fail(err, 'Não foi possível salvar o jogador. Tente de novo.', { who })
        return false
      }
    }
    const next = (queues.current.get(id) ?? Promise.resolve()).then(run)
    queues.current.set(id, next)
    return next
  }

  async function remove(p: Player) {
    if (removing.current.has(p.id)) return
    if (!window.confirm(`Remover ${p.name}?`)) return
    removing.current.add(p.id)
    setError(null)
    try {
      await api.archivePlayer(p.id)
      applyPlayers(latest.current.filter((x) => x.id !== p.id))
    } catch (err) {
      fail(err, 'Não foi possível remover o jogador. Tente de novo.', { who: p.name })
    } finally {
      removing.current.delete(p.id)
    }
  }

  async function setAll(paid: boolean, confirmed = false) {
    if (bulkBusy.current || inFlight.current.size > 0) return
    bulkBusy.current = true
    setBulk(true)
    setConfirmingFor(null)
    setError(null)
    try {
      onGameChange(await api.setAllPaid(paid))
    } catch (err) {
      if (err instanceof HttpError && err.status === 404) {
        onStale?.()
        setError('O jogo mudou. A página foi atualizada.')
        return
      }
      fail(err, 'Não foi possível salvar os pagamentos. Tente de novo.')
    } finally {
      bulkBusy.current = false
      setBulk(false)
      if (confirmed) setFocusAll(true)
    }
  }

  function clearAll() {
    // Só pede confirmação quando o sorteio guardado tem alguém alocado (time ou reserva).
    const d = game?.draw
    const hasDraw = !!d && (d.teams.some((t) => t.length > 0) || d.reserves.length > 0)
    if (hasDraw && game) setConfirmingFor(game.id)
    else void setAll(false)
  }

  async function togglePaid(id: string, paid: boolean) {
    if (bulkBusy.current || inFlight.current.has(id)) return
    inFlight.current.add(id)
    setPending(new Set(inFlight.current))
    setError(null)
    try {
      onGameChange(await api.setPaid(id, paid))
    } catch (err) {
      if (err instanceof HttpError && err.status === 404) {
        onStale?.()
        setError('O jogo mudou. A página foi atualizada.')
        return
      }
      const who = latest.current.find((p) => p.id === id)?.name
      fail(err, 'Não foi possível salvar o pagamento. Tente de novo.', { who, useServerMessage: false })
    } finally {
      inFlight.current.delete(id)
      setPending(new Set(inFlight.current))
    }
  }

  const paidSet = new Set(game?.paid ?? [])
  const paidCount = players.filter((p) => paidSet.has(p.id)).length

  return (
    <section
      aria-label="Jogadores"
      className="flex-[1_1_320px] max-w-[400px] min-w-0 flex flex-col bg-surface rounded-lg shadow-sm overflow-hidden"
    >
      <div className="pt-[18px] px-[18px] pb-[14px] flex flex-col gap-[14px]">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="m-0 text-[20px] font-medium tracking-[-0.01em]">Jogadores</h2>
          <span className="text-[13px] text-neutral-400 tabular-nums">
            {paidCount} de {players.length} pagaram
          </span>
        </div>

        <form
          aria-label="Novo jogador"
          onSubmit={(e) => void add(e)}
          className="flex flex-col gap-[10px] p-3 rounded-md bg-bg"
        >
          <label className="flex flex-col gap-1 text-[12px] text-neutral-500">
            <span className="sr-only">Nome do jogador</span>
            <input className="input w-full box-border bg-surface" placeholder="Nome do novo jogador" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <div className="flex items-center justify-between gap-[10px]">
            <div className="flex items-center gap-2">
              <StarRating value={rating} onChange={setRating} size={22} />
              <span className="text-[14px] font-medium text-gold-ink tabular-nums min-w-[24px]">
                {formatRating(rating)}
              </span>
            </div>
            <button className="btn btn-primary gap-[6px]" type="submit" disabled={adding || !name.trim()}>
              <svg viewBox="0 0 256 256" width="14" height="14" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z"
                />
              </svg>
              Adicionar
            </button>
          </div>
          <span className="text-[12px] text-neutral-400 text-pretty">
            Clique na metade esquerda de uma estrela para dar meia.
          </span>
        </form>

        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] tracking-[0.06em] uppercase text-neutral-500">Quem vai jogar</span>
          <div className="flex gap-0.5">
            <button
              type="button"
              className="btn btn-ghost text-[12px] px-2 py-1"
              disabled={!game || bulk || pending.size > 0}
              ref={allBtn}
              aria-busy={bulk || undefined}
              title={game ? undefined : 'Cadastre a data do jogo primeiro'}
              onClick={() => void setAll(true)}
            >
              Marcar todos
            </button>
            <button
              ref={clearBtn}
              type="button"
              className="btn btn-ghost text-[12px] px-2 py-1"
              disabled={!game || bulk || pending.size > 0}
              aria-busy={bulk || undefined}
              title={game ? undefined : 'Cadastre a data do jogo primeiro'}
              onClick={clearAll}
            >
              Limpar
            </button>
          </div>
        </div>

        {confirmingClear && (
          <div
            role="group"
            aria-label="Confirmar limpeza"
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3"
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setConfirmingFor(null)
                clearBtn.current?.focus()
              }
            }}
          >
            <div className="flex flex-col gap-[3px]">
              <span className="text-[15px] font-medium">Limpar pagamentos?</span>
              <span className="text-[13px] text-neutral-400">O sorteio será apagado.</span>
            </div>
            <div className="flex gap-[6px]">
              <button
                ref={cancelBtn}
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setConfirmingFor(null)
                  clearBtn.current?.focus()
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={bulk || pending.size > 0}
                onClick={() => void setAll(false, true)}
              >
                Limpar tudo
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="m-0 px-3 py-2 rounded-sm bg-gold-tint text-gold-ink text-[13px] shadow-[inset_0_0_0_1px_var(--gold-soft)]" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="flex flex-col px-2 pb-2">
        {players.map((p) => (
          <PlayerRow
            key={p.id}
            player={p}
            paid={paidSet.has(p.id)}
            hasGame={game !== null}
            pending={pending.has(p.id) || bulk}
            onTogglePaid={(paid) => void togglePaid(p.id, paid)}
            onRename={(n) => update(p.id, { name: n })}
            onRate={(r) => void update(p.id, { rating: r })}
            onRemove={() => void remove(p)}
          />
        ))}
      </div>
      {footer}
    </section>
  )
}

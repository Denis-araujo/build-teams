import { useRef, useState, type FormEvent } from 'react'
import { api, HttpError, UnauthorizedError } from '../api'
import type { Game, Player } from '../../shared/types'
import { formatRating, StarRating } from './StarRating'

type Props = {
  players: Player[]
  game: Game | null
  onPlayersChange(players: Player[]): void
  onGameChange(game: Game | null): void
  onUnauthorized?: () => void
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
    <div className="player-row" data-testid={`player-${player.id}`}>
      <input
        type="checkbox"
        aria-label={`Pagou: ${player.name}`}
        checked={paid}
        disabled={!hasGame || pending}
        title={hasGame ? undefined : 'Cadastre a data do jogo primeiro'}
        onChange={(e) => onTogglePaid(e.target.checked)}
      />
      <input
        className="player-name"
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
      <span style={{ minWidth: 28, textAlign: 'right', fontSize: 13, color: 'var(--gold-ink)', fontVariantNumeric: 'tabular-nums' }}>
        {formatRating(player.rating)}
      </span>
      <button
        type="button"
        className="btn btn-ghost btn-icon"
        aria-label={`Remover ${player.name}`}
        onClick={onRemove}
        style={{ width: 28, height: 28, color: 'var(--color-neutral-500)' }}
      >
        <svg viewBox="0 0 256 256" width="14" height="14" aria-hidden="true">
          <path
            fill="currentColor"
            d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"
          />
        </svg>
      </button>
    </div>
  )
}

export function PlayersPanel({ players, game, onPlayersChange, onGameChange, onUnauthorized }: Props) {
  const [name, setName] = useState('')
  const [rating, setRating] = useState(DEFAULT_RATING)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set())
  const inFlight = useRef(new Set<string>())
  // Sempre a lista mais recente, para que respostas tardias não apliquem sobre uma lista velha.
  const latest = useRef(players)
  latest.current = players

  function fail(e: unknown, fallback: string, useServerMessage = true) {
    if (e instanceof UnauthorizedError) onUnauthorized?.()
    else setError(useServerMessage && e instanceof HttpError && e.serverMessage ? e.serverMessage : fallback)
  }

  async function add(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || adding) return
    setAdding(true)
    setError(null)
    try {
      const created = await api.createPlayer({ name: trimmed, rating })
      onPlayersChange([...latest.current, created].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')))
      setName('')
      setRating(DEFAULT_RATING)
    } catch (err) {
      fail(err, 'Não foi possível adicionar o jogador. Tente de novo.')
    } finally {
      setAdding(false)
    }
  }

  async function update(id: string, patch: { name?: string; rating?: number }): Promise<boolean> {
    setError(null)
    try {
      const saved = await api.updatePlayer(id, patch)
      onPlayersChange(latest.current.map((p) => (p.id === id ? saved : p)))
      return true
    } catch (err) {
      fail(err, 'Não foi possível salvar o jogador. Tente de novo.')
      return false
    }
  }

  async function remove(p: Player) {
    if (!window.confirm(`Remover ${p.name}?`)) return
    setError(null)
    try {
      await api.archivePlayer(p.id)
      onPlayersChange(latest.current.filter((x) => x.id !== p.id))
    } catch (err) {
      fail(err, 'Não foi possível remover o jogador. Tente de novo.')
    }
  }

  async function togglePaid(id: string, paid: boolean) {
    if (inFlight.current.has(id)) return
    inFlight.current.add(id)
    setPending(new Set(inFlight.current))
    setError(null)
    try {
      onGameChange(await api.setPaid(id, paid))
    } catch (err) {
      fail(err, 'Não foi possível salvar o pagamento. Tente de novo.', false)
    } finally {
      inFlight.current.delete(id)
      setPending(new Set(inFlight.current))
    }
  }

  const paidSet = new Set(game?.paid ?? [])
  const paidCount = players.filter((p) => paidSet.has(p.id)).length

  return (
    <section className="players-panel" aria-label="Jogadores">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 500, letterSpacing: '-0.01em' }}>Jogadores</h1>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--color-neutral-400)' }}>
          Dê de 1 a 5 estrelas — clique na metade esquerda da estrela para meia.
        </p>
      </div>

      <form
        aria-label="Novo jogador"
        onSubmit={(e) => void add(e)}
        className="admin-card"
        style={{ gap: 10, padding: 14 }}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          <label className="field" style={{ flex: 1, minWidth: 0 }}>
            Nome do jogador
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <button
            className="btn btn-primary"
            type="submit"
            disabled={adding || !name.trim()}
            style={{ alignSelf: 'flex-end' }}
          >
            Adicionar
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <StarRating value={rating} onChange={setRating} size={22} />
          <span style={{ fontSize: 14, color: 'var(--gold-ink)', fontVariantNumeric: 'tabular-nums' }}>
            {formatRating(rating)}
          </span>
        </div>
      </form>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <span style={{ fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-neutral-500)' }}>
        {paidCount} de {players.length} pagaram
      </span>

      <div className="player-list">
        {players.map((p) => (
          <PlayerRow
            key={p.id}
            player={p}
            paid={paidSet.has(p.id)}
            hasGame={game !== null}
            pending={pending.has(p.id)}
            onTogglePaid={(paid) => void togglePaid(p.id, paid)}
            onRename={(n) => update(p.id, { name: n })}
            onRate={(r) => void update(p.id, { rating: r })}
            onRemove={() => void remove(p)}
          />
        ))}
      </div>
    </section>
  )
}

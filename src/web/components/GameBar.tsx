import { useState, type FormEvent } from 'react'
import { api, HttpError, UnauthorizedError } from '../api'
import { todayInBrasilia } from '../../shared/dates'
import type { Game } from '../../shared/types'
import { GameCard } from './GameCard'

const TRASH_PATH =
  'M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z'

type Props = {
  game: Game | null
  setGame: (game: Game | null) => void
  onUnauthorized: () => void
}

export function GameBar({ game, setGame, onUnauthorized }: Props) {
  const [date, setDate] = useState(game?.date ?? '')
  // Ressincroniza o campo quando o jogo ativo muda (recarga, exclusão em outra aba etc.).
  const [syncedDate, setSyncedDate] = useState(game?.date ?? '')
  if ((game?.date ?? '') !== syncedDate) {
    setSyncedDate(game?.date ?? '')
    setDate(game?.date ?? '')
  }
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (e) {
      if (e instanceof UnauthorizedError) onUnauthorized()
      else setError(e instanceof HttpError && e.serverMessage ? e.serverMessage : 'Não foi possível salvar. Tente de novo.')
    } finally {
      setBusy(false)
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!date) return
    void run(async () => {
      setGame(game ? await api.updateGameDate(date) : await api.createGame(date))
    })
  }

  function remove() {
    if (!window.confirm('Excluir o jogo? Pagamentos e sorteio serão perdidos.')) return
    void run(async () => {
      await api.deleteGame()
      setGame(null)
      setDate('')
    })
  }

  return (
    <GameCard date={game?.date ?? null}>
      <form className="flex flex-wrap items-end gap-[10px]" onSubmit={submit}>
        <label className="flex flex-col gap-[6px] text-[13px] text-neutral-400">
          Data do jogo
          <input
            className="input box-border w-full border border-line bg-bg text-text"
            type="date"
            min={todayInBrasilia(new Date())}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <div className="flex gap-[6px]">
          <button className="btn btn-primary" type="submit" disabled={busy || !date}>
            {game ? 'Alterar data' : 'Cadastrar jogo'}
          </button>
          {game && (
            <button className="btn btn-ghost gap-[6px]" type="button" disabled={busy} onClick={remove}>
              <svg viewBox="0 0 256 256" width="14" height="14" aria-hidden="true">
                <path fill="currentColor" d={TRASH_PATH} />
              </svg>
              Excluir jogo
            </button>
          )}
        </div>
        {error && (
          <p className="m-0 basis-full text-[13px] text-gold-ink" role="alert">
            {error}
          </p>
        )}
      </form>
    </GameCard>
  )
}

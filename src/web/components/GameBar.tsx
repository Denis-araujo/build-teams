import { useState, type FormEvent } from 'react'
import { api, HttpError, UnauthorizedError } from '../api'
import { formatGameDate } from '../format'
import { todayInBrasilia } from '../../shared/dates'
import type { Game } from '../../shared/types'

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
    <section className="admin-card" aria-label="Jogo">
      <p style={{ margin: 0, fontSize: 28, fontWeight: 500, letterSpacing: '-0.01em' }}>
        {game ? formatGameDate(game.date) : 'Nenhum jogo marcado'}
      </p>
      <form onSubmit={submit}>
        <div className="form-row">
          <label className="field">
            Data do jogo
            <input
              className="input"
              type="date"
              min={todayInBrasilia(new Date())}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <button className="btn btn-primary" type="submit" disabled={busy || !date}>
            {game ? 'Alterar data' : 'Cadastrar jogo'}
          </button>
          {game && (
            <button className="btn btn-ghost" type="button" disabled={busy} onClick={remove}>
              Excluir jogo
            </button>
          )}
        </div>
        {error && (
          <p className="form-error" role="alert" style={{ marginTop: 8 }}>
            {error}
          </p>
        )}
      </form>
    </section>
  )
}

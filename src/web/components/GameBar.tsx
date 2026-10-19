import { useState, type FormEvent } from 'react'
import { api, HttpError, UnauthorizedError } from '../api'
import { isGameMomentAllowed, todayInBrasilia } from '../../shared/dates'
import type { Game } from '../../shared/types'
import { formatGameShort } from '../format'
import { GameCard } from './GameCard'

type Props = {
  game: Game | null
  setGame: (game: Game | null) => void
  onUnauthorized: () => void
}

type Mode = 'view' | 'confirm' | 'edit'

const DEFAULT_TIME = '19:00'
const PAST_MESSAGE = 'Escolha um dia e uma hora que ainda não passaram.'
const FIELD_LABEL = 'flex flex-col gap-[6px] text-[13px] text-neutral-400'
const FIELD_INPUT = 'input box-border w-full border border-line bg-bg text-text'

// Validação local: texto simples (v4). Erro do servidor: alerta gold-tint (brief seção 5).
function FormError({ error }: { error: { text: string; server: boolean } }) {
  return (
    <span
      className={
        error.server
          ? 'rounded-sm bg-gold-tint px-3 py-2 text-[13px] text-gold-ink shadow-[inset_0_0_0_1px_var(--gold-soft)]'
          : 'text-[13px] text-gold-ink'
      }
      role="alert"
    >
      {error.text}
    </span>
  )
}

export function GameBar({ game, setGame, onUnauthorized }: Props) {
  const [mode, setMode] = useState<Mode>('view')
  const [date, setDate] = useState('')
  const [time, setTime] = useState(DEFAULT_TIME)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<{ text: string; server: boolean } | null>(null)

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (e) {
      if (e instanceof UnauthorizedError) onUnauthorized()
      else setError({ text: e instanceof HttpError && e.serverMessage ? e.serverMessage : 'Não foi possível salvar. Tente de novo.', server: true })
    } finally {
      setBusy(false)
    }
  }

  function startEdit() {
    setDate(game?.date ?? '')
    setTime(game?.time ?? DEFAULT_TIME)
    setError(null)
    setMode('edit')
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!date || !time) return setError({ text: 'Preencha o dia e a hora.', server: false })
    if (!isGameMomentAllowed(date, time, new Date())) return setError({ text: PAST_MESSAGE, server: false })
    void run(async () => {
      setGame(game ? await api.updateGameDate(date, time) : await api.createGame(date, time))
      setMode('view')
    })
  }

  function remove() {
    void run(async () => {
      await api.deleteGame()
      setGame(null)
      setMode('view')
    })
  }

  // Sem jogo (excluído em outra aba etc.), a confirmação perde o sentido.
  const shown: Mode = mode === 'confirm' && !game ? 'view' : mode

  if (shown === 'confirm' && game) {
    return (
      <GameCard game={game}>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <div className="flex flex-col gap-[3px]">
            <span className="text-[15px] font-medium">Excluir o jogo de {formatGameShort(game.date, game.time)}?</span>
            <span className="text-[13px] text-neutral-400">Pagamentos e sorteio serão perdidos.</span>
            {error && <FormError error={error} />}
          </div>
          <div className="flex gap-[6px]">
            <button className="btn btn-ghost" type="button" disabled={busy} onClick={() => setMode('view')}>
              Cancelar
            </button>
            <button className="btn btn-primary" type="button" disabled={busy} onClick={remove}>
              Excluir data
            </button>
          </div>
        </div>
      </GameCard>
    )
  }

  if (shown === 'edit') {
    return (
      <GameCard game={game}>
        <form className="flex flex-col gap-3" onSubmit={submit}>
          <span className="text-[15px] font-medium">{game ? 'Alterar data do jogo' : 'Marcar jogo'}</span>
          <div className="flex flex-wrap items-end gap-[10px]">
            <label className={`${FIELD_LABEL} flex-[1_1_160px]`}>
              Dia
              <input
                className={FIELD_INPUT}
                type="date"
                min={todayInBrasilia(new Date())}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <label className={`${FIELD_LABEL} flex-[0_1_130px]`}>
              Hora
              <input className={FIELD_INPUT} type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </label>
            <div className="flex gap-[6px]">
              <button className="btn btn-ghost" type="button" disabled={busy} onClick={() => setMode('view')}>
                Cancelar
              </button>
              <button className="btn btn-primary" type="submit" disabled={busy}>
                Salvar
              </button>
            </div>
          </div>
          {error && <FormError error={error} />}
        </form>
      </GameCard>
    )
  }

  return (
    <GameCard
      game={game}
      actions={{
        onEdit: startEdit,
        onDelete: () => {
          setError(null)
          setMode('confirm')
        },
      }}
    />
  )
}

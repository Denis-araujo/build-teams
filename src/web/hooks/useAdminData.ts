import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api, UnauthorizedError, type Settings } from '../api'
import type { DrawState, Game, Player } from '../../shared/types'

export type AdminStatus = 'loading' | 'ready' | 'unauthorized' | 'error'

type Draft = { gameId: string; paid: string[]; draw: DrawState | null }

const sameDraft = (game: Game, d: Draft) =>
  JSON.stringify([[...game.paid].sort(), game.draw]) === JSON.stringify([[...d.paid].sort(), d.draw])

/**
 * Estado compartilhado do painel (jogo com sorteio, configurações e jogadores), carregado numa requisição só.
 * Confirmações e sorteio são editados num rascunho local: `game` já vem com o rascunho aplicado e só
 * `save()` manda tudo ao servidor, de uma vez.
 */
export function useAdminData(): {
  status: AdminStatus
  /** O jogo como aparece na tela: o salvo com o rascunho por cima. */
  game: Game | null
  settings: Settings | null
  players: Player[]
  dirty: boolean
  reload(): Promise<void>
  /** Resposta do servidor (criar, remarcar, excluir): vira o jogo salvo e mantém o rascunho do mesmo jogo. */
  setGame(game: Game | null): void
  /** Edição local de confirmações e/ou sorteio; nada vai ao servidor. */
  editGame(game: Game): void
  /** Joga fora as edições locais. */
  discard(): void
  /** Manda o rascunho ao servidor; lança o erro da requisição. */
  save(): Promise<void>
  setSettings(s: Settings): void
  setPlayers(players: Player[]): void
} {
  const [status, setStatus] = useState<AdminStatus>('loading')
  const [saved, setSaved] = useState<Game | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [settings, setSettingsState] = useState<Settings | null>(null)
  const [players, setPlayersState] = useState<Player[]>([])
  // Decisão: se uma mutação (setGame/setPlayers/setSettings) chega enquanto uma recarga está em voo,
  // a recarga é DESCARTADA por inteiro (inclusive os campos que a mutação não tocou). A mutação vem
  // de uma resposta do servidor mais recente; o próximo reload manual traz o resto.
  // Cada recarga e cada mutação incrementam o contador; recarga que não é a mais recente é descartada.
  const version = useRef(0)

  const setGame = useCallback((g: Game | null) => {
    version.current++
    setSaved(g)
    setDraft((d) => (d && g && d.gameId === g.id ? d : null))
  }, [])
  const setSettings = useCallback((s: Settings) => {
    version.current++
    setSettingsState(s)
  }, [])
  const setPlayers = useCallback((p: Player[]) => {
    version.current++
    setPlayersState(p)
  }, [])

  const reload = useCallback(async () => {
    const mine = ++version.current
    try {
      const { game, settings: s, players: p } = await api.getBootstrap()
      if (mine !== version.current) return
      setSaved(game)
      setDraft(null)
      setSettingsState(s)
      setPlayersState(p)
      setStatus('ready')
    } catch (e) {
      if (mine !== version.current && !(e instanceof UnauthorizedError)) return
      setStatus(e instanceof UnauthorizedError ? 'unauthorized' : 'error')
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload()
  }, [reload])

  const activeDraft = draft && saved && draft.gameId === saved.id ? draft : null
  const game = useMemo(
    () => (saved && activeDraft ? { ...saved, paid: activeDraft.paid, draw: activeDraft.draw } : saved),
    [saved, activeDraft],
  )
  const dirty = !!saved && !!activeDraft && !sameDraft(saved, activeDraft)

  const editGame = useCallback((g: Game) => setDraft({ gameId: g.id, paid: g.paid, draw: g.draw }), [])
  const discard = useCallback(() => setDraft(null), [])

  const save = useCallback(async () => {
    if (!activeDraft) return
    setGame(await api.saveGameState(activeDraft.paid, activeDraft.draw))
    setDraft(null)
  }, [activeDraft, setGame])

  return { status, game, settings, players, dirty, reload, setGame, editGame, discard, save, setSettings, setPlayers }
}

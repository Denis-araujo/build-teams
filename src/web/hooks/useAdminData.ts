import { useCallback, useEffect, useRef, useState } from 'react'
import { api, UnauthorizedError, type Settings } from '../api'
import type { Game, Player } from '../../shared/types'

export type AdminStatus = 'loading' | 'ready' | 'unauthorized' | 'error'

/** Estado compartilhado do painel (jogo com sorteio, configurações e jogadores), carregado junto. */
export function useAdminData(): {
  status: AdminStatus
  game: Game | null
  settings: Settings | null
  players: Player[]
  reload(): Promise<void>
  setGame(game: Game | null): void
  setSettings(s: Settings): void
  setPlayers(players: Player[]): void
} {
  const [status, setStatus] = useState<AdminStatus>('loading')
  const [game, setGameState] = useState<Game | null>(null)
  const [settings, setSettingsState] = useState<Settings | null>(null)
  const [players, setPlayersState] = useState<Player[]>([])
  // Decisão: se uma mutação (setGame/setPlayers/setSettings) chega enquanto uma recarga está em voo,
  // a recarga é DESCARTADA por inteiro (inclusive os campos que a mutação não tocou). A mutação vem
  // de uma resposta do servidor mais recente; o próximo reload manual traz o resto.
  // Cada recarga e cada mutação incrementam o contador; recarga que não é a mais recente é descartada.
  const version = useRef(0)

  const setGame = useCallback((g: Game | null) => {
    version.current++
    setGameState(g)
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
      const [g, s, p] = await Promise.all([api.getAdminGame(), api.getSettings(), api.getPlayers()])
      if (mine !== version.current) return
      setGameState(g)
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

  return { status, game, settings, players, reload, setGame, setSettings, setPlayers }
}

import { useCallback, useEffect, useState } from 'react'
import { api, UnauthorizedError, type Settings } from '../api'
import type { Game } from '../../shared/types'

export type AdminStatus = 'loading' | 'ready' | 'unauthorized' | 'error'

/** Estado compartilhado do painel. As Tasks 15–16 acrescentam campos (jogadores etc.) aqui. */
export function useAdminData(): {
  status: AdminStatus
  game: Game | null
  settings: Settings | null
  reload(): Promise<void>
  setGame(game: Game | null): void
  setSettings(s: Settings): void
} {
  const [status, setStatus] = useState<AdminStatus>('loading')
  const [game, setGame] = useState<Game | null>(null)
  const [settings, setSettings] = useState<Settings | null>(null)

  const reload = useCallback(async () => {
    try {
      const [g, s] = await Promise.all([api.getAdminGame(), api.getSettings()])
      setGame(g)
      setSettings(s)
      setStatus('ready')
    } catch (e) {
      setStatus(e instanceof UnauthorizedError ? 'unauthorized' : 'error')
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload()
  }, [reload])

  return { status, game, settings, reload, setGame, setSettings }
}

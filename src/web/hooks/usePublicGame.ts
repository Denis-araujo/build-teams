import { useEffect, useState } from 'react'
import { api } from '../api'
import type { PublicGame } from '../../shared/types'

export function usePublicGame(intervalMs = 30000): {
  game: PublicGame | null
  loading: boolean
  error: string | null
} {
  const [game, setGame] = useState<PublicGame | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    let latest = 0
    const load = async () => {
      const mine = ++latest
      try {
        const g = await api.getGame()
        if (!active || mine !== latest) return
        setGame(g)
        setError(null)
      } catch (e) {
        if (!active || mine !== latest) return
        // mantém os dados anteriores na tela
        setError(e instanceof Error ? e.message : 'Erro ao carregar')
      } finally {
        if (active && mine === latest) setLoading(false)
      }
    }
    void load()
    const timer = setInterval(() => void load(), intervalMs)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      active = false
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [intervalMs])

  return { game, loading, error }
}

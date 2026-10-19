// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { useAdminData } from '../../src/web/hooks/useAdminData'
import type { Game } from '../../src/shared/types'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const res = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response
const OLD: Game = { id: 'g1', date: '2026-10-24', paid: [], draw: null }
const FRESH: Game = { ...OLD, paid: ['p1'] }

it('um reload antigo não sobrescreve o estado definido por uma mutação mais nova', async () => {
  let release: () => void = () => {}
  let slow = false
  vi.stubGlobal(
    'fetch',
    vi.fn(async (path: string) => {
      if (path === '/api/admin/game') {
        if (slow) await new Promise<void>((r) => (release = r))
        return res(OLD)
      }
      if (path === '/api/admin/settings') return res({ memberSeesStars: false })
      if (path === '/api/admin/players') return res([])
      throw new Error(path)
    }),
  )
  const { result } = renderHook(() => useAdminData())
  await waitFor(() => expect(result.current.status).toBe('ready'))
  slow = true
  let pending: Promise<void> = Promise.resolve()
  act(() => {
    pending = result.current.reload()
  })
  act(() => result.current.setGame(FRESH))
  await act(async () => {
    release()
    await pending
  })
  expect(result.current.game).toEqual(FRESH)
})

it('mutação de jogadores durante uma recarga em voo não é perdida (a recarga é descartada)', async () => {
  let release: () => void = () => {}
  let slow = false
  vi.stubGlobal(
    'fetch',
    vi.fn(async (path: string) => {
      if (path === '/api/admin/game') {
        if (slow) await new Promise<void>((r) => (release = r))
        return res(OLD)
      }
      if (path === '/api/admin/settings') return res({ memberSeesStars: false })
      if (path === '/api/admin/players') return res([])
      throw new Error(path)
    }),
  )
  const { result } = renderHook(() => useAdminData())
  await waitFor(() => expect(result.current.status).toBe('ready'))
  slow = true
  let pending: Promise<void> = Promise.resolve()
  act(() => {
    pending = result.current.reload()
  })
  const ana = { id: 'p1', name: 'Ana', rating: 3, archived: false }
  act(() => result.current.setPlayers([ana]))
  act(() => result.current.setSettings({ memberSeesStars: true }))
  await act(async () => {
    release()
    await pending
  })
  expect(result.current.players).toEqual([ana])
  expect(result.current.settings).toEqual({ memberSeesStars: true })
})

import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, UnauthorizedError } from '../../src/web/api'

afterEach(() => vi.unstubAllGlobals())

const res = (status: number, body: unknown = {}) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response

describe('api', () => {
  it('getGame devolve o JSON e usa credentials same-origin', async () => {
    const f = vi.fn(async () => res(200, null))
    vi.stubGlobal('fetch', f)
    expect(await api.getGame()).toBeNull()
    expect(f).toHaveBeenCalledWith('/api/game', expect.objectContaining({ credentials: 'same-origin' }))
  })

  it('non-2xx lança Error com mensagem clara', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => res(500)))
    await expect(api.getGame()).rejects.toThrow(/\/api\/game.*500/)
  })

  it('401 lança UnauthorizedError', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => res(401)))
    const err = await api.getGame().catch((e) => e)
    expect(err).toBeInstanceOf(UnauthorizedError)
  })
})

describe('jogo com hora', () => {
  it('createGame envia data e hora', async () => {
    const f = vi.fn(async () => res(201, {}))
    vi.stubGlobal('fetch', f)
    await api.createGame('2026-10-24', '20:30')
    expect(f).toHaveBeenCalledWith(
      '/api/admin/game',
      expect.objectContaining({ method: 'POST', body: '{"date":"2026-10-24","time":"20:30"}' }),
    )
  })

  it('updateGameDate envia data e hora', async () => {
    const f = vi.fn(async () => res(200, {}))
    vi.stubGlobal('fetch', f)
    await api.updateGameDate('2026-10-31', '19:00')
    expect(f).toHaveBeenCalledWith(
      '/api/admin/game',
      expect.objectContaining({ method: 'PATCH', body: '{"date":"2026-10-31","time":"19:00"}' }),
    )
  })
})

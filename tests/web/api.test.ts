import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, UnauthorizedError } from '../../src/web/api'
import { formatGameDate } from '../../src/web/format'

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

describe('formatGameDate', () => {
  it('formata virada de ano', () => {
    expect(formatGameDate('2026-12-31')).toBe('Quinta-feira, 31/12')
    expect(formatGameDate('2027-01-01')).toBe('Sexta-feira, 01/01')
    expect(formatGameDate('2026-10-17')).toBe('Sábado, 17/10')
  })
})

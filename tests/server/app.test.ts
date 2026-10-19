import { describe, expect, it } from 'vitest'
import { createTestDb } from '../helpers/testDb'
import { createApp } from '../../src/server/app'

const NOW = new Date('2026-10-19T15:00:00Z')
const TODAY = '2026-10-19'
const JSON_H = { 'Content-Type': 'application/json' }

function setup(over: Record<string, unknown> = {}) {
  let current = NOW
  const setNow = (d: Date) => {
    current = d
  }
  const app = createApp({ now: () => current })
  const env = { DB: createTestDb(), ADMIN_PASSWORD: 'segredo', SESSION_SECRET: 'chave-longa', ...over }
  const call = (path: string, init: RequestInit = {}) => app.request(`/api${path}`, init, env)
  const send = async (method: string, path: string, body?: unknown, cookie?: string, ip?: string) =>
    call(path, {
      method,
      headers: {
        ...JSON_H,
        ...(cookie ? { Cookie: cookie } : {}),
        ...(ip ? { 'CF-Connecting-IP': ip } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  const login = async (password = 'segredo', ip?: string) => send('POST', '/admin/login', { password }, undefined, ip)
  const session = async () => {
    const res = await login()
    return (res.headers.get('Set-Cookie') ?? '').split(';')[0]!
  }
  return { env, call, send, login, session, setNow, app }
}

const ADMIN_ROUTES: [string, string][] = [
  ['POST', '/admin/logout'],
  ['GET', '/admin/me'],
  ['GET', '/admin/players'],
  ['POST', '/admin/players'],
  ['PATCH', '/admin/players/x'],
  ['DELETE', '/admin/players/x'],
  ['GET', '/admin/game'],
  ['POST', '/admin/game'],
  ['PATCH', '/admin/game'],
  ['DELETE', '/admin/game'],
  ['PUT', '/admin/game/paid'],
  ['PUT', '/admin/game/draw'],
  ['GET', '/admin/settings'],
  ['PATCH', '/admin/settings'],
  ['GET', '/admin/history'],
]

describe('auth', () => {
  it.each(ADMIN_ROUTES)('%s %s sem cookie -> 401', async (method, path) => {
    const { send } = setup()
    const res = await send(method, path, method === 'GET' ? undefined : {})
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Não autorizado' })
  })

  it('cookie com assinatura adulterada -> 401', async () => {
    const { send, session } = setup()
    const cookie = await session()
    const bad = cookie.slice(0, -1) + (cookie.endsWith('0') ? '1' : '0')
    expect((await send('GET', '/admin/me', undefined, bad)).status).toBe(401)
    expect((await send('GET', '/admin/me', undefined, cookie)).status).toBe(200)
  })

  it('login correto define cookie seguro', async () => {
    const { login } = setup()
    const res = await login()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    const c = res.headers.get('Set-Cookie')!
    expect(c).toContain('HttpOnly')
    expect(c).toContain('Secure')
    expect(c).toContain('SameSite=Strict')
  })

  it('senha errada -> 401', async () => {
    const { login } = setup()
    const res = await login('errada')
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Senha incorreta' })
  })

  it('após 5 erros o 6º, mesmo certo, -> 429', async () => {
    const { login } = setup()
    for (let i = 0; i < 5; i++) expect((await login('errada', '1.1.1.1')).status).toBe(401)
    const res = await login('segredo', '1.1.1.1')
    expect(res.status).toBe(429)
    expect(await res.json()).toEqual({ error: 'Muitas tentativas. Tente de novo em alguns minutos.' })
    expect((await login('segredo', '2.2.2.2')).status).toBe(200)
  })

  it('login com sucesso zera o contador', async () => {
    const { login } = setup()
    for (let i = 0; i < 4; i++) await login('errada', '1.1.1.1')
    expect((await login('segredo', '1.1.1.1')).status).toBe(200)
    for (let i = 0; i < 4; i++) expect((await login('errada', '1.1.1.1')).status).toBe(401)
    expect((await login('segredo', '1.1.1.1')).status).toBe(200)
  })

  it('segredos ausentes falham fechado', async () => {
    const noPass = setup({ ADMIN_PASSWORD: '' })
    const res = await noPass.login('')
    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({ error: 'Servidor sem senha configurada' })

    const good = setup()
    const cookie = await good.session()
    const noSecret = createApp({ now: () => NOW })
    const r = await noSecret.request(
      '/api/admin/me',
      { headers: { Cookie: cookie } },
      { ...good.env, SESSION_SECRET: '' },
    )
    expect(r.status).toBe(401)
    const r2 = await noSecret.request(
      '/api/admin/login',
      { method: 'POST', headers: JSON_H, body: JSON.stringify({ password: 'segredo' }) },
      { ...good.env, SESSION_SECRET: undefined },
    )
    expect(r2.status).toBe(503)
  })

  it('logout limpa o cookie', async () => {
    const { send, session } = setup()
    const res = await send('POST', '/admin/logout', undefined, await session())
    expect(res.status).toBe(200)
    expect(res.headers.get('Set-Cookie')).toContain('Max-Age=0')
  })
})

describe('transporte', () => {
  it('Cache-Control: no-store em toda resposta', async () => {
    const { call, send } = setup()
    expect((await call('/game')).headers.get('Cache-Control')).toBe('no-store')
    expect((await send('GET', '/admin/me')).headers.get('Cache-Control')).toBe('no-store')
  })

  it('corpo que não é JSON -> 415 (login incluso)', async () => {
    const { call, session } = setup()
    const login = await call('/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ password: 'segredo' }),
    })
    expect(login.status).toBe(415)
    expect(await login.json()).toEqual({ error: 'Content-Type deve ser application/json' })
    const cookie = await session()
    const res = await call('/admin/players', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain', Cookie: cookie },
      body: '{}',
    })
    expect(res.status).toBe(415)
  })

  it('JSON malformado -> 400', async () => {
    const { call, session } = setup()
    const res = await call('/admin/players', {
      method: 'POST',
      headers: { ...JSON_H, Cookie: await session() },
      body: '{oops',
    })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Corpo inválido' })
  })
})

describe('jogadores e jogo', () => {
  it('jogador inválido -> 400, inexistente -> 404', async () => {
    const { send, session } = setup()
    const cookie = await session()
    expect((await send('POST', '/admin/players', { name: '', rating: 3 }, cookie)).status).toBe(400)
    expect((await send('POST', '/admin/players', { name: 'A', rating: 'x' }, cookie)).status).toBe(400)
    expect((await send('PATCH', '/admin/players/nope', { name: 'B' }, cookie)).status).toBe(404)
    expect((await send('DELETE', '/admin/players/nope', undefined, cookie)).status).toBe(404)
  })

  it('GET /game sem jogo -> 200 null', async () => {
    const { call } = setup()
    const res = await call('/game')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('null')
  })

  it('fluxo completo e leitura pública dos times', async () => {
    const { send, call, session } = setup()
    const cookie = await session()
    const ids: string[] = []
    for (const [name, rating] of [['Ana', 4], ['Bia', 3], ['Caio', 5]] as const) {
      const res = await send('POST', '/admin/players', { name, rating }, cookie)
      expect(res.status).toBe(201)
      ids.push(((await res.json()) as { id: string }).id)
    }
    expect(((await (await send('GET', '/admin/players', undefined, cookie)).json()) as unknown[]).length).toBe(3)

    expect((await send('GET', '/admin/game', undefined, cookie).then((r) => r.json()))).toBeNull()
    const created = await send('POST', '/admin/game', { date: TODAY }, cookie)
    expect(created.status).toBe(201)
    expect(((await created.json()) as { date: string }).date).toBe(TODAY)
    expect((await send('PATCH', '/admin/game', { date: '2026-10-21' }, cookie)).status).toBe(200)

    for (const id of ids) {
      expect((await send('PUT', '/admin/game/paid', { playerId: id, paid: true }, cookie)).status).toBe(200)
    }
    const draw = {
      teamCount: 2,
      teamSize: 2,
      teams: [[ids[0]!, ids[1]!], [ids[2]!]],
      reserves: [],
      locks: {},
    }
    const put = await send('PUT', '/admin/game/draw', draw, cookie)
    expect(put.status).toBe(200)

    const pub = await call('/game')
    expect(pub.status).toBe(200)
    const body = (await pub.json()) as { teams: string[][] }
    expect(body.teams.flat().sort()).toEqual([...ids].sort())

    expect((await send('DELETE', '/admin/game', undefined, cookie)).status).toBe(204)
    expect(await (await call('/game')).text()).toBe('null')
  })

  it('PUT draw com jogador não pago -> 400', async () => {
    const { send, session } = setup()
    const cookie = await session()
    const p = (await (await send('POST', '/admin/players', { name: 'Ana', rating: 3 }, cookie)).json()) as { id: string }
    await send('POST', '/admin/game', { date: TODAY }, cookie)
    const res = await send(
      'PUT',
      '/admin/game/draw',
      { teamCount: 2, teamSize: 2, teams: [[p.id], []], reserves: [], locks: {} },
      cookie,
    )
    expect(res.status).toBe(400)
  })

  it.each([
    { teamCount: 2, teamSize: 2, teams: 'x', reserves: [], locks: {} },
    { teamCount: 2, teamSize: 2, teams: [[]], reserves: [], locks: [] },
    { teamCount: '2', teamSize: 2, teams: [[]], reserves: [], locks: {} },
    { teamCount: 2, teamSize: 2, teams: [[1]], reserves: [], locks: {} },
    { teamCount: 2, teamSize: 2, teams: [[]], reserves: 'a', locks: {} },
    { teamCount: 2, teamSize: 2, teams: [[]], reserves: [], locks: { a: 1.5 } },
    null,
    [],
  ])('PUT draw com forma inválida -> 400 (%#)', async (bad) => {
    const { send, session } = setup()
    const cookie = await session()
    await send('POST', '/admin/game', { date: TODAY }, cookie)
    const res = await send('PUT', '/admin/game/draw', bad, cookie)
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Corpo inválido' })
  })

  it('corpos com tipos errados -> 400', async () => {
    const { send, session } = setup()
    const cookie = await session()
    expect((await send('POST', '/admin/game', { date: 5 }, cookie)).status).toBe(400)
    expect((await send('PUT', '/admin/game/paid', { playerId: 1, paid: true }, cookie)).status).toBe(400)
    expect((await send('PUT', '/admin/game/paid', { playerId: 'a', paid: 'yes' }, cookie)).status).toBe(400)
    expect((await send('PATCH', '/admin/settings', { memberSeesStars: 'true' }, cookie)).status).toBe(400)
    expect((await send('POST', '/admin/login', { password: 1 })).status).toBe(400)
  })
})

describe('configurações e histórico', () => {
  it('PATCH e GET settings, e estrelas ocultas não vazam rating', async () => {
    const { send, call, session } = setup()
    const cookie = await session()
    expect(await (await send('GET', '/admin/settings', undefined, cookie)).json()).toEqual({ memberSeesStars: false })
    await send('POST', '/admin/players', { name: 'Ana', rating: 4 }, cookie)
    await send('POST', '/admin/game', { date: TODAY }, cookie)
    expect(await (await call('/game')).text()).not.toContain('"rating"')

    expect((await send('PATCH', '/admin/settings', { memberSeesStars: true }, cookie)).status).toBe(200)
    expect(await (await send('GET', '/admin/settings', undefined, cookie)).json()).toEqual({ memberSeesStars: true })
    expect(await (await call('/game')).text()).toContain('"rating"')
  })

  it('history: 401 sem cookie e 200 com', async () => {
    const { send, session } = setup()
    expect((await send('GET', '/admin/history')).status).toBe(401)
    const res = await send('GET', '/admin/history', undefined, await session())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })
})

const AFTER_END = new Date('2026-10-20T03:00:00Z')
const historyCount = async (db: D1Database) =>
  (await db.prepare('SELECT COUNT(*) AS n FROM history').first<{ n: number }>())!.n

describe('finalização em qualquer requisição', () => {
  async function withGame() {
    const s = setup()
    const cookie = await s.session()
    await s.send('POST', '/admin/game', { date: TODAY }, cookie)
    return { ...s, cookie }
  }

  it('antes do fim o jogo fica intacto', async () => {
    const { send, cookie, env } = await withGame()
    expect(((await (await send('GET', '/admin/game', undefined, cookie)).json()) as { date: string }).date).toBe(TODAY)
    expect(await historyCount(env.DB)).toBe(0)
  })

  it('depois do fim, POST /admin/game cria novo jogo e o histórico lista o antigo', async () => {
    const { send, cookie, setNow } = await withGame()
    setNow(AFTER_END)
    expect((await send('POST', '/admin/game', { date: '2026-10-25' }, cookie)).status).toBe(201)
    const hist = (await (await send('GET', '/admin/history', undefined, cookie)).json()) as { gameDate: string }[]
    expect(hist.map((h) => h.gameDate)).toEqual([TODAY])
  })

  it('depois do fim, GET /admin/game -> null e PUT paid -> 404', async () => {
    const { send, cookie, setNow } = await withGame()
    const p = (await (await send('POST', '/admin/players', { name: 'Ana', rating: 3 }, cookie)).json()) as { id: string }
    setNow(AFTER_END)
    expect(await (await send('GET', '/admin/game', undefined, cookie)).json()).toBeNull()
    expect((await send('PUT', '/admin/game/paid', { playerId: p.id, paid: true }, cookie)).status).toBe(404)
  })

  it('requisição sem cookie (401) também finaliza', async () => {
    const { send, setNow, env } = await withGame()
    setNow(AFTER_END)
    expect((await send('GET', '/admin/me')).status).toBe(401)
    expect(await historyCount(env.DB)).toBe(1)
  })
})

describe('robustez', () => {
  it('throw que não é Error -> 500 genérico com no-store', async () => {
    const { app, env } = setup()
    const db = {
      prepare: () => {
        throw 'boom'
      },
    } as unknown as D1Database
    const res = await app.request('/api/game', {}, { ...env, DB: db })
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Erro interno' })
    expect(res.headers.get('Cache-Control')).toBe('no-store')
  })

  it('draw acima dos limites -> 400', async () => {
    const { send, session } = setup()
    const cookie = await session()
    const base = { teamCount: 2, teamSize: 2, teams: [[]], reserves: [], locks: {} }
    const locks = Object.fromEntries(Array.from({ length: 201 }, (_, i) => [`k${i}`, 1]))
    for (const body of [
      { ...base, locks },
      { ...base, teams: Array.from({ length: 9 }, () => []) },
      { ...base, teams: [Array.from({ length: 101 }, (_, i) => `p${i}`)] },
      { ...base, reserves: Array.from({ length: 101 }, (_, i) => `p${i}`) },
    ]) {
      const res = await send('PUT', '/admin/game/draw', body, cookie)
      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ error: 'Corpo inválido' })
    }
  })

  it('cookie válido com ADMIN_PASSWORD vazio ou ausente -> 401', async () => {
    const { app, env, session } = setup()
    const cookie = await session()
    for (const pw of ['', undefined]) {
      const res = await app.request('/api/admin/me', { headers: { Cookie: cookie } }, { ...env, ADMIN_PASSWORD: pw })
      expect(res.status).toBe(401)
    }
  })

  it('PATCH /admin/players/:id com sucesso', async () => {
    const { send, session } = setup()
    const cookie = await session()
    const p = (await (await send('POST', '/admin/players', { name: 'Ana', rating: 3 }, cookie)).json()) as { id: string }
    const res = await send('PATCH', `/admin/players/${p.id}`, { name: 'Ana Maria', rating: 4.5 }, cookie)
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ id: p.id, name: 'Ana Maria', rating: 4.5 })
  })

  it('bloqueio 429 expira após 15 minutos', async () => {
    const { login, setNow } = setup()
    for (let i = 0; i < 5; i++) await login('errada', '1.1.1.1')
    expect((await login('segredo', '1.1.1.1')).status).toBe(429)
    setNow(new Date(NOW.getTime() + 15 * 60_000 + 1000))
    expect((await login('segredo', '1.1.1.1')).status).toBe(200)
  })
})

describe('game time routes', () => {
  it('POST accepts a time and returns it; GET includes it', async () => {
    const { send, session } = setup()
    const cookie = await session()
    const res = await send('POST', '/admin/game', { date: TODAY, time: '20:30' }, cookie)
    expect(res.status).toBe(201)
    expect(((await res.json()) as { time: string }).time).toBe('20:30')
    const got = await send('GET', '/admin/game', undefined, cookie)
    expect(((await got.json()) as { time: string }).time).toBe('20:30')
  })

  it('POST without time defaults to 19:00', async () => {
    const { send, session } = setup()
    const cookie = await session()
    const res = await send('POST', '/admin/game', { date: TODAY }, cookie)
    expect(((await res.json()) as { time: string }).time).toBe('19:00')
  })

  it('rejects an invalid, non-string or past time with 400', async () => {
    const { send, session } = setup()
    const cookie = await session()
    const invalid = await send('POST', '/admin/game', { date: TODAY, time: '25:00' }, cookie)
    expect(invalid.status).toBe(400)
    expect(((await invalid.json()) as { error: string }).error).toBe('Hora inválida')
    const nonString = await send('POST', '/admin/game', { date: TODAY, time: 1900 }, cookie)
    expect(nonString.status).toBe(400)
    expect(((await nonString.json()) as { error: string }).error).toBe('Corpo inválido')
    const past = await send('POST', '/admin/game', { date: TODAY, time: '11:00' }, cookie)
    expect(past.status).toBe(400)
    expect(((await past.json()) as { error: string }).error).toBe(
      'Escolha um dia e uma hora que ainda não passaram.',
    )
  })

  it('PATCH updates the hour and validates it', async () => {
    const { send, session } = setup()
    const cookie = await session()
    await send('POST', '/admin/game', { date: TODAY }, cookie)
    const ok = await send('PATCH', '/admin/game', { date: TODAY, time: '21:00' }, cookie)
    expect(((await ok.json()) as { time: string }).time).toBe('21:00')
    expect((await send('PATCH', '/admin/game', { date: TODAY, time: '7:5' }, cookie)).status).toBe(400)
    expect((await send('PATCH', '/admin/game', { date: TODAY, time: null }, cookie)).status).toBe(400)
  })
})

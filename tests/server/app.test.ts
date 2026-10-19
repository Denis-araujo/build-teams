import { describe, expect, it } from 'vitest'
import { createTestDb } from '../helpers/testDb'
import { createApp } from '../../src/server/app'

const NOW = new Date('2026-10-19T15:00:00Z')
const TODAY = '2026-10-19'
const JSON_H = { 'Content-Type': 'application/json' }

function setup(over: Record<string, unknown> = {}) {
  const app = createApp({ now: () => NOW })
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
  return { env, call, send, login, session }
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

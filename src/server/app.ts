import { Hono } from 'hono'
import type { Context } from 'hono'
import type { DrawState } from '../shared/types'
import {
  clearFailedLogins,
  clearSessionCookie,
  isLoginBlocked,
  readSessionCookie,
  recordFailedLogin,
  sessionCookie,
  signSession,
  verifyPassword,
  verifySession,
} from './auth'
import { NotFoundError, ValidationError } from './errors'
import { finalizeIfExpired } from './finalize'
import {
  createGame,
  deleteActiveGame,
  getActiveGame,
  getSetting,
  saveDraw,
  archivePlayerInGame,
  setPaid,
  setSetting,
  updateGameDate,
} from './games'
import { listHistory } from './history'
import { createPlayer, listPlayers, updatePlayer } from './players'
import { getPublicGame } from './publicGame'

type Env = { Bindings: { DB: D1Database; ADMIN_PASSWORD: string; SESSION_SECRET: string } }
type Ctx = Context<Env>

const BAD_BODY = 'Corpo inválido'
const MAX_TEAMS = 8
const MAX_IDS = 100
const MAX_LOCKS = 200
const bad = () => new ValidationError(BAD_BODY)

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === 'string')

async function readBody(c: Ctx): Promise<Record<string, unknown>> {
  let raw: unknown
  try {
    raw = await c.req.json()
  } catch {
    throw bad()
  }
  if (!isObject(raw)) throw bad()
  return raw
}

function parseDraw(b: Record<string, unknown>): DrawState {
  const { teamCount, teamSize, teams, reserves, locks } = b
  if (typeof teamCount !== 'number' || typeof teamSize !== 'number') throw bad()
  if (!Array.isArray(teams) || !teams.every(isStringArray)) throw bad()
  if (teams.length > MAX_TEAMS || teams.some((t) => t.length > MAX_IDS)) throw bad()
  if (!isStringArray(reserves) || reserves.length > MAX_IDS) throw bad()
  if (!isObject(locks) || Object.keys(locks).length > MAX_LOCKS) throw bad()
  if (!Object.values(locks).every((v) => Number.isInteger(v))) throw bad()
  return { teamCount, teamSize, teams, reserves, locks: locks as Record<string, number> }
}

export function createApp(opts: { now?: () => Date } = {}) {
  const now = opts.now ?? (() => new Date())
  const app = new Hono<Env>().basePath('/api')

  app.use('*', async (c, next) => {
    await next()
    c.header('Cache-Control', 'no-store')
  })

  // Hono só encaminha `instanceof Error` ao onError; normaliza qualquer outro throw.
  app.use('*', async (_c, next) => {
    try {
      await next()
    } catch (e) {
      throw e instanceof Error ? e : new Error(String(e))
    }
  })

  // Primeira requisição (de qualquer pessoa) após o fim do jogo o finaliza.
  app.use('*', async (c, next) => {
    await finalizeIfExpired(c.env.DB, now())
    return next()
  })

  app.onError((err, c) => {
    if (err instanceof ValidationError) return c.json({ error: err.message }, 400)
    if (err instanceof NotFoundError) return c.json({ error: err.message }, 404)
    console.error(err)
    return c.json({ error: 'Erro interno' }, 500)
  })

  // Sessão obrigatória em /admin/* (menos o login). Sem segredos configurados, recusa.
  app.use('/admin/*', async (c, next) => {
    if (c.req.path === '/api/admin/login') return next()
    const { ADMIN_PASSWORD, SESSION_SECRET } = c.env
    const token = readSessionCookie(c.req.header('Cookie'))
    const ok =
      !!ADMIN_PASSWORD &&
      !!SESSION_SECRET &&
      token !== null &&
      (await verifySession(token, SESSION_SECRET, now()))
    if (!ok) return c.json({ error: 'Não autorizado' }, 401)
    return next()
  })

  // Escritas exigem JSON (logout não tem corpo e fica de fora).
  app.use('/admin/*', async (c, next) => {
    const m = c.req.method
    if ((m === 'POST' || m === 'PUT' || m === 'PATCH') && c.req.path !== '/api/admin/logout') {
      const type = (c.req.header('Content-Type') ?? '').split(';')[0]!.trim().toLowerCase()
      if (type !== 'application/json') {
        return c.json({ error: 'Content-Type deve ser application/json' }, 415)
      }
    }
    return next()
  })

  app.get('/game', async (c) => c.json(await getPublicGame(c.env.DB, now())))

  app.post('/admin/login', async (c) => {
    const { ADMIN_PASSWORD, SESSION_SECRET, DB } = c.env
    if (!ADMIN_PASSWORD || !SESSION_SECRET) {
      return c.json({ error: 'Servidor sem senha configurada' }, 503)
    }
    const ip = c.req.header('CF-Connecting-IP') || 'unknown'
    if (await isLoginBlocked(DB, ip, now())) {
      return c.json({ error: 'Muitas tentativas. Tente de novo em alguns minutos.' }, 429)
    }
    const { password } = await readBody(c)
    if (typeof password !== 'string') throw bad()
    if (!(await verifyPassword(password, ADMIN_PASSWORD))) {
      await recordFailedLogin(DB, ip, now())
      return c.json({ error: 'Senha incorreta' }, 401)
    }
    await clearFailedLogins(DB, ip)
    c.header('Set-Cookie', sessionCookie(await signSession(SESSION_SECRET, now())))
    return c.json({ ok: true })
  })

  app.post('/admin/logout', (c) => {
    c.header('Set-Cookie', clearSessionCookie())
    return c.json({ ok: true })
  })

  app.get('/admin/me', (c) => c.json({ ok: true }))

  app.get('/admin/players', async (c) => c.json(await listPlayers(c.env.DB)))

  app.post('/admin/players', async (c) => {
    const { name, rating } = await readBody(c)
    if (typeof name !== 'string' || typeof rating !== 'number') throw bad()
    return c.json(await createPlayer(c.env.DB, { name, rating }), 201)
  })

  app.patch('/admin/players/:id', async (c) => {
    const { name, rating } = await readBody(c)
    if (name !== undefined && typeof name !== 'string') throw bad()
    if (rating !== undefined && typeof rating !== 'number') throw bad()
    return c.json(await updatePlayer(c.env.DB, c.req.param('id'), { name, rating }))
  })

  app.delete('/admin/players/:id', async (c) => {
    await archivePlayerInGame(c.env.DB, c.req.param('id'))
    return c.body(null, 204)
  })

  app.get('/admin/game', async (c) => c.json(await getActiveGame(c.env.DB)))

  app.post('/admin/game', async (c) => {
    const { date } = await readBody(c)
    if (typeof date !== 'string') throw bad()
    return c.json(await createGame(c.env.DB, date, now()), 201)
  })

  app.patch('/admin/game', async (c) => {
    const { date } = await readBody(c)
    if (typeof date !== 'string') throw bad()
    return c.json(await updateGameDate(c.env.DB, date, now()))
  })

  app.delete('/admin/game', async (c) => {
    await deleteActiveGame(c.env.DB)
    return c.body(null, 204)
  })

  app.put('/admin/game/paid', async (c) => {
    const { playerId, paid } = await readBody(c)
    if (typeof playerId !== 'string' || typeof paid !== 'boolean') throw bad()
    return c.json(await setPaid(c.env.DB, playerId, paid))
  })

  app.put('/admin/game/draw', async (c) =>
    c.json(await saveDraw(c.env.DB, parseDraw(await readBody(c)))),
  )

  app.get('/admin/settings', async (c) =>
    c.json({ memberSeesStars: await getSetting(c.env.DB, 'member_sees_stars') }),
  )

  app.patch('/admin/settings', async (c) => {
    const { memberSeesStars } = await readBody(c)
    if (typeof memberSeesStars !== 'boolean') throw bad()
    await setSetting(c.env.DB, 'member_sees_stars', memberSeesStars)
    return c.json({ memberSeesStars })
  })

  app.get('/admin/history', async (c) => c.json(await listHistory(c.env.DB)))

  return app
}

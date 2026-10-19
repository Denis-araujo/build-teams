import { describe, expect, it } from 'vitest'
import { createTestDb } from '../helpers/testDb'
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  clearFailedLogins,
  clearSessionCookie,
  isLoginBlocked,
  readSessionCookie,
  recordFailedLogin,
  sessionCookie,
  signSession,
  verifyPassword,
  verifySession,
} from '../../src/server/auth'

const SECRET = 'segredo-de-teste'
const NOW = new Date('2026-01-01T12:00:00Z')
const DAY = 86_400_000

describe('verifyPassword', () => {
  it('aceita a senha certa e recusa a errada', async () => {
    expect(await verifyPassword('abc123', 'abc123')).toBe(true)
    expect(await verifyPassword('abc124', 'abc123')).toBe(false)
    expect(await verifyPassword('abc12', 'abc123')).toBe(false)
  })
  it('nunca valida quando o segredo esperado é vazio', async () => {
    expect(await verifyPassword('', '')).toBe(false)
    expect(await verifyPassword('x', '')).toBe(false)
  })
  it('recusa entrada vazia', async () => {
    expect(await verifyPassword('', 'abc123')).toBe(false)
  })
})

describe('sessão', () => {
  it('token válido passa', async () => {
    const t = await signSession(SECRET, NOW)
    expect(await verifySession(t, SECRET, NOW)).toBe(true)
  })
  it('token com um caractere hex trocado falha', async () => {
    const t = await signSession(SECRET, NOW)
    const last = t[t.length - 1]
    const bad = t.slice(0, -1) + (last === '0' ? '1' : '0')
    expect(await verifySession(bad, SECRET, NOW)).toBe(false)
  })
  it('token assinado com outro segredo falha', async () => {
    const t = await signSession('outro', NOW)
    expect(await verifySession(t, SECRET, NOW)).toBe(false)
  })
  it('30 dias + 1 segundo de idade falha, 29 dias passa', async () => {
    const t = await signSession(SECRET, NOW)
    expect(await verifySession(t, SECRET, new Date(NOW.getTime() + 30 * DAY + 1000))).toBe(false)
    expect(await verifySession(t, SECRET, new Date(NOW.getTime() + 29 * DAY))).toBe(true)
  })
  it('expira exatamente aos 30 dias', async () => {
    const t = await signSession(SECRET, NOW)
    expect(SESSION_MAX_AGE_SECONDS).toBe(2592000)
    expect(await verifySession(t, SECRET, new Date(NOW.getTime() + 30 * DAY))).toBe(false)
  })
  it('tokens malformados retornam false sem lançar', async () => {
    const hex = 'a'.repeat(64)
    for (const t of ['', 'abc', 'a.b.c', '123.zz', '-1.' + hex, `9999999999999.${hex}.x`, `abc.${hex}`]) {
      expect(await verifySession(t, SECRET, NOW)).toBe(false)
    }
  })
  it('segredo vazio nunca assina nem valida', async () => {
    await expect(signSession('', NOW)).rejects.toThrow()
    const t = await signSession(SECRET, NOW)
    expect(await verifySession(t, '', NOW)).toBe(false)
  })
})

describe('limite de tentativas', () => {
  it('4 falhas não bloqueiam, a 5ª bloqueia', async () => {
    const db = createTestDb()
    for (let i = 0; i < 4; i++) await recordFailedLogin(db, '1.1.1.1', NOW)
    expect(await isLoginBlocked(db, '1.1.1.1', NOW)).toBe(false)
    await recordFailedLogin(db, '1.1.1.1', NOW)
    expect(await isLoginBlocked(db, '1.1.1.1', NOW)).toBe(true)
  })
  it('falhas com mais de 15 minutos não contam', async () => {
    const db = createTestDb()
    for (let i = 0; i < 5; i++) await recordFailedLogin(db, '1.1.1.1', NOW)
    expect(await isLoginBlocked(db, '1.1.1.1', new Date(NOW.getTime() + 15 * 60_000 - 1))).toBe(true)
    expect(await isLoginBlocked(db, '1.1.1.1', new Date(NOW.getTime() + 15 * 60_000))).toBe(false)
  })
  it('o bloqueio é por IP', async () => {
    const db = createTestDb()
    for (let i = 0; i < 5; i++) await recordFailedLogin(db, '1.1.1.1', NOW)
    expect(await isLoginBlocked(db, '2.2.2.2', NOW)).toBe(false)
  })
  it('clearFailedLogins desbloqueia', async () => {
    const db = createTestDb()
    for (let i = 0; i < 5; i++) await recordFailedLogin(db, '1.1.1.1', NOW)
    await clearFailedLogins(db, '1.1.1.1')
    expect(await isLoginBlocked(db, '1.1.1.1', NOW)).toBe(false)
  })
  it('limpa linhas antigas ao registrar', async () => {
    const db = createTestDb()
    await recordFailedLogin(db, '1.1.1.1', NOW)
    await recordFailedLogin(db, '1.1.1.1', new Date(NOW.getTime() + 16 * 60_000))
    const row = await db.prepare('SELECT COUNT(*) AS n FROM login_attempts').first<{ n: number }>()
    expect(row?.n).toBe(1)
  })
})

describe('cookie', () => {
  it('sessionCookie tem os atributos exigidos', () => {
    expect(sessionCookie('tok')).toBe(
      'session=tok; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=2592000',
    )
  })
  it('clearSessionCookie expira o cookie', () => {
    expect(clearSessionCookie()).toBe('session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0')
  })
  it('readSessionCookie extrai o token', () => {
    expect(SESSION_COOKIE).toBe('session')
    expect(readSessionCookie('session=abc.def')).toBe('abc.def')
    expect(readSessionCookie('a=1; session=abc.def; b=2')).toBe('abc.def')
    expect(readSessionCookie('  a=1 ;   session=tok  ')).toBe('tok')
    expect(readSessionCookie('xsession=no; a=1')).toBeNull()
    expect(readSessionCookie('a=1')).toBeNull()
    expect(readSessionCookie('session=')).toBeNull()
    expect(readSessionCookie('')).toBeNull()
    expect(readSessionCookie(null)).toBeNull()
    expect(readSessionCookie(undefined)).toBeNull()
  })
})

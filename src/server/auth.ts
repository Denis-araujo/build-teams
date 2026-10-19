export const SESSION_COOKIE = 'session'
export const SESSION_MAX_AGE_SECONDS = 2592000
const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_SECONDS * 1000

const LOGIN_WINDOW_MS = 900_000
const MAX_FAILED_LOGINS = 5
const SIGNATURE_HEX = /^[0-9a-f]{64}$/
const EXPIRY_DIGITS = /^[0-9]{1,16}$/

const encoder = new TextEncoder()

async function hmacKey(key: Uint8Array | string): Promise<CryptoKey> {
  const raw = typeof key === 'string' ? encoder.encode(key) : key
  return crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
}

async function hmac(key: CryptoKey, message: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(message)))
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

// Compares two byte arrays without early exit. Length difference is folded into the result.
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  let diff = a.length ^ b.length
  const n = Math.max(a.length, b.length)
  for (let i = 0; i < n; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0)
  return diff === 0
}

export async function verifyPassword(input: string, expected: string): Promise<boolean> {
  // Random per-call key: both sides yield fixed-length digests that are compared in constant time.
  const key = await hmacKey(crypto.getRandomValues(new Uint8Array(32)))
  const a = await hmac(key, input)
  const b = await hmac(key, expected)
  const equal = timingSafeEqual(a, b)
  return equal && expected.length > 0 && input.length > 0
}

export async function signSession(secret: string, now: Date): Promise<string> {
  if (!secret) throw new Error('SESSION_SECRET não configurado')
  const expiresAt = String(now.getTime() + SESSION_MAX_AGE_MS)
  const sig = await hmac(await hmacKey(secret), expiresAt)
  return `${expiresAt}.${toHex(sig)}`
}

export async function verifySession(token: string, secret: string, now: Date): Promise<boolean> {
  try {
    if (!secret || typeof token !== 'string') return false
    const parts = token.split('.')
    if (parts.length !== 2) return false
    const [expiry, signature] = parts as [string, string]
    if (!EXPIRY_DIGITS.test(expiry) || !SIGNATURE_HEX.test(signature)) return false
    const expected = await hmac(await hmacKey(secret), expiry)
    const given = new Uint8Array(32)
    for (let i = 0; i < 32; i++) given[i] = parseInt(signature.slice(i * 2, i * 2 + 2), 16)
    if (!timingSafeEqual(expected, given)) return false
    return Number(expiry) > now.getTime()
  } catch {
    return false
  }
}

export async function isLoginBlocked(db: D1Database, ip: string, now: Date): Promise<boolean> {
  const row = await db
    .prepare('SELECT COUNT(*) AS n FROM login_attempts WHERE ip = ? AND at > ?')
    .bind(ip, now.getTime() - LOGIN_WINDOW_MS)
    .first<{ n: number }>()
  return (row?.n ?? 0) >= MAX_FAILED_LOGINS
}

export async function recordFailedLogin(db: D1Database, ip: string, now: Date): Promise<void> {
  const ms = now.getTime()
  await db.prepare('INSERT INTO login_attempts (ip, at) VALUES (?, ?)').bind(ip, ms).run()
  await db
    .prepare('DELETE FROM login_attempts WHERE at <= ?')
    .bind(ms - LOGIN_WINDOW_MS)
    .run()
}

export async function clearFailedLogins(db: D1Database, ip: string): Promise<void> {
  await db.prepare('DELETE FROM login_attempts WHERE ip = ?').bind(ip).run()
}

const COOKIE_ATTRS = 'HttpOnly; Secure; SameSite=Strict; Path=/'

export function sessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${token}; ${COOKIE_ATTRS}; Max-Age=${SESSION_MAX_AGE_SECONDS}`
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; ${COOKIE_ATTRS}; Max-Age=0`
}

export function readSessionCookie(header: string | null | undefined): string | null {
  if (!header) return null
  for (const part of header.split(';')) {
    const eq = part.indexOf('=')
    if (eq < 0) continue
    if (part.slice(0, eq).trim() !== SESSION_COOKIE) continue
    const value = part.slice(eq + 1).trim()
    return value === '' ? null : value
  }
  return null
}

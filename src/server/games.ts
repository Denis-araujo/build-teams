import type { DrawState } from '../shared/types'
import { isGameDateAllowed } from '../shared/dates'
import { validateDrawState } from '../shared/drawValidation'
import { NotFoundError, ValidationError } from './errors'

export type Game = { id: string; date: string; paid: string[]; draw: DrawState | null }

type GameRow = { id: string; date: string; draw_json: string | null; revision: number }
type Loaded = Game & { revision: number }

const CHANGED = 'Os pagamentos ou o sorteio mudaram. Tente de novo.'
const MAX_ATTEMPTS = 3

const NO_ACTIVE = 'Não há jogo ativo'
const DEFAULT_TEAM_COUNT = 2
const DEFAULT_TEAM_SIZE = 6

async function loadActive(db: D1Database): Promise<Loaded | null> {
  const row = await db
    .prepare("SELECT id, date, draw_json, revision FROM games WHERE state = 'active'")
    .first<GameRow>()
  if (!row) return null
  const { results } = await db
    .prepare('SELECT player_id FROM game_paid WHERE game_id = ?')
    .bind(row.id)
    .all<{ player_id: string }>()
  return {
    id: row.id,
    date: row.date,
    revision: row.revision,
    paid: results.map((r) => r.player_id),
    draw: row.draw_json ? (JSON.parse(row.draw_json) as DrawState) : null,
  }
}

async function requireActive(db: D1Database): Promise<Loaded> {
  const game = await loadActive(db)
  if (!game) throw new NotFoundError(NO_ACTIVE)
  return game
}

function publicGame({ id, date, paid, draw }: Loaded): Game {
  return { id, date, paid, draw }
}

export async function getActiveGame(db: D1Database): Promise<Game | null> {
  const g = await loadActive(db)
  return g && publicGame(g)
}

export function isUniqueViolation(err: unknown): boolean {
  return err instanceof Error && /UNIQUE constraint failed/i.test(err.message)
}

function assertDate(date: string, now: Date): void {
  if (!isGameDateAllowed(date, now)) throw new ValidationError('Data inválida ou no passado')
}

export async function createGame(db: D1Database, date: string, now: Date): Promise<Game> {
  assertDate(date, now)
  if (await loadActive(db)) throw new ValidationError('Já existe um jogo ativo')
  try {
    await db
      .prepare(
        "INSERT INTO games (id, date, state, team_count, team_size) VALUES (?, ?, 'active', ?, ?)",
      )
      .bind(crypto.randomUUID(), date, DEFAULT_TEAM_COUNT, DEFAULT_TEAM_SIZE)
      .run()
  } catch (err) {
    // O índice único parcial é a rede de segurança contra corrida.
    if (isUniqueViolation(err)) {
      throw new ValidationError('Já existe um jogo ativo')
    }
    throw err
  }
  return publicGame(await requireActive(db))
}

export async function updateGameDate(db: D1Database, date: string, now: Date): Promise<Game> {
  assertDate(date, now)
  const game = await requireActive(db)
  await db
    .prepare('UPDATE games SET date = ?, revision = revision + 1 WHERE id = ?')
    .bind(date, game.id)
    .run()
  return publicGame(await requireActive(db))
}

export async function deleteActiveGame(db: D1Database): Promise<void> {
  const game = await loadActive(db)
  if (!game) return
  await db.batch([
    db.prepare('DELETE FROM game_paid WHERE game_id = ?').bind(game.id),
    db.prepare('DELETE FROM games WHERE id = ?').bind(game.id),
  ])
}

function cleanedDraw(d: DrawState | null, playerId: string): DrawState | null {
  if (!d) return null
  const present =
    d.teams.some((t) => t.includes(playerId)) || d.reserves.includes(playerId) || playerId in d.locks
  if (!present) return null
  const locks = { ...d.locks }
  delete locks[playerId]
  return {
    ...d,
    teams: d.teams.map((t) => t.filter((id) => id !== playerId)),
    reserves: d.reserves.filter((id) => id !== playerId),
    locks,
  }
}

export async function setPaid(db: D1Database, playerId: string, paid: boolean): Promise<Game> {
  const player = await db.prepare('SELECT id FROM players WHERE id = ?').bind(playerId).first()
  if (!player) throw new NotFoundError()

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const game = await requireActive(db)
    const rev = game.revision
    const next = paid ? null : cleanedDraw(game.draw, playerId)
    // Fase 1: guarda de revisão (e limpeza do sorteio, ao desmarcar).
    const phase1 = next
      ? db
          .prepare(
            "UPDATE games SET draw_json = ?, revision = revision + 1 WHERE id = ? AND state = 'active' AND revision = ?",
          )
          .bind(JSON.stringify(next), game.id, rev)
      : db
          .prepare(
            "UPDATE games SET revision = revision + 1 WHERE id = ? AND state = 'active' AND revision = ?",
          )
          .bind(game.id, rev)
    if ((await phase1.run()).meta.changes !== 1) continue

    // Fase 2: o pagamento só muda se ninguém escreveu entre as fases (revisão ainda rev + 1).
    const guard = 'EXISTS (SELECT 1 FROM games WHERE id = ? AND revision = ?)'
    const pay = paid
      ? db
          .prepare(`INSERT OR IGNORE INTO game_paid (game_id, player_id) SELECT ?, ? WHERE ${guard}`)
          .bind(game.id, playerId, game.id, rev + 1)
      : db
          .prepare(`DELETE FROM game_paid WHERE game_id = ? AND player_id = ? AND ${guard}`)
          .bind(game.id, playerId, game.id, rev + 1)
    const bump = db
      .prepare('UPDATE games SET revision = revision + 1 WHERE id = ? AND revision = ?')
      .bind(game.id, rev + 1)
    const [, bumped] = await db.batch([pay, bump])
    if (bumped.meta.changes === 1) return publicGame(await requireActive(db))
  }
  throw new ValidationError(CHANGED)
}

export async function saveDraw(db: D1Database, state: DrawState): Promise<Game> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const game = await requireActive(db)
    const error = validateDrawState(state, new Set(game.paid))
    if (error) throw new ValidationError(error)
    const res = await db
      .prepare(
        "UPDATE games SET draw_json = ?, team_count = ?, team_size = ?, revision = revision + 1 WHERE id = ? AND state = 'active' AND revision = ?",
      )
      .bind(JSON.stringify(state), state.teamCount, state.teamSize, game.id, game.revision)
      .run()
    if (res.meta.changes === 1) return publicGame(await requireActive(db))
  }
  throw new ValidationError(CHANGED)
}

export async function getSetting(db: D1Database, key: 'member_sees_stars'): Promise<boolean> {
  const row = await db.prepare('SELECT value FROM settings WHERE key = ?').bind(key).first<{ value: string }>()
  return row?.value === 'true'
}

export async function setSetting(
  db: D1Database,
  key: 'member_sees_stars',
  value: boolean,
): Promise<void> {
  await db
    .prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .bind(key, value ? 'true' : 'false')
    .run()
}

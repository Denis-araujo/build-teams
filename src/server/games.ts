import type { DrawState } from '../shared/types'
import { isGameDateAllowed } from '../shared/dates'
import { validateDrawState } from '../shared/drawValidation'
import { NotFoundError, ValidationError } from './errors'

export type Game = { id: string; date: string; paid: string[]; draw: DrawState | null }

type GameRow = { id: string; date: string; draw_json: string | null }

const NO_ACTIVE = 'Não há jogo ativo'
const DEFAULT_TEAM_COUNT = 2
const DEFAULT_TEAM_SIZE = 6

async function loadActive(db: D1Database): Promise<Game | null> {
  const row = await db
    .prepare("SELECT id, date, draw_json FROM games WHERE state = 'active'")
    .first<GameRow>()
  if (!row) return null
  const { results } = await db
    .prepare('SELECT player_id FROM game_paid WHERE game_id = ?')
    .bind(row.id)
    .all<{ player_id: string }>()
  return {
    id: row.id,
    date: row.date,
    paid: results.map((r) => r.player_id),
    draw: row.draw_json ? (JSON.parse(row.draw_json) as DrawState) : null,
  }
}

async function requireActive(db: D1Database): Promise<Game> {
  const game = await loadActive(db)
  if (!game) throw new NotFoundError(NO_ACTIVE)
  return game
}

export const getActiveGame = loadActive

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
    if (err instanceof Error && /UNIQUE|constraint/i.test(err.message)) {
      throw new ValidationError('Já existe um jogo ativo')
    }
    throw err
  }
  return requireActive(db)
}

export async function updateGameDate(db: D1Database, date: string, now: Date): Promise<Game> {
  assertDate(date, now)
  const game = await requireActive(db)
  await db.prepare('UPDATE games SET date = ? WHERE id = ?').bind(date, game.id).run()
  return requireActive(db)
}

export async function deleteActiveGame(db: D1Database): Promise<void> {
  const game = await loadActive(db)
  if (!game) return
  await db.batch([
    db.prepare('DELETE FROM game_paid WHERE game_id = ?').bind(game.id),
    db.prepare('DELETE FROM games WHERE id = ?').bind(game.id),
  ])
}

export async function setPaid(db: D1Database, playerId: string, paid: boolean): Promise<Game> {
  const player = await db.prepare('SELECT id FROM players WHERE id = ?').bind(playerId).first()
  if (!player) throw new NotFoundError()
  const game = await requireActive(db)

  if (paid) {
    await db
      .prepare('INSERT OR IGNORE INTO game_paid (game_id, player_id) VALUES (?, ?)')
      .bind(game.id, playerId)
      .run()
    return requireActive(db)
  }

  const stmts = [
    db.prepare('DELETE FROM game_paid WHERE game_id = ? AND player_id = ?').bind(game.id, playerId),
  ]
  const d = game.draw
  if (d && (d.teams.some((t) => t.includes(playerId)) || d.reserves.includes(playerId) || playerId in d.locks)) {
    const locks = { ...d.locks }
    delete locks[playerId]
    const next: DrawState = {
      ...d,
      teams: d.teams.map((t) => t.filter((id) => id !== playerId)),
      reserves: d.reserves.filter((id) => id !== playerId),
      locks,
    }
    stmts.push(
      db.prepare('UPDATE games SET draw_json = ? WHERE id = ?').bind(JSON.stringify(next), game.id),
    )
  }
  await db.batch(stmts)
  return requireActive(db)
}

export async function saveDraw(db: D1Database, state: DrawState): Promise<Game> {
  const game = await requireActive(db)
  const error = validateDrawState(state, new Set(game.paid))
  if (error) throw new ValidationError(error)
  await db
    .prepare('UPDATE games SET draw_json = ?, team_count = ?, team_size = ? WHERE id = ?')
    .bind(JSON.stringify(state), state.teamCount, state.teamSize, game.id)
    .run()
  return requireActive(db)
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

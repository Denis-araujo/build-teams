import { isGameExpired } from '../shared/dates'
import type { DrawState } from '../shared/types'

type GameRow = { id: string; date: string; draw_json: string | null; team_count: number; team_size: number }
type PlayerRow = { id: string; name: string; rating: number; archived: number }

// Finaliza o jogo ativo se a data já passou (America/Sao_Paulo).
// Devolve true só para o chamador cujo INSERT em history gravou a linha.
export async function finalizeIfExpired(db: D1Database, now: Date): Promise<boolean> {
  const game = await db
    .prepare("SELECT id, date, draw_json, team_count, team_size FROM games WHERE state = 'active'")
    .first<GameRow>()
  if (!game || !isGameExpired(game.date, now)) return false

  const draw = game.draw_json ? (JSON.parse(game.draw_json) as DrawState) : null
  const inDraw = new Set<string>([...(draw?.teams.flat() ?? []), ...(draw?.reserves ?? [])])

  const { results: players } = await db
    .prepare('SELECT id, name, rating, archived FROM players ORDER BY LOWER(name), name')
    .all<PlayerRow>()
  const { results: paidRows } = await db
    .prepare('SELECT player_id FROM game_paid WHERE game_id = ?')
    .bind(game.id)
    .all<{ player_id: string }>()
  const paid = new Set(paidRows.map((r) => r.player_id))

  const finishedAt = now.toISOString()
  const snapshot = {
    date: game.date,
    finishedAt,
    config: {
      teamCount: draw?.teamCount ?? game.team_count,
      teamSize: draw?.teamSize ?? game.team_size,
    },
    players: players
      .filter((p) => p.archived === 0 || inDraw.has(p.id))
      .map((p) => ({ id: p.id, name: p.name, rating: p.rating, paid: paid.has(p.id) })),
    teams: draw?.teams ?? [],
    reserves: draw?.reserves ?? [],
  }

  const [inserted] = await db.batch([
    db
      .prepare(
        'INSERT OR IGNORE INTO history (id, game_id, game_date, finished_at, snapshot_json) VALUES (?, ?, ?, ?, ?)',
      )
      .bind(crypto.randomUUID(), game.id, game.date, finishedAt, JSON.stringify(snapshot)),
    db
      .prepare(
        "UPDATE games SET state = 'finished', draw_json = NULL, revision = revision + 1 WHERE id = ? AND state = 'active'",
      )
      .bind(game.id),
    db.prepare('DELETE FROM game_paid WHERE game_id = ?').bind(game.id),
  ])
  return inserted.meta.changes === 1
}

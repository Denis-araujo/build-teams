type Row = { id: string; game_date: string; finished_at: string; snapshot_json: string }

export type HistoryEntry = { id: string; gameDate: string; finishedAt: string; snapshot: unknown }

export async function listHistory(db: D1Database): Promise<HistoryEntry[]> {
  const { results } = await db
    .prepare(
      'SELECT id, game_date, finished_at, snapshot_json FROM history ORDER BY game_date DESC, finished_at DESC',
    )
    .all<Row>()
  return results.map((r) => ({
    id: r.id,
    gameDate: r.game_date,
    finishedAt: r.finished_at,
    snapshot: JSON.parse(r.snapshot_json) as unknown,
  }))
}

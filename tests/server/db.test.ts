import { describe, expect, it } from 'vitest'
import { createTestDb } from '../helpers/testDb'

const insertGame = (db: D1Database, id: string, state: string) =>
  db
    .prepare(
      "INSERT INTO games (id, date, state, team_count, team_size) VALUES (?, '2026-10-19', ?, 2, 6)",
    )
    .bind(id, state)
    .run()

describe('schema', () => {
  it('rejects a second active game', async () => {
    const db = createTestDb()
    await insertGame(db, 'g1', 'active')
    await expect(insertGame(db, 'g2', 'active')).rejects.toThrow()
  })

  it('accepts two finished games', async () => {
    const db = createTestDb()
    await insertGame(db, 'g1', 'finished')
    await insertGame(db, 'g2', 'finished')
    const r = await db.prepare('SELECT COUNT(*) AS n FROM games').first<{ n: number }>()
    expect(r?.n).toBe(2)
  })

  it('rejects a second history row with the same game_id', async () => {
    const db = createTestDb()
    await insertGame(db, 'g1', 'finished')
    const ins = (id: string) =>
      db
        .prepare(
          "INSERT INTO history (id, game_id, game_date, finished_at, snapshot_json) VALUES (?, 'g1', '2026-10-19', '2026-10-19T20:00:00Z', '{}')",
        )
        .bind(id)
        .run()
    await ins('h1')
    await expect(ins('h2')).rejects.toThrow()
  })
})

describe('adapter', () => {
  it('batch applies nothing when one statement is invalid', async () => {
    const db = createTestDb()
    const ok = db.prepare("INSERT INTO players (id, name, rating) VALUES (?, ?, ?)")
    await expect(
      db.batch([ok.bind('p1', 'Ana', 3), db.prepare('INSERT INTO nope VALUES (1)')]),
    ).rejects.toThrow()
    const r = await db.prepare('SELECT COUNT(*) AS n FROM players').first<{ n: number }>()
    expect(r?.n).toBe(0)
  })

  it('batch returns per-statement meta.changes (INSERT OR IGNORE)', async () => {
    const db = createTestDb()
    const ins = db.prepare('INSERT OR IGNORE INTO players (id, name, rating) VALUES (?, ?, ?)')
    const res = await db.batch([ins.bind('p1', 'Ana', 3), ins.bind('p1', 'Ana', 3)])
    expect(res.map((x) => x.meta.changes)).toEqual([1, 0])
  })

  it('all() returns results and run() returns last_row_id; booleans bind as 0/1', async () => {
    const db = createTestDb()
    await db
      .prepare('INSERT INTO players (id, name, rating, archived) VALUES (?, ?, ?, ?)')
      .bind('p1', 'Ana', 3, true)
      .run()
    const all = await db.prepare('SELECT * FROM players').all<{ archived: number }>()
    expect(all.success).toBe(true)
    expect(all.results[0].archived).toBe(1)
    const r = await db.prepare("INSERT INTO settings (key, value) VALUES ('a','b')").run()
    expect(r.meta.changes).toBe(1)
    expect(typeof r.meta.last_row_id).toBe('number')
  })

  it('rejects undefined bind values', () => {
    const db = createTestDb()
    expect(() => db.prepare('SELECT ?').bind(undefined)).toThrow(/undefined/)
  })

  it('enforces foreign keys', async () => {
    const db = createTestDb()
    await expect(
      db.prepare("INSERT INTO game_paid (game_id, player_id) VALUES ('x','y')").run(),
    ).rejects.toThrow()
  })
})

import { describe, expect, it } from 'vitest'
import { createTestDb } from '../helpers/testDb'
import { archivePlayer, createPlayer } from '../../src/server/players'
import { createGame, getActiveGame, saveDraw, setPaid } from '../../src/server/games'
import { finalizeIfExpired } from '../../src/server/finalize'

const created = new Date('2026-10-19T15:00:00Z')
const lastSecond = new Date('2026-10-20T02:59:59Z')
const expired = new Date('2026-10-20T03:00:00Z')

type Snapshot = {
  date: string
  time: string
  finishedAt: string
  config: { teamCount: number; teamSize: number }
  players: { id: string; name: string; rating: number; paid: boolean }[]
  teams: string[][]
  reserves: string[]
}

async function setup(withDraw = true) {
  const db = createTestDb()
  const a = await createPlayer(db, { name: 'Ana', rating: 3 })
  const b = await createPlayer(db, { name: 'Bia', rating: 4 })
  const c = await createPlayer(db, { name: 'Cris', rating: 2 })
  await createGame(db, '2026-10-19', created)
  await setPaid(db, a.id, true)
  await setPaid(db, b.id, true)
  if (withDraw) {
    await saveDraw(db, { teamCount: 2, teamSize: 1, teams: [[a.id], [b.id]], reserves: [], locks: {} })
  }
  return { db, a, b, c }
}

async function historyRows(db: D1Database) {
  const { results } = await db
    .prepare('SELECT id, game_id, game_date, finished_at, snapshot_json FROM history')
    .all<{ id: string; game_id: string; game_date: string; finished_at: string; snapshot_json: string }>()
  return results
}

describe('finalizeIfExpired', () => {
  it('returns false with no active game', async () => {
    expect(await finalizeIfExpired(createTestDb(), expired)).toBe(false)
  })

  it('respects the Brasília midnight boundary', async () => {
    const { db } = await setup()
    expect(await finalizeIfExpired(db, lastSecond)).toBe(false)
    expect(await getActiveGame(db)).not.toBeNull()
    expect(await finalizeIfExpired(db, expired)).toBe(true)
  })

  it('finishes the game, clears payments and stores the snapshot', async () => {
    const { db, a, b } = await setup()
    expect(await finalizeIfExpired(db, expired)).toBe(true)
    expect(await getActiveGame(db)).toBeNull()
    const paid = await db.prepare('SELECT COUNT(*) AS n FROM game_paid').first<{ n: number }>()
    expect(paid!.n).toBe(0)
    const rows = await historyRows(db)
    expect(rows).toHaveLength(1)
    expect(rows[0].game_date).toBe('2026-10-19')
    expect(rows[0].finished_at).toBe(expired.toISOString())
    const snap = JSON.parse(rows[0].snapshot_json) as Snapshot
    expect(snap).toMatchObject({
      date: '2026-10-19',
      finishedAt: expired.toISOString(),
      config: { teamCount: 2, teamSize: 1 },
      teams: [[a.id], [b.id]],
      reserves: [],
    })
    expect(snap.players).toEqual([
      { id: a.id, name: 'Ana', rating: 3, paid: true },
      { id: b.id, name: 'Bia', rating: 4, paid: true },
      expect.objectContaining({ name: 'Cris', rating: 2, paid: false }),
    ])
  })

  it('keeps names frozen when a player is archived later', async () => {
    const { db, a } = await setup()
    await finalizeIfExpired(db, expired)
    await archivePlayer(db, a.id)
    await db.prepare("UPDATE players SET name = 'Outra' WHERE id = ?").bind(a.id).run()
    const snap = JSON.parse((await historyRows(db))[0].snapshot_json) as Snapshot
    expect(snap.players.find((p) => p.id === a.id)?.name).toBe('Ana')
  })

  it('includes an archived player that appears in the draw', async () => {
    const { db, a } = await setup()
    await archivePlayer(db, a.id)
    await finalizeIfExpired(db, expired)
    const snap = JSON.parse((await historyRows(db))[0].snapshot_json) as Snapshot
    expect(snap.players.find((p) => p.id === a.id)).toEqual({ id: a.id, name: 'Ana', rating: 3, paid: true })
  })

  it('finalizes a game without a draw with empty teams', async () => {
    const { db } = await setup(false)
    expect(await finalizeIfExpired(db, expired)).toBe(true)
    const snap = JSON.parse((await historyRows(db))[0].snapshot_json) as Snapshot
    expect(snap.teams).toEqual([])
    expect(snap.reserves).toEqual([])
    expect(snap.config).toEqual({ teamCount: 2, teamSize: 6 })
  })

  it('concurrent calls leave exactly one history row and one true', async () => {
    const { db } = await setup()
    const results = await Promise.all([finalizeIfExpired(db, expired), finalizeIfExpired(db, expired)])
    expect(results.filter(Boolean)).toHaveLength(1)
    expect(await historyRows(db)).toHaveLength(1)
  })

  it('a late duplicate finalize does not touch a newer game', async () => {
    const { db, a } = await setup()
    // Chamador lento: já leu o jogo antigo, mas só grava depois.
    const late = finalizeIfExpired(db, expired)
    const first = await finalizeIfExpired(db, expired)
    expect([first, await late].filter(Boolean)).toHaveLength(1)
    const next = await createGame(db, '2026-10-25', expired)
    await setPaid(db, a.id, true)
    expect(await finalizeIfExpired(db, expired)).toBe(false)
    expect(await getActiveGame(db)).toMatchObject({ id: next.id, paid: [a.id] })
    expect(await historyRows(db)).toHaveLength(1)
  })

  it('lists snapshot players in pt-BR order', async () => {
    const db = createTestDb()
    for (const name of ['Zeca', 'Álvaro', 'Bia', 'érica', 'André'])
      await createPlayer(db, { name, rating: 3 })
    await createGame(db, '2026-10-19', created)
    expect(await finalizeIfExpired(db, expired)).toBe(true)
    const snap = JSON.parse((await historyRows(db))[0]!.snapshot_json) as Snapshot
    expect(snap.players.map((p) => p.name)).toEqual(['Álvaro', 'André', 'Bia', 'érica', 'Zeca'])
  })

  it('finalizes a game with a corrupt draw_json without throwing', async () => {
    const { db } = await setup(false)
    await db.prepare("UPDATE games SET draw_json = '{not json' WHERE state = 'active'").run()
    expect(await finalizeIfExpired(db, expired)).toBe(true)
    const snap = JSON.parse((await historyRows(db))[0]!.snapshot_json) as Snapshot
    expect(snap.teams).toEqual([])
    expect(snap.reserves).toEqual([])
  })
})

describe('snapshot time', () => {
  it('stores the game time in the snapshot', async () => {
    const db = createTestDb()
    await createGame(db, '2026-10-19', created, '20:30')
    await finalizeIfExpired(db, expired)
    const { results } = await db.prepare('SELECT snapshot_json FROM history').all<{ snapshot_json: string }>()
    expect((JSON.parse(results[0]!.snapshot_json) as Snapshot).time).toBe('20:30')
  })
})

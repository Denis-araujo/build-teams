import { describe, expect, it } from 'vitest'
import { createTestDb } from '../helpers/testDb'
import { NotFoundError, ValidationError } from '../../src/server/errors'
import { createPlayer } from '../../src/server/players'
import {
  createGame,
  deleteActiveGame,
  getActiveGame,
  getSetting,
  saveDraw,
  setPaid,
  setSetting,
  updateGameDate,
} from '../../src/server/games'
import type { DrawState } from '../../src/shared/types'

const now = new Date('2026-10-19T15:00:00Z')

async function setup() {
  const db = createTestDb()
  const a = await createPlayer(db, { name: 'Ana', rating: 3 })
  const b = await createPlayer(db, { name: 'Bia', rating: 4 })
  const c = await createPlayer(db, { name: 'Cris', rating: 2 })
  const game = await createGame(db, '2026-10-20', now)
  return { db, a, b, c, game }
}

describe('games', () => {
  it('has no active game initially', async () => {
    expect(await getActiveGame(createTestDb())).toBeNull()
  })

  it('creates a game with no payments and no draw', async () => {
    const { db, game } = await setup()
    expect(game).toMatchObject({ date: '2026-10-20', paid: [], draw: null })
    expect(await getActiveGame(db)).toEqual(game)
  })

  it('rejects a past or invalid date', async () => {
    const db = createTestDb()
    await expect(createGame(db, '2026-10-18', now)).rejects.toThrow(ValidationError)
    await expect(createGame(db, 'abc', now)).rejects.toThrow(ValidationError)
  })

  it('rejects a second active game', async () => {
    const { db } = await setup()
    await expect(createGame(db, '2026-10-21', now)).rejects.toThrow('Já existe um jogo ativo')
  })

  it('updates the date keeping paid and draw', async () => {
    const { db, a } = await setup()
    await setPaid(db, a.id, true)
    const g = await updateGameDate(db, '2026-10-25', now)
    expect(g.date).toBe('2026-10-25')
    expect(g.paid).toEqual([a.id])
    await expect(updateGameDate(db, '2026-10-01', now)).rejects.toThrow(ValidationError)
  })

  it('update date without active game is not found', async () => {
    await expect(updateGameDate(createTestDb(), '2026-10-25', now)).rejects.toThrow(NotFoundError)
  })

  it('marks and unmarks payment idempotently', async () => {
    const { db, a } = await setup()
    await setPaid(db, a.id, true)
    expect((await setPaid(db, a.id, true)).paid).toEqual([a.id])
    expect((await setPaid(db, a.id, false)).paid).toEqual([])
  })

  it('setPaid fails for unknown player and without game', async () => {
    const { db } = await setup()
    await expect(setPaid(db, 'nope', true)).rejects.toThrow(NotFoundError)
    await expect(setPaid(createTestDb(), 'x', true)).rejects.toThrow(NotFoundError)
  })

  it('unmarking removes the player from teams, reserves and locks', async () => {
    const { db, a, b, c } = await setup()
    for (const p of [a, b, c]) await setPaid(db, p.id, true)
    await saveDraw(db, {
      teamCount: 2,
      teamSize: 2,
      teams: [[a.id, b.id], []],
      reserves: [c.id],
      locks: { [a.id]: 0, [c.id]: 1 },
    })
    const g1 = await setPaid(db, a.id, false)
    expect(g1.draw).toEqual({
      teamCount: 2,
      teamSize: 2,
      teams: [[b.id], []],
      reserves: [c.id],
      locks: { [c.id]: 1 },
    })
    const g2 = await setPaid(db, c.id, false)
    expect(g2.draw!.reserves).toEqual([])
    expect(g2.draw!.locks).toEqual({})
    expect((await getActiveGame(db))!.draw).toEqual(g2.draw)
  })

  it('saveDraw rejects unpaid player and keeps previous draw', async () => {
    const { db, a, b } = await setup()
    await setPaid(db, a.id, true)
    const good: DrawState = { teamCount: 2, teamSize: 2, teams: [[a.id], []], reserves: [], locks: {} }
    await saveDraw(db, good)
    const bad: DrawState = { ...good, teams: [[a.id], [b.id]] }
    await expect(saveDraw(db, bad)).rejects.toThrow(ValidationError)
    expect((await getActiveGame(db))!.draw).toEqual(good)
  })

  it('saveDraw without active game is not found', async () => {
    const state: DrawState = { teamCount: 2, teamSize: 2, teams: [[], []], reserves: [], locks: {} }
    await expect(saveDraw(createTestDb(), state)).rejects.toThrow(NotFoundError)
  })

  it('valid saveDraw is returned by getActiveGame', async () => {
    const { db, a } = await setup()
    await setPaid(db, a.id, true)
    const state: DrawState = { teamCount: 3, teamSize: 4, teams: [[a.id], [], []], reserves: [], locks: {} }
    const g = await saveDraw(db, state)
    expect(g.draw).toEqual(state)
    expect((await getActiveGame(db))!.draw).toEqual(state)
  })

  it('deleteActiveGame removes payments and writes no history', async () => {
    const { db, a } = await setup()
    await setPaid(db, a.id, true)
    await deleteActiveGame(db)
    expect(await getActiveGame(db)).toBeNull()
    const paid = await db.prepare('SELECT COUNT(*) AS n FROM game_paid').first<{ n: number }>()
    const hist = await db.prepare('SELECT COUNT(*) AS n FROM history').first<{ n: number }>()
    expect(paid!.n).toBe(0)
    expect(hist!.n).toBe(0)
    await createGame(db, '2026-10-22', now)
  })

  it('settings default to false and upsert', async () => {
    const db = createTestDb()
    expect(await getSetting(db, 'member_sees_stars')).toBe(false)
    await setSetting(db, 'member_sees_stars', true)
    expect(await getSetting(db, 'member_sees_stars')).toBe(true)
    await setSetting(db, 'member_sees_stars', false)
    expect(await getSetting(db, 'member_sees_stars')).toBe(false)
  })
})

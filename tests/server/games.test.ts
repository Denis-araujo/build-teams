import { describe, expect, it } from 'vitest'
import { createTestDb } from '../helpers/testDb'
import { NotFoundError, ValidationError } from '../../src/server/errors'
import { createPlayer } from '../../src/server/players'
import {
  archivePlayerInGame,
  createGame,
  deleteActiveGame,
  getActiveGame,
  getSetting,
  isUniqueViolation,
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

  it('only translates unique-constraint failures', () => {
    expect(isUniqueViolation(new Error('UNIQUE constraint failed: games.state'))).toBe(true)
    expect(isUniqueViolation(new Error('FOREIGN KEY constraint failed'))).toBe(false)
    expect(isUniqueViolation('x')).toBe(false)
  })

  describe('concurrency', () => {
    // Runs `hook` after a matching read/write: `all` of game_paid (gap between read and
    // phase 1) or `run` of the revision-guarded UPDATE (gap between phase 1 and phase 2).
    function withGap(
      db: D1Database,
      where: 'read' | 'phase1',
      hook: () => Promise<void>,
      once = true,
    ): D1Database {
      let done = false
      type Stmt = D1PreparedStatement
      const fire = async () => {
        if (once && done) return
        done = true
        await hook()
      }
      const wrap = (stmt: Stmt, sql: string): Stmt =>
        ({
          ...stmt,
          bind: (...a: unknown[]) => wrap(stmt.bind(...a), sql),
          all: async () => {
            const r = await stmt.all()
            if (where === 'read' && /FROM game_paid WHERE game_id/.test(sql)) await fire()
            return r
          },
          run: async () => {
            const r = await stmt.run()
            if (where === 'phase1' && /^UPDATE games SET (draw_json = \?, )?revision = revision \+ 1 WHERE id = \? AND state/.test(sql) && !/team_count/.test(sql)) {
              await fire()
            }
            return r
          },
        }) as unknown as Stmt
      return new Proxy(db, {
        get: (t, k) => (k === 'prepare' ? (sql: string) => wrap(t.prepare(sql), sql) : (t as never)[k]),
      })
    }

    it('saveDraw never stores a player unpaid concurrently', async () => {
      const { db, a, b } = await setup()
      await setPaid(db, a.id, true)
      await setPaid(db, b.id, true)
      const state: DrawState = { teamCount: 2, teamSize: 2, teams: [[a.id], [b.id]], reserves: [], locks: {} }
      const racy = withGap(db, 'read', async () => {
        await setPaid(db, b.id, false)
      })
      await expect(saveDraw(racy, state)).rejects.toThrow(ValidationError)
      const g = (await getActiveGame(db))!
      expect(g.paid).toEqual([a.id])
      expect(JSON.stringify(g.draw)).not.toContain(b.id)
    })

    it('setPaid(false) does not overwrite a concurrent saveDraw', async () => {
      const { db, a, b, c } = await setup()
      for (const p of [a, b, c]) await setPaid(db, p.id, true)
      await saveDraw(db, { teamCount: 2, teamSize: 2, teams: [[a.id], [b.id]], reserves: [], locks: {} })
      const edited: DrawState = { teamCount: 2, teamSize: 2, teams: [[a.id, c.id], [b.id]], reserves: [], locks: {} }
      const racy = withGap(db, 'read', async () => {
        await saveDraw(db, edited)
      })
      const g = await setPaid(racy, a.id, false)
      expect(g.paid.sort()).toEqual([b.id, c.id].sort())
      expect(g.draw!.teams).toEqual([[c.id], [b.id]])
    })

    async function unpaidScenario(where: 'read' | 'phase1', once: boolean) {
      const { db, a, b } = await setup()
      await setPaid(db, a.id, true)
      await setPaid(db, b.id, true)
      await saveDraw(db, { teamCount: 2, teamSize: 2, teams: [[a.id], [b.id]], reserves: [], locks: {} })
      const again: DrawState = { teamCount: 2, teamSize: 2, teams: [[b.id], [a.id]], reserves: [], locks: {} }
      const racy = withGap(db, where, async () => {
        await saveDraw(db, again)
      }, once)
      const result = await setPaid(racy, a.id, false).then(
        () => 'ok',
        (e) => e,
      )
      const g = (await getActiveGame(db))!
      return { a, b, result, g }
    }

    it.each(['read', 'phase1'] as const)(
      'setPaid(false) vs competing saveDraw including the player (%s gap) stays consistent',
      async (where) => {
        const { a, b, result, g } = await unpaidScenario(where, true)
        expect(result).toBe('ok')
        expect(g.paid).toEqual([b.id])
        expect(JSON.stringify(g.draw)).not.toContain(a.id)
      },
    )

    it('exhausted attempts leave game_paid untouched', async () => {
      const { a, b, result, g } = await unpaidScenario('phase1', false)
      expect(result).toBeInstanceOf(ValidationError)
      expect(g.paid.sort()).toEqual([a.id, b.id].sort())
    })
  })

  it('archivePlayerInGame removes the player from paid, teams, reserves and locks', async () => {
    const { db, a, b, c } = await setup()
    for (const p of [a, b, c]) await setPaid(db, p.id, true)
    await saveDraw(db, {
      teamCount: 2,
      teamSize: 1,
      teams: [[a.id], [b.id]],
      reserves: [c.id],
      locks: { [a.id]: 0, [c.id]: 1 },
    })
    await archivePlayerInGame(db, a.id)
    await archivePlayerInGame(db, c.id)
    const g = await getActiveGame(db)
    expect(g?.paid).toEqual([b.id])
    expect(g?.draw?.teams).toEqual([[], [b.id]])
    expect(g?.draw?.reserves).toEqual([])
    expect(g?.draw?.locks).toEqual({})
    const { results } = await db.prepare('SELECT id FROM players WHERE archived = 1 ORDER BY name').all()
    expect(results).toHaveLength(2)
  })

  it('archivePlayerInGame works with no active game and still 404s unknown players', async () => {
    const db = createTestDb()
    const a = await createPlayer(db, { name: 'Ana', rating: 3 })
    await archivePlayerInGame(db, a.id)
    const row = await db.prepare('SELECT archived FROM players WHERE id = ?').bind(a.id).first<{ archived: number }>()
    expect(row?.archived).toBe(1)
    await expect(archivePlayerInGame(db, 'nope')).rejects.toThrow(NotFoundError)
  })

  it('a corrupt draw_json yields a game with draw null instead of throwing', async () => {
    const { db, game } = await setup()
    await db.prepare('UPDATE games SET draw_json = ? WHERE id = ?').bind('{not json', game.id).run()
    expect(await getActiveGame(db)).toMatchObject({ id: game.id, draw: null })
    await db.prepare('UPDATE games SET draw_json = ? WHERE id = ?').bind('{"teams":1}', game.id).run()
    expect((await getActiveGame(db))?.draw).toBeNull()
  })
})

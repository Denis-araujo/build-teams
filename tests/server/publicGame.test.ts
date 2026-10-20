import { describe, expect, it } from 'vitest'
import { createTestDb } from '../helpers/testDb'
import { archivePlayer, createPlayer } from '../../src/server/players'
import { createGame, saveDraw, setPaid, setSetting } from '../../src/server/games'
import { getPublicGame } from '../../src/server/publicGame'

const created = new Date('2026-10-19T15:00:00Z')
const expired = new Date('2026-10-20T03:00:00Z')

async function setup(withDraw = true) {
  const db = createTestDb()
  const a = await createPlayer(db, { name: 'Ana', rating: 3.5 })
  const b = await createPlayer(db, { name: 'Bia', rating: 4.5 })
  const c = await createPlayer(db, { name: 'Cris', rating: 2.5 })
  const d = await createPlayer(db, { name: 'Davi', rating: 1.5 })
  await createGame(db, '2026-10-19', created)
  await setPaid(db, a.id, true)
  await setPaid(db, b.id, true)
  await setPaid(db, c.id, true)
  if (withDraw) {
    await saveDraw(db, {
      teamCount: 2,
      teamSize: 1,
      teams: [[a.id], [b.id]],
      reserves: [c.id],
      locks: { [a.id]: 0 },
    })
  }
  return { db, a, b, c, d }
}

describe('getPublicGame', () => {
  it('returns null with no active game', async () => {
    expect(await getPublicGame(createTestDb(), created)).toBeNull()
  })

  it('returns null for an expired game and finalizes it', async () => {
    const { db } = await setup()
    expect(await getPublicGame(db, expired)).toBeNull()
    const row = await db.prepare('SELECT COUNT(*) AS n FROM history').first<{ n: number }>()
    expect(row?.n).toBe(1)
  })

  it('omits the rating key everywhere when stars are hidden', async () => {
    const { db } = await setup()
    await setSetting(db, 'member_sees_stars', false)
    const result = await getPublicGame(db, created)
    expect(result?.showStars).toBe(false)
    const json = JSON.stringify(result)
    expect(json).not.toContain('rating')
    for (const r of ['3.5', '4.5', '2.5', '1.5']) expect(json).not.toContain(r)
    for (const p of result!.players) expect('rating' in p).toBe(false)
  })

  it('includes every rating when stars are visible', async () => {
    const { db } = await setup()
    await setSetting(db, 'member_sees_stars', true)
    const result = await getPublicGame(db, created)
    expect(result?.showStars).toBe(true)
    expect(Object.fromEntries(result!.players.map((p) => [p.name, p.rating]))).toEqual({
      Ana: 3.5,
      Bia: 4.5,
      Cris: 2.5,
      Davi: 1.5,
    })
  })

  it('reflects paid status and alphabetical order', async () => {
    const { db } = await setup()
    const result = await getPublicGame(db, created)
    expect(result?.date).toBe('2026-10-19')
    expect(result?.players.map((p) => [p.name, p.paid])).toEqual([
      ['Ana', true],
      ['Bia', true],
      ['Cris', true],
      ['Davi', false],
    ])
  })

  it('round-trips teams and reserves as ids', async () => {
    const { db, a, b, c } = await setup()
    const result = await getPublicGame(db, created)
    expect(result?.teams).toEqual([[a.id], [b.id]])
    expect(result?.reserves).toEqual([c.id])
  })

  it('has empty teams and reserves without a draw', async () => {
    const { db } = await setup(false)
    const result = await getPublicGame(db, created)
    expect(result?.teams).toEqual([])
    expect(result?.reserves).toEqual([])
  })

  it('hides archived players that are not in the draw', async () => {
    const { db, d } = await setup()
    await archivePlayer(db, d.id)
    const result = await getPublicGame(db, created)
    expect(result?.players.map((p) => p.name)).toEqual(['Ana', 'Bia', 'Cris'])
  })

  it('keeps archived players that are in the draw', async () => {
    const { db, a, c } = await setup()
    await archivePlayer(db, a.id)
    await archivePlayer(db, c.id)
    const result = await getPublicGame(db, created)
    expect(result?.players.map((p) => p.name)).toEqual(['Ana', 'Bia', 'Cris', 'Davi'])
  })

  it('does not expose draw internals', async () => {
    const { db } = await setup()
    const json = JSON.stringify(await getPublicGame(db, created))
    for (const k of ['locks', 'revision', 'draw_json']) {
      expect(json).not.toContain(k)
    }
    expect(Object.keys(JSON.parse(json)).sort()).toEqual(
      ['date', 'players', 'reserves', 'showStars', 'teamCount', 'teamSize', 'teams', 'time'],
    )
  })

  it('exposes the stored draw format when a draw exists', async () => {
    const { db } = await setup()
    const result = await getPublicGame(db, created)
    expect(result?.teamCount).toBe(2)
    expect(result?.teamSize).toBe(1)
  })

  it('omits teamCount and teamSize when there is no draw', async () => {
    const { db } = await setup(false)
    const result = await getPublicGame(db, created)
    expect('teamCount' in result!).toBe(false)
    expect('teamSize' in result!).toBe(false)
  })

  it('still has no rating anywhere with stars hidden and a draw (format is public)', async () => {
    const { db } = await setup()
    await setSetting(db, 'member_sees_stars', false)
    const result = await getPublicGame(db, created)
    expect(result?.teamCount).toBe(2)
    expect(JSON.stringify(result)).not.toContain('rating')
  })

  describe('ordering inside teams', () => {
    async function ordered() {
      const db = createTestDb()
      const zeca = await createPlayer(db, { name: 'Zeca', rating: 5 })
      const bia = await createPlayer(db, { name: 'Bia', rating: 4 })
      const ana = await createPlayer(db, { name: 'Ana', rating: 3 })
      const xu = await createPlayer(db, { name: 'xu', rating: 2 })
      const li = await createPlayer(db, { name: 'Li', rating: 1 })
      const mo = await createPlayer(db, { name: 'Mo', rating: 1.5 })
      await createGame(db, '2026-10-19', created)
      for (const p of [zeca, bia, ana, xu, li, mo]) await setPaid(db, p.id, true)
      await saveDraw(db, {
        teamCount: 2,
        teamSize: 3,
        teams: [
          [zeca.id, bia.id, ana.id],
          [xu.id, mo.id, li.id],
        ],
        reserves: [],
        locks: {},
      })
      return { db, zeca, bia, ana, xu, li, mo }
    }

    it('orders ids by name inside teams when stars are hidden, keeping team order', async () => {
      const { db, zeca, bia, ana, xu, li, mo } = await ordered()
      await setSetting(db, 'member_sees_stars', false)
      const first = await getPublicGame(db, created)
      expect(first?.teams).toEqual([
        [ana.id, bia.id, zeca.id],
        [li.id, mo.id, xu.id],
      ])
      expect(await getPublicGame(db, created)).toEqual(first)
    })

    it('orders reserves by name when stars are hidden', async () => {
      const db = createTestDb()
      const ps = []
      for (const [name, rating] of [['Zeca', 5], ['Bia', 4], ['Ana', 3], ['Dan', 2]] as const) {
        ps.push(await createPlayer(db, { name, rating }))
      }
      await createGame(db, '2026-10-19', created)
      for (const p of ps) await setPaid(db, p.id, true)
      await saveDraw(db, {
        teamCount: 2,
        teamSize: 1,
        teams: [[ps[3].id], [ps[2].id]],
        reserves: [ps[0].id, ps[1].id],
        locks: {},
      })
      await setSetting(db, 'member_sees_stars', false)
      const r = await getPublicGame(db, created)
      expect(r?.reserves).toEqual([ps[1].id, ps[0].id])
      expect(r?.teams).toEqual([[ps[3].id], [ps[2].id]])
    })

    it('keeps the stored order when stars are visible', async () => {
      const { db, zeca, bia, ana, xu, li, mo } = await ordered()
      await setSetting(db, 'member_sees_stars', true)
      const r = await getPublicGame(db, created)
      expect(r?.teams).toEqual([
        [zeca.id, bia.id, ana.id],
        [xu.id, mo.id, li.id],
      ])
    })
  })
})

describe('getPublicGame time', () => {
  it('returns the time and still hides ratings when stars are hidden', async () => {
    const db = createTestDb()
    const a = await createPlayer(db, { name: 'Ana', rating: 3.5 })
    await createGame(db, '2026-10-19', created, '20:30')
    await setPaid(db, a.id, true)
    const game = await getPublicGame(db, created)
    expect(game?.time).toBe('20:30')
    expect(game?.showStars).toBe(false)
    expect(game?.players.every((p) => !('rating' in p))).toBe(true)
  })
})

import { describe, expect, it } from 'vitest'
import { createTestDb } from '../helpers/testDb'
import { createGame } from '../../src/server/games'
import { finalizeIfExpired } from '../../src/server/finalize'
import { listHistory } from '../../src/server/history'

describe('listHistory', () => {
  it('vazio sem jogos finalizados', async () => {
    expect(await listHistory(createTestDb())).toEqual([])
  })

  it('lista o mais recente primeiro com snapshot desserializado', async () => {
    const db = createTestDb()
    await createGame(db, '2026-10-19', new Date('2026-10-19T15:00:00Z'))
    await finalizeIfExpired(db, new Date('2026-10-20T15:00:00Z'))
    await createGame(db, '2026-10-25', new Date('2026-10-21T15:00:00Z'))
    await finalizeIfExpired(db, new Date('2026-10-26T15:00:00Z'))
    const list = await listHistory(db)
    expect(list.map((h) => h.gameDate)).toEqual(['2026-10-25', '2026-10-19'])
    expect(list[0]!.finishedAt).toBe('2026-10-26T15:00:00.000Z')
    expect((list[0]!.snapshot as { date: string }).date).toBe('2026-10-25')
    expect(typeof list[0]!.id).toBe('string')
  })
})

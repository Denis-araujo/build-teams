import { describe, expect, it } from 'vitest'
import { createTestDb } from '../helpers/testDb'
import { NotFoundError, ValidationError } from '../../src/server/errors'
import { archivePlayer, createPlayer, listPlayers, updatePlayer } from '../../src/server/players'

describe('players', () => {
  it('creates and lists', async () => {
    const db = createTestDb()
    const p = await createPlayer(db, { name: 'Ana', rating: 3.5 })
    expect(p).toMatchObject({ name: 'Ana', rating: 3.5, archived: false })
    expect(p.id).toBeTruthy()
    expect(await listPlayers(db)).toEqual([p])
  })

  it('lists alphabetically, case-insensitively', async () => {
    const db = createTestDb()
    await createPlayer(db, { name: 'carla', rating: 3 })
    await createPlayer(db, { name: 'Bia', rating: 3 })
    await createPlayer(db, { name: 'ana', rating: 3 })
    expect((await listPlayers(db)).map((p) => p.name)).toEqual(['ana', 'Bia', 'carla'])
  })

  it('sorts accented names with their base letters (pt-BR)', async () => {
    const db = createTestDb()
    for (const name of ['Zeca', 'Álvaro', 'Bia', 'érica', 'André'])
      await createPlayer(db, { name, rating: 3 })
    expect((await listPlayers(db)).map((p) => p.name)).toEqual(['Álvaro', 'André', 'Bia', 'érica', 'Zeca'])
  })

  it.each([0.7, 0, 5.5])('rejects rating %s', async (rating) => {
    const db = createTestDb()
    await expect(createPlayer(db, { name: 'Ana', rating })).rejects.toThrow(ValidationError)
  })

  it('rejects blank and too-long names', async () => {
    const db = createTestDb()
    await expect(createPlayer(db, { name: '   ', rating: 3 })).rejects.toThrow(ValidationError)
    await expect(createPlayer(db, { name: 'a'.repeat(61), rating: 3 })).rejects.toThrow(ValidationError)
  })

  it('trims the name', async () => {
    const db = createTestDb()
    const p = await createPlayer(db, { name: '  Ana  ', rating: 3 })
    expect(p.name).toBe('Ana')
  })

  it('archive hides from default list but keeps with includeArchived', async () => {
    const db = createTestDb()
    const p = await createPlayer(db, { name: 'Ana', rating: 3 })
    await archivePlayer(db, p.id)
    expect(await listPlayers(db)).toEqual([])
    expect(await listPlayers(db, { includeArchived: true })).toEqual([{ ...p, archived: true }])
  })

  it('updates only the fields in the patch and validates them', async () => {
    const db = createTestDb()
    const p = await createPlayer(db, { name: 'Ana', rating: 3 })
    expect(await updatePlayer(db, p.id, { rating: 4.5 })).toEqual({ ...p, rating: 4.5 })
    expect(await updatePlayer(db, p.id, { name: ' Bia ' })).toEqual({ ...p, name: 'Bia', rating: 4.5 })
    await expect(updatePlayer(db, p.id, { rating: 9 })).rejects.toThrow(ValidationError)
    await expect(updatePlayer(db, p.id, { name: '' })).rejects.toThrow(ValidationError)
  })

  it('throws NotFoundError for unknown ids', async () => {
    const db = createTestDb()
    await expect(updatePlayer(db, 'nope', { rating: 3 })).rejects.toThrow(NotFoundError)
    await expect(archivePlayer(db, 'nope')).rejects.toThrow(NotFoundError)
  })
})

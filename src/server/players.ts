import type { Player } from '../shared/types'
import { NotFoundError, ValidationError } from './errors'

type Row = { id: string; name: string; rating: number; archived: number }

const toPlayer = (r: Row): Player => ({
  id: r.id,
  name: r.name,
  rating: r.rating,
  archived: r.archived === 1,
})

function validName(name: unknown): string {
  const n = typeof name === 'string' ? name.trim() : ''
  if (n.length < 1 || n.length > 60) {
    throw new ValidationError('O nome deve ter de 1 a 60 caracteres')
  }
  return n
}

function validRating(rating: unknown): number {
  if (typeof rating !== 'number' || !Number.isFinite(rating) || rating < 0.5 || rating > 5 || (rating * 2) % 1 !== 0) {
    throw new ValidationError('A nota deve ser de 0,5 a 5, em passos de 0,5')
  }
  return rating
}

async function getRow(db: D1Database, id: string): Promise<Row | null> {
  return db
    .prepare('SELECT id, name, rating, archived FROM players WHERE id = ?')
    .bind(id)
    .first<Row>()
}

export async function createPlayer(
  db: D1Database,
  input: { name: string; rating: number },
): Promise<Player> {
  const name = validName(input.name)
  const rating = validRating(input.rating)
  const id = crypto.randomUUID()
  await db
    .prepare('INSERT INTO players (id, name, rating) VALUES (?, ?, ?)')
    .bind(id, name, rating)
    .run()
  return { id, name, rating, archived: false }
}

export async function listPlayers(
  db: D1Database,
  opts: { includeArchived?: boolean } = {},
): Promise<Player[]> {
  const where = opts.includeArchived ? '' : 'WHERE archived = 0'
  const { results } = await db
    .prepare(`SELECT id, name, rating, archived FROM players ${where}`)
    .all<Row>()
  return results
    .map(toPlayer)
    .sort(
      (a, b) =>
        a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }) || a.id.localeCompare(b.id),
    )
}

export async function updatePlayer(
  db: D1Database,
  id: string,
  patch: { name?: string; rating?: number },
): Promise<Player> {
  const name = patch.name !== undefined ? validName(patch.name) : undefined
  const rating = patch.rating !== undefined ? validRating(patch.rating) : undefined
  const row = await getRow(db, id)
  if (!row) throw new NotFoundError()
  const next = { ...row, name: name ?? row.name, rating: rating ?? row.rating }
  await db
    .prepare('UPDATE players SET name = ?, rating = ? WHERE id = ?')
    .bind(next.name, next.rating, id)
    .run()
  return toPlayer(next)
}

export async function archivePlayer(db: D1Database, id: string): Promise<void> {
  const row = await getRow(db, id)
  if (!row) throw new NotFoundError()
  await db.prepare('UPDATE players SET archived = 1 WHERE id = ?').bind(id).run()
}

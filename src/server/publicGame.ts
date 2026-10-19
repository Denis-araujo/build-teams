import type { PublicGame } from '../shared/types'
import { finalizeIfExpired } from './finalize'
import { getActiveGame, getSetting } from './games'
import { listPlayers } from './players'

// Única fonte de dados da página pública (sem login). Monta cada jogador sem a
// chave `rating` quando as estrelas estão ocultas; nada de travas, revisão ou config.
export async function getPublicGame(db: D1Database, now: Date): Promise<PublicGame | null> {
  await finalizeIfExpired(db, now)
  const game = await getActiveGame(db)
  if (!game) return null

  const showStars = await getSetting(db, 'member_sees_stars')
  const teams = game.draw?.teams ?? []
  const reserves = game.draw?.reserves ?? []
  const inDraw = new Set<string>([...teams.flat(), ...reserves])
  const paid = new Set(game.paid)

  const players = (await listPlayers(db, { includeArchived: true }))
    .filter((p) => !p.archived || inDraw.has(p.id))
    .map((p) =>
      showStars
        ? { id: p.id, name: p.name, paid: paid.has(p.id), rating: p.rating }
        : { id: p.id, name: p.name, paid: paid.has(p.id) },
    )

  return { date: game.date, showStars, players, teams, reserves }
}

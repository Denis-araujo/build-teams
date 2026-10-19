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
  const storedTeams = game.draw?.teams ?? []
  const storedReserves = game.draw?.reserves ?? []
  const inDraw = new Set<string>([...storedTeams.flat(), ...storedReserves])
  const paid = new Set(game.paid)

  const players = (await listPlayers(db, { includeArchived: true }))
    .filter((p) => !p.archived || inDraw.has(p.id))
    .map((p) =>
      showStars
        ? { id: p.id, name: p.name, paid: paid.has(p.id), rating: p.rating }
        : { id: p.id, name: p.name, paid: paid.has(p.id) },
    )

  // Com estrelas ocultas, a ordem dos ids (o sorteio ordena por nota) vazaria a força
  // relativa; ordena por nome. A ordem dos times em si não muda.
  const nameOf = new Map(players.map((p) => [p.id, p.name]))
  const byName = (a: string, b: string) =>
    (nameOf.get(a) ?? '').localeCompare(nameOf.get(b) ?? '', 'pt-BR', { sensitivity: 'base' }) ||
    (a < b ? -1 : a > b ? 1 : 0)
  const teams = showStars ? storedTeams : storedTeams.map((t) => [...t].sort(byName))
  const reserves = showStars ? storedReserves : [...storedReserves].sort(byName)

  return { date: game.date, time: game.time, showStars, players, teams, reserves }
}

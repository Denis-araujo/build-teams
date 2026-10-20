import type { DrawState } from '../../shared/types'

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
export const teamLetter = (i: number) => LETTERS[i] ?? String(i + 1)

/** Índice do time onde o jogador está, -1 se está nas reservas, null se não está no sorteio. */
function locate(draw: DrawState, id: string): number | null {
  const t = draw.teams.findIndex((team) => team.includes(id))
  if (t >= 0) return t
  return draw.reserves.includes(id) ? -1 : null
}

/** Tira o jogador dos times, das reservas e das travas (ex.: ao desmarcar a confirmação). */
export function withoutPlayer(draw: DrawState, id: string): DrawState {
  const locks = { ...draw.locks }
  delete locks[id]
  return {
    ...draw,
    teams: draw.teams.map((t) => t.filter((x) => x !== id)),
    reserves: draw.reserves.filter((x) => x !== id),
    locks,
  }
}

/** Mesmo formato, todos fora dos times e das reservas (ex.: ao limpar as confirmações). */
export function emptiedDraw(draw: DrawState): DrawState {
  return { ...draw, teams: draw.teams.map(() => []), reserves: [], locks: {} }
}

export function moveToTeam(draw: DrawState, playerId: string, teamIndex: number): DrawState {
  if (teamIndex < 0 || teamIndex >= draw.teams.length || locate(draw, playerId) === null) return draw
  const locked = draw.locks[playerId] !== undefined
  const next = withoutPlayer(draw, playerId)
  next.teams[teamIndex] = [...next.teams[teamIndex], playerId]
  if (locked) next.locks[playerId] = teamIndex
  return next
}

export function moveToReserves(draw: DrawState, playerId: string): DrawState {
  if (locate(draw, playerId) === null) return draw
  const next = withoutPlayer(draw, playerId)
  next.reserves = [...next.reserves, playerId]
  return next
}

export function swapPlayers(draw: DrawState, aId: string, bId: string): DrawState {
  const la = locate(draw, aId)
  const lb = locate(draw, bId)
  if (la === null || lb === null || aId === bId) return draw
  const swap = (id: string) => (id === aId ? bId : id === bId ? aId : id)
  const locks = { ...draw.locks }
  const wasA = draw.locks[aId] !== undefined
  const wasB = draw.locks[bId] !== undefined
  delete locks[aId]
  delete locks[bId]
  if (wasA && lb >= 0) locks[aId] = lb
  if (wasB && la >= 0) locks[bId] = la
  return { ...draw, teams: draw.teams.map((t) => t.map(swap)), reserves: draw.reserves.map(swap), locks }
}

export function toggleLock(draw: DrawState, playerId: string): DrawState {
  const idx = draw.teams.findIndex((t) => t.includes(playerId))
  if (idx < 0) return draw
  const locks = { ...draw.locks }
  if (locks[playerId] !== undefined) delete locks[playerId]
  else locks[playerId] = idx
  return { ...draw, locks }
}

/** R18: só guarda trava de quem está no time indicado. */
export function sanitizeLocks(draw: DrawState): DrawState {
  const locks = Object.fromEntries(Object.entries(draw.locks).filter(([id, idx]) => draw.teams[idx]?.includes(id)))
  return { ...draw, locks }
}

export function canMoveToTeam(
  draw: DrawState,
  playerId: string,
  teamIndex: number,
): { ok: true } | { ok: false; reason: string } {
  if (locate(draw, playerId) === null) return { ok: false, reason: 'Jogador não está mais no sorteio.' }
  if (draw.teams[teamIndex]?.includes(playerId)) return { ok: true }
  if ((draw.teams[teamIndex]?.length ?? 0) >= draw.teamSize) {
    return {
      ok: false,
      reason: `Time ${teamLetter(teamIndex)} está cheio (${draw.teamSize} jogadores). Troque com alguém ou mova alguém para as reservas.`,
    }
  }
  return { ok: true }
}

import type { DrawState, Player } from '../../shared/types'

export { fmt } from '../../shared/whatsapp'

export type RatingById = ReadonlyMap<string, number>

/** Ids desconhecidos (jogador removido) não entram nas contas, como não entram na tela. */
const known = (team: string[], ratingById: RatingById) => team.filter((id) => ratingById.has(id))

export function teamTotals(teams: string[][], ratingById: RatingById): number[] {
  return teams.map((t) => known(t, ratingById).reduce((sum, id) => sum + (ratingById.get(id) ?? 0), 0))
}

export function teamAverage(team: string[], ratingById: RatingById): number {
  const ids = known(team, ratingById)
  if (!ids.length) return 0
  return ids.reduce((sum, id) => sum + (ratingById.get(id) ?? 0), 0) / ids.length
}

export function sizesEqual(teams: string[][], ratingById: RatingById): boolean {
  const sizes = teams.map((t) => known(t, ratingById).length)
  return sizes.every((n) => n === sizes[0])
}

export function averageSize(teams: string[][], ratingById: RatingById): number {
  if (!teams.length) return 1
  return teams.reduce((n, t) => n + known(t, ratingById).length, 0) / teams.length
}

/** Diferença entre o time mais forte e o mais fraco: pela soma se os tamanhos são iguais, senão pela média. */
export function spreadOf(teams: string[][], ratingById: RatingById): number {
  if (!teams.length) return 0
  const values = sizesEqual(teams, ratingById)
    ? teamTotals(teams, ratingById)
    : teams.map((t) => teamAverage(t, ratingById))
  return Math.max(...values) - Math.min(...values)
}

export type BalanceTag = { label: 'Equilibrado' | 'Quase parelho' | 'Desequilibrado'; tone: 'good' | 'ok' | 'bad' }

export function balanceTag(
  spread: number,
  opts: { allowHalf: boolean; sizesEqual: boolean; avgSize: number },
): BalanceTag {
  const tol = (opts.allowHalf ? 0.5 : 1) / (opts.sizesEqual ? 1 : Math.max(1, opts.avgSize))
  if (spread <= tol) return { label: 'Equilibrado', tone: 'good' }
  if (spread <= tol * 3) return { label: 'Quase parelho', tone: 'ok' }
  return { label: 'Desequilibrado', tone: 'bad' }
}

/** Peso (flex-grow) do segmento do time na barra de equilíbrio; nunca abaixo de 0,1 para o segmento não sumir. */
export function barShare(total: number, average: number, sizesEqual: boolean): number {
  return Math.max(0.1, sizesEqual ? total : average)
}

/** Pagos (listados em `players`) que não estão em nenhum time nem nas reservas. */
export function outsideCount(paid: string[], players: Player[], draw: DrawState): number {
  const listed = new Set(players.map((p) => p.id))
  const placed = new Set([...draw.teams.flat(), ...draw.reserves])
  return new Set(paid.filter((id) => listed.has(id) && !placed.has(id))).size
}

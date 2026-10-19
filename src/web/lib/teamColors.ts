// Paleta TEAM_COLORS do Montar Times v4 ([fundo, texto]); o índice cicla de 8 em 8.
const TEAM_COLORS = [
  ['#24365a', '#f3f5fe'],
  ['#9fb2d4', '#172339'],
  ['#4a6496', '#f3f5fe'],
  ['#c7d4ea', '#172339'],
  ['#172339', '#f3f5fe'],
  ['#7189b8', '#172339'],
  ['#344b78', '#f3f5fe'],
  ['#e1e9f6', '#172339'],
] as const

export { teamLetter } from './drawEdit'

const at = (index: number) => TEAM_COLORS[((index % 8) + 8) % 8]

/** Cor de fundo do time (faixa e selo). */
export const teamColor = (index: number): string => at(index)[0]

/** Cor do texto sobre `teamColor`. */
export const teamInk = (index: number): string => at(index)[1]

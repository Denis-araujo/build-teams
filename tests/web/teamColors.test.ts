import { describe, expect, it } from 'vitest'
import { teamColor, teamInk, teamLetter } from '../../src/web/lib/teamColors'

describe('teamColors', () => {
  it('cicla a paleta de 8 cores', () => {
    expect(teamColor(0)).toBe(teamColor(8))
    expect(teamColor(3)).toBe(teamColor(11))
  })

  it('as 8 cores de 0..7 são distintas', () => {
    const colors = Array.from({ length: 8 }, (_, i) => teamColor(i))
    expect(new Set(colors).size).toBe(8)
  })

  it('usa os valores exatos do protótipo v4', () => {
    expect(teamColor(0)).toBe('#24365a')
    expect(teamInk(0)).toBe('#f3f5fe')
    expect(teamColor(1)).toBe('#9fb2d4')
    expect(teamInk(1)).toBe('#172339')
    expect(teamColor(7)).toBe('#e1e9f6')
    expect(teamInk(7)).toBe('#172339')
  })

  it('letras A..H', () => {
    expect(teamLetter(0)).toBe('A')
    expect(teamLetter(7)).toBe('H')
  })
})

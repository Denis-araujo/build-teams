import { describe, expect, it } from 'vitest'
import { balanceTag, outsideCount, spreadOf, teamAverage, teamTotals } from '../../src/web/lib/drawStats'
import { fmt } from '../../src/shared/whatsapp'
import type { DrawState, Player } from '../../src/shared/types'

const R = new Map([
  ['a', 4], ['b', 3.5], ['c', 2], ['d', 5], ['e', 1.5], ['f', 3],
])

describe('totais e médias', () => {
  it('soma por time e ignora ids desconhecidos', () => {
    expect(teamTotals([['a', 'b'], ['c', 'x', 'd']], R)).toEqual([7.5, 7])
  })
  it('média por jogador; time vazio dá 0', () => {
    expect(teamAverage(['a', 'b'], R)).toBe(3.75)
    expect(teamAverage([], R)).toBe(0)
    expect(teamAverage(['x'], R)).toBe(0)
  })
})

describe('spreadOf', () => {
  it('tamanhos iguais: diferença das somas', () => {
    expect(spreadOf([['a', 'b'], ['c', 'e']], R)).toBe(4)
  })
  it('tamanhos diferentes: diferença das médias', () => {
    // médias: (4+3.5+2)/3 = 3.1666…, d=5 → 1.8333…
    expect(spreadOf([['a', 'b', 'c'], ['d']], R)).toBeCloseTo(5 - 9.5 / 3, 10)
  })
  it('sem times: 0', () => {
    expect(spreadOf([], R)).toBe(0)
  })
})

describe('balanceTag', () => {
  const eq = { allowHalf: true, sizesEqual: true, avgSize: 6 }
  it('limites exatos com tolerância 0,5', () => {
    expect(balanceTag(0.5, eq)).toEqual({ label: 'Equilibrado', tone: 'good' })
    expect(balanceTag(0.51, eq).label).toBe('Quase parelho')
    expect(balanceTag(1.5, eq)).toEqual({ label: 'Quase parelho', tone: 'neutral' })
    expect(balanceTag(1.51, eq)).toEqual({ label: 'Desequilibrado', tone: 'neutral' })
  })
  it('tamanhos diferentes dividem a tolerância pelo tamanho médio', () => {
    const uneq = { allowHalf: true, sizesEqual: false, avgSize: 4 }
    expect(balanceTag(0.125, uneq).label).toBe('Equilibrado')
    expect(balanceTag(0.13, uneq).label).toBe('Quase parelho')
    expect(balanceTag(0.375, uneq).label).toBe('Quase parelho')
    expect(balanceTag(0.4, uneq).label).toBe('Desequilibrado')
  })
  it('allowHalf false usa tolerância 1', () => {
    expect(balanceTag(1, { ...eq, allowHalf: false }).label).toBe('Equilibrado')
  })
  it('avgSize menor que 1 não amplia a tolerância', () => {
    expect(balanceTag(0.5, { allowHalf: true, sizesEqual: false, avgSize: 0.2 }).label).toBe('Equilibrado')
  })
})

describe('outsideCount', () => {
  const players: Player[] = ['a', 'b', 'c', 'd'].map((id) => ({ id, name: id, rating: 3, archived: false }))
  const draw: DrawState = { teamCount: 2, teamSize: 1, teams: [['a'], ['b']], reserves: ['c'], locks: {} }
  it('conta pagos listados fora de times e reservas', () => {
    expect(outsideCount(['a', 'b', 'c', 'd'], players, draw)).toBe(1)
  })
  it('ignora pagos que não estão na lista de jogadores', () => {
    expect(outsideCount(['a', 'zz'], players, draw)).toBe(0)
  })
})

it('fmt usa vírgula e omite zero final', () => {
  expect(fmt(7)).toBe('7')
  expect(fmt(7.5)).toBe('7,5')
})

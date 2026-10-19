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

describe('nota 0,5', () => {
  const H = new Map([['a', 0.5], ['b', 0.5], ['c', 1], ['d', 0.5]])
  it('totais e médias com 0,5 não dão NaN nem 0', () => {
    expect(teamTotals([['a', 'b'], ['c', 'd']], H)).toEqual([1, 1.5])
    expect(teamAverage(['a'], H)).toBe(0.5)
    expect(teamAverage(['a', 'c'], H)).toBe(0.75)
    expect(fmt(teamAverage(['a'], H))).toBe('0,5')
    expect(fmt(teamTotals([['a']], H)[0])).toBe('0,5')
  })
  it('spreadOf em passos de 0,5', () => {
    expect(spreadOf([['a', 'b'], ['c', 'd']], H)).toBe(0.5)
    expect(spreadOf([['a'], ['c', 'd']], H)).toBe(0.25)
  })
  it('balanceTag com spread de 0,5 em tamanhos iguais é Equilibrado', () => {
    const eq = { allowHalf: true, sizesEqual: true, avgSize: 2 }
    expect(balanceTag(spreadOf([['a', 'b'], ['c', 'd']], H), eq).label).toBe('Equilibrado')
    expect(balanceTag(1, eq).label).toBe('Quase parelho')
  })
})

it('fmt(0.5) mostra 0,5', () => {
  expect(fmt(0.5)).toBe('0,5')
})

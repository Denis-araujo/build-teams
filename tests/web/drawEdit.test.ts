import { describe, expect, it } from 'vitest'
import { canMoveToTeam, moveToReserves, moveToTeam, sanitizeLocks, swapPlayers, toggleLock } from '../../src/web/lib/drawEdit'
import type { DrawState } from '../../src/shared/types'

const base = (): DrawState => ({
  teamCount: 2,
  teamSize: 2,
  teams: [['a', 'b'], ['c']],
  reserves: ['d'],
  locks: { a: 0 },
})

describe('moveToTeam', () => {
  it('tira de onde está e acrescenta ao time', () => {
    const r = moveToTeam(base(), 'b', 1)
    expect(r.teams).toEqual([['a'], ['c', 'b']])
  })
  it('traz da reserva', () => {
    const r = moveToTeam(base(), 'd', 1)
    expect(r.teams).toEqual([['a', 'b'], ['c', 'd']])
    expect(r.reserves).toEqual([])
  })
  it('a trava acompanha o jogador', () => {
    expect(moveToTeam(base(), 'a', 1).locks).toEqual({ a: 1 })
  })
  it('não muta a entrada', () => {
    const d = base()
    const snap = JSON.parse(JSON.stringify(d))
    moveToTeam(d, 'a', 1)
    expect(d).toEqual(snap)
  })
})

describe('moveToReserves', () => {
  it('remove a trava e acrescenta às reservas', () => {
    const r = moveToReserves(base(), 'a')
    expect(r.teams).toEqual([['b'], ['c']])
    expect(r.reserves).toEqual(['d', 'a'])
    expect(r.locks).toEqual({})
  })
  it('não muta a entrada', () => {
    const d = base()
    const snap = JSON.parse(JSON.stringify(d))
    moveToReserves(d, 'a')
    expect(d).toEqual(snap)
  })
})

describe('swapPlayers', () => {
  it('troca entre times e as travas seguem cada um', () => {
    const d = { ...base(), locks: { a: 0, c: 1 } }
    const r = swapPlayers(d, 'a', 'c')
    expect(r.teams).toEqual([['c', 'b'], ['a']])
    expect(r.locks).toEqual({ c: 0, a: 1 })
  })
  it('com uma reserva: quem vai para Reservas perde a trava', () => {
    const r = swapPlayers(base(), 'a', 'd')
    expect(r.teams).toEqual([['d', 'b'], ['c']])
    expect(r.reserves).toEqual(['a'])
    expect(r.locks).toEqual({})
  })
  it('reserva travada não existe; quem entra no time mantém só sua trava', () => {
    const r = swapPlayers(base(), 'd', 'c')
    expect(r.teams).toEqual([['a', 'b'], ['d']])
    expect(r.reserves).toEqual(['c'])
  })
  it('não muta a entrada', () => {
    const d = base()
    const snap = JSON.parse(JSON.stringify(d))
    swapPlayers(d, 'a', 'c')
    expect(d).toEqual(snap)
  })
})

describe('toggleLock', () => {
  it('trava no time atual e destrava', () => {
    const r = toggleLock(base(), 'c')
    expect(r.locks).toEqual({ a: 0, c: 1 })
    expect(toggleLock(r, 'c').locks).toEqual({ a: 0 })
  })
  it('reserva não pode ser travada: devolve o mesmo sorteio', () => {
    const d = base()
    expect(toggleLock(d, 'd')).toBe(d)
  })
  it('não muta a entrada', () => {
    const d = base()
    toggleLock(d, 'c')
    expect(d.locks).toEqual({ a: 0 })
  })
})

describe('sanitizeLocks', () => {
  it('mantém só travas de quem está no time indicado', () => {
    const d = { ...base(), locks: { a: 0, b: 1, d: 0, x: 0, c: 5 } }
    expect(sanitizeLocks(d).locks).toEqual({ a: 0 })
    expect(d.locks).toEqual({ a: 0, b: 1, d: 0, x: 0, c: 5 })
  })
})

describe('canMoveToTeam', () => {
  it('time cheio recusa com o motivo', () => {
    const r = canMoveToTeam(base(), 'c', 0)
    expect(r).toEqual({
      ok: false,
      reason: 'Time A está cheio (2 jogadores). Troque com alguém ou mova alguém para as reservas.',
    })
  })
  it('mesmo time é ok mesmo cheio', () => {
    expect(canMoveToTeam(base(), 'a', 0)).toEqual({ ok: true })
  })
  it('time com vaga é ok', () => {
    expect(canMoveToTeam(base(), 'a', 1)).toEqual({ ok: true })
    expect(canMoveToTeam(base(), 'd', 1)).toEqual({ ok: true })
  })
})

describe('ids que não estão no sorteio', () => {
  it('moveToTeam, moveToReserves e swapPlayers devolvem o mesmo sorteio', () => {
    const d = base()
    expect(moveToTeam(d, 'zzz', 1)).toBe(d)
    expect(moveToReserves(d, 'zzz')).toBe(d)
    expect(swapPlayers(d, 'a', 'zzz')).toBe(d)
    expect(swapPlayers(d, 'zzz', 'a')).toBe(d)
    expect(toggleLock(d, 'zzz')).toBe(d)
  })
  it('canMoveToTeam recusa', () => {
    expect(canMoveToTeam(base(), 'zzz', 1)).toEqual({ ok: false, reason: 'Jogador não está mais no sorteio.' })
  })
})

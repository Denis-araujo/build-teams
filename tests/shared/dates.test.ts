import { describe, expect, it } from 'vitest'
import {
  isGameExpired,
  isGameMomentAllowed,
  isValidGameTime,
  todayInBrasilia,
} from '../../src/shared/dates'

describe('todayInBrasilia', () => {
  it('ainda é dia 19 às 23:59:59 em Brasília', () => {
    expect(todayInBrasilia(new Date('2026-10-20T02:59:59Z'))).toBe('2026-10-19')
  })
  it('vira dia 20 à meia-noite em Brasília', () => {
    expect(todayInBrasilia(new Date('2026-10-20T03:00:00Z'))).toBe('2026-10-20')
  })
})

describe('isGameExpired', () => {
  it('não expira até o fim do dia em Brasília', () => {
    expect(isGameExpired('2026-10-19', new Date('2026-10-20T02:59:59Z'))).toBe(false)
  })
  it('expira após a meia-noite em Brasília', () => {
    expect(isGameExpired('2026-10-19', new Date('2026-10-20T03:00:00Z'))).toBe(true)
  })
})

describe('isValidGameTime', () => {
  it.each(['19:00', '00:00', '23:59', '07:05'])('aceita %s', (t) => {
    expect(isValidGameTime(t)).toBe(true)
  })
  it.each(['24:00', '7:5', '', '19:60', '19:00:00', ' 19:00', '19-00'])('rejeita %j', (t) => {
    expect(isValidGameTime(t)).toBe(false)
  })
  it('nunca lança com valores nulos ou não string', () => {
    expect(isValidGameTime(undefined as unknown as string)).toBe(false)
    expect(isValidGameTime(null as unknown as string)).toBe(false)
    expect(isValidGameTime(1900 as unknown as string)).toBe(false)
  })
})

describe('isGameMomentAllowed', () => {
  // 2026-10-19T22:00:00Z = 19:00 em Brasília
  const at1900 = new Date('2026-10-19T22:00:00Z')
  it('aceita o mesmo minuto', () => {
    expect(isGameMomentAllowed('2026-10-19', '19:00', at1900)).toBe(true)
    expect(isGameMomentAllowed('2026-10-19', '19:00', new Date('2026-10-19T22:00:59Z'))).toBe(true)
  })
  it('rejeita um minuto antes', () => {
    expect(isGameMomentAllowed('2026-10-19', '18:59', at1900)).toBe(false)
    expect(isGameMomentAllowed('2026-10-19', '19:00', new Date('2026-10-19T22:01:00Z'))).toBe(false)
  })
  it('aceita o dia seguinte com hora anterior', () => {
    expect(isGameMomentAllowed('2026-10-20', '00:00', at1900)).toBe(true)
  })
  it('rejeita dia passado', () => {
    expect(isGameMomentAllowed('2026-10-18', '23:59', at1900)).toBe(false)
  })
  it('meia-noite de Brasília versus UTC', () => {
    expect(isGameMomentAllowed('2026-10-19', '23:59', new Date('2026-10-20T02:59:00Z'))).toBe(true)
    expect(isGameMomentAllowed('2026-10-19', '23:59', new Date('2026-10-20T03:00:00Z'))).toBe(false)
    expect(isGameMomentAllowed('2026-10-20', '00:00', new Date('2026-10-20T03:00:00Z'))).toBe(true)
    expect(isGameMomentAllowed('2026-10-20', '00:00', new Date('2026-10-20T03:01:00Z'))).toBe(false)
  })
  it('rejeita data ou hora malformadas', () => {
    expect(isGameMomentAllowed('abc', '19:00', at1900)).toBe(false)
    expect(isGameMomentAllowed('19/10/2026', '19:00', at1900)).toBe(false)
    expect(isGameMomentAllowed('2026-13-40', '19:00', at1900)).toBe(false)
    expect(isGameMomentAllowed('2026-10-20', '25:00', at1900)).toBe(false)
  })
})

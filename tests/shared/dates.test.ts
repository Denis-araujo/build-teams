import { describe, expect, it } from 'vitest'
import { isGameDateAllowed, isGameExpired, todayInBrasilia } from '../../src/shared/dates'

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

describe('isGameDateAllowed', () => {
  const now = new Date('2026-10-19T15:00:00Z') // 12:00 em Brasília
  it('aceita hoje', () => {
    expect(isGameDateAllowed('2026-10-19', now)).toBe(true)
  })
  it('rejeita passado', () => {
    expect(isGameDateAllowed('2026-10-18', now)).toBe(false)
  })
  it('rejeita formato inválido', () => {
    expect(isGameDateAllowed('19/10/2026', now)).toBe(false)
  })
  it('rejeita data inexistente', () => {
    expect(isGameDateAllowed('2026-13-40', now)).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'
import { formatDayLabel, formatGameShort, gameDateParts, relativeDay } from '../../src/web/format'

describe('formatDayLabel', () => {
  it('com hora', () => {
    expect(formatDayLabel('2026-10-17', '19:00')).toBe('Sábado, 17 de outubro · 19:00')
    expect(formatDayLabel('2027-01-01', '08:05')).toBe('Sexta-feira, 1 de janeiro · 08:05')
  })

  it('sem hora', () => {
    expect(formatDayLabel('2026-12-31')).toBe('Quinta-feira, 31 de dezembro')
    expect(formatDayLabel('2028-02-29')).toBe('Terça-feira, 29 de fevereiro')
  })
})

describe('formatGameShort', () => {
  it('dia da semana em minúscula, dd/mm e hora', () => {
    expect(formatGameShort('2026-10-17', '19:00')).toBe('sábado, 17/10 às 19:00')
  })
})

describe('gameDateParts', () => {
  it('mês abreviado sem ponto e dia numérico', () => {
    expect(gameDateParts('2026-10-17')).toEqual({ month: 'out', day: 17 })
    expect(gameDateParts('2027-01-05')).toEqual({ month: 'jan', day: 5 })
  })
})

describe('relativeDay', () => {
  // 17/10/2026 12:00 em Brasília (UTC-3)
  const now = new Date('2026-10-17T15:00:00Z')

  it('conta por dia de calendário', () => {
    expect(relativeDay('2026-10-17', now)).toBe('Hoje')
    expect(relativeDay('2026-10-18', now)).toBe('Amanhã')
    expect(relativeDay('2026-10-20', now)).toBe('Em 3 dias')
    expect(relativeDay('2026-10-16', now)).toBe('Já aconteceu')
    expect(relativeDay('2026-11-02', now)).toBe('Em 16 dias')
  })

  it('jogo de hoje continua "Hoje" mesmo depois da hora', () => {
    expect(relativeDay('2026-10-17', new Date('2026-10-18T01:30:00Z'))).toBe('Hoje')
  })

  it('usa o dia de Brasília, não o de UTC', () => {
    // 18/10 01:00 UTC ainda é 17/10 22:00 em Brasília
    expect(relativeDay('2026-10-17', new Date('2026-10-18T01:00:00Z'))).toBe('Hoje')
    // 18/10 03:30 UTC já é 18/10 00:30 em Brasília
    expect(relativeDay('2026-10-17', new Date('2026-10-18T03:30:00Z'))).toBe('Já aconteceu')
    expect(relativeDay('2026-10-18', new Date('2026-10-18T03:30:00Z'))).toBe('Hoje')
  })

  it('a virada do dia é à meia-noite de Brasília (03:00Z)', () => {
    expect(relativeDay('2026-10-19', new Date('2026-10-20T02:59:59Z'))).toBe('Hoje')
    expect(relativeDay('2026-10-19', new Date('2026-10-20T03:00:00Z'))).toBe('Já aconteceu')
  })

  it('atravessa virada de mês e ano', () => {
    expect(relativeDay('2027-01-01', new Date('2026-12-31T15:00:00Z'))).toBe('Amanhã')
  })
})

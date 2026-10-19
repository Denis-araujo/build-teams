import { todayInBrasilia } from '../shared/dates'

// 'YYYY-MM-DD' vira meio-dia UTC para o dia nunca escorregar, em qualquer fuso do navegador.
const noonUtc = (date: string) => new Date(`${date}T12:00:00Z`)

const cap = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`

/** 'Sábado, 17 de outubro' (dia da semana capitalizado). */
function weekdayLong(date: string): string {
  return cap(
    noonUtc(date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }),
  )
}

/** 'Sábado, 17 de outubro · 19:00'; sem hora, 'Sábado, 17 de outubro'. */
export function formatDayLabel(date: string, time?: string): string {
  return time ? `${weekdayLong(date)} · ${time}` : weekdayLong(date)
}

/** Linha de data do cartão: 'Sábado, 17 de outubro' (a hora vai separada, depois do "às"). */
export const formatGameWeekday = weekdayLong

/** 'sábado, 17/10 às 19:00' (texto da confirmação de exclusão). */
export function formatGameShort(date: string, time: string): string {
  const [, m, d] = date.split('-')
  const weekday = noonUtc(date).toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'UTC' })
  return `${weekday}, ${d}/${m} às ${time}`
}

/** Selo de data do cartão: mês abreviado sem ponto ('out') e dia numérico. */
export function gameDateParts(date: string): { month: string; day: number } {
  const month = noonUtc(date)
    .toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' })
    .replace('.', '')
  return { month, day: Number(date.split('-')[2]) }
}

export type RelativeDay = 'Hoje' | 'Amanhã' | 'Já aconteceu' | `Em ${number} dias`

/** Chip do cartão: por dia de calendário de Brasília (a hora é só informativa). */
export function relativeDay(date: string, now: Date): RelativeDay {
  const diff = Math.round((noonUtc(date).getTime() - noonUtc(todayInBrasilia(now)).getTime()) / 864e5)
  if (diff < 0) return 'Já aconteceu'
  if (diff === 0) return 'Hoje'
  if (diff === 1) return 'Amanhã'
  return `Em ${diff} dias`
}

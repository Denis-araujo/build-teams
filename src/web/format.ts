/** 'YYYY-MM-DD' -> 'Sábado, 17/10' (calculado ao meio-dia UTC para não escorregar de dia). */
export function formatGameDate(date: string): string {
  const [, m, d] = date.split('-')
  const weekday = new Date(`${date}T12:00:00Z`).toLocaleDateString('pt-BR', {
    weekday: 'long',
    timeZone: 'UTC',
  })
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${d}/${m}`
}

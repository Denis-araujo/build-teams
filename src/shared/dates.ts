const brasiliaFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function todayInBrasilia(now: Date): string {
  return brasiliaFormat.format(now)
}

export function isGameExpired(gameDate: string, now: Date): boolean {
  return todayInBrasilia(now) > gameDate
}

function isValidCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

export function isGameDateAllowed(gameDate: string, now: Date): boolean {
  return isValidCalendarDate(gameDate) && gameDate >= todayInBrasilia(now)
}

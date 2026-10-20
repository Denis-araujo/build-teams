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

const brasiliaMinuteFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

export function isValidGameTime(time: string): boolean {
  return typeof time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(time)
}

export function isValidCalendarDate(value: string): boolean {
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

// O momento do jogo (data + hora, horário de Brasília) não pode ser anterior ao minuto atual.
// Compara a hora de parede de Brasília (via Intl), sem assumir deslocamento fixo.
export function isGameMomentAllowed(date: string, time: string, now: Date): boolean {
  if (!isValidCalendarDate(date) || !isValidGameTime(time)) return false
  const p = Object.fromEntries(brasiliaMinuteFormat.formatToParts(now).map((x) => [x.type, x.value]))
  const current = `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`
  return `${date}T${time}` >= current
}

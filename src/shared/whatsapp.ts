interface WhatsAppPlayer {
  name: string;
  rating: number;
}

export interface WhatsAppTextInput {
  date: string; // YYYY-MM-DD
  teams: WhatsAppPlayer[][];
  reserves: WhatsAppPlayer[];
  includeStars: boolean;
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function fmt(n: number): string {
  const r = Math.round(n * 10) / 10;
  return r.toFixed(Number.isInteger(r) ? 0 : 1).replace('.', ',');
}

function dayLabel(date: string): string {
  const [, m, d] = date.split('-');
  const weekday = new Date(`${date}T12:00:00Z`).toLocaleDateString('pt-BR', {
    weekday: 'long',
    timeZone: 'UTC',
  });
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${d}/${m}`;
}

export function buildWhatsAppText(input: WhatsAppTextInput): string {
  const total = input.teams.reduce((n, t) => n + t.length, 0);
  const lines = [
    '🏐 *Escalação · Vôlei*',
    `${dayLabel(input.date)} · ${total} ${total === 1 ? 'jogador' : 'jogadores'}`,
    '',
  ];
  input.teams.forEach((team, ti) => {
    lines.push(`*Time ${LETTERS[ti] ?? ti + 1}*`);
    team.forEach((p, i) =>
      lines.push(`${i + 1}. ${p.name}${input.includeStars ? ` ★${fmt(p.rating)}` : ''}`),
    );
    lines.push('');
  });
  if (input.reserves.length) {
    lines.push(`Reservas: ${input.reserves.map((p) => p.name).join(', ')}`);
  }
  return lines.join('\n').trim();
}

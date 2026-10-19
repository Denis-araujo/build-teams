import { describe, it, expect } from 'vitest';
import { buildWhatsAppText } from '../../src/shared/whatsapp';

const base = {
  date: '2026-10-17',
  teams: [
    [{ name: 'Rafael', rating: 4.5 }, { name: 'Bruno', rating: 3 }],
    [{ name: 'Thiago', rating: 4.5 }, { name: 'Lucas', rating: 3 }],
  ],
  reserves: [{ name: 'Diego', rating: 2 }],
  includeStars: false,
};

describe('buildWhatsAppText', () => {
  it('gera o texto exato sem estrelas', () => {
    expect(buildWhatsAppText(base)).toBe(
      [
        '🏐 *Escalação · Vôlei*',
        'Sábado, 17/10 · 4 jogadores',
        '',
        '*Time A*',
        '1. Rafael',
        '2. Bruno',
        '',
        '*Time B*',
        '1. Thiago',
        '2. Lucas',
        '',
        'Reservas: Diego',
      ].join('\n'),
    );
  });

  it('inclui estrelas com vírgula decimal e sem zero à direita', () => {
    const text = buildWhatsAppText({ ...base, includeStars: true });
    expect(text).toContain('1. Rafael ★4,5');
    expect(text).toContain('2. Bruno ★3\n');
  });

  it('omite Reservas quando não há reservas', () => {
    const text = buildWhatsAppText({ ...base, reserves: [] });
    expect(text).not.toContain('Reservas:');
    expect(text.endsWith('2. Lucas')).toBe(true);
  });
});

describe('buildWhatsAppText com hora', () => {
  const input = {
    date: '2026-10-17',
    teams: [[{ name: 'Rafael', rating: 4.5 }]],
    reserves: [],
    includeStars: false,
  };
  it('termina a linha do dia em " às HH:MM"', () => {
    expect(buildWhatsAppText({ ...input, time: '19:00' }).split('\n')[1]).toBe(
      'Sábado, 17/10 às 19:00 · 1 jogador',
    );
  });
  it('sem hora mantém a linha como antes', () => {
    expect(buildWhatsAppText(input).split('\n')[1]).toBe('Sábado, 17/10 · 1 jogador');
  });
});

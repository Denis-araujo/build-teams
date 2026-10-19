import { describe, it, expect } from 'vitest';
import { drawTeams, type DrawInput } from '../../src/shared/draw';

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const mk = (ratings: number[]) => ratings.map((rating, i) => ({ id: `p${i}`, rating }));
const base = (over: Partial<DrawInput>): DrawInput => ({
  players: mk([5, 4, 3, 2, 1, 3, 4, 2]),
  teamCount: 2,
  teamSize: 4,
  locks: {},
  previousReserves: [],
  ...over,
});
const sum = (ids: string[], players: { id: string; rating: number }[]) =>
  ids.reduce((a, id) => a + players.find((p) => p.id === id)!.rating, 0);
const avg = (ids: string[], players: { id: string; rating: number }[]) =>
  ids.length ? sum(ids, players) / ids.length : 0;

describe('drawTeams', () => {
  it('todos os jogadores aparecem exatamente uma vez entre times e reservas', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const input = base({ players: mk([5, 4, 3, 2, 1, 3, 4, 2, 3, 3, 2]), locks: { p0: 1 } });
      const r = drawTeams(input, mulberry32(seed));
      expect(r.teams).toHaveLength(2);
      const all = [...r.teams.flat(), ...r.reserves].sort();
      expect(all).toEqual(input.players.map((p) => p.id).sort());
    }
  });

  it('nenhum time passa de teamSize e reservas = jogadores − teamCount × teamSize', () => {
    const input = base({ players: mk([5, 4, 3, 2, 1, 3, 4, 2, 3, 3, 2]) });
    const r = drawTeams(input, mulberry32(7));
    r.teams.forEach((t) => expect(t.length).toBeLessThanOrEqual(4));
    expect(r.reserves).toHaveLength(11 - 8);
  });

  it('quem ficou de fora antes tem prioridade para jogar', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const input = base({ players: mk([3, 3, 3, 3, 3, 3, 3, 3, 3, 3]), previousReserves: ['p8', 'p9'] });
      const r = drawTeams(input, mulberry32(seed));
      const playing = r.teams.flat();
      expect(playing).toContain('p8');
      expect(playing).toContain('p9');
      expect(r.reserves).toHaveLength(2);
    }
  });

  it('jogador travado fica no time escolhido', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const r = drawTeams(base({ locks: { p0: 1, p1: 1 } }), mulberry32(seed));
      expect(r.teams[1]).toContain('p0');
      expect(r.teams[1]).toContain('p1');
    }
  });

  it('trava para time acima de teamCount é ignorada', () => {
    const input = base({ locks: { p0: 5 } });
    const r = drawTeams(input, mulberry32(3));
    expect(r.teams).toHaveLength(2);
    const all = [...r.teams.flat(), ...r.reserves].sort();
    expect(all).toEqual(input.players.map((p) => p.id).sort());
  });

  it('trava em time já cheio não é honrada', () => {
    const r = drawTeams(base({ locks: { p0: 0, p1: 0, p2: 0, p3: 0, p4: 0 } }), mulberry32(3));
    expect(r.teams[0]).toHaveLength(4);
    expect(r.teams[0]).toEqual(expect.arrayContaining(['p0', 'p1', 'p2', 'p3']));
    expect(r.teams[1]).toContain('p4');
  });

  it('equilíbrio: diferença de soma entre os times <= 0.5', () => {
    const players = mk([5, 4.5, 4, 4, 3.5, 3.5, 3, 3, 2.5, 2, 1.5, 1]);
    for (let seed = 1; seed <= 20; seed++) {
      const r = drawTeams(
        { players, teamCount: 2, teamSize: 6, locks: {}, previousReserves: [] },
        mulberry32(seed),
      );
      expect(Math.abs(sum(r.teams[0], players) - sum(r.teams[1], players))).toBeLessThanOrEqual(0.5);
    }
  });

  it('tamanhos desiguais comparam média: diferença de média <= 1', () => {
    const players = mk([5, 4, 3, 3, 2, 2, 1]);
    for (let seed = 1; seed <= 20; seed++) {
      const r = drawTeams(
        { players, teamCount: 2, teamSize: 4, locks: {}, previousReserves: [] },
        mulberry32(seed),
      );
      expect(r.teams.flat()).toHaveLength(7);
      expect(Math.abs(avg(r.teams[0], players) - avg(r.teams[1], players))).toBeLessThanOrEqual(1);
    }
  });

  it('modo aleatório não usa nota', () => {
    const a = mk([5, 4, 3, 2, 1, 3, 4, 2, 3, 1]);
    const b = mk([1, 1, 5, 5, 2, 4, 1, 3, 5, 2]);
    const mode = 'aleatório' as const;
    const ra = drawTeams(base({ players: a, mode }), mulberry32(11));
    const rb = drawTeams(base({ players: b, mode }), mulberry32(11));
    expect(ra).toEqual(rb);
  });
});

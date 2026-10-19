import { describe, it, expect } from 'vitest';
import { validateDrawState } from '../../src/shared/drawValidation';
import type { DrawState } from '../../src/shared/types';

const paid = new Set(['a', 'b', 'c', 'd', 'e', 'f']);

function base(over: Partial<DrawState> = {}): DrawState {
  return {
    teamCount: 2,
    teamSize: 2,
    teams: [['a', 'b'], ['c', 'd']],
    reserves: ['e'],
    locks: {},
    ...over,
  };
}

describe('validateDrawState', () => {
  it('estado válido retorna null', () => {
    expect(validateDrawState(base(), paid)).toBeNull();
  });

  it.each([1, 9])('teamCount %i é inválido', (teamCount) => {
    expect(validateDrawState(base({ teamCount }), paid)).toEqual(expect.any(String));
  });

  it.each([0, 13])('teamSize %i é inválido', (teamSize) => {
    expect(validateDrawState(base({ teamSize }), paid)).toEqual(expect.any(String));
  });

  it('teams.length diferente de teamCount', () => {
    expect(validateDrawState(base({ teams: [['a', 'b']] }), paid)).toEqual(expect.any(String));
  });

  it('jogador sem pagamento em time', () => {
    expect(validateDrawState(base({ teams: [['a', 'zz'], ['c', 'd']] }), paid)).toEqual(expect.any(String));
  });

  it('jogador sem pagamento em reserva', () => {
    expect(validateDrawState(base({ reserves: ['zz'] }), paid)).toEqual(expect.any(String));
  });

  it('mesmo id em dois times', () => {
    expect(validateDrawState(base({ teams: [['a', 'b'], ['a', 'd']] }), paid)).toEqual(expect.any(String));
  });

  it('mesmo id em time e reserva', () => {
    expect(validateDrawState(base({ reserves: ['a'] }), paid)).toEqual(expect.any(String));
  });

  it('time com mais de teamSize jogadores', () => {
    expect(validateDrawState(base({ teams: [['a', 'b', 'e'], ['c', 'd']] }), paid)).toEqual(expect.any(String));
  });

  it('lock apontando para índice >= teamCount', () => {
    expect(validateDrawState(base({ locks: { a: 2 } }), paid)).toEqual(expect.any(String));
  });

  it('lock com índice negativo ou não inteiro', () => {
    expect(validateDrawState(base({ locks: { a: -1 } }), paid)).toEqual(expect.any(String));
    expect(validateDrawState(base({ locks: { a: 0.5 } }), paid)).toEqual(expect.any(String));
  });

  it('não lança com times vazios', () => {
    expect(validateDrawState(base({ teams: [[], []], reserves: [] }), paid)).toBeNull();
  });
});

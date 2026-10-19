import type { DrawState } from './types';

export function validateDrawState(state: DrawState, paidIds: ReadonlySet<string>): string | null {
  const { teamCount, teamSize, teams, reserves, locks } = state;

  if (!Number.isInteger(teamCount) || teamCount < 2 || teamCount > 8) {
    return 'Quantidade de times deve estar entre 2 e 8.';
  }
  if (!Number.isInteger(teamSize) || teamSize < 1 || teamSize > 12) {
    return 'Jogadores por time deve estar entre 1 e 12.';
  }
  if (teams.length !== teamCount) {
    return 'Número de times diferente da quantidade configurada.';
  }

  const seen = new Set<string>();
  const check = (id: string): string | null => {
    if (!paidIds.has(id)) return 'Jogador sem pagamento confirmado no sorteio.';
    if (seen.has(id)) return 'Jogador repetido no sorteio.';
    seen.add(id);
    return null;
  };

  for (const team of teams) {
    if (team.length > teamSize) return 'Time com mais jogadores que o permitido.';
    for (const id of team) {
      const err = check(id);
      if (err) return err;
    }
  }
  for (const id of reserves) {
    const err = check(id);
    if (err) return err;
  }

  // Locks referenciando ids desconhecidos não são erro: só o índice do time é validado.
  for (const idx of Object.values(locks)) {
    if (!Number.isInteger(idx) || idx < 0 || idx >= teamCount) {
      return 'Fixação aponta para um time inexistente.';
    }
  }

  return null;
}

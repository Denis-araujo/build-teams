export type DrawInput = {
  players: { id: string; rating: number }[];
  teamCount: number;
  teamSize: number;
  locks: Record<string, number>;
  previousReserves: string[];
  mode?: 'equilibrado' | 'aleatório';
};

type P = { id: string; rating: number };

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function drawTeams(
  input: DrawInput,
  rng: () => number = Math.random,
): { teams: string[][]; reserves: string[] } {
  const { players, teamCount: k, teamSize: size, locks, previousReserves } = input;
  const mode = input.mode ?? 'equilibrado';
  const teams: string[][] = Array.from({ length: k }, () => []);
  const byId: Record<string, P> = {};
  players.forEach((p) => (byId[p.id] = p));
  const sumOf = (ids: string[]) => ids.reduce((a, id) => a + (byId[id]?.rating || 0), 0);

  const pinned = new Set<string>();
  players.forEach((p) => {
    const ti = locks[p.id];
    if (ti !== undefined && Number.isInteger(ti) && ti >= 0 && ti < k && teams[ti].length < size) {
      teams[ti].push(p.id);
      pinned.add(p.id);
    }
  });

  let rest = players.filter((p) => !pinned.has(p.id));
  const slots = Math.max(0, size * k - pinned.size);
  let reserves: string[] = [];
  if (rest.length > slots) {
    const prev = new Set(previousReserves);
    const ordered = shuffle(rest, rng).sort(
      (a, b) => (prev.has(b.id) ? 1 : 0) - (prev.has(a.id) ? 1 : 0),
    );
    reserves = ordered.slice(slots).map((p) => p.id);
    rest = ordered.slice(0, slots);
  }

  if (mode === 'aleatório') {
    shuffle(rest, rng).forEach((p) => {
      let best = -1;
      for (let i = 0; i < k; i++) {
        if (teams[i].length < size && (best < 0 || teams[i].length < teams[best].length)) best = i;
      }
      teams[best].push(p.id);
    });
    return { teams, reserves };
  }

  const tot = teams.map(sumOf);
  const sorted = shuffle(rest, rng).sort((a, b) => b.rating - a.rating);
  sorted.forEach((p) => {
    let best = -1;
    for (let i = 0; i < k; i++) {
      if (teams[i].length >= size) continue;
      if (
        best < 0 ||
        teams[i].length < teams[best].length ||
        (teams[i].length === teams[best].length &&
          (tot[i] < tot[best] || (tot[i] === tot[best] && rng() < 0.5)))
      ) {
        best = i;
      }
    }
    teams[best].push(p.id);
    tot[best] += p.rating;
  });

  // com tamanhos desiguais compara a média, não a soma
  const spread = () => {
    const t = teams.map((x) => (x.length ? sumOf(x) / x.length : 0));
    return k ? Math.max(...t) - Math.min(...t) : 0;
  };
  for (let iter = 0; iter < 60; iter++) {
    const cur = spread();
    let bestSwap: [number, number, number, number] | null = null;
    let bestVal = cur;
    if (cur < 0.01) break;
    for (let a = 0; a < k; a++)
      for (let b = a + 1; b < k; b++)
        for (let i = 0; i < teams[a].length; i++)
          for (let j = 0; j < teams[b].length; j++) {
            const x = teams[a][i];
            const y = teams[b][j];
            if (pinned.has(x) || pinned.has(y) || byId[x].rating === byId[y].rating) continue;
            teams[a][i] = y;
            teams[b][j] = x;
            const v = spread();
            teams[a][i] = x;
            teams[b][j] = y;
            if (v < bestVal - 1e-9) {
              bestVal = v;
              bestSwap = [a, i, b, j];
            }
          }
    if (!bestSwap) break;
    const [a, i, b, j] = bestSwap;
    [teams[a][i], teams[b][j]] = [teams[b][j], teams[a][i]];
  }
  return {
    teams: teams.map((t) => t.sort((x, y) => byId[y].rating - byId[x].rating)),
    reserves,
  };
}

export type Player = { id: string; name: string; rating: number; archived: boolean };

export type DrawState = {
  teamCount: number;
  teamSize: number;
  teams: string[][];
  reserves: string[];
  locks: Record<string, number>;
};

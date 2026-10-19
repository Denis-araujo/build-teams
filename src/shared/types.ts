export type Player = { id: string; name: string; rating: number; archived: boolean };

export type DrawState = {
  teamCount: number;
  teamSize: number;
  teams: string[][];
  reserves: string[];
  locks: Record<string, number>;
};

export type PublicGame = {
  date: string;
  time: string;
  showStars: boolean;
  players: { id: string; name: string; paid: boolean; rating?: number }[];
  teams: string[][];
  reserves: string[];
};

export type Game = { id: string; date: string; time: string; paid: string[]; draw: DrawState | null };

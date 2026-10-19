CREATE TABLE players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  rating INTEGER NOT NULL,
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE games (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  state TEXT NOT NULL,
  team_count INTEGER NOT NULL,
  team_size INTEGER NOT NULL,
  draw_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX one_active_game ON games(state) WHERE state = 'active';

CREATE TABLE game_paid (
  game_id TEXT NOT NULL REFERENCES games(id),
  player_id TEXT NOT NULL REFERENCES players(id),
  PRIMARY KEY (game_id, player_id)
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE history (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL UNIQUE REFERENCES games(id),
  game_date TEXT NOT NULL,
  finished_at TEXT NOT NULL,
  snapshot_json TEXT NOT NULL
);

CREATE TABLE login_attempts (
  ip TEXT NOT NULL,
  at INTEGER NOT NULL
);

CREATE INDEX login_attempts_ip_at ON login_attempts(ip, at);

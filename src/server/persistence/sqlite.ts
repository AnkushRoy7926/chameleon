import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = process.env.SQLITE_DB_PATH || "./data/chameleon.db";

const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS match_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_code TEXT NOT NULL,
    game_id TEXT NOT NULL,
    winner TEXT NOT NULL,
    player_count INTEGER NOT NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT NOT NULL,
    duration_seconds REAL NOT NULL,
    final_state TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS match_players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id INTEGER NOT NULL REFERENCES match_results(id),
    player_id TEXT NOT NULL,
    player_name TEXT NOT NULL,
    result TEXT NOT NULL,
    UNIQUE(match_id, player_id)
  );

  CREATE INDEX IF NOT EXISTS idx_match_results_room ON match_results(room_code);
  CREATE INDEX IF NOT EXISTS idx_match_results_game ON match_results(game_id);
  CREATE INDEX IF NOT EXISTS idx_match_players_match ON match_players(match_id);
  CREATE INDEX IF NOT EXISTS idx_match_players_player ON match_players(player_id);
`);

export interface MatchResult {
  id: number;
  roomCode: string;
  gameId: string;
  winner: string;
  playerCount: number;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  finalState: string;
}

export interface MatchPlayer {
  id: number;
  matchId: number;
  playerId: string;
  playerName: string;
  result: string;
}

export function saveMatchResult(
  roomCode: string,
  gameId: string,
  winner: string,
  playerCount: number,
  startedAt: Date,
  endedAt: Date,
  finalState: unknown,
  players: Array<{ id: string; name: string; result: string }>
): number {
  const durationSeconds = (endedAt.getTime() - startedAt.getTime()) / 1000;

  const insertMatch = db.prepare(`
    INSERT INTO match_results (room_code, game_id, winner, player_count, started_at, ended_at, duration_seconds, final_state)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertPlayer = db.prepare(`
    INSERT INTO match_players (match_id, player_id, player_name, result)
    VALUES (?, ?, ?, ?)
  `);

  const transaction = db.transaction(() => {
    const result = insertMatch.run(
      roomCode,
      gameId,
      winner,
      playerCount,
      startedAt.toISOString(),
      endedAt.toISOString(),
      durationSeconds,
      JSON.stringify(finalState)
    );

    const matchId = result.lastInsertRowid as number;

    for (const player of players) {
      insertPlayer.run(matchId, player.id, player.name, player.result);
    }

    return matchId;
  });

  return transaction();
}

export function getMatchHistory(
  limit: number = 50
): MatchResult[] {
  return db
    .prepare(
      "SELECT * FROM match_results ORDER BY ended_at DESC LIMIT ?"
    )
    .all(limit) as MatchResult[];
}

export function getMatchPlayers(matchId: number): MatchPlayer[] {
  return db
    .prepare("SELECT * FROM match_players WHERE match_id = ?")
    .all(matchId) as MatchPlayer[];
}

export function closeDb(): void {
  db.close();
}

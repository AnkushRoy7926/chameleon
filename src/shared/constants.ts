export const ROOM_CODE_LENGTH = 5;
export const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const DISCONNECT_GRACE_MS = 30_000;
export const MAX_RECONNECTION_ATTEMPTS = 10;
export const RECONNECTION_DELAY_MS = 1000;
export const RECONNECTION_DELAY_MAX_MS = 5000;
export const SESSION_TTL_SECONDS = 1800;
export const ROOM_TTL_SECONDS = 3600;

export const REDIS_HOST = process.env.REDIS_HOST || "localhost";
export const REDIS_PORT = parseInt(process.env.REDIS_PORT || "6379");

export const CHAMELEON_PLAYER_NAMES = [
  "Primordial Origin Immortal Venerable",
  "Star Constellation Immortal Venerable",
  "Limitless Demon Venerable",
  "Red Lotus Demon Venerable",
  "Genesis Lotus Immortal Venerable",
  "Reckless Savage Demon Venerable",
  "Thieving Heaven Demon Venerable",
  "Spectral Soul Demon Venerable",
  "Giant Sun Immortal Venerable",
  "Paradise Earth Immortal Venerable",
  "Heaven Refining Demon Venerable",
  "Great Love Immortal Venerable",
] as const;

export const GAME_IDS = {
  CHAMELEON: "chameleon",
} as const;

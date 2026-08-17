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

export type ChameleonPlayerName = (typeof CHAMELEON_PLAYER_NAMES)[number];

export function getRandomPlayerNames(count: number): ChameleonPlayerName[] {
  const shuffled = [...CHAMELEON_PLAYER_NAMES].sort(
    () => Math.random() - 0.5
  );
  return shuffled.slice(0, count);
}

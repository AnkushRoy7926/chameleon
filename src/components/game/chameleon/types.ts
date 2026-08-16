export interface JournalPlayer {
  id: string;
  name: string;
  isHost: boolean;
  isConnected: boolean;
}

export interface JournalClue {
  playerId: string;
  clue: string;
  order: number;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  content: string;
  timestamp: number;
  system?: boolean;
}

export type DeductionState = "UNKNOWN" | "POSSIBLE" | "ELIMINATED";

export interface GameState {
  phase: string;
  players: JournalPlayer[];
  round: number;
  clueRound: number;
  isChameleon: boolean;
  isHost: boolean;
  alive: boolean;
  knownAnswer?: string | false;
  category?: string;
  allClues?: JournalClue[];
  myClues?: JournalClue[];
  votes?: Record<string, string>;
  ejectedPlayerId?: string;
  ejectedWasChameleon?: boolean;
  chameleonId?: string;
  winner?: string;
  message?: string;
  possibleAnswers?: string[];
  chameleonGuess?: string;
  hasVoted?: boolean;
  wasDraw?: boolean;
  canGuess?: boolean;
  isFirstVotingRound?: boolean;
  hasClued?: boolean;
  votedFor?: string;
  currentCluePlayerId?: string;
  playerDeductions?: Record<string, DeductionState>;
  deductionsOwner?: "me" | "chameleon";
}

export type JournalPage = "clues" | "wordpool" | "chat" | "rules";
export type SpreadIndex = 0 | 1 | 2;

export function getPlayerName(
  players: JournalPlayer[],
  playerId: string
): string {
  if (playerId === "me") return "You";
  return players.find((p) => p.id === playerId)?.name || "Unknown";
}

export function getPlayerInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

export function isMyClueTurn(gameState: GameState): boolean {
  const phase = gameState.phase;
  if (phase !== "CLUE_PHASE_1" && phase !== "CLUE_PHASE_2") return false;
  if (gameState.hasClued) return false;
  return gameState.currentCluePlayerId === "me";
}

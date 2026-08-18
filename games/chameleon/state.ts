import type { Player } from "@shared/types";

export const SKIP_VOTE = "skip";

export type DeductionState = "UNKNOWN" | "POSSIBLE" | "ELIMINATED";

export type ChameleonPhase =
  | "LOBBY"
  | "ROUND_START"
  | "CATEGORY_REVEAL"
  | "CLUE_PHASE_1"
  | "CLUE_PHASE_2"
  | "DISCUSSION"
  | "VOTING"
  | "VOTE_RESULT"
  | "CHAMELEON_GUESS"
  | "GAME_RESULT";

export interface Clue {
  playerId: string;
  clue: string;
}

export interface ChameleonGameState {
  phase: ChameleonPhase;
  players: Player[];
  round: number;
  clueRound: number;
  isFirstVotingRound: boolean;
  roundStartClueCount: number;
  chameleonId: string;
  category: string;
  answer: string;
  clues: Clue[];
  votes: Record<string, string>;
  ejectedPlayerId?: string;
  chameleonGuess?: string;
  winner?: "CHAMELEON" | "PLAYERS";
  playerDeductions: Record<string, Record<string, DeductionState>>;
  phaseStartedAt: number;
  phaseEndsAt?: number;
}

export function createInitialChameleonState(
  players: Player[],
  _settings: Record<string, unknown>
): ChameleonGameState {
  return {
    phase: "LOBBY",
    players,
    round: 1,
    clueRound: 1,
    isFirstVotingRound: true,
    roundStartClueCount: 0,
    chameleonId: "",
    category: "",
    answer: "",
    clues: [],
    votes: {},
    ejectedPlayerId: undefined,
    chameleonGuess: undefined,
    winner: undefined,
    playerDeductions: {},
    phaseStartedAt: Date.now(),
    phaseEndsAt: undefined,
  };
}

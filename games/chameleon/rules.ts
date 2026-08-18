import type { ChameleonGameState, ChameleonPhase } from "./state";
import { SKIP_VOTE } from "./state";

type PartialChameleonState = Partial<ChameleonGameState> & {
  phase: ChameleonPhase;
  players: ChameleonGameState["players"];
  votes: ChameleonGameState["votes"];
  chameleonId: string;
};

export function getPhaseEndCondition(state: ChameleonGameState): boolean {
  const roundClues = state.clues.length - state.roundStartClueCount;

  switch (state.phase) {
    case "LOBBY":
      return false;
    case "ROUND_START":
      return true;
    case "CATEGORY_REVEAL":
      return true;
    case "CLUE_PHASE_1":
      return roundClues >= state.players.length;
    case "CLUE_PHASE_2":
      return roundClues >= state.players.length * 2;
    case "DISCUSSION":
      return true;
    case "VOTING":
      return Object.keys(state.votes).length >= getAlivePlayers(state).length;
    case "VOTE_RESULT":
      return true;
    case "CHAMELEON_GUESS":
      return state.chameleonGuess !== undefined;
    case "GAME_RESULT":
      return false;
    default:
      return false;
  }
}

export function getNextPhase(
  state: PartialChameleonState
): ChameleonPhase | undefined {
  switch (state.phase) {
    case "LOBBY":
      return "ROUND_START";
    case "ROUND_START":
      return "CATEGORY_REVEAL";
    case "CATEGORY_REVEAL":
      return "CLUE_PHASE_1";
    case "CLUE_PHASE_1":
      if (state.isFirstVotingRound) {
        return "CLUE_PHASE_2";
      }
      return "VOTING";
    case "CLUE_PHASE_2":
      return "VOTING";
    case "DISCUSSION":
      return "VOTING";
    case "VOTING":
      return "VOTE_RESULT";
    case "VOTE_RESULT":
      if (state.ejectedPlayerId) {
        return state.ejectedPlayerId === state.chameleonId
          ? "CHAMELEON_GUESS"
          : "GAME_RESULT";
      }
      return "CLUE_PHASE_1";
    case "CHAMELEON_GUESS":
      return "GAME_RESULT";
    case "GAME_RESULT":
      return undefined;
    default:
      return undefined;
  }
}

export function checkMajorityVote(
  state: PartialChameleonState
): string | null {
  const voteCounts: Record<string, number> = {};

  for (const targetId of Object.values(state.votes)) {
    if (targetId === SKIP_VOTE) {
      continue;
    }
    voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
  }

  const majorityThreshold = Math.floor(state.players.length / 2) + 1;
  let maxVotes = 0;
  let winner: string | null = null;
  let isDraw = false;

  for (const [playerId, count] of Object.entries(voteCounts)) {
    if (count > maxVotes) {
      maxVotes = count;
      winner = playerId;
      isDraw = false;
    } else if (count === maxVotes) {
      isDraw = true;
    }
  }

  if (isDraw || maxVotes < majorityThreshold) {
    return null;
  }

  return winner;
}

export function isPlayerAlive(
  state: { ejectedPlayerId?: string },
  playerId: string
): boolean {
  return state.ejectedPlayerId !== playerId;
}

export function getAlivePlayers(state: ChameleonGameState): string[] {
  return state.players
    .filter((p) => p.id !== state.ejectedPlayerId)
    .map((p) => p.id);
}

import type { GameDefinition } from "@shared/types";
import type { ChameleonGameState } from "./state";
import { createInitialChameleonState } from "./state";
import { handleChameleonAction, type ChameleonAction } from "./actions";
import { getPlayerView } from "./player-view";
import {
  getPhaseEndCondition,
  getNextPhase,
  checkMajorityVote,
} from "./rules";

export const chameleonGame: GameDefinition<ChameleonGameState> = {
  id: "chameleon",
  name: "The Chameleon",
  description:
    "One player is the secret Chameleon. Give clues, vote, and catch the Chameleon before they guess the answer!",
  minPlayers: 3,
  maxPlayers: 12,

  createInitialState: createInitialChameleonState,

  handleAction: (state, action, playerId) => {
    return handleChameleonAction(
      state,
      action as ChameleonAction,
      playerId
    );
  },

  getAvailableActions: (state, playerId) => {
    const actions: ChameleonAction[] = [];

    if (state.phase === "LOBBY") {
      actions.push({ type: "START_GAME", payload: {} });
    }

    if (
      (state.phase === "CLUE_PHASE_1" || state.phase === "CLUE_PHASE_2") &&
      state.clues.filter((c) => c.playerId === playerId).length <
        (state.phase === "CLUE_PHASE_1" ? 1 : 2)
    ) {
      actions.push({ type: "SUBMIT_CLUE", payload: { clue: "" } });
    }

    if (state.phase === "VOTING" && !state.votes[playerId]) {
      for (const player of state.players) {
        if (player.id !== playerId && player.id !== state.ejectedPlayerId) {
          actions.push({
            type: "CAST_VOTE",
            payload: { targetId: player.id },
          });
        }
      }
    }

    if (state.phase === "CHAMELEON_GUESS" && state.chameleonId === playerId) {
      actions.push({ type: "GUESS_ANSWER", payload: { answer: "" } });
    }

    if (
      ["CLUE_PHASE_1", "CLUE_PHASE_2", "DISCUSSION", "VOTING", "CHAMELEON_GUESS"].includes(
        state.phase
      )
    ) {
      actions.push({ type: "UPDATE_DEDUCTION", payload: { wordId: "", state: "UNKNOWN" } });
    }

    return actions;
  },

  getPlayerView,

  getGamePhase: (state) => state.phase,

  checkWinCondition: (state) => {
    if (state.winner) {
      return state.winner;
    }
    return null;
  },

  getPhaseEndCondition,
};

export function advancePhase(state: ChameleonGameState): ChameleonGameState {
  const nextPhase = getNextPhase(state);
  if (!nextPhase) {
    return state;
  }

  let newState = {
    ...state,
    phase: nextPhase,
    phaseStartedAt: Date.now(),
  };

  if (nextPhase === "CLUE_PHASE_1" && state.phase === "VOTE_RESULT") {
    newState = {
      ...newState,
      votes: {},
      isFirstVotingRound: false,
      round: state.round + 1,
      clueRound: 1,
      roundStartClueCount: state.clues.length,
      playerDeductions: {},
    };
  }

  if (nextPhase === "CLUE_PHASE_2") {
    newState = {
      ...newState,
      clueRound: 2,
    };
  }

  if (nextPhase === "DISCUSSION") {
    newState = {
      ...newState,
      phaseEndsAt: Date.now() + 60_000,
    };
  }

  if (nextPhase === "GAME_RESULT" && state.phase === "VOTE_RESULT") {
    newState = {
      ...newState,
      winner: "CHAMELEON",
    };
  }

  return newState;
}

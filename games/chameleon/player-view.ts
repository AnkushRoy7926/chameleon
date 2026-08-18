import type { ChameleonGameState } from "./state";
import { isPlayerAlive } from "./rules";
import { CATEGORIES } from "./data/categories";

export function getPlayerView(
  state: ChameleonGameState,
  playerId: string
): Record<string, unknown> {
  const isChameleon = state.chameleonId === playerId;
  const isHost = state.players.find((p) => p.id === playerId)?.isHost ?? false;
  const alive = isPlayerAlive(state, playerId);
  const possibleAnswers = getAllAnswers(state);

  const baseView = {
    phase: state.phase,
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      isHost: p.isHost,
      isConnected: p.isConnected,
    })),
    round: state.round,
    clueRound: state.clueRound,
    isChameleon,
    isHost,
    alive,
  };

  if (state.phase === "LOBBY") {
    return baseView;
  }

  const categoryView = {
    ...baseView,
    category: state.category,
  };

  if (state.phase === "ROUND_START") {
    if (isChameleon) {
      return {
        ...categoryView,
        knownAnswer: false,
        possibleAnswers,
        message: "You are the Chameleon! Try to blend in.",
      };
    }
    return {
      ...categoryView,
      knownAnswer: state.answer,
      possibleAnswers,
    };
  }

  if (state.phase === "CATEGORY_REVEAL") {
    if (isChameleon) {
      return {
        ...categoryView,
        knownAnswer: false,
        possibleAnswers,
      };
    }
    return {
      ...categoryView,
      knownAnswer: state.answer,
      possibleAnswers,
    };
  }

  const clueViewBase = {
    ...categoryView,
    possibleAnswers,
    playerDeductions: state.playerDeductions[playerId] || {},
    deductionsOwner: "me",
  };

  if (state.phase === "CLUE_PHASE_1") {
    const currentRoundClues = state.clues.slice(state.roundStartClueCount);
    const hasClued = currentRoundClues.some((c) => c.playerId === playerId);
    const clueData = {
      hasClued,
      myClues: state.clues.filter((c) => c.playerId === playerId),
      allClues: state.clues.map((c, i) => ({
        playerId: c.playerId,
        clue: c.clue,
        order: i + 1,
      })),
      currentCluePlayerId: getCurrentCluePlayerId(state, playerId),
    };
    if (isChameleon) {
      return {
        ...clueViewBase,
        knownAnswer: false,
        ...clueData,
      };
    }
    return {
      ...clueViewBase,
      knownAnswer: state.answer,
      ...clueData,
    };
  }

  if (state.phase === "CLUE_PHASE_2") {
    const currentRoundClues = state.clues.slice(state.roundStartClueCount);
    const hasClued = currentRoundClues.filter((c) => c.playerId === playerId).length >= 2;
    const clueData = {
      hasClued,
      myClues: state.clues.filter((c) => c.playerId === playerId),
      allClues: state.clues.map((c, i) => ({
        playerId: c.playerId,
        clue: c.clue,
        order: i + 1,
      })),
      currentCluePlayerId: getCurrentCluePlayerId(state, playerId),
    };
    if (isChameleon) {
      return {
        ...clueViewBase,
        knownAnswer: false,
        ...clueData,
      };
    }
    return {
      ...clueViewBase,
      knownAnswer: state.answer,
      ...clueData,
    };
  }

  if (state.phase === "DISCUSSION") {
    const clueData = {
      allClues: state.clues.map((c, i) => ({
        playerId: c.playerId,
        clue: c.clue,
        order: i + 1,
      })),
    };
    if (isChameleon) {
      return {
        ...clueViewBase,
        knownAnswer: false,
        ...clueData,
      };
    }
    return {
      ...clueViewBase,
      knownAnswer: state.answer,
      ...clueData,
    };
  }

  if (state.phase === "VOTING") {
    const voteData = {
      allClues: state.clues.map((c, i) => ({
        playerId: c.playerId,
        clue: c.clue,
        order: i + 1,
      })),
      hasVoted: state.votes[playerId] !== undefined,
      votedFor: state.votes[playerId],
    };
    if (isChameleon) {
      return {
        ...clueViewBase,
        knownAnswer: false,
        ...voteData,
      };
    }
    return {
      ...clueViewBase,
      knownAnswer: state.answer,
      ...voteData,
    };
  }

  if (state.phase === "VOTE_RESULT") {
    return {
      ...categoryView,
      possibleAnswers,
      knownAnswer: isChameleon ? false : state.answer,
      allClues: state.clues.map((c, i) => ({
        playerId: c.playerId,
        clue: c.clue,
        order: i + 1,
      })),
      votes: state.votes,
      ejectedPlayerId: state.ejectedPlayerId,
      ejectedWasChameleon:
        state.ejectedPlayerId === state.chameleonId,
      wasDraw: state.ejectedPlayerId === undefined,
    };
  }

  if (state.phase === "CHAMELEON_GUESS") {
    const chameleonBoard = {
      ...categoryView,
      knownAnswer: false,
      ejectedPlayerId: state.ejectedPlayerId,
      ejectedWasChameleon:
        state.ejectedPlayerId === state.chameleonId,
      possibleAnswers,
      canGuess: isChameleon,
      allClues: state.clues.map((c, i) => ({
        playerId: c.playerId,
        clue: c.clue,
        order: i + 1,
      })),
    };
    if (isChameleon) {
      return {
        ...chameleonBoard,
        playerDeductions: state.playerDeductions[playerId] || {},
        deductionsOwner: "me",
      };
    }
    return {
      ...chameleonBoard,
      playerDeductions: state.playerDeductions[state.chameleonId] || {},
      deductionsOwner: "chameleon",
    };
  }

  if (state.phase === "GAME_RESULT") {
    return {
      ...categoryView,
      knownAnswer: state.answer,
      ejectedPlayerId: state.ejectedPlayerId,
      ejectedWasChameleon:
        state.ejectedPlayerId === state.chameleonId,
      chameleonId: state.chameleonId,
      chameleonGuess: state.chameleonGuess,
      winner: state.winner,
      possibleAnswers,
      playerDeductions: state.playerDeductions[state.chameleonId] || {},
      deductionsOwner: "chameleon",
      allClues: state.clues.map((c, i) => ({
        playerId: c.playerId,
        clue: c.clue,
        order: i + 1,
      })),
      votes: state.votes,
    };
  }

  return baseView;
}

function getAllAnswers(state: ChameleonGameState): string[] {
  const category = CATEGORIES.find((c) => c.name === state.category);
  return category?.answers || [];
}

function getCurrentCluePlayerId(
  state: ChameleonGameState,
  playerId: string
): string | undefined {
  const alivePlayers = state.players.filter(
    (p) => p.id !== state.ejectedPlayerId
  );
  if (alivePlayers.length === 0) {
    return undefined;
  }

  const phaseClueCount = state.clues.length - state.roundStartClueCount;

  const currentPlayer = alivePlayers[phaseClueCount % alivePlayers.length];
  if (!currentPlayer) {
    return undefined;
  }

  return currentPlayer.id === playerId ? "me" : currentPlayer.id;
}

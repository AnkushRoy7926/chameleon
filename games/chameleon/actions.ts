import type { ChameleonGameState, ChameleonPhase, DeductionState } from "./state";
import { SKIP_VOTE } from "./state";
import { isPlayerAlive, checkMajorityVote, getAlivePlayers } from "./rules";
import { getRandomCategory, getRandomAnswer, CATEGORIES } from "./data/categories";

export type ChameleonAction =
  | { type: "START_GAME"; payload: Record<string, never> }
  | { type: "SUBMIT_CLUE"; payload: { clue: string } }
  | { type: "CAST_VOTE"; payload: { targetId: string } }
  | { type: "GUESS_ANSWER"; payload: { answer: string } }
  | { type: "UPDATE_DEDUCTION"; payload: { wordId: string; state: DeductionState } };

export function handleChameleonAction(
  state: ChameleonGameState,
  action: ChameleonAction,
  playerId: string
): { state: ChameleonGameState; error?: string } {
  switch (action.type) {
    case "START_GAME":
      return handleStartGame(state);
    case "SUBMIT_CLUE":
      return handleSubmitClue(state, action.payload.clue, playerId);
    case "CAST_VOTE":
      return handleCastVote(state, action.payload.targetId, playerId);
    case "GUESS_ANSWER":
      return handleGuessAnswer(state, action.payload.answer, playerId);
    case "UPDATE_DEDUCTION":
      return handleUpdateDeduction(
        state,
        action.payload.wordId,
        action.payload.state,
        playerId
      );
    default:
      return { state, error: "Unknown action type" };
  }
}

function handleStartGame(
  state: ChameleonGameState
): { state: ChameleonGameState; error?: string } {
  if (state.phase !== "LOBBY") {
    return { state, error: "Game already started" };
  }

  if (state.players.length < 3) {
    return { state, error: "Need at least 3 players" };
  }

  const chameleonIndex = Math.floor(Math.random() * state.players.length);
  const chameleonId = state.players[chameleonIndex].id;

  const category = getRandomCategory();
  const answer = getRandomAnswer(category);

  return {
    state: {
      ...state,
      phase: "ROUND_START",
      chameleonId,
      category: category.name,
      answer,
      phaseStartedAt: Date.now(),
    },
  };
}

function handleSubmitClue(
  state: ChameleonGameState,
  clue: string,
  playerId: string
): { state: ChameleonGameState; error?: string } {
  if (state.phase !== "CLUE_PHASE_1" && state.phase !== "CLUE_PHASE_2") {
    return { state, error: "Not in clue phase" };
  }

  if (!isPlayerAlive(state, playerId)) {
    return { state, error: "Player has been ejected" };
  }

  const phaseMaxClues = state.phase === "CLUE_PHASE_1" ? 1 : 2;
  const currentRoundClues = state.clues.slice(state.roundStartClueCount);
  const playerClueCount = currentRoundClues.filter(
    (c) => c.playerId === playerId
  ).length;

  if (playerClueCount >= phaseMaxClues) {
    return { state, error: "Already submitted a clue" };
  }

  const currentPlayerId = getCurrentCluePlayerId(state);
  if (currentPlayerId && currentPlayerId !== playerId) {
    return { state, error: "It's not your turn to give a clue" };
  }

  if (!clue || clue.trim().length === 0) {
    return { state, error: "Clue cannot be empty" };
  }

  return {
    state: {
      ...state,
      clues: [...state.clues, { playerId, clue: clue.trim() }],
    },
  };
}

function getCurrentCluePlayerId(state: ChameleonGameState): string | undefined {
  const alivePlayers = state.players.filter(
    (p) => p.id !== state.ejectedPlayerId
  );
  if (alivePlayers.length === 0) {
    return undefined;
  }

  const phaseClueCount = state.clues.length - state.roundStartClueCount;

  return alivePlayers[phaseClueCount % alivePlayers.length]?.id;
}

function handleCastVote(
  state: ChameleonGameState,
  targetId: string,
  playerId: string
): { state: ChameleonGameState; error?: string } {
  if (state.phase !== "VOTING") {
    return { state, error: "Not in voting phase" };
  }

  if (!isPlayerAlive(state, playerId)) {
    return { state, error: "Player has been ejected" };
  }

  if (state.votes[playerId]) {
    return { state, error: "Already voted" };
  }

  if (targetId === SKIP_VOTE) {
    const newVotes = { ...state.votes, [playerId]: SKIP_VOTE };
    const allVoted = Object.keys(newVotes).length >= getAlivePlayers(state).length;

    if (allVoted) {
      const ejectedId = checkMajorityVote({ ...state, votes: newVotes });
      return {
        state: {
          ...state,
          votes: newVotes,
          ejectedPlayerId: ejectedId || undefined,
          phase: "VOTE_RESULT",
          phaseStartedAt: Date.now(),
        },
      };
    }

    return {
      state: {
        ...state,
        votes: newVotes,
      },
    };
  }

  if (playerId === targetId) {
    return { state, error: "Cannot vote for yourself" };
  }

  if (!isPlayerAlive(state, targetId)) {
    return { state, error: "Cannot vote for ejected player" };
  }

  const newVotes = { ...state.votes, [playerId]: targetId };
  const allVoted = Object.keys(newVotes).length >= getAlivePlayers(state).length;

  if (allVoted) {
    const ejectedId = checkMajorityVote({ ...state, votes: newVotes });
    return {
      state: {
        ...state,
        votes: newVotes,
        ejectedPlayerId: ejectedId || undefined,
        phase: "VOTE_RESULT",
        phaseStartedAt: Date.now(),
      },
    };
  }

  return {
    state: {
      ...state,
      votes: newVotes,
    },
  };
}

function handleUpdateDeduction(
  state: ChameleonGameState,
  wordId: string,
  deductionState: DeductionState,
  playerId: string
): { state: ChameleonGameState; error?: string } {
  const allowedPhases: ChameleonPhase[] = [
    "CLUE_PHASE_1",
    "CLUE_PHASE_2",
    "DISCUSSION",
    "VOTING",
    "CHAMELEON_GUESS",
  ];
  if (!allowedPhases.includes(state.phase)) {
    return { state, error: "Not in a phase where deductions can be updated" };
  }

  if (!isPlayerAlive(state, playerId) && !(state.phase === "CHAMELEON_GUESS" && state.chameleonId === playerId)) {
    return { state, error: "Player has been ejected" };
  }

  if (!["UNKNOWN", "POSSIBLE", "ELIMINATED"].includes(deductionState)) {
    return { state, error: "Invalid deduction state" };
  }

  const category = CATEGORIES.find((c) => c.name === state.category);
  if (!category || !category.answers.includes(wordId)) {
    return { state, error: "Word is not in the word pool" };
  }

  const playerBoard = state.playerDeductions[playerId] || {};
  const nextBoard = { ...playerBoard };
  if (deductionState === "UNKNOWN") {
    delete nextBoard[wordId];
  } else {
    nextBoard[wordId] = deductionState;
  }

  return {
    state: {
      ...state,
      playerDeductions: {
        ...state.playerDeductions,
        [playerId]: nextBoard,
      },
    },
  };
}

function handleGuessAnswer(
  state: ChameleonGameState,
  answer: string,
  playerId: string
): { state: ChameleonGameState; error?: string } {
  if (state.phase !== "CHAMELEON_GUESS") {
    return { state, error: "Not in guess phase" };
  }

  if (state.chameleonId !== playerId) {
    return { state, error: "Only the Chameleon can guess" };
  }

  if (state.chameleonGuess) {
    return { state, error: "Already made a guess" };
  }

  const winner = answer === state.answer ? "CHAMELEON" : "PLAYERS";

  return {
    state: {
      ...state,
      chameleonGuess: answer,
      winner,
      phase: "GAME_RESULT",
      phaseStartedAt: Date.now(),
    },
  };
}

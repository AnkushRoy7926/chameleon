import { describe, it, expect } from "vitest";
import { chameleonGame, advancePhase } from "@games/chameleon/definition";
import { createInitialChameleonState } from "@games/chameleon/state";
import { handleChameleonAction } from "@games/chameleon/actions";
import {
  checkMajorityVote,
  getNextPhase,
  getPhaseEndCondition,
  isPlayerAlive,
} from "@games/chameleon/rules";
import { getPlayerView } from "@games/chameleon/player-view";
import { CATEGORIES } from "@games/chameleon/data/categories";
import type { Player } from "@shared/types";

const createMockPlayers = (count: number): Player[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `player-${i}`,
    name: `Player ${i}`,
    isHost: i === 0,
    isConnected: true,
    joinedAt: Date.now(),
  }));

const asDeductions = (view: Record<string, unknown>): Record<string, string> =>
  (view.playerDeductions as Record<string, string>) || {};

describe("Chameleon Game Definition", () => {
  it("should have correct game metadata", () => {
    expect(chameleonGame.id).toBe("chameleon");
    expect(chameleonGame.minPlayers).toBe(3);
    expect(chameleonGame.maxPlayers).toBe(12);
  });

  it("should create initial state", () => {
    const players = createMockPlayers(5);
    const state = chameleonGame.createInitialState(players, {});

    expect(state.phase).toBe("LOBBY");
    expect(state.players).toHaveLength(5);
    expect(state.round).toBe(1);
    expect(state.isFirstVotingRound).toBe(true);
  });
});

describe("Chameleon Actions", () => {
  it("should start the game and assign chameleon", () => {
    const players = createMockPlayers(5);
    let state = chameleonGame.createInitialState(players, {});

    const result = handleChameleonAction(
      state,
      { type: "START_GAME", payload: {} },
      "player-0"
    );

    expect(result.error).toBeUndefined();
    expect(result.state.phase).toBe("ROUND_START");
    expect(result.state.chameleonId).toBeTruthy();
    expect(result.state.chameleonId).not.toBe("");
    expect(result.state.category).toBeTruthy();
    expect(result.state.answer).toBeTruthy();
  });

  it("should not start game with fewer than 3 players", () => {
    const players = createMockPlayers(2);
    let state = chameleonGame.createInitialState(players, {});

    const result = handleChameleonAction(
      state,
      { type: "START_GAME", payload: {} },
      "player-0"
    );

    expect(result.error).toBe("Need at least 3 players");
  });

  it("should submit clues during clue phase", () => {
    const players = createMockPlayers(5);
    let state = chameleonGame.createInitialState(players, {});
    state = handleChameleonAction(
      state,
      { type: "START_GAME", payload: {} },
      "player-0"
    ).state;

    // Advance through phases to CLUE_PHASE_1
    state = { ...state, phase: "CLUE_PHASE_1" };

    const result = handleChameleonAction(
      state,
      { type: "SUBMIT_CLUE", payload: { clue: "test" } },
      "player-0"
    );

    expect(result.error).toBeUndefined();
    expect(result.state.clues).toHaveLength(1);
    expect(result.state.clues[0].clue).toBe("test");
  });

  it("should not allow duplicate clue submission", () => {
    const players = createMockPlayers(5);
    let state = chameleonGame.createInitialState(players, {});
    state = handleChameleonAction(
      state,
      { type: "START_GAME", payload: {} },
      "player-0"
    ).state;

    // Advance through phases to CLUE_PHASE_1
    state = { ...state, phase: "CLUE_PHASE_1" };

    state = handleChameleonAction(
      state,
      { type: "SUBMIT_CLUE", payload: { clue: "test" } },
      "player-0"
    ).state;

    const result = handleChameleonAction(
      state,
      { type: "SUBMIT_CLUE", payload: { clue: "test2" } },
      "player-0"
    );

    expect(result.error).toBe("Already submitted a clue");
  });

  it("should cast votes", () => {
    const players = createMockPlayers(5);
    let state = chameleonGame.createInitialState(players, {});
    state = handleChameleonAction(
      state,
      { type: "START_GAME", payload: {} },
      "player-0"
    ).state;

    state = {
      ...state,
      phase: "VOTING",
      clues: players.map((p) => ({ playerId: p.id, clue: "test" })),
    };

    const result = handleChameleonAction(
      state,
      { type: "CAST_VOTE", payload: { targetId: "player-1" } },
      "player-0"
    );

    expect(result.error).toBeUndefined();
    expect(result.state.votes["player-0"]).toBe("player-1");
  });

  it("should not allow voting for self", () => {
    const players = createMockPlayers(5);
    let state = chameleonGame.createInitialState(players, {});
    state = handleChameleonAction(
      state,
      { type: "START_GAME", payload: {} },
      "player-0"
    ).state;

    state = {
      ...state,
      phase: "VOTING",
      clues: players.map((p) => ({ playerId: p.id, clue: "test" })),
    };

    const result = handleChameleonAction(
      state,
      { type: "CAST_VOTE", payload: { targetId: "player-0" } },
      "player-0"
    );

    expect(result.error).toBe("Cannot vote for yourself");
  });

  it("should allow a player to skip voting", () => {
    const players = createMockPlayers(3);
    let state = chameleonGame.createInitialState(players, {});
    state = handleChameleonAction(
      state,
      { type: "START_GAME", payload: {} },
      "player-0"
    ).state;

    state = {
      ...state,
      phase: "VOTING",
      clues: players.map((p) => ({ playerId: p.id, clue: "test" })),
    };

    const result = handleChameleonAction(
      state,
      { type: "CAST_VOTE", payload: { targetId: "skip" } },
      "player-0"
    );

    expect(result.error).toBeUndefined();
    expect(result.state.votes["player-0"]).toBe("skip");
    expect(result.state.phase).toBe("VOTING");
  });

  it("should only adjourn voting when everyone has voted or skipped", () => {
    const players = createMockPlayers(3);
    let state = chameleonGame.createInitialState(players, {});
    state = handleChameleonAction(
      state,
      { type: "START_GAME", payload: {} },
      "player-0"
    ).state;

    state = {
      ...state,
      phase: "VOTING",
      clues: players.map((p) => ({ playerId: p.id, clue: "test" })),
    };

    state = handleChameleonAction(
      state,
      { type: "CAST_VOTE", payload: { targetId: "player-1" } },
      "player-0"
    ).state;
    expect(state.phase).toBe("VOTING");

    state = handleChameleonAction(
      state,
      { type: "CAST_VOTE", payload: { targetId: "skip" } },
      "player-1"
    ).state;
    expect(state.phase).toBe("VOTING");

    state = handleChameleonAction(
      state,
      { type: "CAST_VOTE", payload: { targetId: "skip" } },
      "player-2"
    ).state;
    expect(state.phase).toBe("VOTE_RESULT");
    expect(state.ejectedPlayerId).toBeUndefined();
  });

  it("should eject a player even when others skip", () => {
    const players = createMockPlayers(3);
    let state = chameleonGame.createInitialState(players, {});
    state = handleChameleonAction(
      state,
      { type: "START_GAME", payload: {} },
      "player-0"
    ).state;

    state = {
      ...state,
      phase: "VOTING",
      clues: players.map((p) => ({ playerId: p.id, clue: "test" })),
    };

    state = handleChameleonAction(
      state,
      { type: "CAST_VOTE", payload: { targetId: "player-1" } },
      "player-0"
    ).state;
    state = handleChameleonAction(
      state,
      { type: "CAST_VOTE", payload: { targetId: "skip" } },
      "player-1"
    ).state;
    state = handleChameleonAction(
      state,
      { type: "CAST_VOTE", payload: { targetId: "player-1" } },
      "player-2"
    ).state;

    expect(state.phase).toBe("VOTE_RESULT");
    expect(state.ejectedPlayerId).toBe("player-1");
  });

  it("should record a player's deduction", () => {
    const players = createMockPlayers(5);
    let state = chameleonGame.createInitialState(players, {});
    state = handleChameleonAction(
      state,
      { type: "START_GAME", payload: {} },
      "player-0"
    ).state;
    state = { ...state, phase: "CLUE_PHASE_1" };

    const result = handleChameleonAction(
      state,
      { type: "UPDATE_DEDUCTION", payload: { wordId: state.answer, state: "POSSIBLE" } },
      "player-0"
    );

    expect(result.error).toBeUndefined();
    expect(result.state.playerDeductions["player-0"][state.answer]).toBe(
      "POSSIBLE"
    );
  });

  it("should cycle a deduction back to unknown by removing the entry", () => {
    const players = createMockPlayers(5);
    let state = chameleonGame.createInitialState(players, {});
    state = handleChameleonAction(
      state,
      { type: "START_GAME", payload: {} },
      "player-0"
    ).state;
    state = { ...state, phase: "CLUE_PHASE_1" };

    state = handleChameleonAction(
      state,
      { type: "UPDATE_DEDUCTION", payload: { wordId: state.answer, state: "ELIMINATED" } },
      "player-0"
    ).state;
    state = handleChameleonAction(
      state,
      { type: "UPDATE_DEDUCTION", payload: { wordId: state.answer, state: "UNKNOWN" } },
      "player-0"
    ).state;

    expect(state.playerDeductions["player-0"][state.answer]).toBeUndefined();
  });

  it("should keep each player's deductions independent", () => {
    const players = createMockPlayers(3);
    let state = chameleonGame.createInitialState(players, {});
    state = handleChameleonAction(
      state,
      { type: "START_GAME", payload: {} },
      "player-0"
    ).state;
    state = { ...state, phase: "CLUE_PHASE_1" };

    state = handleChameleonAction(
      state,
      { type: "UPDATE_DEDUCTION", payload: { wordId: state.answer, state: "POSSIBLE" } },
      "player-0"
    ).state;
    state = handleChameleonAction(
      state,
      { type: "UPDATE_DEDUCTION", payload: { wordId: state.answer, state: "ELIMINATED" } },
      "player-1"
    ).state;

    expect(state.playerDeductions["player-0"][state.answer]).toBe("POSSIBLE");
    expect(state.playerDeductions["player-1"][state.answer]).toBe("ELIMINATED");
  });

  it("should reject a deduction for a word not in the pool", () => {
    const players = createMockPlayers(5);
    let state = chameleonGame.createInitialState(players, {});
    state = handleChameleonAction(
      state,
      { type: "START_GAME", payload: {} },
      "player-0"
    ).state;
    state = { ...state, phase: "CLUE_PHASE_1" };

    const result = handleChameleonAction(
      state,
      { type: "UPDATE_DEDUCTION", payload: { wordId: "NotAWord", state: "POSSIBLE" } },
      "player-0"
    );

    expect(result.error).toBe("Word is not in the word pool");
  });

  it("should reject an invalid deduction state", () => {
    const players = createMockPlayers(5);
    let state = chameleonGame.createInitialState(players, {});
    state = handleChameleonAction(
      state,
      { type: "START_GAME", payload: {} },
      "player-0"
    ).state;
    state = { ...state, phase: "CLUE_PHASE_1" };

    const result = handleChameleonAction(
      state,
      {
        type: "UPDATE_DEDUCTION",
        payload: { wordId: state.answer, state: "SUSPICIOUS" as never },
      },
      "player-0"
    );

    expect(result.error).toBe("Invalid deduction state");
  });

  it("should reject deductions outside gameplay phases", () => {
    const players = createMockPlayers(5);
    let state = chameleonGame.createInitialState(players, {});
    state = handleChameleonAction(
      state,
      { type: "START_GAME", payload: {} },
      "player-0"
    ).state;
    state = { ...state, phase: "VOTE_RESULT" };

    const result = handleChameleonAction(
      state,
      { type: "UPDATE_DEDUCTION", payload: { wordId: state.answer, state: "POSSIBLE" } },
      "player-0"
    );

    expect(result.error).toBe("Not in a phase where deductions can be updated");
  });

  it("should allow the chameleon to keep marking deductions during their guess", () => {
    const players = createMockPlayers(3);
    let state = chameleonGame.createInitialState(players, {});
    state = handleChameleonAction(
      state,
      { type: "START_GAME", payload: {} },
      "player-0"
    ).state;
    state = { ...state, phase: "CHAMELEON_GUESS" };

    const result = handleChameleonAction(
      state,
      { type: "UPDATE_DEDUCTION", payload: { wordId: state.answer, state: "ELIMINATED" } },
      state.chameleonId
    );

    expect(result.error).toBeUndefined();
    expect(
      result.state.playerDeductions[state.chameleonId][state.answer]
    ).toBe("ELIMINATED");
  });

  it("should reset all deductions when a new round begins", () => {
    const players = createMockPlayers(5);
    let state = chameleonGame.createInitialState(players, {});
    state = handleChameleonAction(
      state,
      { type: "START_GAME", payload: {} },
      "player-0"
    ).state;

    state = {
      ...state,
      phase: "VOTE_RESULT",
      ejectedPlayerId: undefined,
      playerDeductions: {
        "player-0": { [state.answer]: "ELIMINATED" },
      },
    };

    const advanced = advancePhase(state);

    expect(advanced.phase).toBe("CLUE_PHASE_1");
    expect(advanced.round).toBe(2);
    expect(advanced.playerDeductions).toEqual({});
  });
});

describe("Chameleon Rules", () => {
  const createPartialState = (overrides: Record<string, unknown>) => ({
    phase: "VOTING" as const,
    players: createMockPlayers(5),
    votes: {} as Record<string, string>,
    clues: [],
    isFirstVotingRound: true,
    round: 1,
    clueRound: 1,
    roundStartClueCount: 0,
    chameleonId: "player-0",
    category: "Test",
    answer: "Answer",
    playerDeductions: {},
    phaseStartedAt: Date.now(),
    ...overrides,
  });

  it("should detect majority vote", () => {
    const state = createPartialState({
      votes: {
        "player-0": "player-1",
        "player-1": "player-1",
        "player-2": "player-1",
        "player-3": "player-2",
        "player-4": "player-2",
      },
    });

    const result = checkMajorityVote(state);
    expect(result).toBe("player-1");
  });

  it("should detect draw", () => {
    const state = createPartialState({
      votes: {
        "player-0": "player-1",
        "player-1": "player-2",
        "player-2": "player-3",
        "player-3": "player-4",
        "player-4": "player-0",
      },
    });

    const result = checkMajorityVote(state);
    expect(result).toBeNull();
  });

  it("should get correct next phase", () => {
    const state1 = createPartialState({ phase: "LOBBY" as const });
    expect(getNextPhase(state1)).toBe("ROUND_START");

    const state2 = createPartialState({
      phase: "CLUE_PHASE_1" as const,
      isFirstVotingRound: true,
    });
    expect(getNextPhase(state2)).toBe("CLUE_PHASE_2");

    const state3 = createPartialState({
      phase: "CLUE_PHASE_1" as const,
      isFirstVotingRound: false,
    });
    expect(getNextPhase(state3)).toBe("VOTING");

    const state3b = createPartialState({
      phase: "CLUE_PHASE_2" as const,
    });
    expect(getNextPhase(state3b)).toBe("VOTING");

    const state3c = createPartialState({
      phase: "DISCUSSION" as const,
    });
    expect(getNextPhase(state3c)).toBe("VOTING");

    const state4 = createPartialState({
      phase: "VOTE_RESULT" as const,
      ejectedPlayerId: "player-1",
    });
    expect(getNextPhase(state4)).toBe("GAME_RESULT");

    const state4b = createPartialState({
      phase: "VOTE_RESULT" as const,
      ejectedPlayerId: "player-0",
    });
    expect(getNextPhase(state4b)).toBe("CHAMELEON_GUESS");

    const state5 = createPartialState({
      phase: "VOTE_RESULT" as const,
      ejectedPlayerId: undefined,
    });
    expect(getNextPhase(state5)).toBe("CLUE_PHASE_1");
  });

  it("should auto-advance out of discussion immediately", () => {
    const state = createPartialState({ phase: "DISCUSSION" as const });
    expect(getPhaseEndCondition(state)).toBe(true);
  });

  it("should treat GAME_RESULT as a terminal phase", () => {
    const players = createMockPlayers(5);
    let state = chameleonGame.createInitialState(players, {});
    state = handleChameleonAction(
      state,
      { type: "START_GAME", payload: {} },
      "player-0"
    ).state;
    state = { ...state, phase: "GAME_RESULT", winner: "PLAYERS" };
    expect(getPhaseEndCondition(state)).toBe(false);
  });

  it("should end the game with a chameleon win when an innocent is ejected", () => {
    const players = createMockPlayers(5);
    let state = chameleonGame.createInitialState(players, {});
    state = handleChameleonAction(
      state,
      { type: "START_GAME", payload: {} },
      "player-0"
    ).state;

    const innocentId = players.find((p) => p.id !== state.chameleonId)!.id;
    state = {
      ...state,
      phase: "VOTE_RESULT",
      ejectedPlayerId: innocentId,
    };

    const advanced = advancePhase(state);
    expect(advanced.phase).toBe("GAME_RESULT");
    expect(advanced.winner).toBe("CHAMELEON");
  });

  it("should send a caught chameleon to the guess phase", () => {
    const players = createMockPlayers(5);
    let state = chameleonGame.createInitialState(players, {});
    state = handleChameleonAction(
      state,
      { type: "START_GAME", payload: {} },
      "player-0"
    ).state;

    state = {
      ...state,
      phase: "VOTE_RESULT",
      ejectedPlayerId: state.chameleonId,
    };

    const advanced = advancePhase(state);
    expect(advanced.phase).toBe("CHAMELEON_GUESS");
    expect(advanced.winner).toBeUndefined();
  });

  it("should ignore skip votes when determining majority", () => {
    const state = createPartialState({
      votes: {
        "player-0": "player-1",
        "player-1": "skip",
        "player-2": "skip",
        "player-3": "skip",
        "player-4": "skip",
      },
    });

    expect(checkMajorityVote(state)).toBeNull();
  });

  it("should check if player is alive", () => {
    const state = { ejectedPlayerId: "player-1" };
    expect(isPlayerAlive(state, "player-0")).toBe(true);
    expect(isPlayerAlive(state, "player-1")).toBe(false);
  });
});

describe("Player View", () => {
  it("should hide chameleon identity from non-chameleons", () => {
    const players = createMockPlayers(5);
    let state = chameleonGame.createInitialState(players, {});
    state = handleChameleonAction(
      state,
      { type: "START_GAME", payload: {} },
      "player-0"
    ).state;

    const nonChameleonId = players.find((p) => p.id !== state.chameleonId)!.id;
    const view = getPlayerView(state, nonChameleonId);

    expect(view.isChameleon).toBe(false);
    expect(view.knownAnswer).toBe(state.answer);
  });

  it("should reveal chameleon identity to chameleon", () => {
    const players = createMockPlayers(5);
    let state = chameleonGame.createInitialState(players, {});
    state = handleChameleonAction(
      state,
      { type: "START_GAME", payload: {} },
      "player-0"
    ).state;

    const chameleonView = getPlayerView(state, state.chameleonId);
    expect(chameleonView.isChameleon).toBe(true);
    expect(chameleonView.knownAnswer).toBe(false);
  });

  it("should not reveal answer to chameleon during gameplay", () => {
    const players = createMockPlayers(5);
    let state = chameleonGame.createInitialState(players, {});
    state = handleChameleonAction(
      state,
      { type: "START_GAME", payload: {} },
      "player-0"
    ).state;

    state = { ...state, phase: "CLUE_PHASE_1" };
    const chameleonView = getPlayerView(state, state.chameleonId);
    expect(chameleonView.knownAnswer).toBe(false);
  });

  it("should reveal answer to non-chameleons during gameplay", () => {
    const players = createMockPlayers(5);
    let state = chameleonGame.createInitialState(players, {});
    state = handleChameleonAction(
      state,
      { type: "START_GAME", payload: {} },
      "player-0"
    ).state;

    state = { ...state, phase: "CLUE_PHASE_1" };
    const nonChameleonId = players.find((p) => p.id !== state.chameleonId)!.id;
    const view = getPlayerView(state, nonChameleonId);
    expect(view.knownAnswer).toBe(state.answer);
  });

  it("should reveal all info at game result", () => {
    const players = createMockPlayers(5);
    let state = chameleonGame.createInitialState(players, {});
    state = handleChameleonAction(
      state,
      { type: "START_GAME", payload: {} },
      "player-0"
    ).state;

    state = {
      ...state,
      phase: "GAME_RESULT",
      winner: "PLAYERS",
      chameleonGuess: "wrong answer",
    };

    const view = getPlayerView(state, "player-1");
    expect(view.winner).toBe("PLAYERS");
    expect(view.knownAnswer).toBe(state.answer);
    expect(view.chameleonId).toBe(state.chameleonId);
  });

  it("should expose only the viewer's own deductions during gameplay", () => {
    const players = createMockPlayers(5);
    let state = chameleonGame.createInitialState(players, {});
    state = handleChameleonAction(
      state,
      { type: "START_GAME", payload: {} },
      "player-0"
    ).state;
    state = { ...state, phase: "CLUE_PHASE_1" };

    state = handleChameleonAction(
      state,
      { type: "UPDATE_DEDUCTION", payload: { wordId: state.answer, state: "POSSIBLE" } },
      "player-0"
    ).state;
    state = handleChameleonAction(
      state,
      { type: "UPDATE_DEDUCTION", payload: { wordId: state.answer, state: "ELIMINATED" } },
      "player-1"
    ).state;

    const view0 = getPlayerView(state, "player-0");
    expect(view0.deductionsOwner).toBe("me");
    expect(asDeductions(view0)[state.answer]).toBe("POSSIBLE");

    const view1 = getPlayerView(state, "player-1");
    expect(asDeductions(view1)[state.answer]).toBe("ELIMINATED");
  });

  it("should reveal the chameleon's board during CHAMELEON_GUESS to others", () => {
    const players = createMockPlayers(5);
    let state = chameleonGame.createInitialState(players, {});
    state = handleChameleonAction(
      state,
      { type: "START_GAME", payload: {} },
      "player-0"
    ).state;
    state = { ...state, phase: "CLUE_PHASE_1" };

    state = handleChameleonAction(
      state,
      { type: "UPDATE_DEDUCTION", payload: { wordId: state.answer, state: "ELIMINATED" } },
      state.chameleonId
    ).state;
    state = { ...state, phase: "CHAMELEON_GUESS" };

    const nonChameleonId = players.find((p) => p.id !== state.chameleonId)!.id;
    const view = getPlayerView(state, nonChameleonId);
    expect(view.deductionsOwner).toBe("chameleon");
    expect(asDeductions(view)[state.answer]).toBe("ELIMINATED");
  });

  it("should give the chameleon their own board during CHAMELEON_GUESS", () => {
    const players = createMockPlayers(5);
    let state = chameleonGame.createInitialState(players, {});
    state = handleChameleonAction(
      state,
      { type: "START_GAME", payload: {} },
      "player-0"
    ).state;
    state = { ...state, phase: "CLUE_PHASE_1" };

    state = handleChameleonAction(
      state,
      { type: "UPDATE_DEDUCTION", payload: { wordId: state.answer, state: "POSSIBLE" } },
      state.chameleonId
    ).state;
    state = { ...state, phase: "CHAMELEON_GUESS" };

    const view = getPlayerView(state, state.chameleonId);
    expect(view.deductionsOwner).toBe("me");
    expect(view.canGuess).toBe(true);
    expect(asDeductions(view)[state.answer]).toBe("POSSIBLE");
  });

  it("should report ejectedWasChameleon true in VOTE_RESULT when the chameleon was ejected", () => {
    const players = createMockPlayers(5);
    let state = chameleonGame.createInitialState(players, {});
    state = handleChameleonAction(
      state,
      { type: "START_GAME", payload: {} },
      "player-0"
    ).state;

    state = {
      ...state,
      phase: "VOTE_RESULT",
      ejectedPlayerId: state.chameleonId,
    };

    const view = getPlayerView(state, "player-0");
    expect(view.ejectedWasChameleon).toBe(true);
  });

  it("should report ejectedWasChameleon false in VOTE_RESULT when an innocent was ejected", () => {
    const players = createMockPlayers(5);
    let state = chameleonGame.createInitialState(players, {});
    state = handleChameleonAction(
      state,
      { type: "START_GAME", payload: {} },
      "player-0"
    ).state;

    const innocentId = players.find((p) => p.id !== state.chameleonId)!.id;
    state = {
      ...state,
      phase: "VOTE_RESULT",
      ejectedPlayerId: innocentId,
    };

    const view = getPlayerView(state, "player-0");
    expect(view.ejectedWasChameleon).toBe(false);
  });

  it("should allow the chameleon to guess in CHAMELEON_GUESS even when ejected", () => {
    const players = createMockPlayers(5);
    let state = chameleonGame.createInitialState(players, {});
    state = handleChameleonAction(
      state,
      { type: "START_GAME", payload: {} },
      "player-0"
    ).state;

    state = {
      ...state,
      phase: "CHAMELEON_GUESS",
      ejectedPlayerId: state.chameleonId,
    };

    const view = getPlayerView(state, state.chameleonId);
    expect(view.canGuess).toBe(true);
    expect(view.ejectedWasChameleon).toBe(true);
  });

  it("should allow the chameleon to update deductions during CHAMELEON_GUESS even when ejected", () => {
    const players = createMockPlayers(5);
    let state = chameleonGame.createInitialState(players, {});
    state = handleChameleonAction(
      state,
      { type: "START_GAME", payload: {} },
      "player-0"
    ).state;

    state = {
      ...state,
      phase: "CHAMELEON_GUESS",
      ejectedPlayerId: state.chameleonId,
    };

    const result = handleChameleonAction(
      state,
      { type: "UPDATE_DEDUCTION", payload: { wordId: state.answer, state: "POSSIBLE" } },
      state.chameleonId
    );
    expect(result.error).toBeUndefined();
    expect(result.state.playerDeductions[state.chameleonId][state.answer]).toBe("POSSIBLE");
  });

  it("should reveal the chameleon's board at game result", () => {
    const players = createMockPlayers(5);
    let state = chameleonGame.createInitialState(players, {});
    state = handleChameleonAction(
      state,
      { type: "START_GAME", payload: {} },
      "player-0"
    ).state;
    state = { ...state, phase: "CLUE_PHASE_1" };

    state = handleChameleonAction(
      state,
      { type: "UPDATE_DEDUCTION", payload: { wordId: state.answer, state: "ELIMINATED" } },
      state.chameleonId
    ).state;

    state = {
      ...state,
      phase: "GAME_RESULT",
      winner: "PLAYERS",
      chameleonGuess: "wrong answer",
    };

    const view = getPlayerView(state, "player-1");
    expect(view.deductionsOwner).toBe("chameleon");
    expect(asDeductions(view)[state.answer]).toBe("ELIMINATED");
  });
});

"use client";

import type { GameState } from "./types";
import { getPlayerName } from "./types";

export function TurnIndicator({ gameState }: { gameState: GameState }) {
  const phase = gameState.phase;
  const isCluePhase = phase === "CLUE_PHASE_1" || phase === "CLUE_PHASE_2";

  if (!isCluePhase && phase !== "DISCUSSION" && phase !== "VOTING") {
    return null;
  }

  const allClues = gameState.allClues || [];
  const totalPlayers = gameState.players.length;

  let phaseClueCount: number;
  let phaseTotal: number;

  if (phase === "CLUE_PHASE_1") {
    phaseClueCount = allClues.length;
    phaseTotal = totalPlayers;
  } else {
    // CLUE_PHASE_2: clues from phase 1 already submitted
    phaseClueCount = Math.max(allClues.length - totalPlayers, 0);
    phaseTotal = totalPlayers;
  }

  const currentCluePlayerId = gameState.currentCluePlayerId;
  const isMyTurn = isCluePhase && currentCluePlayerId === "me";
  const allDone = phaseClueCount >= phaseTotal;

  if (isCluePhase) {
    return (
      <div className="turn-indicator">
        <div className="turn-indicator-label">
          {allDone
            ? "CLUES COMPLETE"
            : isMyTurn
            ? "YOUR TURN"
            : "CURRENT TURN"}
        </div>
        {!allDone && (
          <div className="turn-indicator-player">
            {currentCluePlayerId
              ? getPlayerName(gameState.players, currentCluePlayerId)
              : "Unknown"}
          </div>
        )}
        <div className="turn-indicator-progress">
          CLUE {Math.min(phaseClueCount + 1, phaseTotal)} / {phaseTotal}
        </div>
        {allDone && (
          <div className="turn-indicator-hint">
            All clues submitted. Moving to next phase...
          </div>
        )}
        {!allDone && isMyTurn && (
          <div className="turn-indicator-hint">
            Give your clue now — it&apos;s your turn!
          </div>
        )}
        {!allDone && !isMyTurn && (
          <div className="turn-indicator-hint">
            Waiting for their clue...
          </div>
        )}
      </div>
    );
  }

  if (phase === "DISCUSSION") {
    return (
      <div className="turn-indicator">
        <div className="turn-indicator-label">DISCUSSION</div>
        <div className="turn-indicator-hint">
          Discuss who you think the Chameleon is.
        </div>
      </div>
    );
  }

  if (phase === "VOTING") {
    return (
      <div className="turn-indicator turn-indicator-voting">
        <div className="turn-indicator-label">VOTE</div>
        <div className="turn-indicator-hint">
          Cast your vote on the voting panel.
        </div>
      </div>
    );
  }

  return null;
}

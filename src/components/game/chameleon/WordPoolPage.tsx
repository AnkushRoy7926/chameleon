"use client";

import { useState } from "react";
import type { GameState, DeductionState } from "./types";
import { WordDeductionBoard } from "./WordDeductionBoard";

const PLAY_PHASES = ["CLUE_PHASE_1", "CLUE_PHASE_2", "DISCUSSION", "VOTING"];

export function WordPoolPage({
  gameState,
  onAction,
}: {
  gameState: GameState;
  onAction: (action: { type: string; payload: Record<string, unknown> }) => void;
}) {
  const [selectedForGuess, setSelectedForGuess] = useState<string | null>(null);

  const answers = gameState.possibleAnswers || [];
  const deductions = gameState.playerDeductions || {};
  const isGuessPhase = gameState.phase === "CHAMELEON_GUESS";
  const isWatchingChameleonBoard =
    isGuessPhase && !gameState.canGuess && !gameState.isChameleon;
  const canInteract =
    PLAY_PHASES.includes(gameState.phase) ||
    (isGuessPhase && !!gameState.canGuess);

  const handleDeductionChange = (wordId: string, state: DeductionState) => {
    if (!canInteract) return;
    onAction({ type: "UPDATE_DEDUCTION", payload: { wordId, state } });
  };

  const handleConfirmGuess = () => {
    if (!selectedForGuess) return;
    onAction({ type: "GUESS_ANSWER", payload: { answer: selectedForGuess } });
  };

  return (
    <>
      <h2 className="book-page-title">
        {isWatchingChameleonBoard ? "Chameleon's Investigation" : "Word Pool"}
      </h2>
      <p className="book-page-subtitle">
        {gameState.category}
        {canInteract ? " — click a word to mark your deduction" : ""}
      </p>

      <div className="book-divider" />

      {isGuessPhase && gameState.canGuess && (
        <div className="book-annotation book-annotation-danger">
          <span className="book-annotation-label">
            {gameState.ejectedWasChameleon ? "CAUGHT!" : "ESCAPED!"}
          </span>
          <span className="book-annotation-hint">
            {gameState.ejectedWasChameleon
              ? "Mark your deductions, then choose a final answer below."
              : "An innocent was voted out. You're still hidden — choose a final answer to win."}
          </span>
        </div>
      )}

      {isWatchingChameleonBoard && (
        <div className="book-annotation">
          <span className="book-annotation-label">CHAMELEON&apos;S BOARD</span>
          <span className="book-annotation-hint">
            Their investigation while making the final guess.
          </span>
        </div>
      )}

      {answers.length === 0 ? (
        <div className="book-empty">
          <p>No words available.</p>
        </div>
      ) : (
        <WordDeductionBoard
          words={answers}
          deductions={deductions}
          interactive={canInteract}
          onDeductionChange={handleDeductionChange}
        />
      )}

      {isGuessPhase && gameState.canGuess && (
        <>
          <div className="book-divider-thin" />
          <h3 className="rules-heading">Choose your final answer:</h3>
          <div className="wordpool-guess-options">
            {answers.map((word) => (
              <button
                key={word}
                onClick={() => setSelectedForGuess(word)}
                className={`wordpool-guess-option ${
                  selectedForGuess === word
                    ? "wordpool-guess-option-selected"
                    : ""
                }`}
              >
                {word}
              </button>
            ))}
          </div>
          <div className="wordpool-confirm">
            <button
              onClick={handleConfirmGuess}
              disabled={!selectedForGuess}
              className="book-btn-danger"
            >
              MAKE GUESS
            </button>
          </div>
        </>
      )}
    </>
  );
}

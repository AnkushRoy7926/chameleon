"use client";

import type { DeductionState } from "./types";

const NEXT_STATE: Record<DeductionState, DeductionState> = {
  UNKNOWN: "POSSIBLE",
  POSSIBLE: "ELIMINATED",
  ELIMINATED: "UNKNOWN",
};

export function nextDeductionState(state: DeductionState): DeductionState {
  return NEXT_STATE[state];
}

export function WordEvidenceCard({
  word,
  state,
  onClick,
  disabled,
}: {
  word: string;
  state: DeductionState;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={`word-evidence-card word-evidence-card-${state}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={`${word}: ${state.toLowerCase()}`}
    >
      {state === "POSSIBLE" && (
        <svg
          viewBox="0 0 100 100"
          className="word-evidence-mark"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            className="word-evidence-ellipse"
            d="M5,50 C5,26 26,5 50,5 C74,5 95,26 95,50 C95,74 74,95 50,95 C26,95 5,74 5,50 Z"
          />
        </svg>
      )}
      {state === "ELIMINATED" && (
        <svg
          viewBox="0 0 100 100"
          className="word-evidence-mark"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path className="word-evidence-strike" d="M10,56 L90,44" />
        </svg>
      )}
      <span className="word-evidence-text">{word}</span>
    </button>
  );
}

export function WordDeductionBoard({
  words,
  deductions,
  interactive,
  onDeductionChange,
}: {
  words: string[];
  deductions: Record<string, DeductionState>;
  interactive: boolean;
  onDeductionChange?: (wordId: string, state: DeductionState) => void;
}) {
  return (
    <div className="word-evidence-board">
      {words.map((word) => {
        const state = deductions[word] || "UNKNOWN";
        return (
          <WordEvidenceCard
            key={word}
            word={word}
            state={state}
            disabled={!interactive}
            onClick={() =>
              onDeductionChange?.(word, nextDeductionState(state))
            }
          />
        );
      })}
    </div>
  );
}

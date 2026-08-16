"use client";

import { useState, useEffect } from "react";
import type { GameState } from "./types";
import { getPlayerName, getPlayerInitial, isMyClueTurn } from "./types";

export function CluesPage({
  gameState,
  onAction,
}: {
  gameState: GameState;
  onAction: (action: { type: string; payload: Record<string, unknown> }) => void;
}) {
  const [clueInput, setClueInput] = useState("");
  const [turnBoxDismissed, setTurnBoxDismissed] = useState(false);
  const clues = gameState.allClues || [];
  const isMyTurn = isMyClueTurn(gameState);
  const isCluePhase =
    gameState.phase === "CLUE_PHASE_1" || gameState.phase === "CLUE_PHASE_2";
  const phaseLabel =
    gameState.phase === "CLUE_PHASE_1"
      ? "Clue Round 1"
      : gameState.phase === "CLUE_PHASE_2"
      ? "Clue Round 2"
      : "All Clues";

  const handleSubmitClue = () => {
    if (!clueInput.trim()) return;
    onAction({
      type: "SUBMIT_CLUE",
      payload: { clue: clueInput.trim() },
    });
    setClueInput("");
  };

  useEffect(() => {
    setTurnBoxDismissed(false);
  }, [gameState.clueRound, gameState.round]);

  return (
    <>
      <h2 className="book-page-title">Investigation Notes</h2>
      <p className="book-page-subtitle">
        {phaseLabel} &mdash; Round {gameState.round}
      </p>

      <div className="book-divider" />

      {isMyTurn && !turnBoxDismissed && (
        <div className="clue-turn-box clue-turn-box-alert">
          <div className="chat-clue-box-top">
            <div className="clue-turn-box-label">YOUR TURN</div>
            <button
              className="clue-box-dismiss"
              onClick={() => setTurnBoxDismissed(true)}
              aria-label="Dismiss your turn box"
            >
              &#x2715;
            </button>
          </div>
          <p className="clue-turn-box-hint">
            You have been chosen to give the next clue. The investigator waits
            for no one.
          </p>
          <div className="clue-turn-box-row">
            <input
              type="text"
              value={clueInput}
              onChange={(e) => setClueInput(e.target.value)}
              placeholder="Enter one word..."
              maxLength={20}
              className="book-input"
              onKeyDown={(e) => {
                if (e.key === "Enter" && clueInput.trim()) handleSubmitClue();
              }}
            />
            <button
              onClick={handleSubmitClue}
              disabled={!clueInput.trim()}
              className="book-btn"
            >
              SUBMIT
            </button>
          </div>
        </div>
      )}

      {isMyTurn && turnBoxDismissed && (
        <div className="clue-turn-status">
          <span className="chat-clue-status-label">YOUR TURN</span>
          <button
            className="clue-box-reopen"
            onClick={() => setTurnBoxDismissed(false)}
          >
            Give clue
          </button>
        </div>
      )}

      {isCluePhase && !isMyTurn && gameState.hasClued && (
        <div className="clue-turn-status">
          <span className="chat-clue-status-label">WAITING</span>
          Clue submitted. Waiting for other players...
        </div>
      )}

      {isCluePhase && !isMyTurn && !gameState.hasClued && (
        <div className="clue-turn-status">
          <span className="chat-clue-status-label">WAITING</span>
          Waiting for the current player to give their clue...
        </div>
      )}

      {!gameState.isChameleon && gameState.knownAnswer && (
        <div className="book-annotation">
          <span className="book-annotation-label">YOUR ANSWER:</span>
          <span className="book-annotation-value">{gameState.knownAnswer}</span>
        </div>
      )}

      {gameState.isChameleon && (
        <div className="book-annotation book-annotation-danger">
          <span className="book-annotation-label">YOU ARE THE CHAMELEON</span>
          <span className="book-annotation-hint">
            Blend in. Study the clues carefully.
          </span>
        </div>
      )}

      <div className="book-divider-thin" />

      {clues.length === 0 ? (
        <div className="book-empty">
          <p>No clues submitted yet.</p>
          <p className="book-empty-hint">
            {isCluePhase
              ? "Waiting for clues to come in..."
              : "Clues will appear here during the clue phase."}
          </p>
        </div>
      ) : (
        <div className="clues-list">
          {clues.map((clue, i) => {
            const name = getPlayerName(gameState.players, clue.playerId);
            const initial = getPlayerInitial(name);
            const isEjected = clue.playerId === gameState.ejectedPlayerId;
            return (
              <div
                key={`${clue.playerId}-${i}`}
                className={`clue-entry ${isEjected ? "clue-entry-ejected" : ""}`}
              >
                <div className="clue-entry-header">
                  <div className="clue-avatar">{initial}</div>
                  <div className="clue-meta">
                    <span className="clue-player-name">{name}</span>
                    <span className="clue-order">Clue #{clue.order || i + 1}</span>
                  </div>
                </div>
                <div className="clue-text">&ldquo;{clue.clue}&rdquo;</div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

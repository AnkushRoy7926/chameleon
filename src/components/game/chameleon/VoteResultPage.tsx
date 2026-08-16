"use client";

import type { GameState } from "./types";
import { getPlayerName, getPlayerInitial } from "./types";

export function VoteResultPage({ gameState }: { gameState: GameState }) {
  const wasDraw = !gameState.ejectedPlayerId;
  const ejectedPlayerId = gameState.ejectedPlayerId || "";
  const ejectedName = wasDraw
    ? "Unknown"
    : getPlayerName(gameState.players, ejectedPlayerId);

  const votes = gameState.votes || {};
  const voteCounts: Record<string, number> = {};
  const skippedPlayers: string[] = [];
  Object.entries(votes).forEach(([voterId, votedFor]) => {
    if (votedFor === "skip") {
      skippedPlayers.push(getPlayerName(gameState.players, voterId));
      return;
    }
    voteCounts[votedFor] = (voteCounts[votedFor] || 0) + 1;
  });

  return (
    <>
      <h2 className="book-page-title">Vote Tallies</h2>
      <p className="book-page-subtitle">
        {wasDraw ? "Draw — no one ejected" : "Ejection"}
      </p>

      <div className="book-divider" />

      {wasDraw ? (
        <div className="book-annotation">
          <span className="book-annotation-label">RESULT: DRAW</span>
          <span className="book-annotation-hint">
            The votes were split. No one is ejected. A new round begins.
          </span>
        </div>
      ) : (
        <div className="book-annotation book-annotation-danger">
          <span className="book-annotation-label">
            EJECTED: {ejectedName}
          </span>
          <span className="book-annotation-hint">
            {gameState.ejectedWasChameleon
              ? "The Chameleon has been caught!"
              : "Was this the right call?"}
          </span>
        </div>
      )}

      <div className="book-divider-thin" />

      {skippedPlayers.length > 0 && (
        <div className="book-annotation">
          <span className="book-annotation-label">SKIPPED</span>
          <span className="book-annotation-hint">
            {skippedPlayers.join(", ")} abstained from voting.
          </span>
        </div>
      )}

      <div className="vote-results-list">
        {gameState.players.map((p) => {
          const count = voteCounts[p.id] || 0;
          const voters = Object.entries(votes)
            .filter(([, v]) => v === p.id)
            .map(([k]) => getPlayerName(gameState.players, k));
          const isEjected = p.id === gameState.ejectedPlayerId;

          return (
            <div
              key={p.id}
              className={`vote-result-entry ${isEjected ? "vote-result-entry-ejected" : ""}`}
            >
              <div className="vote-result-header">
                <div className="vote-result-avatar">
                  {getPlayerInitial(p.name)}
                </div>
                <span className="vote-result-name">{p.name}</span>
                <span className="vote-result-count">{count} vote{count !== 1 ? "s" : ""}</span>
              </div>
              {voters.length > 0 && (
                <div className="vote-result-voters">
                  Voted by: {voters.join(", ")}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

"use client";

import { useState } from "react";
import type { GameState } from "./types";
import { getPlayerName, getPlayerInitial, getPlayerPfp } from "./types";
import { PfpModal } from "./PfpModal";

const SKIP_VOTE = "skip";

export function VotingPanel({
  gameState,
  onAction,
}: {
  gameState: GameState;
  onAction: (action: { type: string; payload: Record<string, unknown> }) => void;
}) {
  const [modalPfp, setModalPfp] = useState<{ src: string; alt: string } | null>(null);
  const hasVoted = gameState.hasVoted;
  const myVote = hasVoted ? gameState.votedFor : undefined;
  const didSkip = myVote === SKIP_VOTE;

  const voteCounts: Record<string, number> = {};
  const votes = gameState.votes || {};
  Object.values(votes).forEach((votedFor) => {
    if (votedFor === SKIP_VOTE) return;
    voteCounts[votedFor] = (voteCounts[votedFor] || 0) + 1;
  });
  const skipCount = Object.values(votes).filter((v) => v === SKIP_VOTE).length;

  return (
    <>
      <h2 className="book-page-title">Cast Your Vote</h2>
      <p className="book-page-subtitle">Who is the Chameleon?</p>

      <div className="book-divider" />

      {hasVoted && (
        <div className="book-annotation">
          <span className="book-annotation-label">
            {didSkip ? "YOU SKIPPED" : "VOTE CAST"}
          </span>
          <span className="book-annotation-hint">
            {didSkip
              ? "You abstained. Waiting for other players..."
              : `You voted for ${getPlayerName(gameState.players, myVote || "")}. Waiting for other players...`}
          </span>
        </div>
      )}

      <div className="voting-list">
        {gameState.players.map((p) => {
          if (p.id === "me") return null;
          const isCurrentVote = myVote === p.id;
          const count = voteCounts[p.id] || 0;
          return (
            <button
              key={p.id}
              onClick={() =>
                onAction({
                  type: "CAST_VOTE",
                  payload: { targetId: p.id },
                })
              }
              disabled={hasVoted && !isCurrentVote}
              className={`vote-btn ${isCurrentVote ? "vote-btn-selected" : ""}`}
            >
              {getPlayerPfp(p.name) ? (
                <img src={getPlayerPfp(p.name)!} alt={p.name} className="clue-avatar-pfp" onClick={(e) => { e.stopPropagation(); setModalPfp({ src: getPlayerPfp(p.name)!, alt: p.name }); }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <div className="clue-avatar">{getPlayerInitial(p.name)}</div>
              )}
              <div className="vote-btn-info">
                <span className="vote-btn-name">{p.name}</span>
                <span className="vote-btn-count">
                  {count} vote{count !== 1 ? "s" : ""}
                </span>
              </div>
            </button>
          );
        })}

        <button
          onClick={() =>
            onAction({
              type: "CAST_VOTE",
              payload: { targetId: SKIP_VOTE },
            })
          }
          disabled={hasVoted && !didSkip}
          className={`vote-btn vote-btn-skip ${didSkip ? "vote-btn-selected" : ""}`}
        >
          <div className="clue-avatar">-</div>
          <div className="vote-btn-info">
            <span className="vote-btn-name">Skip</span>
            <span className="vote-btn-count">
              {skipCount} skip{skipCount !== 1 ? "s" : ""}
            </span>
          </div>
        </button>
      </div>

      <div className="book-divider-thin" />

      <div className="book-page-number">p. {hasVoted ? 14 : 13}</div>

      {modalPfp && (
        <PfpModal src={modalPfp.src} alt={modalPfp.alt} onClose={() => setModalPfp(null)} />
      )}
    </>
  );
}

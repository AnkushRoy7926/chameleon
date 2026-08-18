"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { GameState } from "./types";
import { getPlayerName, getPlayerInitial, getPlayerPfp } from "./types";
import { WordDeductionBoard } from "./WordDeductionBoard";
import { getSocket } from "@/lib/socket-client";
import { PfpModal } from "./PfpModal";

export function GameResult({ gameState }: { gameState: GameState }) {
  const router = useRouter();
  const [restartError, setRestartError] = useState<string | null>(null);
  const [restarting, setRestarting] = useState(false);
  const [modalPfp, setModalPfp] = useState<{ src: string; alt: string } | null>(null);
  const [cluesOpen, setCluesOpen] = useState(false);

  const chameleonId = gameState.chameleonId || "";
  const chameleon = getPlayerName(gameState.players, chameleonId);
  const chameleonInitial = getPlayerInitial(chameleon);
  const chameleonPfp = getPlayerPfp(chameleon);
  const answer = gameState.knownAnswer;
  const guessedAnswer = gameState.chameleonGuess;
  const chameleonWon = gameState.winner === "CHAMELEON";

  const handleHomepage = () => {
    router.push("/");
  };

  const handleReplay = () => {
    if (restarting) return;
    setRestartError(null);
    setRestarting(true);
    getSocket().emit("restart_game", (result) => {
      setRestarting(false);
      if (!result.success) {
        setRestartError(result.error || "Failed to restart the game");
      }
    });
  };

  return (
    <div className="book-result">
      <div className="book-result-header">
        <div className="book-result-icon">{chameleonWon ? "\u{1F525}" : "\u{1F50D}"}</div>
        <h1 className={`book-result-title ${chameleonWon ? "book-result-title-danger" : "book-result-title-success"}`}>
          {chameleonWon ? "THE CHAMELEON WINS" : "PLAYERS WIN"}
        </h1>
        <p className="book-result-subtitle">
          {chameleonWon
            ? gameState.ejectedWasChameleon
              ? "The Chameleon was caught, but guessed the answer correctly."
              : "The Chameleon escaped the vote and wins!"
            : "The Chameleon was caught and guessed wrong."}
        </p>
      </div>

      <div className="book-divider" />

      <div className="book-result-actions">
        <button onClick={handleHomepage} className="book-btn">
          &#8962; Homepage
        </button>
        <button
          onClick={handleReplay}
          disabled={restarting}
          className="book-btn-danger"
        >
          {restarting ? "Starting..." : "\u21BB Play Again"}
        </button>
      </div>
      {restartError && (
        <div className="book-result-error">{restartError}</div>
      )}

      <div className="book-divider" />

      <div className="book-result-section">
        <h3 className="rules-heading">The Answer</h3>
        <div className="book-result-answer">{answer}</div>
        <p className="book-result-category">Category: {gameState.category}</p>
      </div>

      <div className="book-divider-thin" />

      <div className="book-result-section">
        <h3 className="rules-heading">The Chameleon</h3>
        <div className="book-result-chameleon">
          {chameleonPfp ? (
            <img
              src={chameleonPfp}
              alt={chameleon}
              className="book-result-chameleon-pfp"
              onClick={() => setModalPfp({ src: chameleonPfp, alt: chameleon })}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div className="clue-avatar clue-avatar-large">{chameleonInitial}</div>
          )}
          <div className="book-result-chameleon-name">{chameleon}</div>
        </div>
        {guessedAnswer && (
          <div className="book-result-guess">
            <span className="book-result-guess-label">Their guess:</span>
            <span className={`book-result-guess-value ${chameleonWon ? "" : "book-result-guess-wrong"}`}>
              {guessedAnswer}
            </span>
            <span className={`book-result-guess-verdict ${chameleonWon ? "book-result-guess-correct" : ""}`}>
              {chameleonWon ? "CORRECT" : "INCORRECT"}
            </span>
          </div>
        )}
      </div>

      <div className="book-divider-thin" />

      <div className="book-result-section">
        <h3 className="rules-heading">All Clues</h3>
        <div className="clue-dropdown">
          <button
            className="clue-dropdown-toggle"
            onClick={() => setCluesOpen(!cluesOpen)}
          >
            <span className={`clue-dropdown-arrow ${cluesOpen ? "clue-dropdown-arrow-open" : ""}`}>&#9654;</span>
            {cluesOpen ? "Hide clues" : "Show clues"}
          </button>
          {cluesOpen && (
            <div className="clue-dropdown-body">
              <div className="clues-list clues-list-compact" style={{ paddingTop: "0.5rem" }}>
                {(gameState.allClues || []).map((clue, i) => {
                  const name = getPlayerName(gameState.players, clue.playerId);
                  const pfp = getPlayerPfp(name);
                  return (
                    <div key={`${clue.playerId}-${i}`} className="clue-entry clue-entry-compact">
                      <div className="clue-entry-header">
                        {pfp ? (
                          <img src={pfp} alt={name} className="clue-avatar-pfp" onClick={() => setModalPfp({ src: pfp, alt: name })} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        ) : (
                          <div className="clue-avatar">{getPlayerInitial(name)}</div>
                        )}
                        <div className="clue-meta">
                          <span className="clue-player-name">{name}</span>
                          <span className="clue-order">#{clue.order || i + 1}</span>
                        </div>
                      </div>
                      <div className="clue-text">&ldquo;{clue.clue}&rdquo;</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="book-divider-thin" />

      <div className="book-result-section">
        <h3 className="rules-heading">All Votes</h3>
        <div className="vote-results-list">
          {gameState.players.map((p) => {
            const votedFor = gameState.votes?.[p.id];
            const votedName = votedFor
              ? votedFor === "skip"
                ? "Skipped"
                : getPlayerName(gameState.players, votedFor)
              : "No vote";
            return (
              <div key={p.id} className="vote-result-entry vote-result-entry-compact">
                {getPlayerPfp(p.name) ? (
                  <img src={getPlayerPfp(p.name)!} alt={p.name} className="vote-result-avatar-pfp" onClick={() => setModalPfp({ src: getPlayerPfp(p.name)!, alt: p.name })} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <div className="vote-result-avatar">{getPlayerInitial(p.name)}</div>
                )}
                <span className="vote-result-name">{p.name}</span>
                <span className="vote-result-arrow">&rarr;</span>
                <span className="vote-result-target">{votedName}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="book-divider-thin" />

      <div className="book-result-section">
        <h3 className="rules-heading">The Chameleon&apos;s Investigation</h3>
        <div className="word-evidence-board word-evidence-board-readonly">
          <WordDeductionBoard
            words={gameState.possibleAnswers || []}
            deductions={gameState.playerDeductions || {}}
            interactive={false}
          />
        </div>
        <div className="wordpool-result">
          <div className="wordpool-result-answer">
            <span className="wordpool-result-label">THE ACTUAL ANSWER WAS</span>
            <span className="wordpool-result-value">{answer}</span>
          </div>
        </div>
      </div>

      {modalPfp && (
        <PfpModal src={modalPfp.src} alt={modalPfp.alt} onClose={() => setModalPfp(null)} />
      )}
    </div>
  );
}

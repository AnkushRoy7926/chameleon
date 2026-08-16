"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { GameState, SpreadIndex, ChatMessage } from "./types";
import { isMyClueTurn } from "./types";
import { getSocket } from "@/lib/socket-client";
import { CluesPage } from "./CluesPage";
import { WordPoolPage } from "./WordPoolPage";
import { ChatPage } from "./ChatPage";
import { RulesPageOne } from "./RulesPage";
import { RulesPageTwo } from "./RulesPageTwo";
import { TurnIndicator } from "./TurnIndicator";
import { VotingPanel } from "./VotingPanel";
import { VoteResultPage } from "./VoteResultPage";
import { GameResult } from "./GameResult";

const SPREAD_LABELS = ["Clues & Word Pool", "Discussion & Voting", "Rules"];

export function ChameleonJournal({
  gameState,
  roomCode,
  messages,
  onAction,
  onSendMessage,
}: {
  gameState: GameState;
  roomCode: string;
  messages: ChatMessage[];
  onAction: (action: { type: string; payload: Record<string, unknown> }) => void;
  onSendMessage: (content: string) => void;
}) {
  const [spread, setSpread] = useState<SpreadIndex>(0);
  const [showTurnAlert, setShowTurnAlert] = useState(false);
  const [showVotingAlert, setShowVotingAlert] = useState(false);
  const wasMyTurnRef = useRef(false);
  const prevPhaseRef = useRef(gameState.phase);

  const isMyTurn = isMyClueTurn(gameState);

  useEffect(() => {
    if (isMyTurn && !wasMyTurnRef.current) {
      setShowTurnAlert(true);
      const timer = setTimeout(() => setShowTurnAlert(false), 5000);
      return () => clearTimeout(timer);
    }
    wasMyTurnRef.current = isMyTurn;
  }, [isMyTurn]);

  useEffect(() => {
    const phase = gameState.phase;
    if (phase === "VOTING" && prevPhaseRef.current !== "VOTING") {
      setShowVotingAlert(true);
    }
    prevPhaseRef.current = phase;
  }, [gameState.phase]);

  useEffect(() => {
    if (!showVotingAlert) return;
    const timer = setTimeout(() => setShowVotingAlert(false), 6000);
    return () => clearTimeout(timer);
  }, [showVotingAlert]);

  const showBook = !["LOBBY", "GAME_RESULT"].includes(gameState.phase);
  const isVoting = gameState.phase === "VOTING";
  const showVoteResult = gameState.phase === "VOTE_RESULT";
  const showRoundStart = gameState.phase === "ROUND_START";
  const showCategoryReveal = gameState.phase === "CATEGORY_REVEAL";
  const showChameleonGuess = gameState.phase === "CHAMELEON_GUESS";
  const showGameResult = gameState.phase === "GAME_RESULT";

  const handlePrevSpread = useCallback(() => {
    setSpread((prev) => ((prev - 1 + 3) % 3) as SpreadIndex);
  }, []);

  const handleNextSpread = useCallback(() => {
    setSpread((prev) => ((prev + 1) % 3) as SpreadIndex);
  }, []);

  if (showGameResult) {
    return (
      <div className="book-desk">
        <div className="book book-full">
          <GameResult gameState={gameState} />
        </div>
      </div>
    );
  }

  if (showVoteResult) {
    return (
      <div className="book-desk">
        <div className="book book-full">
          <div className="book-tabs">
            {SPREAD_LABELS.map((label, i) => (
              <button
                key={i}
                onClick={() => setSpread(i as SpreadIndex)}
                className={`book-tab ${spread === i ? "book-tab-active" : ""}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="book-body">
            <button className="book-arrow book-arrow-left" onClick={handlePrevSpread}>
              &#x25C0;
            </button>
            <div className="book-spread">
              <div className="book-page book-page-left">
                <VoteResultPage gameState={gameState} />
              </div>
              <div className="book-spine" />
              <div className="book-page book-page-right">
                <TurnIndicator gameState={gameState} />
              </div>
            </div>
            <button className="book-arrow book-arrow-right" onClick={handleNextSpread}>
              &#x25B6;
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="book-desk">
      {showRoundStart && <RoundStartOverlay gameState={gameState} />}
      {showCategoryReveal && <CategoryRevealOverlay gameState={gameState} />}
      {showChameleonGuess && !gameState.canGuess && !gameState.isChameleon && (
        <ChameleonGuessOverlay gameState={gameState} />
      )}
      {showTurnAlert && <TurnAlertToast onDismiss={() => setShowTurnAlert(false)} />}
      {showVotingAlert && <VotingAlertToast onDismiss={() => setShowVotingAlert(false)} />}

      <div className="book book-full">
        {showBook && (
          <div className="book-tabs">
            {SPREAD_LABELS.map((label, i) => (
              <button
                key={i}
                onClick={() => setSpread(i as SpreadIndex)}
                className={`book-tab ${spread === i ? "book-tab-active" : ""}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <div className="book-body">
          <button className="book-arrow book-arrow-left" onClick={handlePrevSpread}>
            &#x25C0;
          </button>

          <div className="book-spread">
            {/* ── LEFT PAGE ── */}
            <div className="book-page book-page-left">
              {spread === 0 && (
                <CluesPage gameState={gameState} onAction={onAction} />
              )}
              {spread === 1 && (
                <ChatPage
                  gameState={gameState}
                  messages={messages}
                  onSendMessage={onSendMessage}
                  onAction={onAction}
                />
              )}
              {spread === 2 && <RulesPageOne />}
            </div>

            <div className="book-spine" />

            {/* ── RIGHT PAGE ── */}
            <div className="book-page book-page-right">
              {spread === 0 && (
                <WordPoolPage gameState={gameState} onAction={onAction} />
              )}
              {spread === 1 && (
                isVoting ? (
                  <VotingPanel gameState={gameState} onAction={onAction} />
                ) : (
                  <div className="book-blank-page">
                    <TurnIndicator gameState={gameState} />
                  </div>
                )
              )}
              {spread === 2 && (
                <>
                  <RulesPageTwo />
                  {gameState.isHost && (
                    <HostControls onAction={onAction} />
                  )}
                </>
              )}
            </div>
          </div>

          <button className="book-arrow book-arrow-right" onClick={handleNextSpread}>
            &#x25B6;
          </button>
        </div>
      </div>
    </div>
  );
}

function TurnAlertToast({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="turn-alert-toast">
      <div className="turn-alert-toast-top">
        <div className="turn-alert-toast-content">
          <div className="turn-alert-toast-icon">&#x1F50D;</div>
          <div>
            <div className="turn-alert-toast-label">YOUR TURN</div>
            <div className="turn-alert-toast-text">
              It&apos;s your turn to give a clue!
            </div>
          </div>
        </div>
        <button
          className="clue-box-dismiss"
          onClick={onDismiss}
          aria-label="Dismiss your turn alert"
        >
          &#x2715;
        </button>
      </div>
    </div>
  );
}

function VotingAlertToast({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="turn-alert-toast turn-alert-toast-voting">
      <div className="turn-alert-toast-top">
        <div className="turn-alert-toast-content">
          <div className="turn-alert-toast-icon">&#x1F5F3;&#xFE0F;</div>
          <div>
            <div className="turn-alert-toast-label">VOTING TIME</div>
            <div className="turn-alert-toast-text">
              All players must cast their vote. Who do you suspect?
            </div>
          </div>
        </div>
        <button
          className="clue-box-dismiss"
          onClick={onDismiss}
          aria-label="Dismiss voting alert"
        >
          &#x2715;
        </button>
      </div>
    </div>
  );
}

function RoundStartOverlay({ gameState }: { gameState: GameState }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="book-overlay">
      <div className="book-overlay-content">
        {gameState.isChameleon ? (
          <>
            <div className="book-overlay-icon">&#x1F98E;</div>
            <h2 className="book-overlay-title book-overlay-title-danger">
              YOU ARE THE CHAMELEON
            </h2>
            <p className="book-overlay-text">
              Blend in. Give a clue that sounds plausible but doesn&apos;t
              give away that you don&apos;t know the answer.
            </p>
          </>
        ) : (
          <>
            <div className="book-overlay-icon">&#x1F50D;</div>
            <h2 className="book-overlay-title">INVESTIGATION BEGINS</h2>
            <p className="book-overlay-text">
              You know the answer: <strong>{gameState.knownAnswer}</strong>
            </p>
            <p className="book-overlay-hint">
              Category: {gameState.category}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function CategoryRevealOverlay({ gameState }: { gameState: GameState }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="book-overlay">
      <div className="book-overlay-content">
        <div className="book-overlay-label">CATEGORY</div>
        <h2 className="book-overlay-title">{gameState.category}</h2>
        {!gameState.isChameleon && (
          <p className="book-overlay-text">
            Your answer: <strong>{gameState.knownAnswer}</strong>
          </p>
        )}
        {gameState.isChameleon && (
          <p className="book-overlay-text book-overlay-text-muted">
            You don&apos;t know the answer. Study the clues carefully.
          </p>
        )}
      </div>
    </div>
  );
}

function ChameleonGuessOverlay({ gameState }: { gameState: GameState }) {
  const wasCaught = !!gameState.ejectedWasChameleon;
  return (
    <div className="book-overlay">
      <div className="book-overlay-content">
        <div className="book-overlay-icon">&#x1F98E;</div>
        <h2 className="book-overlay-title book-overlay-title-danger">
          {wasCaught
            ? "THE CHAMELEON HAS BEEN CAUGHT"
            : "THE CHAMELEON ESCAPED"}
        </h2>
        <p className="book-overlay-text">
          {wasCaught
            ? "Let's see what they thought..."
            : "An innocent player was ejected. The chameleon is still hiding..."}
        </p>
      </div>
    </div>
  );
}

function HostControls({
  onAction,
}: {
  onAction: (action: { type: string; payload: Record<string, unknown> }) => void;
}) {
  const [status, setStatus] = useState<string | null>(null);

  const handleReshuffle = () => {
    setStatus("Reshuffling...");
    const socket = getSocket();
    socket.emit("reshuffle_names", (result) => {
      if (result.success) {
        setStatus("Names reshuffled!");
      } else {
        setStatus(result.error || "Failed to reshuffle");
      }
      setTimeout(() => setStatus(null), 2500);
    });
  };

  const handleRestartRound = () => {
    setStatus("Restarting...");
    const socket = getSocket();
    socket.emit("restart_game", (result) => {
      if (result.success) {
        setStatus("New round started!");
      } else {
        setStatus(result.error || "Failed to restart");
      }
      setTimeout(() => setStatus(null), 2500);
    });
  };

  return (
    <div className="host-controls">
      <div className="book-divider" />
      <h3 className="rules-heading">Host Controls</h3>
      <div className="host-controls-buttons">
        <button
          className="book-btn host-btn"
          onClick={handleReshuffle}
        >
          Reshuffle Names
        </button>
        <button
          className="book-btn host-btn"
          onClick={handleRestartRound}
        >
          Restart Round
        </button>
      </div>
      {status && <div className="host-controls-status">{status}</div>}
    </div>
  );
}

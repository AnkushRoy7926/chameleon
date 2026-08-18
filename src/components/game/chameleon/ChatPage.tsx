"use client";

import { useState, useRef, useEffect } from "react";
import type { GameState, ChatMessage } from "./types";
import { getPlayerInitial, getPlayerPfp, isMyClueTurn } from "./types";
import { PfpModal } from "./PfpModal";

export function ChatPage({
  gameState,
  messages,
  onSendMessage,
  onAction,
}: {
  gameState: GameState;
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  onAction: (action: { type: string; payload: Record<string, unknown> }) => void;
}) {
  const [input, setInput] = useState("");
  const [clueInput, setClueInput] = useState("");
  const [clueBoxDismissed, setClueBoxDismissed] = useState(false);
  const [modalPfp, setModalPfp] = useState<{ src: string; alt: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    setClueBoxDismissed(false);
  }, [gameState.clueRound, gameState.round]);

  const isCluePhase =
    gameState.phase === "CLUE_PHASE_1" || gameState.phase === "CLUE_PHASE_2";
  const isDiscussion = gameState.phase === "DISCUSSION";
  const isVoting = gameState.phase === "VOTING";
  const canGiveClue = isCluePhase && !gameState.hasClued && isMyClueTurn(gameState);
  const hasGivenClue = isCluePhase && gameState.hasClued;

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input.trim());
    setInput("");
  };

  const handleSubmitClue = () => {
    if (!clueInput.trim()) return;
    onAction({
      type: "SUBMIT_CLUE",
      payload: { clue: clueInput.trim() },
    });
    setClueInput("");
  };

  return (
    <div className="chat-page">
      <h2 className="book-page-title">Discussion Log</h2>
      <p className="book-page-subtitle">
        {isCluePhase && "Clue Phase"}
        {isDiscussion && "Open Discussion"}
        {isVoting && "Voting"}
        {!isCluePhase && !isDiscussion && !isVoting && "Game Log"}
      </p>

      <div className="book-divider" />

      {isCluePhase && canGiveClue && !clueBoxDismissed && (
        <div className="chat-clue-box">
          <div className="chat-clue-box-top">
            <div className="chat-clue-box-label">YOUR TURN</div>
            <button
              className="clue-box-dismiss"
              onClick={() => setClueBoxDismissed(true)}
              aria-label="Dismiss your turn box"
            >
              &#x2715;
            </button>
          </div>
          <p className="chat-clue-box-hint">
            Give a one-word clue related to the answer.
          </p>
          <div className="chat-clue-box-row">
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

      {isCluePhase && canGiveClue && clueBoxDismissed && (
        <div className="chat-clue-status">
          <span className="chat-clue-status-label">YOUR TURN</span>
          <button
            className="clue-box-reopen"
            onClick={() => setClueBoxDismissed(false)}
          >
            Give clue
          </button>
        </div>
      )}

      {isCluePhase && hasGivenClue && (
        <div className="chat-clue-status">
          <span className="chat-clue-status-label">WAITING</span>
          Clue submitted. Waiting for other players...
        </div>
      )}

      {isCluePhase && !canGiveClue && !hasGivenClue && (
        <div className="chat-clue-status">
          <span className="chat-clue-status-label">WAITING</span>
          Waiting for the current player to give their clue...
        </div>
      )}

      {isDiscussion && (
        <div className="chat-phase-banner">
          <span className="chat-phase-label">DISCUSSION</span>
          Discuss who you think the Chameleon is.
        </div>
      )}

      {isVoting && (
        <div className="chat-phase-banner chat-phase-banner-danger">
          <span className="chat-phase-label">VOTING</span>
          Cast your vote on the right page.
        </div>
      )}

      {(isCluePhase || isDiscussion || isVoting) && (
        <div className="book-divider-thin" />
      )}

      <div className="chat-messages-area">
        {messages.length === 0 && (
          <div className="book-empty">
            <p>No messages yet.</p>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`chat-msg ${msg.system ? "chat-msg-system" : ""}`}
          >
            {msg.system ? (
              <div className="chat-msg-system-text">{msg.content}</div>
            ) : (
              <>
                <div className="chat-msg-header">
                  {getPlayerPfp(msg.playerName) ? (
                    <img src={getPlayerPfp(msg.playerName)!} alt={msg.playerName} className="chat-msg-avatar-pfp" onClick={() => setModalPfp({ src: getPlayerPfp(msg.playerName)!, alt: msg.playerName })} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <div className="chat-msg-avatar">
                      {getPlayerInitial(msg.playerName)}
                    </div>
                  )}
                  <span className="chat-msg-name">{msg.playerName}</span>
                  <span className="chat-msg-time">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="chat-msg-body">{msg.content}</div>
              </>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-row">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className="book-input"
          onKeyDown={(e) => {
            if (e.key === "Enter" && input.trim()) handleSend();
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="book-btn"
        >
          SEND
        </button>
      </div>

      {modalPfp && (
        <PfpModal src={modalPfp.src} alt={modalPfp.alt} onClose={() => setModalPfp(null)} />
      )}
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { getSocket } from "@/lib/socket-client";
import { ChameleonJournal } from "@/components/game/chameleon/ChameleonJournal";
import type { GameState } from "@/components/game/chameleon/types";
import type { ChatMessage } from "@/components/game/chameleon/types";

export default function GamePage() {
  const params = useParams();
  const roomCode = params.roomCode as string;

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const fetchGameState = useCallback(() => {
    const socket = getSocket();
    socket.emit("get_game_state", (result) => {
      if (result.success && result.gameState) {
        setGameState(result.gameState as GameState);
        setIsLoading(false);
      } else {
        setError(result.error || "Failed to load game state");
        setIsLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    const socket = getSocket();

    const onGameStateUpdate = (data: {
      gameState: unknown;
      phase: string;
    }) => {
      setGameState(data.gameState as GameState);
      setIsLoading(false);
    };

    const onGameStarted = (data: {
      gameState: unknown;
      phase: string;
    }) => {
      setGameState(data.gameState as GameState);
      setIsLoading(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `sys_${Date.now()}_start`,
          playerId: "system",
          playerName: "System",
          content: "The game has started. The investigation begins...",
          timestamp: Date.now(),
          system: true,
        },
      ]);
    };

    const onGameOver = (data: {
      winner: string;
      finalState: unknown;
    }) => {
      setGameState(data.finalState as GameState);
    };

    const onSessionRestored = (data: {
      room: unknown;
      gameState: unknown;
    }) => {
      if (data.gameState) {
        setGameState(data.gameState as GameState);
        setIsLoading(false);
      }
    };

    const onChatMessage = (data: {
      id: string;
      playerId: string;
      playerName: string;
      content: string;
      timestamp: number;
      system?: boolean;
    }) => {
      setMessages((prev) => [...prev, data as ChatMessage]);
    };

    const onSocketError = (data: { message: string }) => {
      setError(data.message);
    };

    socket.on("game_state_update", onGameStateUpdate);
    socket.on("game_started", onGameStarted);
    socket.on("game_over", onGameOver);
    socket.on("session_restored", onSessionRestored);
    socket.on("chat_message", onChatMessage);
    socket.on("error", onSocketError);

    const connectAndFetch = () => {
      if (socket.connected) {
        fetchGameState();
      } else {
        socket.connect();
        socket.once("connect", () => {
          fetchGameState();
        });
      }
    };

    connectAndFetch();

    return () => {
      socket.off("game_state_update", onGameStateUpdate);
      socket.off("game_started", onGameStarted);
      socket.off("game_over", onGameOver);
      socket.off("session_restored", onSessionRestored);
      socket.off("chat_message", onChatMessage);
      socket.off("error", onSocketError);
    };
  }, [roomCode, fetchGameState]);

  const handleAction = (action: {
    type: string;
    payload: Record<string, unknown>;
  }) => {
    const socket = getSocket();
    socket.emit("player_action", { action }, (result) => {
      if (!result.success) {
        setError(result.error || "Action failed");
        setTimeout(() => setError(null), 3000);
      }
    });
  };

  const handleSendMessage = useCallback((content: string) => {
    const socket = getSocket();
    socket.emit("send_chat_message", { content });
  }, []);

  if (isLoading || !gameState) {
    return (
      <div className="journal-loading">
        <div className="journal-loading-content">
          <div className="journal-loading-icon">&#x1F4D6;</div>
          <div className="journal-loading-text">Opening your journal...</div>
          {error && (
            <div className="journal-loading-error">
              <p>{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  setIsLoading(true);
                  fetchGameState();
                }}
                className="journal-btn-primary"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (gameState.phase === "LOBBY") {
    return (
      <div className="journal-loading">
        <div className="journal-loading-content">
          <div className="journal-loading-icon">&#x1F98E;</div>
          <div className="journal-loading-text">Waiting for the game to start...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="journal-error-toast">{error}</div>
      )}
      <ChameleonJournal
        gameState={gameState}
        roomCode={roomCode}
        messages={messages}
        onAction={handleAction}
        onSendMessage={handleSendMessage}
      />
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getSocket, useSocket, loadSession, saveSession } from "@/lib/socket-client";
import type { Player, Room } from "@shared/types";

function getPlayerPfp(name: string): string | null {
  const slug = name.toLowerCase().replace(/\s+/g, " ").trim();
  return `/venerables/${slug}.jpg`;
}

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = params.roomCode as string;
  const { isConnected } = useSocket();

  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    const session = loadSession();

    const doJoin = () => {
      socket.emit(
        "join_room",
        { roomCode },
        (result) => {
          if (result.success && result.playerId && result.token) {
            saveSession(roomCode, result.playerId, result.token);
            setMyPlayerId(result.playerId);
            setIsLoading(false);
          } else {
            setError(result.error || "Failed to join room");
            setIsLoading(false);
          }
        }
      );
    };

    const doReconnect = () => {
      socket.emit("reconnect", {
        roomCode: session!.roomCode,
        playerId: session!.playerId,
        token: session!.token,
      });
    };

    const onConnect = () => {
      if (session && session.roomCode === roomCode) {
        doReconnect();
      } else {
        doJoin();
      }
    };

    const onSessionRestored = (data: { room: Room; gameState: unknown }) => {
      setPlayers(data.room.players);
      setMyPlayerId(session?.playerId ?? null);
      setIsLoading(false);
    };

    if (socket.connected) {
      onConnect();
    } else {
      socket.once("connect", onConnect);
      socket.once("connect_error", (err) => {
        setError("Failed to connect to server: " + err.message);
        setIsLoading(false);
      });
      socket.connect();
    }

    socket.on("session_restored", onSessionRestored);

    const onPlayerJoined = (data: { players: Player[] }) => {
      setPlayers(data.players);
    };

    const onPlayerLeft = (data: {
      playerId: string;
      players: Player[];
    }) => {
      setPlayers(data.players);
    };

    const onGameStarted = (data: {
      gameState: unknown;
      phase: string;
    }) => {
      router.push(`/room/${roomCode}/game`);
    };

    socket.on("player_joined", onPlayerJoined);
    socket.on("player_left", onPlayerLeft);
    socket.on("game_started", onGameStarted);

    return () => {
      socket.off("session_restored", onSessionRestored);
      socket.off("player_joined", onPlayerJoined);
      socket.off("player_left", onPlayerLeft);
      socket.off("game_started", onGameStarted);
    };
  }, [roomCode, router]);

  const handleStartGame = () => {
    const socket = getSocket();
    socket.emit("start_game");
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/join?code=${roomCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 flex items-center justify-center">
        <div className="text-muted">Joining room...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto card">
          <div className="text-center">
            <div className="text-4xl mb-4">❌</div>
            <h2 className="text-xl font-semibold mb-2">Error</h2>
            <p className="text-muted mb-4">{error}</p>
            <a href="/" className="btn-primary">
              Back to Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="card mb-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-2">Room</h1>
            <div className="flex items-center justify-center gap-2">
              <span className="text-4xl font-mono font-bold text-primary tracking-widest">
                {roomCode}
              </span>
              <button
                onClick={handleCopyCode}
                className="btn-secondary text-sm"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted">Share this link:</span>
              <button onClick={handleCopyLink} className="text-sm text-primary hover:underline">
                Copy invite link
              </button>
            </div>
            <div className="p-3 bg-surface-light rounded-lg text-sm text-muted font-mono truncate">
              {typeof window !== "undefined"
                ? `${window.location.origin}/join?code=${roomCode}`
                : `.../join?code=${roomCode}`}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-surface-light rounded-lg">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  isConnected ? "bg-success" : "bg-danger"
                }`}
              />
              <span className="text-sm text-muted">
                {isConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
            <span className="text-sm text-muted">
              {players.length} player{players.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="card mb-6">
          <h2 className="text-lg font-semibold mb-4">Players</h2>
          <div className="space-y-2">
            {players.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between p-3 bg-surface-light rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getPlayerPfp(player.name) ? (
                    <img
                      src={getPlayerPfp(player.name)!}
                      alt={player.name}
                      className="w-10 h-10 rounded-full"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div
                    className={`w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold ${getPlayerPfp(player.name) ? 'hidden' : ''}`}
                  >
                    {player.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-medium">{player.name}</div>
                    <div className="text-xs text-muted">
                      {player.id.slice(0, 8)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {player.isHost && (
                    <span className="badge-warning">Host</span>
                  )}
                  <div
                    className={`w-2 h-2 rounded-full ${
                      player.isConnected ? "bg-success" : "bg-muted"
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          {myPlayerId && players.find((p) => p.id === myPlayerId)?.isHost ? (
            <button
              onClick={handleStartGame}
              disabled={players.length < 3}
              className="btn-primary w-full"
            >
              {players.length < 3
                ? `Need ${3 - players.length} more player${
                    3 - players.length !== 1 ? "s" : ""
                  }`
                : "Start Game"}
            </button>
          ) : (
            <div className="text-center text-muted py-2">
              Waiting for the host to start the game...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

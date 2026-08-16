"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSocket } from "@/lib/socket-client";

interface GameInfo {
  id: string;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
}

export default function CreateRoomPage() {
  const router = useRouter();
  const [selectedGame, setSelectedGame] = useState("chameleon");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [games, setGames] = useState<GameInfo[]>([]);

  useEffect(() => {
    fetch("/api/games")
      .then((res) => res.json())
      .then((data) => setGames(data))
      .catch(() => {
        setGames([
          {
            id: "chameleon",
            name: "The Chameleon",
            description:
              "One player is secretly the Chameleon. Give clues, discuss, and vote to catch them!",
            minPlayers: 3,
            maxPlayers: 12,
          },
        ]);
      });
  }, []);

  const handleCreate = async () => {
    setIsCreating(true);
    setError(null);

    try {
      const socket = getSocket();
      socket.connect();

      socket.emit(
        "create_room",
        { gameId: selectedGame },
        (result) => {
          if (result.success && result.roomCode) {
            router.push(`/room/${result.roomCode}`);
          } else {
            setError(result.error || "Failed to create room");
            setIsCreating(false);
          }
        }
      );
    } catch (err) {
      setError("Failed to connect to server");
      setIsCreating(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Create Room</h1>

        <div className="card">
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Select Game
            </label>
            <div className="space-y-2">
              {games.map((game) => (
                <button
                  key={game.id}
                  onClick={() => setSelectedGame(game.id)}
                  className={`w-full p-4 rounded-lg border text-left transition-all ${
                    selectedGame === game.id
                      ? "border-primary bg-primary/10"
                      : "border-border bg-surface-light hover:border-border-light"
                  }`}
                >
                  <div className="font-medium">{game.name}</div>
                  <div className="text-sm text-muted">{game.description}</div>
                  <div className="text-xs text-muted mt-2">
                    {game.minPlayers}-{game.maxPlayers} players
                  </div>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={isCreating}
            className="btn-primary w-full"
          >
            {isCreating ? "Creating..." : "Create Room"}
          </button>
        </div>
      </div>
    </div>
  );
}

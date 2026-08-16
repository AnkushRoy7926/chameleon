"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSocket } from "@/lib/socket-client";

export default function JoinRoomPage() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async () => {
    if (!roomCode.trim()) {
      setError("Please enter a room code");
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      const socket = getSocket();
      socket.connect();

      socket.emit("join_room", { roomCode: roomCode.toUpperCase() }, (result) => {
        if (result.success) {
          router.push(`/room/${roomCode.toUpperCase()}`);
        } else {
          setError(result.error || "Failed to join room");
          setIsJoining(false);
        }
      });
    } catch (err) {
      setError("Failed to connect to server");
      setIsJoining(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Join Room</h1>

        <div className="card">
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Room Code</label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => {
                setRoomCode(e.target.value.toUpperCase());
                setError(null);
              }}
              placeholder="Enter 5-character code"
              maxLength={5}
              className="input text-center text-2xl tracking-widest font-mono"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleJoin();
                }
              }}
            />
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleJoin}
            disabled={isJoining || roomCode.length !== 5}
            className="btn-primary w-full"
          >
            {isJoining ? "Joining..." : "Join Room"}
          </button>
        </div>
      </div>
    </div>
  );
}

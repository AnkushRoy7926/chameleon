"use client";

import { useEffect, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import type { ServerToClientEvents, ClientToServerEvents } from "@shared/events";

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: GameSocket | null = null;

export function getSocket(): GameSocket {
  if (typeof window === "undefined") return null!;
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3001", {
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
    });
  }
  return socket;
}

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [socketError, setSocketError] = useState<string | null>(null);

  useEffect(() => {
    const s = getSocket();

    const onConnect = () => {
      setIsConnected(true);
      setSocketError(null);
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    const onError = (err: { message: string; code?: string }) => {
      setSocketError(err.message);
    };

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("error", onError);

    s.connect();

    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.off("error", onError);
    };
  }, []);

  const disconnect = useCallback(() => {
    const s = getSocket();
    s.disconnect();
  }, []);

  return { isConnected, socketError, disconnect };
}

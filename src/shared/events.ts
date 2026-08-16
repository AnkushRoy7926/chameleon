import type { Player, Room, GameAction } from "./types";

export interface ServerToClientEvents {
  session_restored: (data: { room: Room; gameState: unknown }) => void;
  session_expired: () => void;

  room_created: (data: { room: Room }) => void;
  player_joined: (data: { players: Player[] }) => void;
  player_left: (data: { playerId: string; players: Player[] }) => void;
  player_reconnected: (data: { playerId: string }) => void;

  game_started: (data: { gameState: unknown; phase: string }) => void;
  game_state_update: (data: { gameState: unknown; phase: string }) => void;
  game_over: (data: { winner: string; finalState: unknown }) => void;

  chat_message: (data: {
    id: string;
    playerId: string;
    playerName: string;
    content: string;
    timestamp: number;
    system?: boolean;
  }) => void;

  error: (data: { message: string; code?: string }) => void;
}

export interface ClientToServerEvents {
  create_room: (
    data: { gameId: string; settings?: Record<string, unknown> },
    callback: (result: {
      success: boolean;
      roomCode?: string;
      error?: string;
    }) => void
  ) => void;

  join_room: (
    data: { roomCode: string },
    callback: (result: { success: boolean; error?: string }) => void
  ) => void;

  leave_room: () => void;

  reconnect: (data: { roomCode: string; playerId: string; token: string }) => void;

  start_game: () => void;

  restart_game: (
    callback: (result: { success: boolean; error?: string }) => void
  ) => void;

  reshuffle_names: (
    callback: (result: { success: boolean; error?: string }) => void
  ) => void;

  get_game_state: (
    callback: (result: { success: boolean; gameState?: unknown; phase?: string; error?: string }) => void
  ) => void;

  player_action: (
    data: { action: GameAction },
    callback: (result: { success: boolean; error?: string }) => void
  ) => void;

  send_chat_message: (data: { content: string }) => void;

  player_ready: () => void;
}

export interface InterServerEvents {
  room_sync: (data: { roomCode: string; state: unknown }) => void;
}

export interface SocketData {
  playerId: string;
  playerName: string;
  roomCode: string;
  connectedAt: number;
}

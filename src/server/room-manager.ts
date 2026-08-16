import { ROOM_CODE_LENGTH, ROOM_CODE_ALPHABET, DISCONNECT_GRACE_MS } from "@shared/constants";
import type { Player, Room } from "@shared/types";
import {
  saveRoom,
  getRoom,
  deleteRoom,
  saveSession,
  deleteSession,
} from "./persistence/redis";
import { CHAMELEON_PLAYER_NAMES } from "../../games/chameleon/data/names";

const pendingDisconnects = new Map<string, NodeJS.Timeout>();

export function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_ALPHABET.charAt(
      Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)
    );
  }
  return code;
}

export function assignPlayerName(existingNames: string[]): string {
  const availableNames = CHAMELEON_PLAYER_NAMES.filter(
    (name) => !existingNames.includes(name)
  );

  if (availableNames.length === 0) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let suffix = "";
    for (let i = 0; i < 4; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `Player_${suffix}`;
  }

  return availableNames[Math.floor(Math.random() * availableNames.length)];
}

export async function createRoom(
  gameId: string,
  hostId: string,
  settings: Record<string, unknown> = {}
): Promise<Room> {
  let roomCode = generateRoomCode();
  let existingRoom = await getRoom(roomCode);

  while (existingRoom) {
    roomCode = generateRoomCode();
    existingRoom = await getRoom(roomCode);
  }

  const playerName = assignPlayerName([]);
  const player: Player = {
    id: hostId,
    name: playerName,
    isHost: true,
    isConnected: true,
    joinedAt: Date.now(),
  };

  const room: Room = {
    code: roomCode,
    gameId,
    players: [player],
    hostId,
    status: "waiting",
    settings,
    createdAt: Date.now(),
  };

  await saveRoom(room);
  return room;
}

export async function joinRoom(
  roomCode: string,
  playerId: string
): Promise<{ room: Room; player: Player } | { error: string }> {
  const room = await getRoom(roomCode);

  if (!room) {
    return { error: "Room not found" };
  }

  // Check if player is already in the room (reconnection)
  const existingPlayer = room.players.find((p) => p.id === playerId);
  if (existingPlayer) {
    existingPlayer.isConnected = true;
    await saveRoom(room);
    return { room, player: existingPlayer };
  }

  // Only allow new joins if game is in waiting status
  if (room.status !== "waiting") {
    return { error: "Game already in progress" };
  }

  if (room.players.length >= 12) {
    return { error: "Room is full" };
  }

  const existingNames = room.players.map((p) => p.name);
  const playerName = assignPlayerName(existingNames);

  const newPlayer: Player = {
    id: playerId,
    name: playerName,
    isHost: false,
    isConnected: true,
    joinedAt: Date.now(),
  };

  room.players.push(newPlayer);
  await saveRoom(room);

  return { room, player: newPlayer };
}

export async function leaveRoom(
  roomCode: string,
  playerId: string
): Promise<Room | null> {
  const room = await getRoom(roomCode);

  if (!room) {
    return null;
  }

  room.players = room.players.filter((p) => p.id !== playerId);

  if (room.players.length === 0) {
    await deleteRoom(roomCode);
    return null;
  }

  if (room.hostId === playerId) {
    const newHost = room.players[0];
    newHost.isHost = true;
    room.hostId = newHost.id;
  }

  await saveRoom(room);
  return room;
}

export function handleDisconnect(playerId: string, callback: () => void): void {
  const existingTimer = pendingDisconnects.get(playerId);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const timer = setTimeout(() => {
    pendingDisconnects.delete(playerId);
    callback();
  }, DISCONNECT_GRACE_MS);

  pendingDisconnects.set(playerId, timer);
}

export function cancelDisconnect(playerId: string): void {
  const timer = pendingDisconnects.get(playerId);
  if (timer) {
    clearTimeout(timer);
    pendingDisconnects.delete(playerId);
  }
}

export async function createReconnectionToken(
  roomCode: string,
  playerId: string
): Promise<string> {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  await saveSession(roomCode, playerId, token);
  return token;
}

export async function validateReconnectionToken(
  playerId: string,
  token: string
): Promise<boolean> {
  const { validateSession } = await import("./persistence/redis");
  return validateSession(playerId, token);
}

export async function removeReconnectionToken(
  playerId: string
): Promise<void> {
  await deleteSession(playerId);
}

import Redis from "ioredis";
import {
  REDIS_HOST,
  REDIS_PORT,
  REDIS_URL,
  SESSION_TTL_SECONDS,
  ROOM_TTL_SECONDS,
} from "@shared/constants";
import type { Player, Room } from "@shared/types";

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    if (REDIS_URL) {
      redis = new Redis(REDIS_URL, {
        retryStrategy(times) {
          if (times > 10) return null;
          return Math.min(100 * Math.pow(2, times - 1), 30000);
        },
        maxRetriesPerRequest: 3,
      });
    } else {
      redis = new Redis({
        host: REDIS_HOST,
        port: REDIS_PORT,
        retryStrategy(times) {
          if (times > 10) return null;
          return Math.min(100 * Math.pow(2, times - 1), 30000);
        },
        maxRetriesPerRequest: 3,
      });
    }

    redis.on("error", (err) => {
      console.error("Redis error:", err.message);
    });

    redis.on("connect", () => {
      console.log("Redis connected");
    });
  }
  return redis;
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}

export async function saveRoom(room: Room): Promise<void> {
  const r = getRedis();
  const key = `room:${room.code}`;

  await r.hset(key, {
    code: room.code,
    gameId: room.gameId,
    hostId: room.hostId,
    status: room.status,
    settings: JSON.stringify(room.settings),
    createdAt: room.createdAt.toString(),
  });

  await r.expire(key, ROOM_TTL_SECONDS);

  for (const player of room.players) {
    await savePlayer(room.code, player);
  }
}

export async function savePlayer(roomCode: string, player: Player): Promise<void> {
  const r = getRedis();
  const key = `room:${roomCode}:player:${player.id}`;

  await r.hset(key, {
    id: player.id,
    name: player.name,
    isHost: player.isHost.toString(),
    isConnected: player.isConnected.toString(),
    joinedAt: player.joinedAt.toString(),
  });

  await r.expire(key, ROOM_TTL_SECONDS);

  await r.sadd(`room:${roomCode}:players`, player.id);
  await r.expire(`room:${roomCode}:players`, ROOM_TTL_SECONDS);
}

export async function getRoom(roomCode: string): Promise<Room | null> {
  const r = getRedis();
  const key = `room:${roomCode}`;

  const data = await r.hgetall(key);
  if (!data || Object.keys(data).length === 0) {
    return null;
  }

  const playerIds = await r.smembers(`room:${roomCode}:players`);
  const players: Player[] = [];

  for (const playerId of playerIds) {
    const playerData = await r.hgetall(`room:${roomCode}:player:${playerId}`);
    if (playerData && Object.keys(playerData).length > 0) {
      players.push({
        id: playerData.id,
        name: playerData.name,
        isHost: playerData.isHost === "true",
        isConnected: playerData.isConnected === "true",
        joinedAt: parseInt(playerData.joinedAt),
      });
    }
  }

  return {
    code: data.code,
    gameId: data.gameId,
    players,
    hostId: data.hostId,
    status: data.status as Room["status"],
    settings: JSON.parse(data.settings || "{}"),
    createdAt: parseInt(data.createdAt),
  };
}

export async function deleteRoom(roomCode: string): Promise<void> {
  const r = getRedis();
  const playerIds = await r.smembers(`room:${roomCode}:players`);

  for (const playerId of playerIds) {
    await r.del(`room:${roomCode}:player:${playerId}`);
  }

  await r.del(`room:${roomCode}:players`);
  await r.del(`room:${roomCode}`);
  await r.del(`room:${roomCode}:game_state`);
}

export async function saveGameState(
  roomCode: string,
  gameState: unknown
): Promise<void> {
  const r = getRedis();
  await r.set(
    `room:${roomCode}:game_state`,
    JSON.stringify(gameState),
    "EX",
    ROOM_TTL_SECONDS
  );
}

export async function getGameState(roomCode: string): Promise<unknown | null> {
  const r = getRedis();
  const data = await r.get(`room:${roomCode}:game_state`);
  return data ? JSON.parse(data) : null;
}

export async function saveSession(
  roomCode: string,
  playerId: string,
  token: string
): Promise<void> {
  const r = getRedis();
  await r.hset(`session:${playerId}`, {
    roomCode,
    token,
    createdAt: Date.now().toString(),
  });
  await r.expire(`session:${playerId}`, SESSION_TTL_SECONDS);
}

export async function validateSession(
  playerId: string,
  token: string
): Promise<boolean> {
  const r = getRedis();
  const data = await r.hgetall(`session:${playerId}`);
  return data.token === token;
}

export async function deleteSession(playerId: string): Promise<void> {
  const r = getRedis();
  await r.del(`session:${playerId}`);
}

import type { Server, Socket } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from "@shared/events";
import type { GameAction } from "@shared/types";
import {
  createRoom,
  joinRoom,
  leaveRoom,
  handleDisconnect,
  cancelDisconnect,
  createReconnectionToken,
  validateReconnectionToken,
} from "./room-manager";
import { getGame } from "../../games/registry";
import { saveGameState, getGameState } from "./persistence/redis";
import { saveMatchResult } from "./persistence/sqlite";
import { chameleonGame, advancePhase } from "../../games/chameleon/definition";

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>;
type GameServer = Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>;

export function setupSocketHandlers(io: GameServer): void {
  io.on("connection", (socket: GameSocket) => {
    console.log(`Player connected: ${socket.id}`);

    socket.on("create_room", async (data, callback) => {
      try {
        const { gameId, settings } = data;

        const game = getGame(gameId);
        if (!game) {
          callback({ success: false, error: "Game not found" });
          return;
        }

        const playerId = socket.id;
        const room = await createRoom(gameId, playerId, settings);

        socket.data.playerId = playerId;
        socket.data.roomCode = room.code;

        socket.join(room.code);

        const token = await createReconnectionToken(room.code, playerId);

        socket.emit("room_created", { room });
        callback({ success: true, roomCode: room.code, playerId, token });
      } catch (error) {
        console.error("Create room error:", error);
        callback({ success: false, error: "Failed to create room" });
      }
    });

    socket.on("join_room", async (data, callback) => {
      try {
        const { roomCode } = data;
        const playerId = socket.id;
        console.log("[Server] join_room called:", { roomCode, playerId });

        const result = await joinRoom(roomCode, playerId);
        console.log("[Server] join_room result:", "error" in result ? result.error : "success");

        if ("error" in result) {
          callback({ success: false, error: result.error });
          return;
        }

        socket.data.playerId = playerId;
        socket.data.roomCode = roomCode;

        socket.join(roomCode);
        console.log("[Server] Socket joined room:", roomCode);

        const token = await createReconnectionToken(roomCode, playerId);

        const room = await getRoom(roomCode);
        if (room) {
          io.to(roomCode).emit("player_joined", { players: room.players });
        }

        callback({ success: true, playerId, token });
      } catch (error) {
        console.error("[Server] Join room error:", error);
        callback({ success: false, error: "Failed to join room" });
      }
    });

    socket.on("leave_room", async () => {
      try {
        const { playerId, roomCode } = socket.data;
        if (!roomCode || !playerId) return;

        const room = await leaveRoom(roomCode, playerId);
        socket.leave(roomCode);

        if (room) {
          io.to(roomCode).emit("player_left", {
            playerId,
            players: room.players,
          });
        }

        socket.data.roomCode = undefined;
      } catch (error) {
        console.error("Leave room error:", error);
      }
    });

    socket.on("reconnect", async (data) => {
      try {
        const { roomCode, playerId: oldPlayerId, token } = data;
        const newPlayerId = socket.id;

        const isValid = await validateReconnectionToken(oldPlayerId, token);
        if (!isValid) {
          socket.emit("session_expired");
          return;
        }

        cancelDisconnect(oldPlayerId);

        socket.data.playerId = newPlayerId;
        socket.data.roomCode = roomCode;

        socket.join(roomCode);

        const room = await getRoom(roomCode);
        if (room) {
          const player = room.players.find((p) => p.id === oldPlayerId);
          if (player) {
            player.id = newPlayerId;
            player.isConnected = true;
          }

          if (room.hostId === oldPlayerId) {
            room.hostId = newPlayerId;
          }

          await saveRoom(room);

          const gameState = await getGameState(roomCode);
          if (gameState) {
            schedulePhaseAdvance(io, roomCode, gameState);
          }

          const game = getGame(room.gameId);
          const playerView = game && gameState
            ? game.getPlayerView(gameState, newPlayerId)
            : gameState;

          const token2 = await createReconnectionToken(roomCode, newPlayerId);

          socket.emit("session_restored", {
            room,
            gameState: playerView || null,
          });

          socket.emit("reconnect_success", { playerId: newPlayerId, token: token2 });

          io.to(roomCode).emit("player_reconnected", { playerId: newPlayerId });
        }
      } catch (error) {
        console.error("Reconnect error:", error);
        socket.emit("session_expired");
      }
    });

    socket.on("start_game", async () => {
      try {
        const { playerId, roomCode } = socket.data;
        if (!roomCode || !playerId) return;

        const room = await getRoom(roomCode);
        if (!room) {
          socket.emit("error", { message: "Room not found" });
          return;
        }

        if (room.hostId !== playerId) {
          socket.emit("error", { message: "Only the host can start the game" });
          return;
        }

        const game = getGame(room.gameId);
        if (!game) {
          socket.emit("error", { message: "Game not found" });
          return;
        }

        if (room.players.length < game.minPlayers) {
          socket.emit("error", {
            message: `Need at least ${game.minPlayers} players`,
          });
          return;
        }

        let gameState = game.createInitialState(room.players, room.settings);
        const startResult = game.handleAction(
          gameState,
          { type: "START_GAME", payload: {} },
          playerId
        );

        if (startResult.error) {
          socket.emit("error", { message: startResult.error });
          return;
        }

        gameState = startResult.state;

        if (room.gameId === "chameleon") {
          gameState = await advanceChameleonState(
            gameState as ChameleonGameState
          );
        }

        const phase = game.getGamePhase(gameState);
        const playerView = game.getPlayerView(gameState, playerId);

        await saveGameState(roomCode, gameState);
        schedulePhaseAdvance(io, roomCode, gameState);

        room.status = "playing";
        await saveRoom(room);

        io.to(roomCode).emit("game_started", {
          gameState: playerView,
          phase,
        });

        for (const player of room.players) {
          if (player.id !== playerId) {
            const playerViewState = game.getPlayerView(gameState, player.id);
            io.to(player.id).emit("game_started", {
              gameState: playerViewState,
              phase,
            });
          }
        }
      } catch (error) {
        console.error("Start game error:", error);
        socket.emit("error", { message: "Failed to start game" });
      }
    });

    socket.on("restart_game", async (callback) => {
      try {
        const { playerId, roomCode } = socket.data;
        if (!roomCode || !playerId) {
          callback?.({ success: false, error: "Not in a room" });
          return;
        }

        const room = await getRoom(roomCode);
        if (!room) {
          callback?.({ success: false, error: "Room not found" });
          return;
        }

        if (room.hostId !== playerId) {
          callback?.({ success: false, error: "Only the host can replay the game" });
          return;
        }

        const game = getGame(room.gameId);
        if (!game) {
          callback?.({ success: false, error: "Game not found" });
          return;
        }

        if (room.players.length < game.minPlayers) {
          callback?.({
            success: false,
            error: `Need at least ${game.minPlayers} players`,
          });
          return;
        }

        let gameState = game.createInitialState(room.players, room.settings);
        const startResult = game.handleAction(
          gameState,
          { type: "START_GAME", payload: {} },
          playerId
        );

        if (startResult.error) {
          callback?.({ success: false, error: startResult.error });
          return;
        }

        gameState = startResult.state;

        if (room.gameId === "chameleon") {
          gameState = await advanceChameleonState(
            gameState as ChameleonGameState
          );
        }

        const phase = game.getGamePhase(gameState);

        await saveGameState(roomCode, gameState);
        schedulePhaseAdvance(io, roomCode, gameState);

        room.status = "playing";
        await saveRoom(room);

        for (const player of room.players) {
          const playerViewState = game.getPlayerView(gameState, player.id);
          io.to(player.id).emit("game_started", {
            gameState: playerViewState,
            phase,
          });
        }

        callback?.({ success: true });
      } catch (error) {
        console.error("Restart game error:", error);
        callback?.({ success: false, error: "Failed to restart game" });
      }
    });

    socket.on("reshuffle_names", async (callback) => {
      try {
        const { playerId, roomCode } = socket.data;
        if (!roomCode || !playerId) {
          callback({ success: false, error: "Not in a room" });
          return;
        }

        const room = await getRoom(roomCode);
        if (!room) {
          callback({ success: false, error: "Room not found" });
          return;
        }

        if (room.hostId !== playerId) {
          callback({ success: false, error: "Only the host can reshuffle names" });
          return;
        }

        const { CHAMELEON_PLAYER_NAMES } = await import("../../games/chameleon/data/names");
        const shuffled = [...CHAMELEON_PLAYER_NAMES].sort(() => Math.random() - 0.5);

        for (let i = 0; i < room.players.length; i++) {
          room.players[i].name = shuffled[i % shuffled.length];
        }

        await saveRoom(room);

        io.to(roomCode).emit("player_joined", { players: room.players });

        callback({ success: true });
      } catch (error) {
        console.error("Reshuffle names error:", error);
        callback({ success: false, error: "Failed to reshuffle names" });
      }
    });

    socket.on("get_game_state", async (callback) => {
      try {
        const { playerId, roomCode } = socket.data;
        console.log("[Server] get_game_state called:", { 
          socketId: socket.id, 
          playerId, 
          roomCode,
          hasPlayerId: !!playerId,
          hasRoomCode: !!roomCode 
        });
        
        if (!roomCode || !playerId) {
          console.log("[Server] get_game_state: Not in a room - socket.data:", socket.data);
          callback({ success: false, error: "Not in a room" });
          return;
        }

        const gameState = await getGameState(roomCode);
        console.log("[Server] get_game_state: gameState exists?", !!gameState);
        
        if (!gameState) {
          console.log("[Server] get_game_state: Game not found in Redis");
          callback({ success: false, error: "Game not found" });
          return;
        }

        const room = await getRoom(roomCode);
        console.log("[Server] get_game_state: room exists?", !!room);
        
        if (!room) {
          callback({ success: false, error: "Room not found" });
          return;
        }

        const game = getGame(room.gameId);
        console.log("[Server] get_game_state: game definition exists?", !!game);
        
        if (!game) {
          callback({ success: false, error: "Game not found" });
          return;
        }

        const phase = game.getGamePhase(gameState);
        const playerView = game.getPlayerView(gameState, playerId);
        console.log("[Server] get_game_state: returning phase:", phase);

        callback({ success: true, gameState: playerView, phase });
      } catch (error) {
        console.error("[Server] Get game state error:", error);
        callback({ success: false, error: "Failed to get game state" });
      }
    });

    socket.on("player_action", async (data, callback) => {
      try {
        const { playerId, roomCode } = socket.data;
        if (!roomCode || !playerId) {
          callback({ success: false, error: "Not in a room" });
          return;
        }

        const gameState = await getGameState(roomCode);
        if (!gameState) {
          callback({ success: false, error: "Game not found" });
          return;
        }

        const room = await getRoom(roomCode);
        if (!room) {
          callback({ success: false, error: "Room not found" });
          return;
        }

        const game = getGame(room.gameId);
        if (!game) {
          callback({ success: false, error: "Game not found" });
          return;
        }

        const result = game.handleAction(
          gameState,
          data.action,
          playerId
        );

        if (result.error) {
          callback({ success: false, error: result.error });
          return;
        }

        let newState = result.state;

        if (room.gameId === "chameleon") {
          newState = await advanceChameleonState(newState as ChameleonGameState);
        }

        await saveGameState(roomCode, newState);
        schedulePhaseAdvance(io, roomCode, newState);

        const phase = game.getGamePhase(newState);

        for (const player of room.players) {
          const playerViewState = game.getPlayerView(newState, player.id);
          io.to(player.id).emit("game_state_update", {
            gameState: playerViewState,
            phase,
          });
        }

        if (data.action.type === "SUBMIT_CLUE") {
          const player = room.players.find((p) => p.id === playerId);
          if (player) {
            const clueText = (data.action as any).payload?.clue || "???";
            io.to(roomCode).emit("chat_message", {
              id: `sys_${Date.now()}_clue`,
              playerId,
              playerName: player.name,
              content: `${player.name} submitted their clue: "${clueText}"`,
              timestamp: Date.now(),
              system: true,
            });
          }
        }

        if (data.action.type === "CAST_VOTE") {
          const player = room.players.find((p) => p.id === playerId);
          if (player) {
            io.to(roomCode).emit("chat_message", {
              id: `sys_${Date.now()}_vote`,
              playerId,
              playerName: player.name,
              content: `${player.name} has voted.`,
              timestamp: Date.now(),
              system: true,
            });
          }
        }

        const winCondition = game.checkWinCondition(newState);
        if (winCondition) {
          await finalizeGame(io, room, newState, winCondition);
        }

        callback({ success: true });
      } catch (error) {
        console.error("Player action error:", error);
        callback({ success: false, error: "Failed to process action" });
      }
    });

    socket.on("player_ready", async () => {
      const { playerId, roomCode } = socket.data;
      if (!roomCode || !playerId) return;

      io.to(roomCode).emit("player_reconnected", { playerId });
    });

    socket.on("send_chat_message", async (data) => {
      try {
        const { playerId, roomCode } = socket.data;
        if (!roomCode || !playerId) return;

        const room = await getRoom(roomCode);
        if (!room) return;

        const player = room.players.find((p) => p.id === playerId);
        if (!player) return;

        const message = {
          id: `msg_${Date.now()}_${playerId.slice(0, 8)}`,
          playerId,
          playerName: player.name,
          content: data.content.slice(0, 500),
          timestamp: Date.now(),
          system: false,
        };

        io.to(roomCode).emit("chat_message", message);
      } catch (error) {
        console.error("Chat message error:", error);
      }
    });

    socket.on("disconnect", () => {
      const { playerId, roomCode } = socket.data;

      if (playerId) {
        handleDisconnect(playerId, async () => {
          if (roomCode) {
            const room = await leaveRoom(roomCode, playerId);
            if (room) {
              io.to(roomCode).emit("player_left", {
                playerId,
                players: room.players,
              });
            }
          }
        });
      }

      console.log(`Player disconnected: ${socket.id}`);
    });
  });
}

async function getRoom(roomCode: string) {
  const { getRoom: getRoomFromRedis } = await import("./persistence/redis");
  return getRoomFromRedis(roomCode);
}

async function saveRoom(room: import("@shared/types").Room) {
  const { saveRoom: saveRoomToRedis } = await import("./persistence/redis");
  return saveRoomToRedis(room);
}

type ChameleonGameState = import("../../games/chameleon/state").ChameleonGameState;

const phaseTimers = new Map<string, NodeJS.Timeout>();

async function advanceChameleonState(
  state: ChameleonGameState
): Promise<ChameleonGameState> {
  const { getPhaseEndCondition } = await import("../../games/chameleon/rules");

  let chameleonState = state;
  while (getPhaseEndCondition(chameleonState)) {
    chameleonState = advancePhase(chameleonState);
  }
  return chameleonState;
}

function clearPhaseTimer(roomCode: string): void {
  const timer = phaseTimers.get(roomCode);
  if (timer) {
    clearTimeout(timer);
    phaseTimers.delete(roomCode);
  }
}

function schedulePhaseAdvance(
  io: GameServer,
  roomCode: string,
  gameState: unknown
): void {
  clearPhaseTimer(roomCode);

  const state = gameState as Partial<ChameleonGameState>;
  if (!state.phaseEndsAt || state.phaseEndsAt <= Date.now()) {
    return;
  }

  const delay = state.phaseEndsAt - Date.now() + 100;
  const timer = setTimeout(() => {
    void runPhaseAdvance(io, roomCode);
  }, delay);
  phaseTimers.set(roomCode, timer);
}

async function runPhaseAdvance(io: GameServer, roomCode: string): Promise<void> {
  phaseTimers.delete(roomCode);

  try {
    const room = await getRoom(roomCode);
    if (!room || room.status !== "playing") return;

    const game = getGame(room.gameId);
    if (!game) return;

    const gameState = await getGameState(roomCode);
    if (!gameState) return;

    const phaseBefore = game.getGamePhase(gameState);
    const advanced = await advanceChameleonState(
      gameState as ChameleonGameState
    );
    const phaseAfter = game.getGamePhase(advanced);

    if (phaseAfter === phaseBefore) return;

    await saveGameState(roomCode, advanced);

    for (const player of room.players) {
      const playerViewState = game.getPlayerView(advanced, player.id);
      io.to(player.id).emit("game_state_update", {
        gameState: playerViewState,
        phase: phaseAfter,
      });
    }

    const winCondition = game.checkWinCondition(advanced);
    if (winCondition) {
      await finalizeGame(io, room, advanced, winCondition);
      return;
    }

    schedulePhaseAdvance(io, roomCode, advanced);
  } catch (error) {
    console.error("Phase advance timer error:", error);
  }
}

async function finalizeGame(
  io: GameServer,
  room: import("@shared/types").Room,
  newState: ChameleonGameState,
  winCondition: string
): Promise<void> {
  clearPhaseTimer(room.roomCode);

  io.to(room.roomCode).emit("game_over", {
    winner: winCondition,
    finalState: newState,
  });

  await saveMatchResult(
    room.roomCode,
    room.gameId,
    winCondition,
    room.players.length,
    new Date(room.createdAt),
    new Date(),
    newState,
    room.players.map((p) => ({
      id: p.id,
      name: p.name,
      result:
        winCondition === "CHAMELEON"
          ? p.id === newState.chameleonId
            ? "winner"
            : "loser"
          : p.id === newState.chameleonId
            ? "loser"
            : "winner",
    }))
  );

  room.status = "finished";
  await saveRoom(room);
}

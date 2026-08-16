import { Server } from "socket.io";
import { createServer } from "node:http";
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from "./src/shared/events";
import { setupSocketHandlers } from "./src/server/socket-handlers";
import { closeRedis } from "./src/server/persistence/redis";
import { closeDb } from "./src/server/persistence/sqlite";

const PORT = parseInt(process.env.WS_PORT || "3001");

const httpServer = createServer();

const io = new Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>(
  httpServer,
  {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
    },
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
      skipMiddlewares: false,
    },
  }
);

setupSocketHandlers(io);

httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});

process.on("SIGINT", async () => {
  console.log("Shutting down...");
  io.close();
  await closeRedis();
  closeDb();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Shutting down...");
  io.close();
  await closeRedis();
  closeDb();
  process.exit(0);
});

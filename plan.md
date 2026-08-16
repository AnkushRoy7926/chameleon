# Chameleon Multiplayer Game Platform — Implementation Plan

## Architecture Overview

A real-time multiplayer game platform built with Next.js (App Router) + Socket.IO, designed as a reusable engine where additional games can be added without rewriting infrastructure.

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14+ (App Router), TypeScript, Tailwind CSS |
| Real-time | Socket.IO (standalone Node.js server) |
| Hot State | Redis (rooms, game state, sessions) |
| Cold State | SQLite via better-sqlite3 (match results, persistence) |
| Testing | Vitest + React Testing Library |
| DevOps | Docker for Redis, concurrently for parallel dev |

### Process Architecture

```
┌─────────────────────┐     ┌─────────────────────┐
│  Next.js Dev Server  │     │  Socket.IO Server    │
│  (port 3000)         │     │  (port 3001)         │
│  - SSR/SSG pages     │     │  - Game engine       │
│  - API routes        │     │  - Room management   │
│  - React components  │     │  - State machine     │
└─────────┬───────────┘     └─────────┬───────────┘
          │                           │
          │     WebSocket (Socket.IO) │
          └───────────┬───────────────┘
                      │
         ┌────────────┼────────────┐
         │            │            │
    ┌────▼────┐  ┌────▼────┐  ┌───▼────┐
    │  Redis  │  │  Redis  │  │ SQLite │
    │ (rooms) │  │(state)  │  │(persist│
    └─────────┘  └─────────┘  └────────┘
```

---

## Project Structure

```
chameleon/
├── package.json
├── tsconfig.json
├── tsconfig.server.json          # Separate TS config for server
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── vitest.config.ts
├── docker-compose.yml            # Redis
├── .env.local                    # Environment variables
├── server.ts                     # Standalone Socket.IO server entry
│
├── src/
│   ├── shared/                   # Shared types (client + server)
│   │   ├── types.ts              # Core game types
│   │   ├── events.ts             # Socket.IO event interfaces
│   │   └── constants.ts          # Shared constants
│   │
│   ├── server/                   # Socket.IO server code
│   │   ├── index.ts              # Server bootstrap
│   │   ├── room-manager.ts       # Room CRUD + player management
│   │   ├── game-engine.ts        # Generic game engine
│   │   ├── socket-handlers.ts    # Event handlers
│   │   ├── persistence/
│   │   │   ├── redis.ts          # Redis client + helpers
│   │   │   └── sqlite.ts         # SQLite client + schema
│   │   └── middleware/
│   │       └── validation.ts     # Zod schemas for events
│   │
│   ├── app/                      # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Landing page
│   │   ├── globals.css
│   │   ├── create/
│   │   │   └── page.tsx          # Create room
│   │   ├── join/
│   │   │   └── page.tsx          # Join room
│   │   ├── games/
│   │   │   ├── page.tsx          # Game selection
│   │   │   └── chameleon/
│   │   │       └── page.tsx      # Chameleon info
│   │   └── room/
│   │       └── [roomCode]/
│   │           ├── page.tsx      # Room lobby
│   │           └── game/
│   │               └── page.tsx  # Active game
│   │
│   ├── components/
│   │   ├── ui/                   # Base UI components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── modal.tsx
│   │   │   ├── badge.tsx
│   │   │   └── toast.tsx
│   │   ├── lobby/
│   │   │   ├── create-room-form.tsx
│   │   │   ├── join-room-form.tsx
│   │   │   └── game-selector.tsx
│   │   ├── room/
│   │   │   ├── player-list.tsx
│   │   │   ├── room-code-display.tsx
│   │   │   └── ready-button.tsx
│   │   ├── game/
│   │   │   └── chameleon/         # Chameleon journal UI (Phasmophobia notebook style)
│   │   │       ├── ChameleonJournal.tsx   # Main journal shell (spreads, tabs, overlays)
│   │   │       ├── CluesPage.tsx          # Investigation notes / clue list + submission
│   │   │       ├── WordPoolPage.tsx       # Deduction notebook + chameleon final guess
│   │   │       ├── ChatPage.tsx           # Discussion log (always open)
│   │   │       ├── VotingPanel.tsx        # Voting interface (with skip)
│   │   │       ├── VoteResultPage.tsx     # Vote tally display
│   │   │       ├── GameResult.tsx         # Win/loss + reveal
│   │   │       ├── WordDeductionBoard.tsx # Reusable evidence cards + marks
│   │   │       ├── TurnIndicator.tsx      # Clue-turn / phase status
│   │   │       ├── RulesPage.tsx          # Rules part 1
│   │   │       ├── RulesPageTwo.tsx       # Rules part 2
│   │   │       ├── JournalTabs.tsx        # Tab bar
│   │   │       └── types.ts               # Client GameState + helpers
│   │   └── providers/
│   │       └── socket-provider.tsx   # Socket.IO React context
│   │
│   ├── lib/
│   │   ├── socket-client.ts      # Client-side Socket.IO singleton
│   │   ├── use-game.ts           # Game state hook
│   │   └── use-socket.ts         # Socket connection hook
│   │
│   └── types/
│       └── index.ts              # Client-specific types
│
├── games/
│   ├── registry.ts               # Game registry
│   ├── types.ts                  # GameDefinition interface
│   └── chameleon/
│       ├── definition.ts         # Game definition
│       ├── state.ts              # State type + initial state
│       ├── actions.ts            # Move handlers
│       ├── rules.ts              # Phase transitions, win conditions
│       ├── player-view.ts        # Secret info filtering
│       └── data/
│           └── categories.ts     # 10+ categories with 8-12 answers
│
├── tests/
│   ├── unit/
│   │   ├── games/
│   │   │   └── chameleon/
│   │   │       ├── rules.test.ts
│   │   │       ├── actions.test.ts
│   │   │       └── player-view.test.ts
│   │   ├── server/
│   │   │   ├── room-manager.test.ts
│   │   │   └── game-engine.test.ts
│   │   └── lib/
│   │       └── validation.test.ts
│   ├── integration/
│   │   ├── socket-events.test.ts
│   │   └── game-flow.test.ts
│   └── security/
│       └── info-leak.test.ts
│
└── scripts/
    └── dev.ts                    # Dev script (starts both servers)
```

---

## Implementation Phases

### Phase 1: Project Setup + Shared Types (Foundation)

**Files to create:**
- `package.json` — Dependencies
- `tsconfig.json` — TypeScript config
- `tsconfig.server.json` — Server-specific TS config
- `next.config.ts` — Next.js config
- `tailwind.config.ts` — Tailwind config
- `postcss.config.js` — PostCSS
- `vitest.config.ts` — Test config
- `docker-compose.yml` — Redis container
- `.env.local` — Environment variables
- `src/shared/types.ts` — Core types
- `src/shared/events.ts` — Socket.IO event types
- `src/shared/constants.ts` — Shared constants

**Key types in `src/shared/types.ts`:**

```typescript
// Player
interface Player {
  id: string;
  name: string;
  isHost: boolean;
  isConnected: boolean;
  joinedAt: number;
}

// Room
interface Room {
  code: string;
  gameId: string;
  players: Player[];
  hostId: string;
  status: 'waiting' | 'playing' | 'finished';
  settings: Record<string, unknown>;
  createdAt: number;
}

// Game Definition (generic interface)
interface GameDefinition {
  id: string;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  createInitialState: (players: Player[], settings: Record<string, unknown>) => unknown;
  handleAction: (state: unknown, action: GameAction, playerId: string) => unknown;
  getAvailableActions: (state: unknown, playerId: string) => GameAction[];
  getPlayerView: (state: unknown, playerId: string) => unknown;
  getGamePhase: (state: unknown) => string;
  checkWinCondition: (state: unknown) => string | null;
}

// Game Action
interface GameAction {
  type: string;
  payload: Record<string, unknown>;
}
```

**Key types in `src/shared/events.ts`:**

```typescript
// Server -> Client
interface ServerToClientEvents {
  // Connection
  session_restored: (data: { room: Room; gameState: unknown }) => void;
  session_expired: () => void;

  // Room
  room_created: (data: { room: Room }) => void;
  player_joined: (data: { players: Player[] }) => void;
  player_left: (data: { playerId: string; players: Player[] }) => void;
  player_reconnected: (data: { playerId: string }) => void;

  // Game
  game_started: (data: { gameState: unknown; phase: string }) => void;
  game_state_update: (data: { gameState: unknown; phase: string }) => void;
  game_over: (data: { winner: string; finalState: unknown }) => void;

  // Error
  error: (data: { message: string; code?: string }) => void;
}

// Client -> Server
interface ClientToServerEvents {
  // Room
  create_room: (data: { gameId: string; settings?: Record<string, unknown> }, callback: (result: { success: boolean; roomCode?: string; error?: string }) => void) => void;
  join_room: (data: { roomCode: string }, callback: (result: { success: boolean; error?: string }) => void) => void;
  leave_room: () => void;
  reconnect: (data: { roomCode: string; playerId: string; token: string }) => void;

  // Game
  start_game: () => void;
  restart_game: (callback: (result: { success: boolean; error?: string }) => void) => void;
  player_action: (data: { action: GameAction }, callback: (result: { success: boolean; error?: string }) => void) => void;
  player_ready: () => void;
}
```

**Dependencies (`package.json`):**

```json
{
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "socket.io": "^4.7.0",
    "socket.io-client": "^4.7.0",
    "ioredis": "^5.4.0",
    "better-sqlite3": "^11.0.0",
    "zod": "^3.23.0",
    "nanoid": "^5.0.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.3.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "@types/react": "^18.3.0",
    "@types/better-sqlite3": "^7.6.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "vitest": "^1.6.0",
    "@testing-library/react": "^15.0.0",
    "@testing-library/jest-dom": "^6.4.0",
    "jsdom": "^24.0.0",
    "tsx": "^4.0.0",
    "concurrently": "^8.2.0"
  }
}
```

---

### Phase 2: Socket.IO Server + Room Management

**Files to create:**
- `server.ts` — Server entry point
- `src/server/index.ts` — Server bootstrap
- `src/server/room-manager.ts` — Room CRUD
- `src/server/socket-handlers.ts` — Event handlers
- `src/server/persistence/redis.ts` — Redis client
- `src/server/persistence/sqlite.ts` — SQLite client
- `src/server/middleware/validation.ts` — Zod validation

**Server entry (`server.ts`):**

```typescript
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { setupSocketHandlers } from './src/server/socket-handlers';

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: false,
  },
});

setupSocketHandlers(io);

const PORT = parseInt(process.env.WS_PORT || '3001');
httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});
```

**Room Manager (`src/server/room-manager.ts`):**

Key responsibilities:
- Generate 5-character room codes (nanoid with custom alphabet)
- Create/join/leave rooms
- Player name assignment (Reverend Insanity characters)
- Reconnection token management
- Delayed cleanup on disconnect (30s grace period)
- Persist room state to Redis

**Redis Schema (`src/server/persistence/redis.ts`):**

```
room:{code}                    → Hash (gameId, hostId, status, settings, createdAt)
room:{code}:players            → Set (player IDs)
room:{code}:player:{id}        → Hash (name, isHost, isConnected, joinedAt)
room:{code}:game_state         → String (JSON-serialized game state)
room:{code}:session:{playerId} → Hash (token, connectedAt) — for reconnection
```

**SQLite Schema (`src/server/persistence/sqlite.ts`):**

```sql
CREATE TABLE match_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_code TEXT NOT NULL,
  game_id TEXT NOT NULL,
  winner TEXT NOT NULL,
  player_count INTEGER NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT NOT NULL,
  duration_seconds REAL NOT NULL,
  final_state TEXT NOT NULL
);

CREATE TABLE match_players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER NOT NULL REFERENCES match_results(id),
  player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  result TEXT NOT NULL,
  UNIQUE(match_id, player_id)
);
```

---

### Phase 3: Game Engine Core

**Files to create:**
- `games/types.ts` — GameDefinition interface
- `games/registry.ts` — Game registry
- `src/server/game-engine.ts` — Generic engine

**Game Definition Interface (`games/types.ts`):**

```typescript
type GamePhase = string;

interface PhaseConfig {
  next: GamePhase | ((state: unknown) => GamePhase | undefined);
  onBegin?: (state: unknown) => unknown;
  onEnd?: (state: unknown) => unknown;
}

interface GameDefinition<G = unknown> {
  id: string;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  phases: Record<GamePhase, PhaseConfig>;

  createInitialState: (players: Player[], settings: Record<string, unknown>) => G;

  handleAction: (state: G, action: GameAction, playerId: string) => {
    state: G;
    error?: string;
  };

  getAvailableActions: (state: G, playerId: string) => GameAction[];

  getPlayerView: (state: G, playerId: string) => unknown;

  getGamePhase: (state: G) => GamePhase;

  checkWinCondition: (state: G) => string | null;

  getPhaseEndCondition: (state: G) => boolean;
}
```

**Game Registry (`games/registry.ts`):**

```typescript
const registry = new Map<string, GameDefinition>();

export function registerGame(game: GameDefinition): void;
export function getGame(gameId: string): GameDefinition | undefined;
export function getAllGames(): GameDefinition[];
```

**Game Engine (`src/server/game-engine.ts`):**

Key responsibilities:
- Initialize game state from definition
- Process player actions through definition.handleAction
- Check phase end conditions
- Transition phases via definition.phases
- Broadcast state updates via Socket.IO
- Call definition.checkWinCondition after each action
- Generate per-player views via definition.getPlayerView

---

### Phase 4: Chameleon Game Implementation

**Files to create:**
- `games/chameleon/definition.ts`
- `games/chameleon/state.ts`
- `games/chameleon/actions.ts`
- `games/chameleon/rules.ts`
- `games/chameleon/player-view.ts`
- `games/chameleon/data/categories.ts`
- `games/chameleon/data/names.ts`

**Game Flow (Revised):**

```
LOBBY
↓
ROUND_START
↓
CATEGORY_REVEAL
↓
CLUE_PHASE_1 ──────────────────────────┐
↓                                      │ (First round: 2 clue phases,
CLUE_PHASE_2                           │  then straight to VOTING — no DISCUSSION)
↓                                      │
VOTING                                 │
↓                                      │
VOTE_RESULT                            │
  ├─ Majority vote → chameleon EJECTED ┼──→ CHAMELEON_GUESS → GAME_RESULT (caught: chameleon gets a final guess)
  ├─ Majority vote → innocent EJECTED ─┼──→ GAME_RESULT (escaped: chameleon wins immediately)
  └─ Draw ─────────────────────────────┘
        ↓
  CLUE_PHASE_1 ────────────────────────┐
  ↓                                    │ (Subsequent rounds: 1 clue phase)
  VOTING                               │
  ↓                                    │
  VOTE_RESULT                          │
    ├─ Majority vote → chameleon EJECTED ┼──→ CHAMELEON_GUESS → GAME_RESULT
    ├─ Majority vote → innocent EJECTED ─┼──→ GAME_RESULT
    └─ Draw ───────────────────────────┘
          ↓
    Repeat until someone is ejected
```

Notes on the flow:
- Clue submissions are **turn-gated** (the current player is `alivePlayers[clueCount % alivePlayers.length]`; the server rejects others with "It's not your turn to give a clue").
- **Skip votes**: any player may abstain with `targetId: "skip"`. All alive players must vote/skip before `VOTING` ends; skipped votes are ignored by the majority check.
- `DISCUSSION` still exists as a phase only for backward compatibility with stale in-flight states — `getPhaseEndCondition("DISCUSSION")` is `true`, so it auto-advances to `VOTING` and is never entered in new games.

**State Type (`games/chameleon/state.ts`):**

```typescript
type ChameleonPhase =
  | 'LOBBY'
  | 'ROUND_START'
  | 'CATEGORY_REVEAL'
  | 'CLUE_PHASE_1'    // First clue round (always happens)
  | 'CLUE_PHASE_2'    // Second clue round (only in initial round)
  | 'DISCUSSION'
  | 'VOTING'
  | 'VOTE_RESULT'
  | 'CHAMELEON_GUESS'
  | 'GAME_RESULT';

interface ChameleonGameState {
  phase: ChameleonPhase;
  players: Player[];
  round: number;              // Increments on each voting round
  clueRound: number;          // Which clue phase we're in (1 or 2)
  isFirstVotingRound: boolean; // True until first vote completes
  chameleonId: string;
  category: string;
  answer: string;
  clues: Array<{ playerId: string; clue: string }>;
  votes: Record<string, string>;   // voterId -> targetId, or "skip" to abstain
  ejectedPlayerId?: string;     // Player ejected by majority vote
  playerDeductions: Record<string, Record<string, DeductionState>>; // per-player notebooks
  chameleonGuess?: string;
  winner?: 'CHAMELEON' | 'PLAYERS';
  phaseStartedAt: number;
  phaseEndsAt?: number;
}

type DeductionState = 'UNKNOWN' | 'POSSIBLE' | 'ELIMINATED';
export const SKIP_VOTE = 'skip';
```

**Phase Transition Logic:**

- `CLUE_PHASE_1` → `CLUE_PHASE_2` (only if `isFirstVotingRound === true`, i.e. the very first round)
- `CLUE_PHASE_1` → `VOTING` (if `isFirstVotingRound === false`, i.e. after a draw)
- `CLUE_PHASE_2` → `VOTING`
- `VOTE_RESULT` → `CHAMELEON_GUESS` (if the ejected player was the chameleon)
- `VOTE_RESULT` → `GAME_RESULT` (if an innocent was ejected — the chameleon escaped and wins; `winner` is set to `CHAMELEON` by `advancePhase`)
- `VOTE_RESULT` → `CLUE_PHASE_1` (if draw, set `isFirstVotingRound = false`, increment `round`)
- `CHAMELEON_GUESS` → `GAME_RESULT` (once the chameleon submits a guess)
- `DISCUSSION` → `VOTING` (dead path, auto-advances; never entered in new games)
- Each voting round increments `round` counter

**Player View Filtering (`games/chameleon/player-view.ts`):**

`getPlayerView(state, playerId)` returns a **phase-specific view** — there is no single flat shape; each phase branch returns only the fields that are safe for that player/phase. Key rules:

- `isChameleon` is always included (whether *you* are the chameleon)
- `knownAnswer` is `false` for the chameleon and the real answer for non-chameleons (never sent in `LOBBY`)
- `playerDeductions` is **your own** notebook during play (`deductionsOwner: "me"`); non-chameleons see the **chameleon's** notebook read-only during `CHAMELEON_GUESS` and `GAME_RESULT` (`deductionsOwner: "chameleon"`)
- `votes` + `ejectedPlayerId` exposed from `VOTE_RESULT` onward; `ejectedWasChameleon` (whether the ejected player was the chameleon) exposed in `VOTE_RESULT`, `CHAMELEON_GUESS`, `GAME_RESULT`
- `chameleonGuess` + `winner` only at `GAME_RESULT`; `chameleonId` only revealed at `GAME_RESULT`
- `canGuess: true` only for the chameleon during `CHAMELEON_GUESS` — **even if the chameleon was ejected** (a caught chameleon still gets a final guess to win)

**Game Data (`games/chameleon/data/categories.ts`):**

10+ categories, each with 8-12 answers:

```typescript
const categories = [
  {
    name: "Reverend Insanity Venerables",
    answers: [
      "Primordial Origin Immortal Venerable",
      "Star Constellation Immortal Venerable",
      "Limitless Demon Venerable",
      "Red Lotus Demon Venerable",
      "Genesis Lotus Immortal Venerable",
      "Reckless Savage Demon Venerable",
      "Thieving Heaven Demon Venerable",
      "Spectral Soul Demon Venerable",
      "Giant Sun Immortal Venerable",
      "Paradise Earth Immortal Venerable",
      "Heaven Refining Demon Venerable",
      "Great Love Immortal Venerable",
    ],
  },
  {
    name: "Pizza Toppings",
    answers: ["Pepperoni", "Mushrooms", "Onions", "Sausage", "Bacon", "Extra Cheese", "Black Olives", "Green Peppers", "Pineapple", "Jalapeños"],
  },
  {
    name: "Types of Pasta",
    answers: ["Spaghetti", "Penne", "Fusilli", "Rigatoni", "Farfalle", "Linguine", "Gnocchi", "Ravioli", "Lasagna", "Orzo"],
  },
  {
    name: "Animals",
    answers: ["Dog", "Cat", "Elephant", "Giraffe", "Penguin", "Dolphin", "Eagle", "Lion", "Octopus", "Tiger"],
  },
  {
    name: "Fruits",
    answers: ["Apple", "Banana", "Orange", "Strawberry", "Mango", "Watermelon", "Grapes", "Pineapple", "Cherry", "Peach"],
  },
  {
    name: "Superpowers",
    answers: ["Flight", "Invisibility", "Super Strength", "Telepathy", "Time Travel", "Teleportation", "Super Speed", "Mind Control", "Shape Shifting", "X-Ray Vision"],
  },
  {
    name: "Board Games",
    answers: ["Monopoly", "Chess", "Clue", "Risk", "Settlers of Catan", "Scrabble", "Ticket to Ride", "Pandemic", "Codenames", "Avalon"],
  },
  {
    name: "Movies",
    answers: ["The Godfather", "Inception", "Pulp Fiction", "The Matrix", "Forrest Gump", "Interstellar", "Gladiator", "The Dark Knight", "Titanic", "Avatar"],
  },
  {
    name: "Video Games",
    answers: ["Minecraft", "Fortnite", "The Legend of Zelda", "Super Mario Bros", "Grand Theft Auto", "Call of Duty", "Minecraft", "Roblox", "Among Us", "Valorant"],
  },
  {
    name: "Types of Coffee",
    answers: ["Espresso", "Cappuccino", "Latte", "Americano", "Mocha", "Macchiato", "Cold Brew", "Flat White", "Affogato", "Irish Coffee"],
  },
  {
    name: "Planets",
    answers: ["Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto", "Moon"],
  },
  {
    name: "Musical Instruments",
    answers: ["Guitar", "Piano", "Violin", "Drums", "Flute", "Saxophone", "Trumpet", "Cello", "Harmonica", "Ukulele"],
  },
];
```

**Player Names (`games/chameleon/data/names.ts`):**

```typescript
const CHAMELEON_PLAYER_NAMES = [
  "Primordial Origin Immortal Venerable",
  "Star Constellation Immortal Venerable",
  "Limitless Demon Venerable",
  "Red Lotus Demon Venerable",
  "Genesis Lotus Immortal Venerable",
  "Reckless Savage Demon Venerable",
  "Thieving Heaven Demon Venerable",
  "Spectral Soul Demon Venerable",
  "Giant Sun Immortal Venerable",
  "Paradise Earth Immortal Venerable",
  "Heaven Refining Demon Venerable",
  "Great Love Immortal Venerable",
];
```

---

### Phase 5: Next.js Pages + Socket Client

**Files to create:**
- `src/app/layout.tsx`
- `src/app/page.tsx` — Landing page
- `src/app/globals.css`
- `src/app/create/page.tsx`
- `src/app/join/page.tsx`
- `src/app/games/page.tsx`
- `src/app/games/chameleon/page.tsx`
- `src/app/room/[roomCode]/page.tsx` — Lobby
- `src/app/room/[roomCode]/game/page.tsx` — Active game
- `src/lib/socket-client.ts`
- `src/components/providers/socket-provider.tsx`

**Socket Client (`src/lib/socket-client.ts`):**

```typescript
"use client";

import { io, Socket } from "socket.io-client";
import type { ServerToClientEvents, ClientToServerEvents } from "@/shared/events";

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: GameSocket | null = null;

export function getSocket(): GameSocket {
  if (typeof window === "undefined") return null!;
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_WS_URL!, {
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
    });
  }
  return socket;
}
```

**Landing Page (`src/app/page.tsx`):**

- Dark theme with game-night aesthetic
- Two prominent cards: "Create Room" and "Join Room"
- Game selection grid
- Subtle animations

**Create Room Page (`src/app/create/page.tsx`):**

- Game selector dropdown
- Max players slider/input
- Optional game settings
- Creates room via Socket.IO
- Redirects to lobby with room code

**Join Room Page (`src/app/join/page.tsx`):**

- Room code input (5 characters)
- Join button
- Redirects to lobby

**Lobby (`src/app/room/[roomCode]/page.tsx`):**

- Room code display with share link
- Player list with names and host indicator
- Ready/start buttons
- Game info panel

---

### Phase 6: Chameleon UI Components

**Files created:**
- `src/components/game/chameleon/ChameleonJournal.tsx`
- `src/components/game/chameleon/CluesPage.tsx`
- `src/components/game/chameleon/WordPoolPage.tsx`
- `src/components/game/chameleon/ChatPage.tsx`
- `src/components/game/chameleon/VotingPanel.tsx`
- `src/components/game/chameleon/VoteResultPage.tsx`
- `src/components/game/chameleon/GameResult.tsx`
- `src/components/game/chameleon/WordDeductionBoard.tsx`
- `src/components/game/chameleon/TurnIndicator.tsx`
- `src/components/game/chameleon/RulesPage.tsx`
- `src/components/game/chameleon/RulesPageTwo.tsx`
- `src/components/game/chameleon/JournalTabs.tsx`
- `src/components/game/chameleon/types.ts`

**ChameleonJournal.tsx:**

Main journal shell that renders based on phase:
- Spread layout (Clues & Word Pool / Discussion & Voting / Rules) with page tabs and arrow nav
- `VOTE_RESULT` and `GAME_RESULT` render as single full-page layouts instead of spreads
- Overlays for ROUND_START, CATEGORY_REVEAL, and the CHAMELEON_GUESS outcome (caught vs. escaped)
- Dismissible "YOUR TURN" toast when it becomes the player's clue turn
- Dismissible "VOTING TIME" toast when the game enters VOTING (all players)

**GameResult.tsx:**

- Reveals the answer, the chameleon's identity, their guess + verdict, all clues, all votes, and the chameleon's investigation board
- Subtitle reflects the four outcomes (caught/escaped × chameleon won/lost); escape now ends the game immediately, so a won-by-escape has no guess shown
- "Homepage" button (`router.push("/")`) and "Play Again" button (emits `restart_game`, host-only; errors surface inline)

**WordDeductionBoard.tsx (replaces the planned elimination-board):**

- Grid of evidence cards, one per possible answer
- Click cycles `UNKNOWN → POSSIBLE → ELIMINATED → UNKNOWN` (dispatch `UPDATE_DEDUCTION`)
- `POSSIBLE` renders an animated hand-drawn ellipse mark; `ELIMINATED` renders an animated strike line (text fades)
- Private during gameplay, revealed at CHAMELEON_GUESS / GAME_RESULT
- `interactive={false}` renders a read-only board (GameResult)

**VotingPanel.tsx:**

- Grid of player cards plus a "Skip" button
- Click to select target, confirm to dispatch `CAST_VOTE`
- Cannot vote for self; buttons disabled after voting
- Per-target live vote counts shown

**VoteResultPage.tsx:**

- Shows who was ejected, draw status, and whether the ejected player was the chameleon
- On draw: "No majority" message — a new round begins with one clue phase

---

### Phase 7: Testing

**Files to create:**
- `tests/unit/games/chameleon/rules.test.ts`
- `tests/unit/games/chameleon/actions.test.ts`
- `tests/unit/games/chameleon/player-view.test.ts`
- `tests/unit/server/room-manager.test.ts`
- `tests/unit/server/game-engine.test.ts`
- `tests/integration/socket-events.test.ts`
- `tests/integration/game-flow.test.ts`
- `tests/security/info-leak.test.ts`

**Key test cases:**

1. **Game Logic Tests:**
   - Chameleon assignment is random and unique
   - Answer selection is random
   - Clue submission only during CLUE_PHASE_1 and CLUE_PHASE_2
   - Vote counting works correctly
   - Draw handling: after first vote draw, only one clue phase before next vote
   - Draw handling: subsequent draws continue single-clue-phase loop
   - Ejection occurs on majority vote
   - Chameleon guess validation
   - Win condition checking

2. **Security Tests:**
   - Chameleon ID not leaked to non-chameleon players
   - Answer not leaked to chameleon
   - Other players' views don't contain secret info
   - Client state inspection doesn't reveal secrets

3. **Room Management Tests:**
   - Room code generation (unique, 5 chars)
   - Player name assignment (unique from pool)
   - Host migration on host disconnect
   - Reconnection token validation
   - Delayed cleanup works

4. **Integration Tests:**
   - Full game flow from create to result
   - Multiple players joining
   - Player disconnect and reconnect
   - Page refresh recovery

---

## Environment Variables (`.env.local`)

```bash
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=http://localhost:3001

# WebSocket Server
WS_PORT=3001

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# SQLite
SQLITE_DB_PATH=./data/chameleon.db

# Development
NODE_ENV=development
```

---

## How to Run Locally

```bash
# 1. Install dependencies
npm install

# 2. Start Redis (Docker)
docker-compose up -d

# 3. Start both servers (dev mode)
npm run dev

# This runs:
# - Next.js dev server on http://localhost:3000
# - Socket.IO server on http://localhost:3001
```

**package.json scripts:**

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:next\" \"npm run dev:server\"",
    "dev:next": "next dev",
    "dev:server": "tsx watch server.ts",
    "build": "next build",
    "start": "node dist/server.js",
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "lint": "next lint",
    "typecheck": "tsc --noEmit"
  }
}
```

---

## How to Add a New Game

1. Create directory: `games/my-new-game/`
2. Create files:
   - `definition.ts` — Implement `GameDefinition` interface
   - `state.ts` — Define game state type
   - `actions.ts` — Implement move handlers
   - `rules.ts` — Phase transitions and win conditions
   - `player-view.ts` — Secret info filtering
   - `data/` — Game content
   - `components/` — React UI components
3. Register in `games/registry.ts`:

```typescript
import { myNewGame } from './my-new-game/definition';
registerGame(myNewGame);
```

4. The room system automatically supports the new game via `gameId`.

---

## Known Limitations

1. **Single Server Instance**: No horizontal scaling (Redis adapter would be needed for multi-server)
2. **No Authentication**: Player identity is session-based, not account-based
3. **No Persistence Across Restarts**: Redis data lost on container restart (configurable via Redis persistence)
4. **No Mobile Optimization**: Desktop-first as specified
5. **No Spectator Mode**: Only players can join rooms
6. **No Replay System**: Match results saved but not full replay data

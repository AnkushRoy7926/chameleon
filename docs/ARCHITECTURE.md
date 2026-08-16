# Chameleon Game Platform — Architecture Reference

## Overview

A real-time multiplayer web platform that recreates "The Chameleon" board game. Built with Next.js 14 (App Router), TypeScript, Tailwind CSS, Socket.IO (standalone server on port 3001), Redis (ephemeral state), and SQLite (match persistence).

**Running:** `npm run dev` starts both Next.js (port 3000) and the Socket.IO server (port 3001) concurrently. Redis must be running (`docker-compose up -d`). Existing rooms must create a new game to pick up engine changes (old states are left in Redis untouched).

---

## Directory Structure

```
chameleon/
├── server.ts                          # Standalone Socket.IO entry point (port 3001)
├── .env.local                         # Environment variables
├── docker-compose.yml                 # Redis container
├── next.config.mjs                    # Next.js config
├── tailwind.config.ts                 # Tailwind config
├── tsconfig.json                      # Next.js TypeScript config
├── tsconfig.server.json               # Server-side TypeScript config
├── vitest.config.ts                   # Test config
│
├── src/
│   ├── shared/                        # Shared types/events/constants (client + server)
│   │   ├── types.ts                   # Player, Room, GameDefinition interfaces
│   │   ├── events.ts                  # Socket.IO event type definitions
│   │   └── constants.ts               # Room codes, timeouts, player names
│   │
│   ├── server/                        # Server-side logic
│   │   ├── socket-handlers.ts         # All Socket.IO event handlers
│   │   ├── room-manager.ts            # Room CRUD, player management, reconnection
│   │   └── persistence/
│   │       ├── redis.ts               # Redis: rooms, game state, sessions
│   │       └── sqlite.ts              # SQLite: match history, player results
│   │
│   ├── lib/                           # Client-side utilities
│   │   ├── socket-client.ts           # Socket.IO client singleton + useSocket hook
│   │   └── utils.ts                   # cn(), shuffle(), pickRandom()
│   │
│   ├── app/                           # Next.js App Router pages
│   │   ├── layout.tsx                 # Root layout
│   │   ├── page.tsx                   # Landing page
│   │   ├── globals.css                # ALL CSS (journal/book theme, ~1892 lines)
│   │   ├── create/page.tsx            # Create room page
│   │   ├── join/page.tsx              # Join room page
│   │   ├── games/page.tsx             # Game list
│   │   ├── games/chameleon/page.tsx   # Chameleon game info
│   │   ├── api/games/route.ts         # GET /api/games — game registry list
│   │   └── room/[roomCode]/
│   │       ├── page.tsx               # Lobby page
│   │       └── game/page.tsx          # Game page (socket wiring + journal)
│   │
│   └── components/game/chameleon/     # All UI components
│       ├── types.ts                   # Client-side GameState, ChatMessage, helpers
│       ├── ChameleonJournal.tsx        # Main journal shell (spread navigation)
│       ├── CluesPage.tsx              # Left page: clue list + clue submission
│       ├── WordPoolPage.tsx           # Right page: deduction notebook + final guess
│       ├── WordDeductionBoard.tsx     # Reusable deduction board + evidence card
│       ├── ChatPage.tsx               # Left page: discussion log + free chat
│       ├── RulesPage.tsx              # Left page: rules part 1
│       ├── RulesPageTwo.tsx           # Right page: rules part 2
│       ├── VotingPanel.tsx            # Right page: vote casting (+ skip)
│       ├── VoteResultPage.tsx         # Vote tally display
│       ├── TurnIndicator.tsx          # Current turn / phase status
│       ├── GameResult.tsx             # Final game outcome + investigation reveal
│       └── JournalTabs.tsx            # (unused, tabs are in ChameleonJournal)
│
├── games/                             # Game definitions (engine layer)
│   ├── registry.ts                    # Game registry (registerGame/getGame)
│   └── chameleon/
│       ├── definition.ts              # GameDefinition + advancePhase()
│       ├── actions.ts                 # All action handlers (START, CLUE, VOTE, DEDUCTION, GUESS)
│       ├── player-view.ts             # getPlayerView() — filtered state per player
│       ├── rules.ts                   # Phase transitions, win conditions, voting
│       ├── state.ts                   # ChameleonGameState + DeductionState + initializer
│       └── data/
│           ├── categories.ts          # 12 categories × 10 answers each
│           └── names.ts               # 12 Reverend Insanity player names
│
└── tests/
    ├── setup.ts                       # Test setup
    └── unit/
        ├── server/room-manager.test.ts
        └── games/chameleon/rules.test.ts
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React 18, TypeScript |
| Styling | Tailwind CSS + custom CSS (~1892 lines in globals.css) |
| Realtime | Socket.IO 4.7 (standalone server) |
| Ephemeral state | Redis (via ioredis) — rooms, game state, sessions |
| Persistent state | SQLite (via better-sqlite3) — match history |
| Testing | Vitest |
| Build | `next build` for frontend, `tsx` for server |

---

## Path Aliases

```json
{
  "@/*": "./src/*",
  "@shared/*": "./src/shared/*",
  "@games/*": "./games/*"
}
```

- `@shared/types` → `src/shared/types.ts`
- `@games/chameleon/definition` → `games/chameleon/definition.ts`
- `@/lib/socket-client` → `src/lib/socket-client.ts`

---

## Environment Variables (.env.local)

```
NEXT_PUBLIC_APP_URL=http://localhost:3000    # Next.js frontend
NEXT_PUBLIC_WS_URL=http://localhost:3001    # Socket.IO server
WS_PORT=3001                                # Socket.IO port
REDIS_HOST=localhost
REDIS_PORT=6379
SQLITE_DB_PATH=./data/chameleon.db
NODE_ENV=development
```

---

## Architecture: How It All Connects

### Startup Flow

1. `npm run dev` → runs `next dev` (port 3000) + `tsx watch server.ts` (port 3001)
2. `server.ts` creates an HTTP server, attaches Socket.IO, calls `setupSocketHandlers(io)`
3. `games/registry.ts` runs `registerGame(chameleonGame)` at import time
4. Client loads `src/app/room/[roomCode]/game/page.tsx` → connects to Socket.IO → fetches game state

### Game Lifecycle

```
LOBBY → ROUND_START → CATEGORY_REVEAL → CLUE_PHASE_1 → CLUE_PHASE_2 → VOTING → VOTE_RESULT
         ↑                                                                    │
         │                                      (draw: new round, 1 clue phase)│
         │                                                                    ▼
         │                                                  caught (ejected = chameleon) → CHAMELEON_GUESS → GAME_RESULT
         └────────────────────────────────────────────── CLUE_PHASE_1 ←── (escaped: innocent ejected → GAME_RESULT)
```

- **Round 1:** two clue phases (`CLUE_PHASE_1` → `CLUE_PHASE_2`), then straight to `VOTING`. There is **no DISCUSSION phase** — the game goes directly from clues to the vote.
- **After a draw:** a new round starts at `CLUE_PHASE_1` with only **one** clue phase, then `VOTING`.
- **Ejection:** `VOTE_RESULT` with an `ejectedPlayerId` branches on identity:
  - **Chameleon caught** (ejected player is the chameleon) → `CHAMELEON_GUESS` → `GAME_RESULT`. The chameleon gets one final guess (`canGuess: true` even when ejected) to win.
  - **Chameleon escaped** (innocent ejected) → game ends immediately at `GAME_RESULT` with `winner: "CHAMELEON"` — no guess is offered. The result screen reveals the chameleon and offers a homepage / play-again choice.
- **Caught vs. escaped:** the player view exposes `ejectedWasChameleon` (whether the ejected player was the chameleon) during `VOTE_RESULT`, `CHAMELEON_GUESS`, and `GAME_RESULT`.
- **DISCUSSION phase exists in the state machine for backward compatibility with stale states only.** `getPhaseEndCondition(DISCUSSION)` returns `true`, so any leftover DISCUSSION state is advanced straight to `VOTING` and the client never sees it in new games.

**Phase transitions** are driven by `getPhaseEndCondition()` in `rules.ts`. After every action, the server loops `while (getPhaseEndCondition(state)) { state = advancePhase(state); }` to skip through instant phases (ROUND_START, CATEGORY_REVEAL, VOTE_RESULT). `GAME_RESULT` returns `false` — it is a terminal phase, so the loop always stops there.

**Timers:** `advancePhase()` sets `phaseEndsAt` for DISCUSSION only (60s, dead path). The server schedules a `setTimeout` advance via `schedulePhaseAdvance()` when `phaseEndsAt` is set; the timer is cleared on every state change and on game finalization.

### Socket.IO Event Flow

**Client → Server:**
- `create_room` → creates room, returns roomCode
- `join_room` → joins existing room
- `leave_room` → leaves room
- `reconnect` → restores session via token
- `start_game` → host only, creates initial state, sends `game_started`
- `restart_game` → host only, starts a fresh game in the same room (same players), sends `game_started` to everyone — used by the "Play Again" button on `GAME_RESULT`
- `get_game_state` → returns current player view (also used for page-refresh recovery)
- `player_action` → generic action dispatch (SUBMIT_CLUE, CAST_VOTE, UPDATE_DEDUCTION, GUESS_ANSWER, ...)
- `player_ready` → marks player ready in lobby
- `send_chat_message` → broadcasts chat to room

**Server → Client:**
- `room_created` / `player_joined` / `player_left` / `player_reconnected` → room/roster changes
- `game_started` → initial game state per player
- `game_state_update` → filtered player view after every action
- `chat_message` → system messages (clue submissions, votes) + player chat
- `game_over` → final state + winner

### State Management

- **Redis** stores ephemeral state: rooms, game state, reconnection sessions
- **SQLite** stores persistent match history: results, players, durations
- Game state is stored as JSON in Redis key `room:{code}:game_state`
- `getPlayerView(state, playerId)` filters secrets (answer, chameleon identity) before sending to each player

---

## Game Engine (games/chameleon/)

### Key Files

| File | Purpose |
|------|---------|
| `state.ts` | `ChameleonGameState`, `DeductionState`, `SKIP_VOTE`, `createInitialChameleonState()` |
| `actions.ts` | `handleChameleonAction()` — all action handlers |
| `rules.ts` | `getPhaseEndCondition()`, `getNextPhase()`, `checkMajorityVote()`, `getAlivePlayers()` |
| `player-view.ts` | `getPlayerView()` — returns filtered state per player |
| `definition.ts` | `chameleonGame` (GameDefinition), `advancePhase()` |
| `data/categories.ts` | 12 categories with 10 answers each |
| `data/names.ts` | 12 player names (Reverend Insanity characters) |

### Action Types

```typescript
type ChameleonAction =
  | { type: "START_GAME"; payload: Record<string, never> }
  | { type: "SUBMIT_CLUE"; payload: { clue: string } }
  | { type: "CAST_VOTE"; payload: { targetId: string } }        // targetId === "skip" abstains
  | { type: "GUESS_ANSWER"; payload: { answer: string } }
  | { type: "UPDATE_DEDUCTION"; payload: { wordId: string; state: DeductionState } };
```

### ChameleonGameState

```typescript
type DeductionState = "UNKNOWN" | "POSSIBLE" | "ELIMINATED";

interface ChameleonGameState {
  phase: ChameleonPhase;
  players: Player[];
  round: number;
  clueRound: number;
  isFirstVotingRound: boolean;
  chameleonId: string;                 // Secret — only revealed to chameleon
  category: string;
  answer: string;                      // Secret — hidden from chameleon
  clues: Clue[];                       // Accumulated across the round (see below)
  votes: Record<string, string>;       // voterId -> targetId, or "skip"
  ejectedPlayerId?: string;
  chameleonGuess?: string;
  winner?: "CHAMELEON" | "PLAYERS";
  playerDeductions: Record<string, Record<string, DeductionState>>; // per-player notebooks
  phaseStartedAt: number;
  phaseEndsAt?: number;                // Only set for DISCUSSION (dead path)
}
```

### Important: Clues Array Is Cumulative

The `clues` array is NOT cleared between CLUE_PHASE_1 and CLUE_PHASE_2. It accumulates across the entire round:
- CLUE_PHASE_1 ends when `clues.length >= players.length`
- CLUE_PHASE_2 ends when `clues.length >= players.length * 2`
- When a new round starts (after `VOTE_RESULT` → `CLUE_PHASE_1`), `advancePhase()` clears `clues: []`, `votes: {}`, and `playerDeductions: {}`, sets `isFirstVotingRound = false`, and increments `round`.

### Important: Clue Turns Are Gated

`SUBMIT_CLUE` is **turn-gated** on the server: `getCurrentCluePlayerId()` picks the current player (`alivePlayers[phaseClueCount % alivePlayers.length]`), and any other player gets `"It's not your turn to give a clue"`. The client mirrors this with `isMyClueTurn()`.

### Important: Phase Advancement Loops

The server loops through instant-advance phases:
```typescript
while (getPhaseEndCondition(chameleonState)) {
  chameleonState = advancePhase(chameleonState);
}
```
This means ROUND_START, CATEGORY_REVEAL, and VOTE_RESULT are skipped instantly — the client never sees them (except VOTE_RESULT, which `advancePhase` never auto-leaves; it is a real, visible tally screen).

### Voting Rules

- Every alive player must cast a vote (or skip) before `VOTING` ends: `Object.keys(state.votes).length >= getAlivePlayers(state).length`.
- `SKIP_VOTE = "skip"` is a sentinel. Skipped votes are recorded in `votes` but **ignored** by `checkMajorityVote()`.
- A target is ejected only when they receive a strict majority: `Math.floor(players.length / 2) + 1`. A draw or no majority → new round (no ejection).

### Word Pool Deduction System (UPDATE_DEDUCTION)

Replaces the old eliminate/uneliminate actions. This is a **visual, private deduction notebook** — it is NOT an answer selector and the server never auto-derives marks from `secretAnswer`.

- Open to **all alive players** during `CLUE_PHASE_1`, `CLUE_PHASE_2`, `DISCUSSION`, `VOTING`, and `CHAMELEON_GUESS`. Rejected with `"Not in a phase where deductions can be updated"` otherwise.
- Stored per player: `playerDeductions[playerId] = { [wordId]: DeductionState }`. Absent key = `UNKNOWN`.
- The client cycles a word `UNKNOWN → POSSIBLE → ELIMINATED → UNKNOWN` on click (`nextDeductionState`). Sending `UNKNOWN` **deletes** the entry.
- The word must belong to the current category's pool (`CATEGORIES` lookup); otherwise `"Word is not in the word pool"`. Invalid states → `"Invalid deduction state"`.
- Marking the real answer `ELIMINATED` is allowed — deduction state is purely the player's hypothesis.
- **Privacy:** during gameplay each player only sees their own board (`deductionsOwner: "me"`). During `CHAMELEON_GUESS`, non-chameleons see the **chameleon's** board read-only (`deductionsOwner: "chameleon"`), which is also revealed at `GAME_RESULT`.

---

## Client Components (src/components/game/chameleon/)

### Page Spreads (ChameleonJournal.tsx)

The journal renders as a physical book with 3 spreads:

| Spread | Left Page | Right Page |
|--------|-----------|------------|
| **0** (Clues & Word Pool) | `CluesPage` | `WordPoolPage` |
| **1** (Discussion & Voting) | `ChatPage` | `VotingPanel` (only during VOTING), else `TurnIndicator` |
| **2** (Rules) | `RulesPageOne` | `RulesPageTwo` |

- Tabs at top switch between spreads; arrow buttons navigate left/right
- **No auto page-turning** — player controls which spread they view
- `VOTE_RESULT` and `GAME_RESULT` render as single full-page layouts (`VoteResultPage`, `GameResult`) instead of spreads
- A "YOUR TURN" toast alerts the player when it becomes their clue turn; overlays show round start, category reveal, and the chameleon-guess outcome (caught vs escaped)

### Key Component Behaviors

**CluesPage.tsx (Investigation Notes):**
- Lists all submitted clues in the current round with avatar, name, and order number
- Shows the clue submission box when `isMyClueTurn(gameState)` — with a dismissible "YOUR TURN" box
- The turn box can be dismissed (×) and reopened via a "Give clue" link; the dismissed state resets on `clueRound`/`round` change
- Shows "YOUR ANSWER:" annotation for non-chameleons, "YOU ARE THE CHAMELEON" annotation for the chameleon

**ChatPage.tsx (Discussion Log):**
- Chat input is **always rendered** (all phases) — chat is never locked
- During clue phases, shows the turn-gated clue submission box (dismissible, same pattern as CluesPage)
- Regular messages send via `send_chat_message`; clue/vote system messages arrive as `chat_message` with `system: true`

**WordPoolPage.tsx (deduction notebook):**
- Renders `WordDeductionBoard` over the current category's answers — **no `?`/`✓`/`X` symbols; the word itself is the interface**
- Interactive during play phases (`CLUE_PHASE_1`, `CLUE_PHASE_2`, `DISCUSSION`, `VOTING`) and for the chameleon during `CHAMELEON_GUESS`
- Each click dispatches `UPDATE_DEDUCTION` with the next state for that word
- During `CHAMELEON_GUESS`, the chameleon additionally sees a separate "Choose your final answer" list (any word selectable, including eliminated ones) → `GUESS_ANSWER`
- Non-chameleons during `CHAMELEON_GUESS` see the chameleon's board read-only titled "Chameleon's Investigation"
- During `GAME_RESULT`, `GameResult` shows the same board read-only plus the answer reveal

**WordDeductionBoard.tsx (reusable):**
- `WordDeductionBoard({ words, deductions, interactive, onDeductionChange })` — grid of evidence cards
- `WordEvidenceCard({ word, state, onClick, disabled })`:
  - `UNKNOWN` → plain text
  - `POSSIBLE` → hand-drawn SVG ellipse around the word (blue, `@keyframes evidenceDraw` 0.35s)
  - `ELIMINATED` → animated SVG strike line (red) + text at `opacity: 0.4`
- `nextDeductionState(state)` cycles `UNKNOWN → POSSIBLE → ELIMINATED → UNKNOWN`

**VotingPanel.tsx:**
- List of player vote buttons plus a "Skip" button
- Sends `CAST_VOTE` with `targetId` = player id or `"skip"`
- Shows per-target live vote counts and skip count; disables other buttons after voting

**TurnIndicator.tsx:**
- Shows current turn during clue phases with per-phase progress (`CLUE_PHASE_1`: `clueCount / players.length`; `CLUE_PHASE_2`: `(clueCount - players.length) / players.length`)
- Shows "CLUES COMPLETE" when all clues submitted; DISCUSSION/VOTING status labels

**GameResult.tsx:**
- Winner header (chameleon vs players), the answer reveal, chameleon identity + their guess + CORRECT/INCORRECT verdict, all clues, all votes, and the chameleon's investigation board (read-only `WordDeductionBoard`) with "THE ACTUAL ANSWER WAS"

### Types (types.ts)

```typescript
type DeductionState = "UNKNOWN" | "POSSIBLE" | "ELIMINATED";

interface GameState {        // Client-side (filtered by getPlayerView)
  phase: string;
  players: JournalPlayer[];
  round: number;
  clueRound: number;
  isChameleon: boolean;
  alive: boolean;
  knownAnswer?: string | false;
  category?: string;
  allClues?: JournalClue[];
  myClues?: JournalClue[];
  votes?: Record<string, string>;
  ejectedPlayerId?: string;
  ejectedWasChameleon?: boolean;  // whether the ejected player was the chameleon
  chameleonId?: string;
  winner?: string;
  message?: string;
  possibleAnswers?: string[];
  chameleonGuess?: string;
  hasVoted?: boolean;
  wasDraw?: boolean;
  canGuess?: boolean;             // true for the chameleon in CHAMELEON_GUESS (even if ejected)
  isFirstVotingRound?: boolean;
  hasClued?: boolean;
  votedFor?: string;
  currentCluePlayerId?: string;
  playerDeductions?: Record<string, DeductionState>;  // own board during play, chameleon's at reveal
  deductionsOwner?: "me" | "chameleon";
}
```

Helper functions: `getPlayerName()`, `getPlayerInitial()`, `isMyClueTurn()` (phase is a clue phase, not yet clued, and `currentCluePlayerId === "me"`).

---

## CSS Theme (globals.css)

The entire journal UI is styled in `src/app/globals.css` (~1892 lines). Key sections:

| Section | Lines | Description |
|---------|-------|-------------|
| Phasmophobia book theme | 68-88 | CSS custom properties for paper, ink, colors |
| Game diary theme | 90-128 | Scoped overrides: diary.jpg background, greyscale ink, padding |
| Loading / error states | 130-177 | `.journal-loading`, `.journal-error-toast` |
| Journal container | 141-181 | `.book-desk`, `.journal-*` |
| Physical book container | 182-219 | `.book`, `.book-full` |
| Page tabs | 220-251 | `.book-tab`, `.book-tab-active` |
| Book body / arrows | 252-300 | `.book-body`, `.book-arrow-left/right` |
| Two-page spread / page / spine | 301-416 | `.book-spread`, `.book-page`, `.book-spine` |
| Blank right page | 417-425 | `.book-blank-page` |
| Page content typography | 426-469 | `.book-page-title`, `.book-divider`, `.book-page-number` |
| Annotations / callouts | 470-511 | `.book-annotation`, labels, hints |
| Empty state | 512-529 | `.book-empty`, `.book-empty-hint` |
| Buttons / inputs | 530-606 | `.book-btn`, `.book-btn-danger`, `.book-input` |
| Overlays / transitions | 607-675 | `.book-overlay` (round start, category reveal, caught) |
| Turn alert toast | 676-734 | `.turn-alert-toast`, `.turn-alert-toast-top`, `.turn-alert-toast-voting` (dismissible × + VOTING variant) |
| Clues page | 735-867 | `.clues-list`, `.clue-entry`, `.clue-avatar` |
| Word pool (legacy) | 868-1018 | `.wordpool-grid` (superseded by word-evidence styles) |
| Chat / discussion page | 1019-1182 | `.chat-clue-box`, `.chat-messages-area`, `.chat-msg`, `.chat-input-row` |
| Voting panel | 1183-1248 | `.voting-list`, `.vote-btn`, `.vote-btn-skip` |
| Vote result | 1249-1332 | `.vote-results-list`, `.vote-result-entry` |
| Game result | 1333-1498 | `.book-result`, `.book-result-header`, `.book-result-actions`, `.book-result-error`, `.wordpool-result-answer` |
| Rules page | 1499-1541 | `.rules-section`, `.rules-heading` |
| Room code display | 1542-1557 | `.room-code-display` |
| Animations | 1558-1602 | `@keyframes fadeIn`, `slideUp`, `pulse`, turn indicator |
| Word deduction board | 1603-1731 | `.word-evidence-board/card/mark/ellipse/strike/text`, `@keyframes evidenceDraw`, `.wordpool-guess-option*` |
| Dismissable YOUR TURN box | 1732-1774 | `.chat-clue-box-top`, `.clue-box-dismiss`, `.clue-box-reopen` |
| Host controls | 1776-1812 | `.host-controls`, `.host-btn`, `.host-controls-status` |
| Responsive | 1852-1892 | Mobile: single page, no spine/arrows/right page |

---

## Server Architecture

### Socket Handlers (socket-handlers.ts)

All socket events are handled in `setupSocketHandlers(io)`. Key events:

- `create_room` → `createRoom()` → emits `room_created`
- `join_room` → `joinRoom()` → emits `player_joined` to room
- `start_game` → validates host + min players → creates state → runs `advanceChameleonState()` → emits `game_started` per player → schedules phase timer
- `player_action` → dispatches to `game.handleAction()` → loops phase advancement → saves state → emits `game_state_update` per player → emits system `chat_message` for clues/votes → checks win condition → `finalizeGame()`
- `get_game_state` → returns player view (used for refresh recovery)
- `send_chat_message` → broadcasts `chat_message` to room (content capped at 500 chars)
- `disconnect` → 30s grace period → `leaveRoom()` → emits `player_left`

Phase timer management (`phaseTimers` map keyed by room code):
- `schedulePhaseAdvance()` — clears the existing timer, schedules one when `phaseEndsAt` is in the future
- `runPhaseAdvance()` — re-advances the phase loop from the stored state and emits fresh views, re-schedules if needed
- `finalizeGame()` — clears the timer, emits `game_over`, saves the match to SQLite

### Room Manager (room-manager.ts)

- `createRoom()` — generates unique 5-char code, assigns random Reverend Insanity name
- `joinRoom()` — validates room exists, not full, not in progress
- `leaveRoom()` — removes player, transfers host if needed, deletes empty rooms
- `handleDisconnect()` — 30s grace period before removal
- `createReconnectionToken()` — 32-char random token stored in Redis

### Persistence

**Redis keys:**
- `room:{code}` — room hash (code, gameId, hostId, status, settings, createdAt)
- `room:{code}:players` — set of player IDs
- `room:{code}:player:{id}` — player hash
- `room:{code}:game_state` — JSON game state
- `session:{playerId}` — reconnection token hash

**SQLite tables:**
- `match_results` — room_code, game_id, winner, player_count, timestamps, final_state
- `match_players` — match_id, player_id, player_name, result (winner/loser)

---

## Extending with New Games

1. Create `games/mygame/` with: `state.ts`, `actions.ts`, `rules.ts`, `player-view.ts`, `definition.ts`
2. Implement `GameDefinition<MyGameState>` interface
3. Register in `games/registry.ts`: `registerGame(myGame)`
4. Create components in `src/components/game/mygame/`
5. Add route at `src/app/games/mygame/page.tsx`

The `GameDefinition` interface requires:
- `createInitialState(players, settings)` — initial state
- `handleAction(state, action, playerId)` — action handler
- `getAvailableActions(state, playerId)` — what actions a player can take
- `getPlayerView(state, playerId)` — filtered state (hides secrets)
- `getGamePhase(state)` — current phase string
- `checkWinCondition(state)` — winner or null
- `getPhaseEndCondition(state)` — should phase advance?

---

## Known Issues / Notes

- **Chat messages are ephemeral** — stored in client React state only, broadcast via socket, not persisted to Redis.
- **Deductions are private per player** — each player's notebook (`playerDeductions[playerId]`) is only sent to that player during gameplay. The chameleon's board is revealed at `CHAMELEON_GUESS` (to non-chameleons) and `GAME_RESULT` (to everyone). Deductions are never auto-computed from the server answer.
- **Deduction state is purely visual** — there are no `?`/`✓`/`X` badges; the word itself is the interface (POSSIBLE = ellipse, ELIMINATED = strike-through + muted text). The server stores only `{ wordId: state }` maps; absent key = UNKNOWN.
- **DISCUSSION is a dead path in new games** — `getNextPhase()` never routes to it anymore (clues go straight to `VOTING`); it exists only so stale in-flight states can advance cleanly.
- **Clues array is cumulative** — does NOT reset between CLUE_PHASE_1 and CLUE_PHASE_2. Only resets when a new round starts.
- **Phase advancement loops** — the server uses `while` loop to skip through instant phases (ROUND_START, CATEGORY_REVEAL, VOTE_RESULT).
- **`get_player_state` has verbose debug logging** — the `[Server]` console noise in `socket-handlers.ts` is intentional for development.
- **Old rooms/states in Redis are not migrated** — engine changes only affect newly started games.

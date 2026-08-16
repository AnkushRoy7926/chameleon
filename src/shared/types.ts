export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  isConnected: boolean;
  joinedAt: number;
}

export interface Room {
  code: string;
  gameId: string;
  players: Player[];
  hostId: string;
  status: "waiting" | "playing" | "finished";
  settings: Record<string, unknown>;
  createdAt: number;
}

export interface GameAction {
  type: string;
  payload: Record<string, unknown>;
}

export interface GameDefinition<G = unknown> {
  id: string;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;

  createInitialState: (
    players: Player[],
    settings: Record<string, unknown>
  ) => G;

  handleAction: (
    state: G,
    action: GameAction,
    playerId: string
  ) => { state: G; error?: string };

  getAvailableActions: (state: G, playerId: string) => GameAction[];

  getPlayerView: (state: G, playerId: string) => Record<string, unknown>;

  getGamePhase: (state: G) => string;

  checkWinCondition: (state: G) => string | null;

  getPhaseEndCondition: (state: G) => boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyGameDefinition = GameDefinition<any>;

export interface PhaseConfig<G> {
  next: string | ((state: G) => string | undefined);
  onBegin?: (state: G) => G;
  onEnd?: (state: G) => G;
}

export type GameId = string;
export type RoomCode = string;
export type PlayerId = string;

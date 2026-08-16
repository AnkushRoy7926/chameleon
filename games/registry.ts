import type { AnyGameDefinition } from "@shared/types";
import { chameleonGame } from "./chameleon/definition";

const registry = new Map<string, AnyGameDefinition>();

export function registerGame(game: AnyGameDefinition): void {
  if (registry.has(game.id)) {
    throw new Error(`Game with id ${game.id} already registered`);
  }
  registry.set(game.id, game);
}

export function getGame(gameId: string): AnyGameDefinition | undefined {
  return registry.get(gameId);
}

export function getAllGames(): AnyGameDefinition[] {
  return Array.from(registry.values());
}

export function getGameList(): Array<{
  id: string;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
}> {
  return getAllGames().map((game) => ({
    id: game.id,
    name: game.name,
    description: game.description,
    minPlayers: game.minPlayers,
    maxPlayers: game.maxPlayers,
  }));
}

registerGame(chameleonGame);

import { NextResponse } from "next/server";
import { getAllGames } from "../../../../games/registry";

export async function GET() {
  const games = getAllGames().map((game) => ({
    id: game.id,
    name: game.name,
    description: game.description,
    minPlayers: game.minPlayers,
    maxPlayers: game.maxPlayers,
  }));

  return NextResponse.json(games);
}

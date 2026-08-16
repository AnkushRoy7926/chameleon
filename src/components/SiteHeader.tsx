"use client";

import { usePathname } from "next/navigation";

export function SiteHeader() {
  const pathname = usePathname();
  const isGame = /^\/room\/[^/]+\/game/.test(pathname);

  if (isGame) return null;

  return (
    <header className="border-b border-border p-4">
      <div className="container mx-auto flex items-center justify-between">
        <a href="/" className="text-xl font-bold text-primary">
          Chameleon
        </a>
        <nav className="flex gap-4">
          <a
            href="/games"
            className="text-muted hover:text-white transition-colors"
          >
            Games
          </a>
          <a
            href="/create"
            className="text-muted hover:text-white transition-colors"
          >
            Create Room
          </a>
          <a
            href="/join"
            className="text-muted hover:text-white transition-colors"
          >
            Join Room
          </a>
        </nav>
      </div>
    </header>
  );
}

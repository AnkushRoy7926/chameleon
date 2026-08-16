import Link from "next/link";

export default function GamesPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Games</h1>

        <div className="grid gap-6">
          <Link href="/games/chameleon" className="card-hover group">
            <div className="flex items-start gap-4">
              <div className="text-5xl">🦎</div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                  The Chameleon
                </h2>
                <p className="text-muted mb-4">
                  One player is secretly the Chameleon. Give clues, discuss, and
                  vote to catch them before they guess the answer!
                </p>
                <div className="flex gap-4 text-sm">
                  <span className="badge-primary">3-12 Players</span>
                  <span className="badge-success">Social Deduction</span>
                  <span className="badge-warning">15-30 min</span>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

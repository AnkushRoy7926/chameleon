import Link from "next/link";

export default function ChameleonPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/games"
          className="text-muted hover:text-white transition-colors mb-6 inline-block"
        >
          ← Back to Games
        </Link>

        <div className="card mb-8">
          <div className="flex items-start gap-6">
            <div className="text-7xl">🦎</div>
            <div>
              <h1 className="text-3xl font-bold mb-2">The Chameleon</h1>
              <p className="text-muted mb-4">
                3-12 Players • Social Deduction • 15-30 minutes
              </p>
              <div className="flex gap-4">
                <Link href="/create?game=chameleon" className="btn-primary">
                  Create Room
                </Link>
                <Link href="/join" className="btn-secondary">
                  Join Room
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Objective</h2>
            <p className="text-muted">
              Identify the secret Chameleon before they can guess the hidden
              answer. The Chameleon wins if they survive until the end or
              correctly guess the answer after being caught.
            </p>
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Setup</h2>
            <ul className="text-muted space-y-2">
              <li>• One player is secretly chosen as the Chameleon</li>
              <li>• A category and answer are revealed to non-Chameleons</li>
              <li>• The Chameleon only sees the category, not the answer</li>
            </ul>
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Gameplay</h2>
            <ul className="text-muted space-y-2">
              <li>• Each player gives a one-word clue</li>
              <li>• Two rounds of clues before voting</li>
              <li>• Players discuss who they think is the Chameleon</li>
              <li>• Vote to eject a player</li>
              <li>• If it&apos;s a draw, one more clue round before voting again</li>
            </ul>
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold mb-4">End Game</h2>
            <ul className="text-muted space-y-2">
              <li>• If the Chameleon is ejected, they get one guess</li>
              <li>• Correct guess = Chameleon wins</li>
              <li>• Wrong guess = Players win</li>
              <li>• If the Chameleon is never caught, they win</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

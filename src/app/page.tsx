import Link from "next/link";

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Chameleon
        </h1>
        <p className="text-xl text-muted mb-12">
          A real-time multiplayer game platform. Catch the Chameleon before they
          guess the answer!
        </p>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <Link href="/create" className="card-hover group">
            <div className="text-4xl mb-4">🎮</div>
            <h2 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
              Create Room
            </h2>
            <p className="text-muted">
              Start a new game night. Choose your game and invite friends.
            </p>
          </Link>

          <Link href="/join" className="card-hover group">
            <div className="text-4xl mb-4">🎯</div>
            <h2 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
              Join Room
            </h2>
            <p className="text-muted">
              Have a room code? Jump right into the game.
            </p>
          </Link>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-4">How to Play</h2>
          <div className="grid md:grid-cols-3 gap-6 text-left">
            <div>
              <div className="text-2xl mb-2">1</div>
              <h3 className="font-medium mb-1">Create or Join</h3>
              <p className="text-sm text-muted">
                Start a room or join with a code from your host.
              </p>
            </div>
            <div>
              <div className="text-2xl mb-2">2</div>
              <h3 className="font-medium mb-1">Give Clues</h3>
              <p className="text-sm text-muted">
                Everyone gives a one-word clue. The Chameleon doesn&apos;t know
                the answer!
              </p>
            </div>
            <div>
              <div className="text-2xl mb-2">3</div>
              <h3 className="font-medium mb-1">Vote & Catch</h3>
              <p className="text-sm text-muted">
                Vote who you think is the Chameleon. Catch them to win!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

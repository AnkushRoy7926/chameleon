"use client";

export function RulesPageTwo() {
  return (
    <>
      <h2 className="book-page-title">Field Manual</h2>
      <p className="book-page-subtitle">continued</p>

      <div className="book-divider" />

      <div className="rules-section">
        <h3 className="rules-heading">Voting</h3>
        <ol className="rules-list">
          <li>Each player votes for who they think is the Chameleon.</li>
          <li>You cannot vote for yourself.</li>
          <li>Majority vote ejects that player.</li>
          <li>Draw means no ejection, new round begins.</li>
        </ol>
      </div>

      <div className="book-divider-thin" />

      <div className="rules-section">
        <h3 className="rules-heading">Chameleon Guess</h3>
        <p className="rules-text">
          If the Chameleon is ejected, they guess the answer.
          Use the Word Pool to track your deductions.
        </p>
      </div>

      <div className="book-divider-thin" />

      <div className="rules-section">
        <h3 className="rules-heading">Win Conditions</h3>
        <ul className="rules-list rules-list-bullet">
          <li>
            <strong>Chameleon wins</strong> if they guess correctly.
          </li>
          <li>
            <strong>Players win</strong> if the Chameleon guesses wrong,
            or is never caught.
          </li>
        </ul>
      </div>

      <div className="book-divider-thin" />

      <div className="rules-section">
        <h3 className="rules-heading">Word Pool</h3>
        <p className="rules-text">
          All players can see eliminations on the Word Pool page.
          The Chameleon marks words to eliminate them from consideration.
          These marks are visible to everyone throughout the game.
        </p>
      </div>

      <div className="book-divider-thin" />

      <div className="rules-section">
        <h3 className="rules-heading">Clue Submission</h3>
        <p className="rules-text">
          During the clue phase, submit your one-word clue on the
          Discussion page. Your clue will appear in the Discussion Log
          for all players to see.
        </p>
      </div>
    </>
  );
}

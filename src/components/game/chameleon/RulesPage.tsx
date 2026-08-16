"use client";

export function RulesPageOne() {
  return (
    <>
      <h2 className="book-page-title">Field Manual</h2>
      <p className="book-page-subtitle">How to Play</p>

      <div className="book-divider" />

      <div className="rules-section">
        <h3 className="rules-heading">Overview</h3>
        <p className="rules-text">
          One player is secretly the <strong>Chameleon</strong>. Everyone
          else knows the answer. The Chameleon must blend in by giving
          clues that sound plausible without actually knowing the answer.
        </p>
      </div>

      <div className="book-divider-thin" />

      <div className="rules-section">
        <h3 className="rules-heading">Setup</h3>
        <ol className="rules-list">
          <li>A category and secret answer are chosen.</li>
          <li>One player is secretly assigned as the Chameleon.</li>
          <li>Non-Chameleon players see the secret answer.</li>
          <li>The Chameleon only sees the category name.</li>
        </ol>
      </div>

      <div className="book-divider-thin" />

      <div className="rules-section">
        <h3 className="rules-heading">Clue Phase</h3>
        <ol className="rules-list">
          <li>Players give one-word clues, one at a time.</li>
          <li>The server determines the clue order automatically.</li>
          <li>Non-Chameleon: give a clue related to the answer.</li>
          <li>The Chameleon: give a clue that sounds like it fits.</li>
          <li>First round: two clues each. After a draw: one clue.</li>
        </ol>
      </div>

      <div className="book-divider-thin" />

      <div className="rules-section">
        <h3 className="rules-heading">Discussion</h3>
        <p className="rules-text">
          After all clues are given, players discuss who they think is
          the Chameleon. Use the Discussion log to communicate.
        </p>
      </div>
    </>
  );
}

"use client";

import type { JournalPage } from "./types";

const TABS: { id: JournalPage; label: string }[] = [
  { id: "clues", label: "CLUES" },
  { id: "wordpool", label: "WORD POOL" },
  { id: "chat", label: "CHAT" },
  { id: "rules", label: "RULES" },
];

export function JournalTabs({
  activePage,
  onPageChange,
}: {
  activePage: JournalPage;
  onPageChange: (page: JournalPage) => void;
}) {
  return (
    <nav className="journal-tabs">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onPageChange(tab.id)}
          className={`journal-tab ${activePage === tab.id ? "journal-tab-active" : ""}`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

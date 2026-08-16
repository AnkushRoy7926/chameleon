import { describe, it, expect } from "vitest";
import {
  generateRoomCode,
  assignPlayerName,
} from "../../../src/server/room-manager";

describe("Room Manager", () => {
  describe("generateRoomCode", () => {
    it("should generate 5-character codes", () => {
      for (let i = 0; i < 100; i++) {
        const code = generateRoomCode();
        expect(code).toHaveLength(5);
      }
    });

    it("should only contain valid characters", () => {
      const validChars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      for (let i = 0; i < 100; i++) {
        const code = generateRoomCode();
        for (const char of code) {
          expect(validChars).toContain(char);
        }
      }
    });
  });

  describe("assignPlayerName", () => {
    it("should assign unique names from pool", () => {
      const names: string[] = [];
      for (let i = 0; i < 12; i++) {
        const name = assignPlayerName(names);
        expect(names).not.toContain(name);
        names.push(name);
      }
    });

    it("should use fallback when pool exhausted", () => {
      const existingNames = [
        "Primordial Origin Immortal Venerable",
        "Star Constellation Immortal Venerable",
        "Limitless Demon Venerable",
        "Red Lotus Demon Venerable",
        "Genesis Lotus Immortal Venerable",
        "Reckless Savage Demon Venerable",
        "Thieving Heaven Demon Venerable",
        "Spectral Soul Demon Venerable",
        "Giant Sun Immortal Venerable",
        "Paradise Earth Immortal Venerable",
        "Heaven Refining Demon Venerable",
        "Great Love Immortal Venerable",
      ];

      const name = assignPlayerName(existingNames);
      expect(name).toMatch(/^Player_/);
    });
  });
});

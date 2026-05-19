import { describe, expect, it } from "vitest";
import {
  isManualRoomCountQuote,
  sanitizeRoomCountInput,
  validateNumRooms
} from "./roomCountValidation";

describe("sanitizeRoomCountInput", () => {
  it("removes zero and caps at property max", () => {
    expect(sanitizeRoomCountInput("0", "lagenhet")).toBe("");
    expect(sanitizeRoomCountInput("07", "lagenhet")).toBe("7");
    expect(sanitizeRoomCountInput("11", "lagenhet")).toBe("10");
  });
});

describe("isManualRoomCountQuote", () => {
  it("flags room counts above priced tiers", () => {
    expect(isManualRoomCountQuote("lagenhet", 7)).toBe(true);
    expect(isManualRoomCountQuote("lagenhet", 6)).toBe(false);
    expect(isManualRoomCountQuote("radhus", 8)).toBe(true);
    expect(isManualRoomCountQuote("radhus", 7)).toBe(false);
    expect(isManualRoomCountQuote("villa", 8)).toBe(true);
    expect(isManualRoomCountQuote("villa", 3)).toBe(false);
  });
});

describe("validateNumRooms", () => {
  it("rejects missing and out-of-range values", () => {
    expect(validateNumRooms("", "lagenhet")).toBe("Ange antal rum.");
    expect(validateNumRooms("0", "lagenhet")).toBe("Antal rum måste vara minst 1.");
    expect(validateNumRooms("8", "lagenhet")).toBe("");
    expect(validateNumRooms("11", "lagenhet")).toContain("högst 10");
  });
});

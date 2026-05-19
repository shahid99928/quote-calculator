import { describe, expect, it } from "vitest";
import {
  isManualWindowCountQuote,
  sanitizeWindowCountInput,
  validateWindowCount
} from "./windowCountValidation";

describe("windowCountValidation", () => {
  it("caps input at 100 windows", () => {
    expect(sanitizeWindowCountInput("150")).toBe("100");
    expect(sanitizeWindowCountInput("0")).toBe("");
  });

  it("validates range 1-100", () => {
    expect(validateWindowCount("0")).toContain("mellan 1 och 100");
    expect(validateWindowCount("101")).toContain("mellan 1 och 100");
    expect(validateWindowCount("60")).toBe("");
    expect(validateWindowCount("100")).toBe("");
  });

  it("detects window count above priced interval", () => {
    expect(isManualWindowCountQuote(61)).toBe(true);
    expect(isManualWindowCountQuote(60)).toBe(false);
    expect(isManualWindowCountQuote(100)).toBe(true);
  });
});

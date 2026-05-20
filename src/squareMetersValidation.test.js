import { describe, expect, it } from "vitest";
import {
  isManualSquareMetersQuote,
  sanitizeSquareMetersInput,
  validateSquareMeters
} from "./squareMetersValidation";

describe("squareMetersValidation", () => {
  it("caps input at service maximum", () => {
    expect(sanitizeSquareMetersInput("501", "Flyttstadning")).toBe("500");
    expect(sanitizeSquareMetersInput("10001", "Foretagsstadning")).toBe("10000");
    expect(sanitizeSquareMetersInput("0", "Flyttstadning")).toBe("");
  });

  it("validates ranges for housing and business", () => {
    expect(validateSquareMeters("19", "Flyttstadning")).toContain("mellan 20 och 500");
    expect(validateSquareMeters("600", "Flyttstadning")).toContain("mellan 20 och 500");
    expect(validateSquareMeters("49", "Foretagsstadning")).toContain("mellan 50 och 10000");
    expect(validateSquareMeters("10001", "Foretagsstadning")).toContain("mellan 50 och 10000");
    expect(validateSquareMeters("100", "Foretagsstadning")).toBe("");
    expect(validateSquareMeters("75", "Trappstadning BRFer")).toBe("");
    expect(validateSquareMeters("20", "Hemstadning")).toBe("");
  });

  it("detects kvm above priced interval for manual quote", () => {
    expect(isManualSquareMetersQuote(201, "Flyttstadning", "lagenhet")).toBe(true);
    expect(isManualSquareMetersQuote(200, "Flyttstadning", "lagenhet")).toBe(false);
    expect(isManualSquareMetersQuote(301, "Hemstadning", "radhus")).toBe(true);
    expect(isManualSquareMetersQuote(500, "Flyttstadning", "villa")).toBe(false);
    expect(isManualSquareMetersQuote(600, "Foretagsstadning", "")).toBe(true);
    expect(isManualSquareMetersQuote(500, "Foretagsstadning", "")).toBe(false);
  });
});

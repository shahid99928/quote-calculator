import { describe, expect, it } from "vitest";
import { getMinBookingDateString, isBookingDateNotInPast, validateBookingDate } from "./bookingDate";

describe("bookingDate", () => {
  it("rejects dates before min date", () => {
    expect(isBookingDateNotInPast("2020-01-01", "2026-05-19")).toBe(false);
    expect(isBookingDateNotInPast("2026-05-19", "2026-05-19")).toBe(true);
    expect(isBookingDateNotInPast("2026-05-20", "2026-05-19")).toBe(true);
  });

  it("returns validation message for past dates", () => {
    expect(validateBookingDate("2020-01-01")).toBe("Datumet kan inte ligga i det förflutna.");
    expect(validateBookingDate("")).toBe("Välj ett datum för bokningen.");
  });

  it("returns min date in YYYY-MM-DD format", () => {
    expect(getMinBookingDateString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

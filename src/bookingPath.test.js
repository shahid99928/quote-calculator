import { describe, expect, it } from "vitest";
import {
  BOOKING_PATH_PREFIX,
  parseBookingTokenFromLocation,
  stripBookingPathFromPathname
} from "./bookingPath.js";

describe("parseBookingTokenFromLocation", () => {
  it("reads token from /boka/{token} path", () => {
    expect(
      parseBookingTokenFromLocation({
        pathname: `${BOOKING_PATH_PREFIX}/abc123`,
        search: ""
      })
    ).toBe("abc123");
  });

  it("falls back to legacy bookingToken query param", () => {
    expect(
      parseBookingTokenFromLocation({
        pathname: "/",
        search: "?bookingToken=legacy"
      })
    ).toBe("legacy");
  });
});

describe("stripBookingPathFromPathname", () => {
  it("removes booking path segments", () => {
    expect(stripBookingPathFromPathname(`${BOOKING_PATH_PREFIX}/secret`)).toBe("");
  });
});

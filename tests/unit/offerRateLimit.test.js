import { describe, expect, it } from "vitest";
import { getClientIp, normalizeRateLimitEmail } from "../../supabase/functions/calculate-offer/offerRateLimit.ts";

describe("offerRateLimit helpers", () => {
  it("getClientIp prefers cf-connecting-ip", () => {
    const req = new Request("https://example.com", {
      headers: {
        "cf-connecting-ip": "203.0.113.1",
        "x-forwarded-for": "198.51.100.1, 203.0.113.2"
      }
    });
    expect(getClientIp(req)).toBe("203.0.113.1");
  });

  it("normalizeRateLimitEmail lowercases and trims", () => {
    expect(normalizeRateLimitEmail("  Test@Example.COM ")).toBe("test@example.com");
  });
});

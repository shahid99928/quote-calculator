import { describe, expect, it } from "vitest";
import {
  getOfferSubmitErrorMessage,
  isOfferRateLimitError
} from "./offerSubmitErrors.js";

describe("getOfferSubmitErrorMessage", () => {
  it("shows friendly rate limit text without technical prefix", () => {
    const msg = getOfferSubmitErrorMessage(
      "För många offertförfrågningar. Du kan skicka högst 10 förfrågningar per timme.",
      null
    );
    expect(msg).toContain("gränsen");
    expect(msg).toContain("timme");
    expect(msg).not.toContain("Kunde inte beräkna offert");
    expect(msg).not.toContain("Captcha");
  });

  it("maps captcha failure without English prefix", () => {
    const msg = getOfferSubmitErrorMessage("Captcha verification failed.", null);
    expect(msg).not.toContain("Captcha verification failed");
    expect(msg).toContain("captcha");
  });

  it("detects rate limit from 429 hint", () => {
    expect(isOfferRateLimitError("", new Error("Edge function returned status 429."))).toBe(true);
  });
});

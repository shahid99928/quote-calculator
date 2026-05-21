import { describe, expect, it } from "vitest";
import { getOfferDeliveryWarningMessage } from "./offerDeliveryMessage.js";

describe("getOfferDeliveryWarningMessage", () => {
  it("returns empty when delivery succeeded", () => {
    expect(getOfferDeliveryWarningMessage({ deliveryWarning: false })).toBe("");
  });

  it("explains saved quote when both channels fail", () => {
    const msg = getOfferDeliveryWarningMessage({
      deliveryWarning: true,
      deliveryIssue: "customer_channels_failed",
      offertForfraganId: 42,
      emailDelivered: false,
      smsDelivered: false
    });
    expect(msg).toContain("42");
    expect(msg).toContain("sparad");
    expect(msg).not.toContain("OBS:");
  });
});

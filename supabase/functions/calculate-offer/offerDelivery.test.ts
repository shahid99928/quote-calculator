import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { summarizeOfferDelivery } from "./offerDelivery.ts";

Deno.test("summarizeOfferDelivery flags missing booking link", () => {
  const summary = summarizeOfferDelivery("", {
    emailStatus: "sent",
    smsStatus: "sent",
    emailError: null,
    smsError: null
  });
  assertEquals(summary.deliveryWarning, true);
  assertEquals(summary.deliveryIssue, "no_booking_link");
});

Deno.test("summarizeOfferDelivery warns when both channels fail", () => {
  const summary = summarizeOfferDelivery("https://app.example/boka/tok", {
    emailStatus: "failed",
    smsStatus: "skipped",
    emailError: "x",
    smsError: null
  });
  assertEquals(summary.deliveryWarning, true);
  assertEquals(summary.deliveryIssue, "customer_channels_failed");
  assertEquals(summary.emailDelivered, false);
});

Deno.test("summarizeOfferDelivery ok when one channel succeeds", () => {
  const summary = summarizeOfferDelivery("https://app.example/boka/tok", {
    emailStatus: "sent",
    smsStatus: "failed",
    emailError: null,
    smsError: "x"
  });
  assertEquals(summary.deliveryWarning, false);
  assertEquals(summary.deliveryIssue, "none");
});

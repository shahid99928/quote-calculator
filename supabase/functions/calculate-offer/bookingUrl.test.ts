import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildBookingUrl, isBookingPageHost, resolveBookingBaseUrl } from "./bookingUrl.ts";

Deno.test("allowlist rejects unknown and blocked hosts", () => {
  assertEquals(isBookingPageHost("www.valstadat.com"), false);
  assertEquals(isBookingPageHost("evil-site.vercel.app"), false);
  assertEquals(isBookingPageHost("quote-calculator-teal.vercel.app"), true);
  assertEquals(isBookingPageHost("quote-calculator-git-main-hausai.vercel.app"), true);
  assertEquals(isBookingPageHost("localhost"), true);
});

Deno.test("buildBookingUrl adds bookingToken query param", () => {
  const url = buildBookingUrl("https://quote-calculator-teal.vercel.app", "abc123");
  assertEquals(url, "https://quote-calculator-teal.vercel.app/?bookingToken=abc123");
});

Deno.test("resolveBookingBaseUrl rejects phishing payload", () => {
  const req = new Request("https://example.com", {
    headers: { referer: "https://www.valstadat.com/kontakt" }
  });
  const base = resolveBookingBaseUrl(req, "https://evil-site.vercel.app/");
  assertEquals(base, "");
});

Deno.test("resolveBookingBaseUrl accepts allowlisted payload", () => {
  const req = new Request("https://example.com");
  const base = resolveBookingBaseUrl(req, "https://quote-calculator-teal.vercel.app/");
  assertEquals(base, "https://quote-calculator-teal.vercel.app");
});

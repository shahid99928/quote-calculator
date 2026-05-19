import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildBookingUrl, isBookingPageHost, resolveBookingBaseUrl } from "./bookingUrl.ts";

Deno.test("rejects valstadat.com as booking host", () => {
  assertEquals(isBookingPageHost("www.valstadat.com"), false);
  assertEquals(isBookingPageHost("quote-calculator-teal.vercel.app"), true);
});

Deno.test("buildBookingUrl adds bookingToken query param", () => {
  const url = buildBookingUrl("https://quote.example.com", "abc123");
  assertEquals(url, "https://quote.example.com/?bookingToken=abc123");
});

Deno.test("resolveBookingBaseUrl prefers payload over blocked referer", () => {
  const req = new Request("https://example.com", {
    headers: { referer: "https://www.valstadat.com/kontakt" }
  });
  const base = resolveBookingBaseUrl(req, "https://quote.example.com/");
  assertEquals(base, "https://quote.example.com");
});

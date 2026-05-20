import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  assertBookingAccess,
  createBookingTokenExpiresAt,
  emailsMatch,
  isBookingTokenExpired,
  toPublicBookingOffer
} from "./bookingTokenAuth.ts";

const sampleRow = {
  id: 1,
  tjanst_typ: "Flyttstadning",
  offert: 1000,
  stad: "Stockholm",
  telefon: "0701234567",
  epost: "Kund@Example.com",
  skapad: "2026-05-01T10:00:00Z",
  boknings_token_galler_till: "2099-01-01T00:00:00Z"
};

Deno.test("emailsMatch is case-insensitive", () => {
  assertEquals(emailsMatch("Kund@Example.com", " kund@example.com "), true);
});

Deno.test("assertBookingAccess rejects expired token", () => {
  assertEquals(
    assertBookingAccess(
      { ...sampleRow, boknings_token_galler_till: "2020-01-01T00:00:00Z" },
      "kund@example.com"
    ),
    false
  );
});

Deno.test("toPublicBookingOffer omits contact fields", () => {
  const pub = toPublicBookingOffer(sampleRow);
  assertEquals(Object.keys(pub).sort(), ["id", "offert", "skapad", "stad", "tjanst_typ"]);
});

Deno.test("createBookingTokenExpiresAt adds TTL days", () => {
  const expires = createBookingTokenExpiresAt(new Date("2026-05-01T12:00:00Z"));
  assertEquals(isBookingTokenExpired(expires), false);
});

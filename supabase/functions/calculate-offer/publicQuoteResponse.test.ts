import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { toPublicCalculateOfferQuote } from "./publicQuoteResponse.ts";

Deno.test("toPublicCalculateOfferQuote omits token and contact fields", () => {
  const publicQuote = toPublicCalculateOfferQuote({
    id: 1,
    tjanst_typ: "Flyttstadning",
    offert: 4200,
    stad: "Stockholm",
    skapad: "2026-05-20T12:00:00Z",
    offert_forfragan_id: 99
  });

  assertEquals(publicQuote.id, 1);
  assertEquals(publicQuote.offert, 4200);
  assertEquals(publicQuote.offert_forfragan_id, 99);
  assertEquals(Object.keys(publicQuote).sort(), [
    "id",
    "offert",
    "offert_forfragan_id",
    "skapad",
    "stad",
    "tjanst_typ"
  ]);
});

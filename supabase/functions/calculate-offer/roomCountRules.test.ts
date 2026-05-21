import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { validateNumRoomsForProperty } from "./roomCountRules.ts";

Deno.test("villa requires at least 3 rooms on backend", () => {
  assertEquals(validateNumRoomsForProperty("villa", 2), "Villa requires at least 3 room(s).");
  assertEquals(validateNumRoomsForProperty("villa", 3), null);
  assertEquals(validateNumRoomsForProperty("lagenhet", 2), null);
});

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  isManualSquareMetersQuote,
  validateSquareMetersForService,
  getSquareMetersLimitsForService
} from "./squareMetersRules.ts";

Deno.test("housing kvm limits 20-500", () => {
  const limits = getSquareMetersLimitsForService("Flyttstadning", true);
  assertEquals(validateSquareMetersForService(19, limits), "squareMeters must be between 20 and 500.");
  assertEquals(validateSquareMetersForService(20, limits), null);
});

Deno.test("business kvm limits 50-1000", () => {
  const limits = getSquareMetersLimitsForService("Foretagsstadning", false);
  assertEquals(validateSquareMetersForService(1000, limits), null);
  assertEquals(validateSquareMetersForService(1001, limits), "squareMeters must be between 50 and 1000.");
});

Deno.test("manual quote when kvm above priced max", () => {
  assertEquals(isManualSquareMetersQuote("Flyttstadning", "lagenhet", 151, true), true);
  assertEquals(isManualSquareMetersQuote("Foretagsstadning", "", 600, false), true);
  assertEquals(isManualSquareMetersQuote("Foretagsstadning", "", 500, false), false);
});

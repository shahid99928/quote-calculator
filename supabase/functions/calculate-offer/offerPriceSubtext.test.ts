import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { getOfferPriceSubtext, isExklMomsRutOfferService } from "./offerPriceSubtext.ts";

Deno.test("business and stair services use exkl moms/RUT subtext", () => {
  assertEquals(isExklMomsRutOfferService("Trappstadning BRFer"), true);
  assertEquals(isExklMomsRutOfferService("Foretagsstadning"), true);
  assertEquals(isExklMomsRutOfferService("kontorstädning"), true);
  assertEquals(getOfferPriceSubtext("kontorstädning"), "Priset är exkl. moms och RUT-avdrag.");
});

Deno.test("housing services use inkl moms/RUT subtext", () => {
  assertEquals(getOfferPriceSubtext("Flyttstadning"), "Priset är inkl. moms och efter RUT-avdraget");
  assertEquals(getOfferPriceSubtext("Fonsterputs"), "Priset är inkl. moms och efter RUT-avdraget");
});

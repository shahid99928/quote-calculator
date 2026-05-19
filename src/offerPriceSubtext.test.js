import { describe, expect, it } from "vitest";
import { getOfferPriceSubtext, isExklMomsRutOfferService } from "./offerPriceSubtext";

describe("offerPriceSubtext", () => {
  it("uses exkl text for business and stair services", () => {
    expect(isExklMomsRutOfferService("Foretagsstadning")).toBe(true);
    expect(isExklMomsRutOfferService("industristädning")).toBe(true);
    expect(getOfferPriceSubtext("butikstädning")).toBe("Priset är exkl. moms och RUT-avdrag.");
  });

  it("uses inkl text for housing services", () => {
    expect(getOfferPriceSubtext("Hemstadning")).toBe("Priset är inkl. moms och efter RUT-avdraget");
  });
});

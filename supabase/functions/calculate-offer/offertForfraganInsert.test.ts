import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildOffertForfraganRow } from "./offertForfraganInsert.ts";

const baseParams = {
  persistedServiceType: "Fonsterputs",
  normalizedPropertyType: "villa",
  numRooms: 0,
  squareMeters: 0,
  frequency: "",
  businessLocalType: "",
  workstations: 0,
  stairwells: 0,
  floors: 0,
  elevators: 0,
  stairFrequency: "",
  windowCount: 75,
  windowType: "2-sidiga (In/utvandiga)",
  glazedBalcony: "Nej",
  balconyWindowCount: 0,
  city: "Stockholm",
  phone: "0701234567",
  email: "test@example.com",
  consent: true,
  isBusinessService: false,
  isHomeService: false,
  isStairService: false,
  isWindowService: true
};

Deno.test("manual Fonsterputs row includes window fields and no kvm", () => {
  const row = buildOffertForfraganRow(baseParams);
  assertEquals(row.tjanst_typ, "Fonsterputs");
  assertEquals(row.boendetyp, "villa");
  assertEquals(row.antal_fonster, 75);
  assertEquals(row.fonstertyp, "2-sidiga (In/utvandiga)");
  assertEquals(row.inglasad_balkong, "Nej");
  assertEquals(row.kvadratmeter, null);
  assertEquals(row.antal_rum, null);
});

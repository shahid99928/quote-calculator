import { describe, expect, it } from "vitest";
import { SERVICE_OFFER_CASES } from "../fixtures/offerExpectations.js";

const functionsBaseUrl =
  process.env.SUPABASE_FUNCTIONS_URL ?? "http://127.0.0.1:54321/functions/v1";
const anonKey = process.env.SUPABASE_ANON_KEY ?? "";
const runDbTests = process.env.RUN_DB_TESTS === "1";

const maybeDescribe = runDbTests ? describe : describe.skip;

async function postCalculateOffer(payload) {
  const response = await fetch(`${functionsBaseUrl}/calculate-offer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(anonKey ? { apikey: anonKey, Authorization: `Bearer ${anonKey}` } : {})
    },
    body: JSON.stringify(payload)
  });
  const body = await response.json();
  return { response, body };
}

maybeDescribe("calculate-offer — all services (local DB + seed)", () => {
  for (const testCase of SERVICE_OFFER_CASES) {
    it(`returns 200 and correct offert for ${testCase.serviceType}`, async () => {
      const uniqueEmail = `svc-${testCase.serviceType.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}@example.com`;
      const { response, body } = await postCalculateOffer({
        ...testCase.payload,
        email: uniqueEmail
      });

      expect(response.status).toBe(200);
      expect(body.error).toBeUndefined();
      expect(body.manualReview).toBeUndefined();
      expect(body.quote).toBeTruthy();
      expect(Number(body.quote.offert)).toBe(testCase.expectedOffert());
      expect(body.quote.telefon).toBeUndefined();
      expect(body.quote.boknings_token).toBeUndefined();
    });
  }

  it("returns 400 for unsupported service type", async () => {
    const { response, body } = await postCalculateOffer({
      serviceType: "OgiltigTjanst",
      propertyType: "lagenhet",
      numRooms: 2,
      squareMeters: 50,
      city: "Stockholm",
      phone: "0701234567",
      email: "bad-service@example.com",
      consent: true
    });
    expect(response.status).toBe(400);
    expect(String(body.error)).toMatch(/serviceType/i);
  });
});

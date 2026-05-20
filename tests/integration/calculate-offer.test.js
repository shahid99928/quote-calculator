import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";

const functionsBaseUrl =
  process.env.SUPABASE_FUNCTIONS_URL ?? "http://127.0.0.1:54321/functions/v1";
const anonKey = process.env.SUPABASE_ANON_KEY ?? "";
const projectUrl = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
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

maybeDescribe("calculate-offer integration", () => {
  it("creates quote rows for valid Flyttstadning request", async () => {
    const payload = {
      serviceType: "Flyttstadning",
      propertyType: "lagenhet",
      numRooms: 2,
      squareMeters: 50,
      city: "Stockholm",
      phone: "0701234567",
      email: "seed-test@example.com",
      consent: true
    };

    const { response, body } = await postCalculateOffer(payload);
    expect(response.status).toBe(200);
    expect(body.quote).toBeTruthy();
    expect(Number(body.quote.offert)).toBeGreaterThan(0);
    expect(body.quote.telefon).toBeUndefined();
    expect(body.quote.epost).toBeUndefined();
    expect(body.quote.boknings_token).toBeUndefined();
    expect(body.bookingUrl).toBeUndefined();
  });

  it("returns 400 when consent is false", async () => {
    const payload = {
      serviceType: "Flyttstadning",
      propertyType: "lagenhet",
      numRooms: 2,
      squareMeters: 50,
      city: "Stockholm",
      phone: "0701234567",
      email: "seed-test@example.com",
      consent: false
    };
    const { response, body } = await postCalculateOffer(payload);
    expect(response.status).toBe(400);
    expect(body.error).toContain("consent must be true");
  });

  it("handles Foretagsstadning office with workstations addon", async () => {
    const payload = {
      serviceType: "Foretagsstadning",
      squareMeters: 100,
      frequency: "1 gång/vecka",
      businessLocalType: "Kontor",
      workstations: 5,
      city: "Stockholm",
      phone: "0701234567",
      email: "office-test@example.com",
      consent: true
    };
    const { response, body } = await postCalculateOffer(payload);
    expect(response.status).toBe(200);
    expect(Number(body.quote.offert)).toBe(2150);
    expect(body.bookingUrl).toBeUndefined();
  });

  it("persists quote in kund_offert when service role is available", async () => {
    if (!serviceRoleKey) return;
    const admin = createClient(projectUrl, serviceRoleKey);
    const email = `persist-${Date.now()}@example.com`;
    const payload = {
      serviceType: "Flyttstadning",
      propertyType: "lagenhet",
      numRooms: 2,
      squareMeters: 40,
      city: "Stockholm",
      phone: "0701234567",
      email,
      consent: true
    };
    const { response } = await postCalculateOffer(payload);
    expect(response.status).toBe(200);

    const { data, error } = await admin
      .from("kund_offert")
      .select("epost, tjanst_typ")
      .eq("epost", email)
      .order("id", { ascending: false })
      .limit(1);

    expect(error).toBeNull();
    expect(data?.[0]?.epost).toBe(email);

    const { data: requestRows, error: requestError } = await admin
      .from("offert_förfrågan")
      .select("epost, tjanst_typ, kvadratmeter")
      .eq("epost", email)
      .order("id", { ascending: false })
      .limit(1);

    expect(requestError).toBeNull();
    expect(requestRows?.[0]?.epost).toBe(email);
    expect(requestRows?.[0]?.tjanst_typ).toBe("Flyttstadning");
    expect(requestRows?.[0]?.status).toBe("auto");
  });

  it("sets status manuell for oversized housing quote", async () => {
    if (!serviceRoleKey) return;
    const admin = createClient(projectUrl, serviceRoleKey);
    const email = `manual-${Date.now()}@example.com`;
    const payload = {
      serviceType: "Flyttstadning",
      propertyType: "lagenhet",
      numRooms: 3,
      squareMeters: 201,
      city: "Stockholm",
      phone: "0701234567",
      email,
      consent: true
    };
    const { response, body } = await postCalculateOffer(payload);
    expect(response.status).toBe(200);
    expect(body.manualReview).toBe(true);

    const { data, error } = await admin
      .from("offert_förfrågan")
      .select("status, epost")
      .eq("epost", email)
      .order("id", { ascending: false })
      .limit(1);

    expect(error).toBeNull();
    expect(data?.[0]?.status).toBe("manuell");
  });
});

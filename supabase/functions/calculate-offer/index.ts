import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  calculateHousingLaborCost,
  calculateHousingOfferBreakdown,
  type BostadsPrisRow
} from "./housingLaborCost.ts";
import type { TrappLaborBreakdown } from "./stairLaborCost.ts";
import { isRoomCountAboveFormMaximum } from "./roomCountRules.ts";
import {
  MANUAL_LARGE_HOME_QUOTE_MESSAGE,
  requiresManualQuote
} from "./manualQuote.ts";
import {
  getSquareMetersLimitsForService,
  validateSquareMetersForService
} from "./squareMetersRules.ts";
import { validateWindowCountForService } from "./windowCountRules.ts";
import { buildBookingUrl, resolveBookingBaseUrl } from "./bookingUrl.ts";
import {
  buildOffertForfraganRow,
  deleteOffertForfraganById,
  OFFERT_FORFRAGAN_STATUS,
  saveOffertForfragan
} from "./offertForfraganInsert.ts";
import { getOfferPriceSubtext } from "./offerPriceSubtext.ts";

function createBookingTokenExpiresAt(): string {
  const configured = Number(Deno.env.get("BOOKING_TOKEN_TTL_DAYS") ?? "30");
  const ttlDays = Number.isFinite(configured) && configured > 0 ? configured : 30;
  const expires = new Date();
  expires.setUTCDate(expires.getUTCDate() + ttlDays);
  return expires.toISOString();
}

type QuoteRequest = {
  serviceType: string;
  propertyType: string;
  numRooms: number;
  squareMeters: number;
  frequency?: string;
  stairwells?: number;
  floors?: number;
  elevators?: number;
  stairFrequency?: string;
  businessLocalType?: string;
  workstations?: number;
  windowCount?: number;
  windowType?: string;
  glazedBalcony?: string;
  balconyWindowCount?: number;
  city: string;
  phone: string;
  email: string;
  bookingPageUrl?: string;
  consent: boolean;
};

const baseCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function getCorsHeaders(req?: Request) {
  const requestedHeaders = req?.headers.get("Access-Control-Request-Headers")?.trim();
  return {
    ...baseCorsHeaders,
    "Access-Control-Allow-Headers":
      requestedHeaders || baseCorsHeaders["Access-Control-Allow-Headers"]
  };
}

const supportedServices = new Set([
  "Flyttstadning",
  "Hemstadning",
  "Storstadning",
  "Byggstadning",
  "Visningsstadning",
  "Fonsterputs",
  "Foretagsstadning",
  "Trappstadning BRFer"
]);

const allowedStairFrequencies = new Set(["1 gång/vecka", "Varannan vecka", "1 gång/månad"]);

const allowedPropertyTypes = new Set(["lagenhet", "radhus", "villa"]);
const allowedFrequencies = new Set([
  "Engångsstädning",
  "1 gång/vecka",
  "2 gånger/vecka",
  "Varje dag",
  "1 gång/månad",
  "2 gånger/månad"
]);
const allowedWindowTypes = new Set([
  "2-sidiga (In/utvandiga)",
  "4-sidiga (In/utvandiga samt emellan)",
  "Annan"
]);
const allowedBusinessLocalTypes = new Set(["Kontor", "Butik", "Industri"]);
const allowedGlazedBalconyOptions = new Set(["Ja", "Nej"]);
const VAT_RATE = 0.25;
const RUT_DEDUCTION_RATE = 0.5;
const OFFER_EMAIL_SUBJECT = "Din offert - Välstädat";

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function badRequest(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    headers: { ...baseCorsHeaders, "Content-Type": "application/json" },
    status: 400
  });
}

function normalizeSwedishPhoneNumber(phone: string): string | null {
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (!cleaned) return null;
  if (cleaned.startsWith("+")) {
    return /^\+\d{8,15}$/.test(cleaned) ? cleaned : null;
  }
  if (cleaned.startsWith("00")) {
    const withPlus = `+${cleaned.slice(2)}`;
    return /^\+\d{8,15}$/.test(withPlus) ? withPlus : null;
  }
  if (cleaned.startsWith("0")) {
    const swedishE164 = `+46${cleaned.slice(1)}`;
    return /^\+\d{8,15}$/.test(swedishE164) ? swedishE164 : null;
  }
  return /^\d{8,15}$/.test(cleaned) ? `+${cleaned}` : null;
}

function getServiceLabel(serviceType: string): string {
  const normalized = normalizeText(serviceType);
  if (normalized === "flyttstadning") return "Flyttstädning";
  if (normalized === "visningsstadning") return "Visningsstädning";
  if (normalized === "hemstadning") return "Hemstädning";
  if (normalized === "storstadning") return "Storstädning";
  if (normalized === "byggstadning") return "Byggstädning";
  if (normalized === "fonsterputs") return "Fönsterputs";
  if (normalized === "trappstadning brfer") return "Trappstädning BRF:er";
  if (normalized === "kontorstadning") return "Kontorsstädning";
  if (normalized === "butikstadning") return "Butikstädning";
  if (normalized === "industristadning") return "Industristädning";
  return serviceType;
}

function createBookingToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

function buildOfferEmailHtml(params: {
  city: string;
  serviceLabel: string;
  serviceType: string;
  squareMeters: number | null;
  offert: number;
  bookingUrl: string;
}) {
  const escapedCity = escapeHtml(params.city);
  const escapedServiceLabel = escapeHtml(params.serviceLabel);
  const escapedBookingUrl = escapeHtml(params.bookingUrl);
  const priceSubtext = getOfferPriceSubtext(params.serviceType, params.serviceLabel);
  const today = new Date();
  const dateLabel = today.toLocaleDateString("sv-SE", {
    day: "2-digit",
    month: "short"
  });

  const squareMetersRow =
    params.squareMeters && Number.isFinite(params.squareMeters)
      ? `<div style="padding:16px 0;border-top:1px solid #e6e6e6;">
          <div style="font-size:15px;color:#555;">Antal kvm:</div>
          <div style="font-size:32px;line-height:1.2;color:#2d2d2d;">${params.squareMeters} kvm</div>
        </div>`
      : "";

  return `<!doctype html>
<html lang="sv">
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      .booking-btn:hover {
        background: #9e4d4d !important;
      }

      @media only screen and (max-width: 640px) {
        .email-shell {
          width: 100% !important;
          padding: 24px !important;
        }
        .booking-btn {
          display: block !important;
          width: 100% !important;
          box-sizing: border-box !important;
          text-align: center !important;
          font-size: 24px !important;
          padding: 10px 16px !important;
        }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#f3f3f3;font-family:Arial,Helvetica,sans-serif;color:#2d2d2d;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" class="email-shell" width="640" cellspacing="0" cellpadding="0" style="background:#ffffff;padding:32px 36px;">
            <tr>
              <td style="font-size:36px;font-weight:700;color:#2d2d2d;padding-bottom:20px;">Offert ${escapedServiceLabel.toLowerCase()}</td>
              <td align="right" style="font-size:14px;color:#8a8a8a;padding-bottom:20px;">${dateLabel.toUpperCase()}</td>
            </tr>
            <tr>
              <td colspan="2" style="font-size:28px;font-weight:700;color:#2d2d2d;padding-bottom:28px;">Välstädat</td>
            </tr>
            <tr>
              <td colspan="2" style="font-size:46px;font-weight:700;color:#b35a5a;padding-bottom:8px;">Hej,</td>
            </tr>
            <tr>
              <td colspan="2" style="font-size:34px;font-weight:700;color:#b35a5a;padding-bottom:34px;">Tack för din offertförfrågan!</td>
            </tr>
            <tr>
              <td colspan="2" style="font-size:34px;font-weight:700;color:#b35a5a;padding-bottom:10px;">Din förfrågan</td>
            </tr>
            <tr>
              <td colspan="2" style="padding:12px 0;border-top:1px solid #e6e6e6;">
                <div style="font-size:15px;color:#555;">Typ av tjänst:</div>
                <div style="font-size:32px;line-height:1.2;color:#2d2d2d;">${escapedServiceLabel}</div>
              </td>
            </tr>
            <tr>
              <td colspan="2">${squareMetersRow}</td>
            </tr>
            <tr>
              <td colspan="2" style="padding:16px 0;border-top:1px solid #e6e6e6;">
                <div style="font-size:15px;color:#555;">Stad:</div>
                <div style="font-size:32px;line-height:1.2;color:#2d2d2d;">${escapedCity}</div>
              </td>
            </tr>
            <tr>
              <td colspan="2" align="center" style="padding:36px 0 24px;">
                <div style="font-size:22px;color:#b35a5a;">Ditt pris:</div>
                <div style="font-size:58px;font-weight:700;color:#b35a5a;line-height:1.1;">${Math.round(params.offert)} kr</div>
                <div style="font-size:26px;font-style:italic;color:#b35a5a;padding-top:8px;">
                  ${priceSubtext}
                </div>
              </td>
            </tr>
            <tr>
              <td colspan="2" align="center" style="padding:18px 0 26px;">
                ${
                  params.bookingUrl
                    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;">
                  <tr>
                    <td align="center" bgcolor="#b35a5a" style="background-color:#b35a5a;border-radius:14px;">
                      <a
                        class="booking-btn"
                        href="${escapedBookingUrl}"
                        target="_blank"
                        style="
                          display:block;
                          width:100%;
                          box-sizing:border-box;
                          background-color:#b35a5a;
                          border:1px solid #b35a5a;
                          border-radius:14px;
                          color:#ffffff !important;
                          font-family:Arial,Helvetica,sans-serif;
                          font-size:28px;
                          font-weight:700;
                          line-height:1.2;
                          text-align:center;
                          text-decoration:none;
                          padding:10px 16px;
                          -webkit-text-size-adjust:none;
                        "
                      >
                        <span style="color:#ffffff !important;">Boka din tid här</span>
                      </a>
                    </td>
                  </tr>
                </table>`
                    : `<p style="font-size:20px;color:#b35a5a;margin:0;">Kontakta oss för att boka din tid.</p>`
                }
              </td>
            </tr>
            <tr>
              <td colspan="2" style="border-top:1px solid #e6e6e6;padding-top:26px;font-size:46px;font-weight:700;color:#b35a5a;">
                Hos Välstädat ingår alltid:
              </td>
            </tr>
            <tr>
              <td colspan="2" style="padding-top:14px;font-size:24px;line-height:1.55;color:#5a5a5a;">
                - Erfarna och noggranna städare<br />
                - Kvalitetskontrollerat resultat<br />
                - Trygg service med tydlig kommunikation
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      status: 405
    });
  }

  let payload: QuoteRequest;
  try {
    payload = (await req.json()) as QuoteRequest;
  } catch (_error) {
    return badRequest("Invalid JSON body.");
  }

  const serviceType = payload.serviceType?.trim() ?? "";
  const propertyType = payload.propertyType?.trim() ?? "";
  const normalizedPropertyType = normalizeText(propertyType);
  const numRooms = Number(payload.numRooms);
  const squareMeters = Number(payload.squareMeters);
  const frequency = payload.frequency?.trim() ?? "";
  const businessLocalType = payload.businessLocalType?.trim() ?? "";
  const isBusinessService = serviceType === "Foretagsstadning";
  const isHomeService = serviceType === "Hemstadning";
  const workstations = Number(payload.workstations);
  const isWindowService = serviceType === "Fonsterputs";
  const isStairService = serviceType === "Trappstadning BRFer";
  const stairwells = Number(payload.stairwells);
  const floors = Number(payload.floors);
  const elevators = Number(payload.elevators);
  const stairFrequency = payload.stairFrequency?.trim() ?? "";
  const windowCount = Number(payload.windowCount);
  const balconyWindowCount = Number(payload.balconyWindowCount);
  const windowType = payload.windowType?.trim() ?? "";
  const glazedBalcony = payload.glazedBalcony?.trim() ?? "";
  const city = payload.city?.trim() ?? "";
  const phone = payload.phone?.trim() ?? "";
  const email = payload.email?.trim() ?? "";
  const bookingPageUrl = payload.bookingPageUrl?.trim() ?? "";
  const consent = Boolean(payload.consent);

  if (!supportedServices.has(serviceType)) {
    return badRequest("Service type is not supported for quote calculation.");
  }
  const isHousingPropertyServiceEarly =
    !isBusinessService &&
    !isWindowService &&
    !isStairService &&
    allowedPropertyTypes.has(normalizedPropertyType);

  const sqmLimitsEarly = getSquareMetersLimitsForService(serviceType, isHousingPropertyServiceEarly);
  const sqmValidationErrorEarly = validateSquareMetersForService(
    Math.round(squareMeters),
    sqmLimitsEarly
  );
  if (sqmValidationErrorEarly) {
    return badRequest(sqmValidationErrorEarly);
  }

  if (isBusinessService) {
    if (!allowedFrequencies.has(frequency)) {
      return badRequest(
        "frequency must be one of: Engångsstädning, 1 gång/vecka, 2 gånger/vecka, Varje dag, 1 gång/månad, 2 gånger/månad."
      );
    }
    if (!allowedBusinessLocalTypes.has(businessLocalType)) {
      return badRequest("businessLocalType must be one of: Kontor, Butik, Industri.");
    }
    if (businessLocalType === "Kontor" && (!Number.isInteger(workstations) || workstations <= 0)) {
      return badRequest("workstations must be a positive integer for Kontor.");
    }
  } else if (isHomeService) {
    if (!allowedFrequencies.has(frequency)) {
      return badRequest(
        "frequency must be one of: Engångsstädning, 1 gång/vecka, 2 gånger/vecka, Varje dag, 1 gång/månad, 2 gånger/månad."
      );
    }
  } else if (isStairService) {
    if (!Number.isInteger(stairwells) || stairwells < 1 || stairwells > 99) {
      return badRequest("stairwells must be an integer between 1 and 99.");
    }
    if (!Number.isInteger(floors) || floors < 1 || floors > 99) {
      return badRequest("floors must be an integer between 1 and 99.");
    }
    if (!Number.isInteger(elevators) || elevators < 0 || elevators > 99) {
      return badRequest("elevators must be an integer between 0 and 99.");
    }
    if (!allowedStairFrequencies.has(stairFrequency)) {
      return badRequest("stairFrequency must be one of: 1 gång/vecka, Varannan vecka, 1 gång/månad.");
    }
  } else if (isWindowService) {
    if (!allowedPropertyTypes.has(normalizedPropertyType)) {
      return badRequest("Property type must be one of: lagenhet, radhus, villa.");
    }
    const windowCountValidationError = validateWindowCountForService(windowCount);
    if (windowCountValidationError) {
      return badRequest(windowCountValidationError);
    }
    if (!allowedWindowTypes.has(windowType)) {
      return badRequest(
        "windowType must be one of: 2-sidiga (In/utvandiga), 4-sidiga (In/utvandiga samt emellan), Annan."
      );
    }
    if (!allowedGlazedBalconyOptions.has(glazedBalcony)) {
      return badRequest("glazedBalcony must be either Ja or Nej.");
    }
    if (glazedBalcony === "Ja" && (!Number.isInteger(balconyWindowCount) || balconyWindowCount <= 0)) {
      return badRequest("balconyWindowCount must be a positive integer when glazedBalcony is Ja.");
    }
    if (glazedBalcony === "Nej" && Number.isFinite(balconyWindowCount) && balconyWindowCount > 0) {
      return badRequest("balconyWindowCount must be empty when glazedBalcony is Nej.");
    }
  } else {
    if (!allowedPropertyTypes.has(normalizedPropertyType)) {
      return badRequest("Property type must be one of: lagenhet, radhus, villa.");
    }
    if (!Number.isInteger(numRooms) || numRooms <= 0) {
      return badRequest("numRooms must be a positive integer.");
    }
    if (numRooms > 10) {
      return badRequest("numRooms must be at most 10.");
    }
  }
  if (!city || !phone || !email) {
    return badRequest("city, phone and email are required.");
  }
  if (!consent) {
    return badRequest("consent must be true.");
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Missing Supabase env vars." }), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      status: 500
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const persistedServiceType =
    isBusinessService
      ? businessLocalType === "Kontor"
        ? "kontorstädning"
        : businessLocalType === "Butik"
          ? "butikstädning"
          : "industristädning"
      : serviceType;

  const isHousingPropertyService = isHousingPropertyServiceEarly;

  const roundedSquareMeters = Math.round(squareMeters);

  const offertForfraganRow = buildOffertForfraganRow({
    persistedServiceType,
    normalizedPropertyType,
    numRooms,
    squareMeters,
    frequency,
    businessLocalType,
    workstations,
    stairwells,
    floors,
    elevators,
    stairFrequency,
    windowCount,
    windowType,
    glazedBalcony,
    balconyWindowCount,
    city,
    phone,
    email,
    consent,
    isBusinessService,
    isHomeService,
    isStairService,
    isWindowService
  });

  if (
    requiresManualQuote(
      serviceType,
      normalizedPropertyType,
      numRooms,
      roundedSquareMeters,
      windowCount,
      isHousingPropertyService
    )
  ) {
    // Manual review: save full request in offert_förfrågan only (no kund_offert, no customer email).
    const manualSave = await saveOffertForfragan(supabase, {
      ...offertForfraganRow,
      status: OFFERT_FORFRAGAN_STATUS.MANUELL
    });
    if (manualSave.error) {
      return new Response(JSON.stringify({ error: manualSave.error }), {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        status: 500
      });
    }

    return new Response(
      JSON.stringify({
        manualReview: true,
        requestSaved: true,
        offertForfraganId: manualSave.id,
        message: MANUAL_LARGE_HOME_QUOTE_MESSAGE
      }),
      {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        status: 200
      }
    );
  }

  let offert: number;
  let housingPricing: ReturnType<typeof calculateHousingOfferBreakdown> | null = null;
  let stairPricing: (TrappLaborBreakdown & { offert: number }) | null = null;

  function mapTrappRpcError(message: string): string {
    if (message.includes("KVM_OUT_OF_RANGE")) {
      return "No kvm price tier found for selected square meters (50–500).";
    }
    if (message.includes("FREQUENCY_NOT_SUPPORTED")) {
      return "stairFrequency must be one of: 1 gång/vecka, Varannan vecka, 1 gång/månad.";
    }
    if (message.includes("STYCKPRIS_MISSING")) {
      return "Stair unit prices are not configured.";
    }
    return message;
  }

  if (isBusinessService) {
    const { data: businessRows, error: businessPriceError } = await supabase
      .from("företags_priser")
      .select("grundavgift, pris_per_kvm, kvm_fran")
      .eq("typ_av_lokal", businessLocalType)
      .eq("stadfrekvens", frequency)
      .lte("kvm_fran", squareMeters)
      .gte("kvm_till", squareMeters)
      .order("kvm_fran", { ascending: false })
      .limit(1);

    if (businessPriceError) {
      return new Response(JSON.stringify({ error: businessPriceError.message }), {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        status: 500
      });
    }

    const businessRow = businessRows?.[0];
    if (!businessRow) {
      return badRequest("No matching company price row found for selected sqm and frequency.");
    }

    const baseFee = Number(businessRow.grundavgift);
    const pricePerSqm = Number(businessRow.pris_per_kvm);
    let workstationsAddon = 0;

    if (businessLocalType === "Kontor") {
      const { data: workstationRows, error: workstationPriceError } = await supabase
        .from("kontors_arbetsplats_priser")
        .select("manadstillagg_per_arbetsplats, arbetsplatser_fran")
        .lte("arbetsplatser_fran", workstations)
        .gte("arbetsplatser_till", workstations)
        .order("arbetsplatser_fran", { ascending: false })
        .limit(1);

      if (workstationPriceError) {
        return new Response(JSON.stringify({ error: workstationPriceError.message }), {
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
          status: 500
        });
      }

      const workstationRow = workstationRows?.[0];
      if (!workstationRow) {
        return badRequest("No matching workstation price row found for selected office size.");
      }

      const addonPerWorkstation = Number(workstationRow.manadstillagg_per_arbetsplats);
      workstationsAddon = workstations * addonPerWorkstation;
    }

    // Slutpris exkl. moms och RUT (samma modell som trappstädning).
    offert = Number((baseFee + squareMeters * pricePerSqm + workstationsAddon).toFixed(2));
  } else if (isStairService) {
    const { data: trappBreakdown, error: trappPriceError } = await supabase.rpc("berakna_trapp_pris", {
      p_kvm: Math.round(squareMeters),
      p_antal_trapphus: stairwells,
      p_antal_vaningar: floors,
      p_antal_hissar: elevators,
      p_stadfrekvens: stairFrequency
    });

    if (trappPriceError) {
      return badRequest(mapTrappRpcError(trappPriceError.message));
    }

    const trappPris = Number((trappBreakdown as { arbetskostnad?: number })?.arbetskostnad);
    if (!Number.isFinite(trappPris)) {
      return badRequest("Could not calculate stair-cleaning price.");
    }

    offert = Number(trappPris.toFixed(2));
    stairPricing = {
      ...(trappBreakdown as TrappLaborBreakdown),
      offert
    };
  } else if (isWindowService) {
    const { data: windowRows, error: windowPriceError } = await supabase
      .from("fönsterputs_priser")
      .select("grundavgift, pris_per_fonster, pris_balkongfonster")
      .eq("boendetyp", normalizedPropertyType)
      .eq("fonstertyp", windowType)
      .eq("inglasad_balkong", glazedBalcony)
      .lte("antal_fonster_fran", windowCount)
      .gte("antal_fonster_till", windowCount)
      .order("antal_fonster_fran", { ascending: false })
      .limit(1);

    if (windowPriceError) {
      return new Response(JSON.stringify({ error: windowPriceError.message }), {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        status: 500
      });
    }

    const windowRow = windowRows?.[0];
    if (!windowRow) {
      return badRequest("No matching window-cleaning price row found for selected options.");
    }

    const effectiveBalconyWindowCount = glazedBalcony === "Ja" ? balconyWindowCount : 0;
    const baseFee = Number(windowRow.grundavgift);
    const perWindowPrice = Number(windowRow.pris_per_fonster);
    const balconyPerWindowPrice = Number(windowRow.pris_balkongfonster);
    const laborCost =
      baseFee + windowCount * perWindowPrice + effectiveBalconyWindowCount * balconyPerWindowPrice;
    const totalWithVat = laborCost * (1 + VAT_RATE);
    const rutDeduction = totalWithVat * RUT_DEDUCTION_RATE;
    offert = Number((totalWithVat - rutDeduction).toFixed(2));
  } else {
    const { data: priceRows, error: priceError } = await supabase
      .from("bostads_priser")
      .select("boendetyp, antal_rum, kvm_fran, kvm_till, grundavgift, pris_per_kvm, stadfrekvens, tjanst_typ");

    if (priceError) {
      return new Response(JSON.stringify({ error: priceError.message }), {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        status: 500
      });
    }

    const targetPropertyType = normalizedPropertyType;
    const targetHousingServiceType = isHomeService ? "Hemstadning" : serviceType;
    const targetFrequency = isHomeService ? frequency : "Engångsstädning";
    const propertyRows =
      priceRows?.filter((row) => normalizeText(String(row.boendetyp)) === targetPropertyType) ?? [];
    const serviceScopedRows = propertyRows.filter(
      (row) => String(row.tjanst_typ ?? "") === targetHousingServiceType
    );
    const frequencyRows = serviceScopedRows.filter((row) => {
      const rowFrequency = row.stadfrekvens ? String(row.stadfrekvens) : "";
      return rowFrequency === targetFrequency;
    });

    if (frequencyRows.length === 0) {
      return badRequest("No matching price row found for selected property type and service.");
    }

    const laborResult = calculateHousingLaborCost(
      frequencyRows as BostadsPrisRow[],
      numRooms,
      squareMeters
    );

    if (!laborResult.ok) {
      return badRequest(laborResult.error);
    }

    housingPricing = calculateHousingOfferBreakdown(
      laborResult.laborCost,
      VAT_RATE,
      RUT_DEDUCTION_RATE
    );
    offert = housingPricing.offert;
  }

  const offertForfraganSave = await saveOffertForfragan(supabase, {
    ...offertForfraganRow,
    status: OFFERT_FORFRAGAN_STATUS.AUTO
  });
  if (offertForfraganSave.error) {
    return new Response(JSON.stringify({ error: offertForfraganSave.error }), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      status: 500
    });
  }

  const kundOffertPayload: Record<string, unknown> = {
    tjanst_typ: persistedServiceType,
    offert,
    stad: city,
    telefon: phone,
    epost: email,
    boknings_token: createBookingToken(),
    boknings_token_galler_till: createBookingTokenExpiresAt()
  };
  if (offertForfraganSave.id) {
    kundOffertPayload.offert_forfragan_id = offertForfraganSave.id;
  }

  const { data: insertedRow, error: insertError } = await supabase
    .from("kund_offert")
    .insert(kundOffertPayload)
    .select("id, offert, stad, telefon, epost, skapad, boknings_token, offert_forfragan_id")
    .single();

  if (insertError) {
    if (offertForfraganSave.id) {
      const rollbackError = await deleteOffertForfraganById(supabase, offertForfraganSave.id);
      if (rollbackError) {
        return new Response(
          JSON.stringify({
            error:
              "Could not save quote and rollback also failed. Please contact support.",
            rollbackError,
            orphanOffertForfraganId: offertForfraganSave.id
          }),
          {
            headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
            status: 500
          }
        );
      }
    }
    console.error("kund_offert insert failed:", insertError.message);
    return new Response(JSON.stringify({ error: insertError.message }), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      status: 500
    });
  }

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL");
  const bookingBaseUrl = resolveBookingBaseUrl(req, bookingPageUrl);
  const bookingUrl = buildBookingUrl(bookingBaseUrl, insertedRow.boknings_token);
  if (!bookingUrl) {
    console.error(
      "Offer email will not include a booking link. Set Supabase secret BOOKING_PAGE_URL to your deployed form URL."
    );
  }
  let emailStatus: "sent" | "failed" | "skipped" = "skipped";
  let emailError: string | null = null;
  if (resendApiKey && resendFromEmail) {
    try {
      const serviceLabel = getServiceLabel(persistedServiceType);
      const emailHtml = buildOfferEmailHtml({
        city,
        serviceLabel,
        serviceType: isStairService ? serviceType : persistedServiceType,
        squareMeters: isWindowService ? null : Math.round(squareMeters),
        offert,
        bookingUrl
      });

      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: `Välstädat <${resendFromEmail}>`,
          to: [email],
          subject: OFFER_EMAIL_SUBJECT,
          html: emailHtml
        })
      });

      if (!resendResponse.ok) {
        const resendErrorText = await resendResponse.text();
        console.error("Resend failed:", resendResponse.status, resendErrorText);
        emailStatus = "failed";
        emailError = `Resend ${resendResponse.status}: ${resendErrorText}`;
      } else {
        emailStatus = "sent";
      }
    } catch (emailException) {
      console.error("Unexpected resend error:", emailException);
      emailStatus = "failed";
      emailError =
        emailException instanceof Error ? emailException.message : "Unexpected resend error.";
    }
  } else {
    console.error("Resend is not configured. Missing RESEND_API_KEY or RESEND_FROM_EMAIL.");
    emailStatus = "skipped";
    emailError = "Resend is not configured.";
  }

  const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const twilioMessagingServiceSid = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");
  const normalizedPhone = normalizeSwedishPhoneNumber(phone);
  let smsStatus: "sent" | "failed" | "skipped" = "skipped";
  let smsError: string | null = null;
  if (twilioAccountSid && twilioAuthToken && twilioMessagingServiceSid && normalizedPhone) {
    try {
      const serviceLabel = getServiceLabel(persistedServiceType);
      const smsBody = bookingUrl
        ? `Hej! Din offert från Välstädat är ${Math.round(offert)} kr för ${serviceLabel} i ${city}. Boka: ${bookingUrl}`
        : `Hej! Din offert från Välstädat är ${Math.round(offert)} kr för ${serviceLabel} i ${city}.`;
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
      const body = new URLSearchParams({
        To: normalizedPhone,
        MessagingServiceSid: twilioMessagingServiceSid,
        Body: smsBody
      });
      const basicAuth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
      const twilioResponse = await fetch(twilioUrl, {
        method: "POST",
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: body.toString()
      });

      if (!twilioResponse.ok) {
        const twilioErrorText = await twilioResponse.text();
        console.error("Twilio SMS failed:", twilioResponse.status, twilioErrorText);
        smsStatus = "failed";
        smsError = `Twilio ${twilioResponse.status}: ${twilioErrorText}`;
      } else {
        smsStatus = "sent";
      }
    } catch (smsException) {
      console.error("Unexpected Twilio SMS error:", smsException);
      smsStatus = "failed";
      smsError = smsException instanceof Error ? smsException.message : "Unexpected Twilio SMS error.";
    }
  } else {
    console.error("Twilio SMS skipped. Missing secrets or invalid phone format.");
    smsStatus = "skipped";
    smsError = "Twilio secrets missing or invalid phone format.";
  }

  const deliveryWarning = !bookingUrl || (emailStatus !== "sent" && smsStatus !== "sent");

  return new Response(
    JSON.stringify({
      quote: insertedRow,
      offertForfraganId: offertForfraganSave.id,
      bookingUrl: bookingUrl || null,
      ...(housingPricing ? { pricing: housingPricing } : {}),
      ...(stairPricing ? { pricing: stairPricing } : {}),
      emailStatus,
      emailError,
      smsStatus,
      smsError,
      deliveryWarning
    }),
    {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      status: 200
    }
  );
});

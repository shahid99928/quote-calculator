import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type QuoteRequest = {
  serviceType: string;
  propertyType: string;
  numRooms: number;
  squareMeters: number;
  frequency?: string;
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
  "Foretagsstadning"
]);

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
const OFFER_SMS_BOOKING_URL = "https://www.valstadat.com";

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
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
  if (normalized === "kontorstadning") return "Kontorsstädning";
  if (normalized === "butikstadning") return "Butikstädning";
  if (normalized === "industristadning") return "Industristädning";
  return serviceType;
}

function createBookingToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

function normalizeBaseUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

function isPublicHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase();
  if (!host) return false;
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") return false;
  if (host.endsWith(".local")) return false;
  return true;
}

function resolveBookingBaseUrl(req: Request, payloadBaseUrl?: string): string {
  const requestProvidedUrl = payloadBaseUrl?.trim() ?? "";
  if (requestProvidedUrl) {
    try {
      const requestParsed = new URL(requestProvidedUrl);
      if (requestParsed.protocol === "http:" || requestParsed.protocol === "https:") {
        return normalizeBaseUrl(requestProvidedUrl);
      }
    } catch (_error) {
      // Ignore malformed request URL and continue with other fallbacks.
    }
  }

  const configuredUrl = Deno.env.get("BOOKING_PAGE_URL")?.trim() ?? "";
  if (configuredUrl) {
    try {
      const configuredParsed = new URL(configuredUrl);
      if (isPublicHost(configuredParsed.hostname)) {
        return normalizeBaseUrl(configuredUrl);
      }
    } catch (_error) {
      // Ignore malformed configured URL and continue to fallback chain.
    }
  }

  const referer = req.headers.get("referer")?.trim() ?? "";
  if (referer) {
    try {
      const parsed = new URL(referer);
      if (isPublicHost(parsed.hostname)) {
        return normalizeBaseUrl(`${parsed.origin}${parsed.pathname}`);
      }
    } catch (_error) {
      // Fall through to origin/default if referer is malformed.
    }
  }

  const origin = req.headers.get("origin")?.trim() ?? "";
  if (origin) {
    try {
      const parsedOrigin = new URL(origin);
      if (isPublicHost(parsedOrigin.hostname)) {
        return normalizeBaseUrl(origin);
      }
    } catch (_error) {
      // Ignore malformed origin and use default.
    }
  }

  return normalizeBaseUrl(OFFER_SMS_BOOKING_URL);
}

function buildBookingUrl(baseUrl: string, token: string): string {
  const parsed = new URL(baseUrl);
  parsed.searchParams.set("bookingToken", token);
  return parsed.toString();
}

function buildOfferEmailHtml(params: {
  city: string;
  serviceLabel: string;
  squareMeters: number | null;
  offert: number;
  bookingUrl: string;
}) {
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
              <td style="font-size:36px;font-weight:700;color:#2d2d2d;padding-bottom:20px;">Offert ${params.serviceLabel.toLowerCase()}</td>
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
                <div style="font-size:32px;line-height:1.2;color:#2d2d2d;">${params.serviceLabel}</div>
              </td>
            </tr>
            <tr>
              <td colspan="2">${squareMetersRow}</td>
            </tr>
            <tr>
              <td colspan="2" style="padding:16px 0;border-top:1px solid #e6e6e6;">
                <div style="font-size:15px;color:#555;">Stad:</div>
                <div style="font-size:32px;line-height:1.2;color:#2d2d2d;">${params.city}</div>
              </td>
            </tr>
            <tr>
              <td colspan="2" align="center" style="padding:36px 0 24px;">
                <div style="font-size:22px;color:#b35a5a;">Ditt pris:</div>
                <div style="font-size:58px;font-weight:700;color:#b35a5a;line-height:1.1;">${Math.round(params.offert)} kr</div>
                <div style="font-size:26px;font-style:italic;color:#b35a5a;padding-top:8px;">
                  Priset är inkl. moms och efter RUT-avdraget
                </div>
              </td>
            </tr>
            <tr>
              <td colspan="2" align="center" style="padding:18px 0 26px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;">
                  <tr>
                    <td align="center" bgcolor="#b35a5a" style="background-color:#b35a5a;border-radius:14px;">
                      <a
                        class="booking-btn"
                        href="${params.bookingUrl}"
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
                </table>
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
  if (isBusinessService) {
    if (!Number.isFinite(squareMeters) || squareMeters < 50) {
      return badRequest("squareMeters must be at least 50 for Foretagsstadning.");
    }
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
  } else if (isWindowService) {
    if (!allowedPropertyTypes.has(normalizedPropertyType)) {
      return badRequest("Property type must be one of: lagenhet, radhus, villa.");
    }
    if (!Number.isInteger(windowCount) || windowCount <= 0) {
      return badRequest("windowCount must be a positive integer.");
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
    if (!Number.isFinite(squareMeters) || squareMeters <= 0) {
      return badRequest("squareMeters must be greater than 0.");
    }
    if (!allowedPropertyTypes.has(normalizedPropertyType)) {
      return badRequest("Property type must be one of: lagenhet, radhus, villa.");
    }
    if (!Number.isInteger(numRooms) || numRooms <= 0) {
      return badRequest("numRooms must be a positive integer.");
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

  let offert: number;
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

    offert = Number((baseFee + squareMeters * pricePerSqm + workstationsAddon).toFixed(2));
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
    // RUT deduction for eligible household services is 50% of labor cost incl. VAT.
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

    const sqmMatchedRows = frequencyRows.filter((row) => {
      const from = Number(row.kvm_fran);
      const to = Number(row.kvm_till);
      return from <= squareMeters && squareMeters <= to;
    });

    const exactRoomMatch =
      sqmMatchedRows.find((row) => Number(row.antal_rum) === numRooms) ?? null;

    const nearestRoomMatch =
      !exactRoomMatch && sqmMatchedRows.length > 0
        ? sqmMatchedRows.sort(
            (a, b) => Math.abs(Number(a.antal_rum) - numRooms) - Math.abs(Number(b.antal_rum) - numRooms)
          )[0]
        : null;

    const matchingRow = exactRoomMatch ?? nearestRoomMatch;

    if (!matchingRow) {
      return badRequest("No matching price row found for selected property type and sqm.");
    }

    const baseFee = Number(matchingRow.grundavgift);
    const pricePerSqm = Number(matchingRow.pris_per_kvm);
    const laborCost = baseFee + squareMeters * pricePerSqm;
    const totalWithVat = laborCost * (1 + VAT_RATE);
    const rutDeduction = laborCost * RUT_DEDUCTION_RATE;
    offert = Number((totalWithVat - rutDeduction).toFixed(2));
  }

  const { error: requestInsertError } = await supabase.from("offert_förfrågan").insert({
    tjanst_typ: persistedServiceType,
    typ_av_lokal: isBusinessService ? businessLocalType : null,
    antal_arbetsplatser: persistedServiceType === "kontorstädning" ? workstations : null,
    boendetyp: isBusinessService ? null : normalizedPropertyType,
    antal_rum: isBusinessService || isWindowService ? null : numRooms,
    stadfrekvens: isBusinessService || isHomeService ? frequency : null,
    kvadratmeter: isWindowService ? null : Math.round(squareMeters),
    antal_fonster: isWindowService ? windowCount : null,
    fonstertyp: isWindowService ? windowType : null,
    inglasad_balkong: isWindowService ? glazedBalcony : null,
    antal_balkongfonster: isWindowService && glazedBalcony === "Ja" ? balconyWindowCount : null,
    stad: city,
    telefon: phone,
    epost: email,
    samtycke: consent
  });

  if (requestInsertError) {
    return new Response(JSON.stringify({ error: requestInsertError.message }), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      status: 500
    });
  }

  const { data: insertedRow, error: insertError } = await supabase
    .from("kund_offert")
    .insert({
      tjanst_typ: persistedServiceType,
      offert,
      stad: city,
      telefon: phone,
      epost: email,
      boknings_token: createBookingToken()
    })
    .select("id, offert, stad, telefon, epost, skapad, boknings_token")
    .single();

  if (insertError) {
    return new Response(JSON.stringify({ error: insertError.message }), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      status: 500
    });
  }

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL");
  const bookingBaseUrl = resolveBookingBaseUrl(req, bookingPageUrl);
  const bookingUrl = buildBookingUrl(bookingBaseUrl, insertedRow.boknings_token);
  if (resendApiKey && resendFromEmail) {
    try {
      const emailHtml = buildOfferEmailHtml({
        city,
        serviceLabel: getServiceLabel(persistedServiceType),
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
      }
    } catch (emailError) {
      console.error("Unexpected resend error:", emailError);
    }
  } else {
    console.error("Resend is not configured. Missing RESEND_API_KEY or RESEND_FROM_EMAIL.");
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
      const smsBody = `Hej! Din offert från Välstädat är ${Math.round(offert)} kr för ${serviceLabel} i ${city}. Boka: ${bookingUrl}`;
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

  return new Response(
    JSON.stringify({
      quote: insertedRow,
      smsStatus,
      smsError
    }),
    {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      status: 200
    }
  );
});

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
  <body style="margin:0;padding:0;background:#f3f3f3;font-family:Arial,Helvetica,sans-serif;color:#2d2d2d;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="background:#ffffff;padding:32px 36px;">
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
                <a href="${params.bookingUrl}" style="font-size:40px;color:#7d7d7d;text-decoration:none;font-weight:700;">
                  Boka din tid nu
                </a>
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
      .select("base_fee, price_per_sqm, sqm_from")
      .eq("typ_av_lokal", businessLocalType)
      .eq("städ_frekvens", frequency)
      .lte("sqm_from", squareMeters)
      .gte("sqm_to", squareMeters)
      .order("sqm_from", { ascending: false })
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

    const baseFee = Number(businessRow.base_fee);
    const pricePerSqm = Number(businessRow.price_per_sqm);
    let workstationsAddon = 0;

    if (businessLocalType === "Kontor") {
      const { data: workstationRows, error: workstationPriceError } = await supabase
        .from("kontors_arbetsplats_priser")
        .select("monthly_addon_per_workstation, workstations_from")
        .lte("workstations_from", workstations)
        .gte("workstations_to", workstations)
        .order("workstations_from", { ascending: false })
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

      const addonPerWorkstation = Number(workstationRow.monthly_addon_per_workstation);
      workstationsAddon = workstations * addonPerWorkstation;
    }

    offert = Number((baseFee + squareMeters * pricePerSqm + workstationsAddon).toFixed(2));
  } else if (isWindowService) {
    const { data: windowRows, error: windowPriceError } = await supabase
      .from("fönsterputs_priser")
      .select("base_fee, price_per_window, balcony_window_price")
      .eq("property_type", normalizedPropertyType)
      .eq("window_type", windowType)
      .eq("glazed_balcony", glazedBalcony)
      .lte("window_count_from", windowCount)
      .gte("window_count_to", windowCount)
      .order("window_count_from", { ascending: false })
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
    const baseFee = Number(windowRow.base_fee);
    const perWindowPrice = Number(windowRow.price_per_window);
    const balconyPerWindowPrice = Number(windowRow.balcony_window_price);
    const laborCost =
      baseFee + windowCount * perWindowPrice + effectiveBalconyWindowCount * balconyPerWindowPrice;
    const totalWithVat = laborCost * (1 + VAT_RATE);
    // RUT deduction for eligible household services is 50% of labor cost incl. VAT.
    const rutDeduction = totalWithVat * RUT_DEDUCTION_RATE;
    offert = Number((totalWithVat - rutDeduction).toFixed(2));
  } else {
    const { data: priceRows, error: priceError } = await supabase
      .from("bostads_priser")
      .select("property_type, num_rooms, sqm_from, sqm_to, base_fee, price_per_sqm, städ_frekvens, service_type");

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
      priceRows?.filter((row) => normalizeText(String(row.property_type)) === targetPropertyType) ?? [];
    const serviceScopedRows = propertyRows.filter(
      (row) => String(row.service_type ?? "") === targetHousingServiceType
    );
    const frequencyRows = serviceScopedRows.filter((row) => {
      const rowFrequency = row["städ_frekvens"] ? String(row["städ_frekvens"]) : "";
      return rowFrequency === targetFrequency;
    });

    const sqmMatchedRows = frequencyRows.filter((row) => {
      const from = Number(row.sqm_from);
      const to = Number(row.sqm_to);
      return from <= squareMeters && squareMeters <= to;
    });

    const exactRoomMatch =
      sqmMatchedRows.find((row) => Number(row.num_rooms) === numRooms) ?? null;

    const nearestRoomMatch =
      !exactRoomMatch && sqmMatchedRows.length > 0
        ? sqmMatchedRows.sort(
            (a, b) => Math.abs(Number(a.num_rooms) - numRooms) - Math.abs(Number(b.num_rooms) - numRooms)
          )[0]
        : null;

    const matchingRow = exactRoomMatch ?? nearestRoomMatch;

    if (!matchingRow) {
      return badRequest("No matching price row found for selected property type and sqm.");
    }

    const baseFee = Number(matchingRow.base_fee);
    const pricePerSqm = Number(matchingRow.price_per_sqm);
    const laborCost = baseFee + squareMeters * pricePerSqm;
    const totalWithVat = laborCost * (1 + VAT_RATE);
    const rutDeduction = laborCost * RUT_DEDUCTION_RATE;
    offert = Number((totalWithVat - rutDeduction).toFixed(2));
  }

  const { error: requestInsertError } = await supabase.from("offert_förfrågan").insert({
    service_type: persistedServiceType,
    typ_av_lokal: isBusinessService ? businessLocalType : null,
    antal_arbetsplatser: persistedServiceType === "kontorstädning" ? workstations : null,
    property_type: isBusinessService ? null : normalizedPropertyType,
    num_rooms: isBusinessService || isWindowService ? null : numRooms,
    städ_frekvens: isBusinessService || isHomeService ? frequency : null,
    square_meters: isWindowService ? null : Math.round(squareMeters),
    window_count: isWindowService ? windowCount : null,
    window_type: isWindowService ? windowType : null,
    glazed_balcony: isWindowService ? glazedBalcony : null,
    balcony_window_count: isWindowService && glazedBalcony === "Ja" ? balconyWindowCount : null,
    city,
    phone,
    email,
    consent
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
      service_type: persistedServiceType,
      offert,
      city,
      phone,
      email,
      booking_token: createBookingToken()
    })
    .select("id, offert, city, phone, email, created_at, booking_token")
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
  const bookingUrl = buildBookingUrl(bookingBaseUrl, insertedRow.booking_token);
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
      }
    } catch (smsError) {
      console.error("Unexpected Twilio SMS error:", smsError);
    }
  } else {
    console.error("Twilio SMS skipped. Missing secrets or invalid phone format.");
  }

  return new Response(
    JSON.stringify({
      quote: insertedRow
    }),
    {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      status: 200
    }
  );
});

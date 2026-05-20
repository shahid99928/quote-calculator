import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  assertBookingAccess,
  BOOKING_ACCESS_ERROR,
  toPublicBookingOffer
} from "./bookingTokenAuth.ts";

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

type BookingPayload = {
  action: "get" | "book";
  token: string;
  email: string;
  requestedDate?: string;
  acceptedOffer?: boolean;
};

const BOOKING_EMAIL_SUBJECT = "Bokningsbekräftelse - Välstädat";
const BOOKING_SITE_URL = "https://www.valstadat.com";

function badRequest(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    headers: { ...baseCorsHeaders, "Content-Type": "application/json" },
    status: 400
  });
}

function getTodayInStockholm(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Stockholm" }).format(new Date());
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  if (Number.isNaN(new Date(`${value}T12:00:00`).getTime())) return false;
  return value >= getTodayInStockholm();
}

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
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

  let payload: BookingPayload;
  try {
    payload = (await req.json()) as BookingPayload;
  } catch (_error) {
    return badRequest("Invalid JSON body.");
  }

  const action = payload.action;
  const token = payload.token?.trim() ?? "";
  const email = payload.email?.trim() ?? "";
  if (!token) {
    return badRequest("token is required.");
  }
  if (!email) {
    return badRequest("email is required.");
  }
  if (action !== "get" && action !== "book") {
    return badRequest("action must be get or book.");
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
  const { data: offerRow, error: offerError } = await supabase
    .from("kund_offert")
    .select("id, tjanst_typ, offert, stad, telefon, epost, skapad, boknings_token_galler_till")
    .eq("boknings_token", token)
    .maybeSingle();

  if (offerError || !assertBookingAccess(offerRow, email)) {
    return new Response(JSON.stringify({ error: BOOKING_ACCESS_ERROR }), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      status: 404
    });
  }

  if (action === "get") {
    const { data: bookingRow } = await supabase
      .from("kund_bokningar")
      .select("onskat_datum, offert_accepterad, skapad, uppdaterad")
      .eq("kund_offert_id", offerRow.id)
      .maybeSingle();

    return new Response(
      JSON.stringify({
        offer: toPublicBookingOffer(offerRow),
        booking: bookingRow ?? null
      }),
      {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        status: 200
      }
    );
  }

  const acceptedOffer = Boolean(payload.acceptedOffer);
  const requestedDate = payload.requestedDate?.trim() ?? "";
  if (!acceptedOffer) {
    return badRequest("Offer must be accepted before booking.");
  }
  if (!isValidDate(requestedDate)) {
    return badRequest("Datumet kan inte ligga i det förflutna.");
  }

  const { data: bookingResult, error: bookingError } = await supabase
    .from("kund_bokningar")
    .upsert(
      {
        kund_offert_id: offerRow.id,
        onskat_datum: requestedDate,
        offert_accepterad: true,
        uppdaterad: new Date().toISOString()
      },
      { onConflict: "kund_offert_id" }
    )
    .select("boknings_id, kund_offert_id, onskat_datum, offert_accepterad, skapad, uppdaterad")
    .single();

  if (bookingError) {
    return new Response(JSON.stringify({ error: bookingError.message }), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      status: 500
    });
  }

  const serviceLabel = getServiceLabel(String(offerRow.tjanst_typ ?? ""));
  const offertAmount = Number(offerRow.offert);
  const bookingReference = `VS-${bookingResult.boknings_id}`;
  const confirmationText = `Din bokning är bekräftad hos Välstädat. Boknings-ID: ${bookingReference}. Tjänst: ${serviceLabel}. Datum: ${requestedDate}. Stad: ${offerRow.stad}. Pris: ${Math.round(offertAmount)} kr.`;

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL");
  if (resendApiKey && resendFromEmail) {
    try {
      const confirmationHtml = `<!doctype html>
<html lang="sv">
  <body style="margin:0;padding:0;background:#f3f3f3;font-family:Arial,Helvetica,sans-serif;color:#2d2d2d;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="background:#ffffff;padding:32px 36px;">
            <tr>
              <td style="font-size:34px;font-weight:700;color:#b35a5a;padding-bottom:14px;">Tack! Din bokning är bekräftad</td>
            </tr>
            <tr>
              <td style="font-size:22px;line-height:1.6;color:#4a4a4a;">
                <strong>Boknings-ID:</strong> ${bookingReference}<br />
                <strong>Tjänst:</strong> ${serviceLabel}<br />
                <strong>Datum:</strong> ${requestedDate}<br />
                <strong>Stad:</strong> ${offerRow.stad}<br />
                <strong>Offertpris:</strong> ${offertAmount.toFixed(2)} kr
              </td>
            </tr>
            <tr>
              <td style="padding-top:22px;font-size:18px;color:#6a6a6a;line-height:1.6;">
                Vi återkommer inom kort med praktisk information inför ditt bokade datum.
              </td>
            </tr>
            <tr>
              <td style="padding-top:18px;">
                <a href="${BOOKING_SITE_URL}" style="font-size:20px;color:#b35a5a;text-decoration:none;font-weight:700;">
                  Besök valstadat.com
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: `Välstädat <${resendFromEmail}>`,
          to: [offerRow.epost],
          subject: BOOKING_EMAIL_SUBJECT,
          html: confirmationHtml
        })
      });

      if (!resendResponse.ok) {
        const resendErrorText = await resendResponse.text();
        console.error("Booking confirmation email failed:", resendResponse.status, resendErrorText);
      }
    } catch (emailError) {
      console.error("Unexpected booking confirmation email error:", emailError);
    }
  }

  const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const twilioMessagingServiceSid = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");
  const normalizedPhone = normalizeSwedishPhoneNumber(String(offerRow.telefon ?? ""));
  if (twilioAccountSid && twilioAuthToken && twilioMessagingServiceSid && normalizedPhone) {
    try {
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
      const body = new URLSearchParams({
        To: normalizedPhone,
        MessagingServiceSid: twilioMessagingServiceSid,
        Body: confirmationText
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
        console.error("Booking confirmation SMS failed:", twilioResponse.status, twilioErrorText);
      }
    } catch (smsError) {
      console.error("Unexpected booking confirmation SMS error:", smsError);
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      booking: bookingResult
    }),
    {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      status: 200
    }
  );
});

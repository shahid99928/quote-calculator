import type { KundOffertBookingRow } from "./bookingTokenAuth.ts";
import type { KundBokningRow } from "./bookingPersistence.ts";

const BOOKING_EMAIL_SUBJECT = "Bokningsbekräftelse - Välstädat";
const BOOKING_SITE_URL = "https://www.valstadat.com";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getServiceLabel(serviceType: string): string {
  const normalized = serviceType
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
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

export async function sendBookingConfirmation(
  offerRow: KundOffertBookingRow,
  booking: KundBokningRow,
  requestedDate: string
): Promise<void> {
  const bookingReference = `VS-${booking.boknings_id}`;
  const serviceLabel = getServiceLabel(String(offerRow.tjanst_typ ?? ""));
  const escapedServiceLabel = escapeHtml(serviceLabel);
  const escapedRequestedDate = escapeHtml(requestedDate);
  const escapedCity = escapeHtml(String(offerRow.stad ?? ""));
  const escapedBookingReference = escapeHtml(bookingReference);
  const escapedSiteUrl = escapeHtml(BOOKING_SITE_URL);
  const offertAmount = Number(offerRow.offert);
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
                <strong>Boknings-ID:</strong> ${escapedBookingReference}<br />
                <strong>Tjänst:</strong> ${escapedServiceLabel}<br />
                <strong>Datum:</strong> ${escapedRequestedDate}<br />
                <strong>Stad:</strong> ${escapedCity}<br />
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
                <a href="${escapedSiteUrl}" style="font-size:20px;color:#b35a5a;text-decoration:none;font-weight:700;">
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
}

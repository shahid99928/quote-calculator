export type ChannelStatus = "sent" | "failed" | "skipped";

export type DeliveryIssue = "none" | "no_booking_link" | "customer_channels_failed";

export type OfferChannelDelivery = {
  emailStatus: ChannelStatus;
  smsStatus: ChannelStatus;
  emailError: string | null;
  smsError: string | null;
};

export type OfferDeliverySummary = {
  deliveryWarning: boolean;
  deliveryIssue: DeliveryIssue;
  emailDelivered: boolean;
  smsDelivered: boolean;
};

const OFFER_EMAIL_SUBJECT = "Din offert - Välstädat";
const ADMIN_ALERT_SUBJECT = "[Välstädat] Offert sparad – kundleverans misslyckades";

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

function getAdminAlertEmails(): string[] {
  const raw = Deno.env.get("OFFER_DELIVERY_ALERT_EMAIL") ?? "";
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  label: string
): Promise<{ ok: boolean; status: number; bodyText: string }> {
  let lastStatus = 0;
  let lastBody = "";
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await fetch(url, init);
      lastStatus = response.status;
      lastBody = await response.text();
      if (response.ok) {
        return { ok: true, status: lastStatus, bodyText: lastBody };
      }
      console.error(`${label} attempt ${attempt} failed:`, lastStatus, lastBody);
    } catch (error) {
      lastBody = error instanceof Error ? error.message : String(error);
      console.error(`${label} attempt ${attempt} error:`, lastBody);
    }
    if (attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  }
  return { ok: false, status: lastStatus, bodyText: lastBody };
}

export function summarizeOfferDelivery(
  bookingUrl: string,
  channels: OfferChannelDelivery
): OfferDeliverySummary {
  const emailDelivered = channels.emailStatus === "sent";
  const smsDelivered = channels.smsStatus === "sent";
  if (!bookingUrl) {
    return {
      deliveryWarning: true,
      deliveryIssue: "no_booking_link",
      emailDelivered,
      smsDelivered
    };
  }
  const deliveryWarning = !emailDelivered && !smsDelivered;
  return {
    deliveryWarning,
    deliveryIssue: deliveryWarning ? "customer_channels_failed" : "none",
    emailDelivered,
    smsDelivered
  };
}

export async function deliverOfferToCustomer(params: {
  customerEmail: string;
  customerPhone: string;
  emailHtml: string;
  smsBody: string;
}): Promise<OfferChannelDelivery> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL");
  let emailStatus: ChannelStatus = "skipped";
  let emailError: string | null = null;

  if (resendApiKey && resendFromEmail) {
    const emailResult = await fetchWithRetry(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: `Välstädat <${resendFromEmail}>`,
          to: [params.customerEmail],
          subject: OFFER_EMAIL_SUBJECT,
          html: params.emailHtml
        })
      },
      "Resend offer email"
    );
    if (emailResult.ok) {
      emailStatus = "sent";
    } else {
      emailStatus = "failed";
      emailError = `Resend ${emailResult.status}: ${emailResult.bodyText}`.slice(0, 500);
    }
  } else {
    emailError = "Resend is not configured.";
    console.error("Resend is not configured. Missing RESEND_API_KEY or RESEND_FROM_EMAIL.");
  }

  const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const twilioMessagingServiceSid = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");
  const normalizedPhone = normalizeSwedishPhoneNumber(params.customerPhone);
  let smsStatus: ChannelStatus = "skipped";
  let smsError: string | null = null;

  if (twilioAccountSid && twilioAuthToken && twilioMessagingServiceSid && normalizedPhone) {
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const body = new URLSearchParams({
      To: normalizedPhone,
      MessagingServiceSid: twilioMessagingServiceSid,
      Body: params.smsBody
    });
    const basicAuth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
    const smsResult = await fetchWithRetry(
      twilioUrl,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: body.toString()
      },
      "Twilio offer SMS"
    );
    if (smsResult.ok) {
      smsStatus = "sent";
    } else {
      smsStatus = "failed";
      smsError = `Twilio ${smsResult.status}: ${smsResult.bodyText}`.slice(0, 500);
    }
  } else {
    smsError = "Twilio secrets missing or invalid phone format.";
    console.error("Twilio SMS skipped. Missing secrets or invalid phone format.");
  }

  return { emailStatus, smsStatus, emailError, smsError };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function alertAdminOfferDeliveryFailed(params: {
  offertForfraganId: number;
  kundOffertId: number;
  city: string;
  serviceLabel: string;
  offert: number;
  customerEmail: string;
  customerPhone: string;
  bookingUrl: string;
  channels: OfferChannelDelivery;
  summary: OfferDeliverySummary;
}): Promise<void> {
  const adminEmails = getAdminAlertEmails();
  if (adminEmails.length === 0) {
    console.error(
      "Offer saved but customer delivery failed. Set OFFER_DELIVERY_ALERT_EMAIL to notify admins."
    );
    return;
  }

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL");
  if (!resendApiKey || !resendFromEmail) {
    console.error("Cannot alert admin: Resend is not configured.");
    return;
  }

  const html = `<!doctype html>
<html lang="sv">
  <body style="font-family:Arial,Helvetica,sans-serif;color:#2d2d2d;">
    <h2>Offert sparad – kundleverans misslyckades</h2>
    <p>En auto-offert sparades i databasen men kunden fick inte e-post/SMS (eller bokningslänk saknas).</p>
    <ul>
      <li><strong>Ärendenummer (offert_förfrågan):</strong> ${escapeHtml(String(params.offertForfraganId))}</li>
      <li><strong>kund_offert ID:</strong> ${escapeHtml(String(params.kundOffertId))}</li>
      <li><strong>Tjänst:</strong> ${escapeHtml(params.serviceLabel)}</li>
      <li><strong>Stad:</strong> ${escapeHtml(params.city)}</li>
      <li><strong>Offert:</strong> ${escapeHtml(String(Math.round(params.offert)))} kr</li>
      <li><strong>E-post:</strong> ${escapeHtml(params.customerEmail)}</li>
      <li><strong>Telefon:</strong> ${escapeHtml(params.customerPhone)}</li>
      <li><strong>Bokningslänk:</strong> ${params.bookingUrl ? escapeHtml(params.bookingUrl) : "(saknas)"}</li>
      <li><strong>E-poststatus:</strong> ${escapeHtml(params.channels.emailStatus)}${params.channels.emailError ? ` – ${escapeHtml(params.channels.emailError)}` : ""}</li>
      <li><strong>SMS-status:</strong> ${escapeHtml(params.channels.smsStatus)}${params.channels.smsError ? ` – ${escapeHtml(params.channels.smsError)}` : ""}</li>
      <li><strong>deliveryIssue:</strong> ${escapeHtml(params.summary.deliveryIssue)}</li>
    </ul>
    <p>Kontakta kunden manuellt om inget kanalmeddelande nådde fram.</p>
  </body>
</html>`;

  const result = await fetchWithRetry(
    "https://api.resend.com/emails",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: `Välstädat <${resendFromEmail}>`,
        to: adminEmails,
        subject: ADMIN_ALERT_SUBJECT,
        html
      })
    },
    "Resend admin delivery alert"
  );

  if (!result.ok) {
    console.error("Admin delivery alert failed:", result.status, result.bodyText);
  }
}

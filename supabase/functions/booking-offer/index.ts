import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendBookingConfirmation } from "./bookingConfirmation.ts";
import { claimOrUpdateBooking } from "./bookingPersistence.ts";
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

  const claimResult = await claimOrUpdateBooking(supabase, offerRow.id, requestedDate);

  if (claimResult.kind === "error") {
    return new Response(JSON.stringify({ error: claimResult.message }), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      status: 500
    });
  }

  if (claimResult.kind === "already_booked") {
    return new Response(
      JSON.stringify({
        success: true,
        alreadyBooked: true,
        booking: claimResult.booking
      }),
      {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        status: 200
      }
    );
  }

  await sendBookingConfirmation(offerRow, claimResult.booking, requestedDate);

  return new Response(
    JSON.stringify({
      success: true,
      booking: claimResult.booking,
      ...(claimResult.kind === "rescheduled" ? { rescheduled: true } : {})
    }),
    {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      status: 200
    }
  );
});

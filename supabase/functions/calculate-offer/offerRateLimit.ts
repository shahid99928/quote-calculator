import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEFAULT_MAX_PER_HOUR = 10;
const WINDOW_MS = 60 * 60 * 1000;

export function normalizeRateLimitEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function getClientIp(req: Request): string {
  const cfConnectingIp = req.headers.get("cf-connecting-ip")?.trim();
  if (cfConnectingIp) return cfConnectingIp;

  const forwarded = req.headers.get("x-forwarded-for")?.trim() ?? "";
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return "unknown";
}

function getMaxOffersPerHour(): number {
  const configured = Number(Deno.env.get("OFFER_RATE_LIMIT_MAX_PER_HOUR") ?? String(DEFAULT_MAX_PER_HOUR));
  return Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : DEFAULT_MAX_PER_HOUR;
}

async function countRecentEvents(
  supabase: SupabaseClient,
  column: "client_ip" | "email_normalized",
  value: string,
  sinceIso: string
): Promise<number> {
  const { count, error } = await supabase
    .from("offer_rate_limit_events")
    .select("id", { count: "exact", head: true })
    .eq(column, value)
    .gte("created_at", sinceIso);

  if (error) {
    console.error(`Rate limit count failed (${column}):`, error.message);
    return 0;
  }
  return count ?? 0;
}

export type OfferRateLimitResult =
  | { allowed: true }
  | { allowed: false; message: string };

export async function assertOfferRateLimit(
  supabase: SupabaseClient,
  clientIp: string,
  email: string
): Promise<OfferRateLimitResult> {
  if (Deno.env.get("DISABLE_OFFER_RATE_LIMIT") === "1") {
    return { allowed: true };
  }

  const maxPerHour = getMaxOffersPerHour();
  const sinceIso = new Date(Date.now() - WINDOW_MS).toISOString();
  const normalizedEmail = normalizeRateLimitEmail(email);

  const [ipCount, emailCount] = await Promise.all([
    countRecentEvents(supabase, "client_ip", clientIp, sinceIso),
    countRecentEvents(supabase, "email_normalized", normalizedEmail, sinceIso)
  ]);

  if (ipCount >= maxPerHour || emailCount >= maxPerHour) {
    return {
      allowed: false,
      message: `För många offertförfrågningar. Du kan skicka högst ${maxPerHour} förfrågningar per timme. Försök igen senare.`
    };
  }

  return { allowed: true };
}

export async function recordOfferRateLimitEvent(
  supabase: SupabaseClient,
  clientIp: string,
  email: string
): Promise<void> {
  if (Deno.env.get("DISABLE_OFFER_RATE_LIMIT") === "1") {
    return;
  }

  const { error } = await supabase.from("offer_rate_limit_events").insert({
    client_ip: clientIp,
    email_normalized: normalizeRateLimitEmail(email)
  });

  if (error) {
    console.error("Failed to record offer rate limit event:", error.message);
  }
}

/** Hosts that must never be used as booking SPA base (no ?bookingToken= handler). */
const BLOCKED_BOOKING_HOSTS = new Set([
  "valstadat.com",
  "www.valstadat.com",
  "mpkcnixjiyvnnljhubrn.supabase.co"
]);

export function normalizeBaseUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

export function isBookingPageHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase();
  if (!host || BLOCKED_BOOKING_HOSTS.has(host)) return false;
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") return false;
  if (host.endsWith(".local")) return false;
  return true;
}

function tryParseBookingBase(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    if (!isBookingPageHost(parsed.hostname)) return null;
    return normalizeBaseUrl(`${parsed.origin}${parsed.pathname}`);
  } catch {
    return null;
  }
}

export function resolveBookingBaseUrl(req: Request, payloadBaseUrl?: string): string {
  const fromPayload = tryParseBookingBase(payloadBaseUrl ?? "");
  if (fromPayload) return fromPayload;

  const fromEnv = tryParseBookingBase(Deno.env.get("BOOKING_PAGE_URL") ?? "");
  if (fromEnv) return fromEnv;

  const referer = req.headers.get("referer")?.trim() ?? "";
  const fromReferer = tryParseBookingBase(referer);
  if (fromReferer) return fromReferer;

  const origin = req.headers.get("origin")?.trim() ?? "";
  const fromOrigin = tryParseBookingBase(origin);
  if (fromOrigin) return fromOrigin;

  console.error(
    "BOOKING_PAGE_URL is missing or invalid, and referer/origin are not a booking app host. " +
      "Set Supabase secret BOOKING_PAGE_URL to your Vercel form URL (e.g. https://your-app.vercel.app)."
  );
  return "";
}

export function buildBookingUrl(baseUrl: string, token: string): string {
  if (!baseUrl) {
    return "";
  }
  const parsed = new URL(baseUrl);
  parsed.searchParams.set("bookingToken", token);
  return parsed.toString();
}

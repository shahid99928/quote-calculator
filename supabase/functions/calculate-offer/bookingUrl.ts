/** Booking links use a path segment so tokens are not stored in query strings (history, logs, Referer). */
export const BOOKING_PATH_PREFIX = "/boka";

/** Hosts allowed in offer email/SMS booking links (allowlist only). */
const DEFAULT_ALLOWED_BOOKING_HOSTS = new Set([
  "quote-calculator-teal.vercel.app",
  "quote-calculator-git-main-hausai.vercel.app",
  "localhost",
  "127.0.0.1"
]);

export function normalizeBaseUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

function getAllowedBookingHosts(): Set<string> {
  const hosts = new Set(DEFAULT_ALLOWED_BOOKING_HOSTS);

  const extraHosts = Deno.env.get("BOOKING_PAGE_ALLOWED_HOSTS") ?? "";
  for (const part of extraHosts.split(",")) {
    const host = part.trim().toLowerCase();
    if (host) hosts.add(host);
  }

  const fromEnvUrl = Deno.env.get("BOOKING_PAGE_URL") ?? "";
  if (fromEnvUrl) {
    try {
      hosts.add(new URL(fromEnvUrl).hostname.toLowerCase());
    } catch {
      // ignore invalid BOOKING_PAGE_URL
    }
  }

  return hosts;
}

export function isBookingPageHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase();
  if (!host) return false;
  return getAllowedBookingHosts().has(host);
}

export function stripBookingPathFromPathname(pathname: string): string {
  const normalized = pathname.trim() || "/";
  const lower = normalized.toLowerCase();
  if (lower === BOOKING_PATH_PREFIX) {
    return "";
  }
  if (lower.startsWith(`${BOOKING_PATH_PREFIX}/`)) {
    return "";
  }
  return normalized === "/" ? "" : normalized.replace(/\/$/, "");
}

function tryParseBookingBase(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    if (!isBookingPageHost(parsed.hostname)) return null;
    const path = stripBookingPathFromPathname(parsed.pathname);
    return normalizeBaseUrl(path ? `${parsed.origin}${path}` : parsed.origin);
  } catch {
    return null;
  }
}

export function resolveBookingBaseUrl(req: Request, payloadBaseUrl?: string): string {
  const fromEnv = tryParseBookingBase(Deno.env.get("BOOKING_PAGE_URL") ?? "");
  if (fromEnv) return fromEnv;

  const fromPayload = tryParseBookingBase(payloadBaseUrl ?? "");
  if (fromPayload) return fromPayload;

  const referer = req.headers.get("referer")?.trim() ?? "";
  const fromReferer = tryParseBookingBase(referer);
  if (fromReferer) return fromReferer;

  const origin = req.headers.get("origin")?.trim() ?? "";
  const fromOrigin = tryParseBookingBase(origin);
  if (fromOrigin) return fromOrigin;

  console.error(
    "BOOKING_PAGE_URL is missing or not on the booking host allowlist, and referer/origin/payload were rejected. " +
      "Set Supabase secret BOOKING_PAGE_URL to your production app URL (e.g. https://quote-calculator-teal.vercel.app)."
  );
  return "";
}

export function buildBookingUrl(baseUrl: string, token: string): string {
  if (!baseUrl) {
    return "";
  }
  const trimmedToken = token.trim();
  if (!trimmedToken) {
    return "";
  }
  const parsed = new URL(baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  parsed.search = "";
  parsed.hash = "";
  const basePath = stripBookingPathFromPathname(parsed.pathname);
  const prefix = basePath ? `${basePath}${BOOKING_PATH_PREFIX}` : BOOKING_PATH_PREFIX;
  parsed.pathname = `${prefix}/${encodeURIComponent(trimmedToken)}`;
  return parsed.toString();
}

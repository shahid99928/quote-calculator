export const BOOKING_PATH_PREFIX = "/boka";

export function stripBookingPathFromPathname(pathname) {
  const normalized = (pathname ?? "").trim() || "/";
  const lower = normalized.toLowerCase();
  if (lower === BOOKING_PATH_PREFIX || lower.startsWith(`${BOOKING_PATH_PREFIX}/`)) {
    return "";
  }
  return normalized === "/" ? "" : normalized.replace(/\/$/, "");
}

export function parseBookingTokenFromLocation(location) {
  const pathname = location?.pathname ?? "";
  const match = pathname.match(new RegExp(`^${BOOKING_PATH_PREFIX}/([^/]+)/?$`, "i"));
  if (match?.[1]) {
    try {
      return decodeURIComponent(match[1]).trim();
    } catch {
      return match[1].trim();
    }
  }
  return new URLSearchParams(location?.search ?? "").get("bookingToken")?.trim() ?? "";
}

/** Move legacy ?bookingToken= links to /boka/{token} without leaving the token in the query string. */
export function migrateLegacyBookingTokenInUrl(location = window.location) {
  if (typeof window === "undefined") return;

  const fromQuery = new URLSearchParams(location.search).get("bookingToken")?.trim() ?? "";
  const url = new URL(location.href);

  if (fromQuery && !parseBookingTokenFromLocation({ pathname: location.pathname, search: "" })) {
    url.pathname = `${BOOKING_PATH_PREFIX}/${encodeURIComponent(fromQuery)}`;
    url.searchParams.delete("bookingToken");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    return;
  }

  if (fromQuery) {
    url.searchParams.delete("bookingToken");
    const next = `${url.pathname}${url.search}${url.hash}`;
    if (next !== `${location.pathname}${location.search}${location.hash}`) {
      window.history.replaceState(null, "", next);
    }
  }
}

export function getBookingPageBaseUrl(location = window.location) {
  const configured = String(import.meta.env.VITE_BOOKING_PAGE_URL ?? "").trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  const path = stripBookingPathFromPathname(location.pathname);
  return path ? `${location.origin}${path}` : location.origin;
}

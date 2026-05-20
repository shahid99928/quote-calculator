export const BOOKING_ACCESS_ERROR =
  "Bokningslänken är ogiltig eller har gått ut. Kontrollera e-postadressen.";

export type KundOffertBookingRow = {
  id: number;
  tjanst_typ: string;
  offert: number;
  stad: string;
  telefon: string;
  epost: string;
  skapad: string;
  boknings_token_galler_till: string;
};

export type PublicBookingOffer = {
  id: number;
  tjanst_typ: string;
  offert: number;
  stad: string;
  skapad: string;
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function emailsMatch(stored: string, provided: string): boolean {
  const a = normalizeEmail(stored);
  const b = normalizeEmail(provided);
  return Boolean(a && b && a === b);
}

export function getBookingTokenTtlDays(): number {
  const configured = Number(Deno.env.get("BOOKING_TOKEN_TTL_DAYS") ?? "90");
  return Number.isFinite(configured) && configured > 0 ? configured : 90;
}

export function createBookingTokenExpiresAt(from = new Date()): string {
  const expires = new Date(from);
  expires.setUTCDate(expires.getUTCDate() + getBookingTokenTtlDays());
  return expires.toISOString();
}

export function isBookingTokenExpired(gallerTill: string | null | undefined): boolean {
  if (!gallerTill) return true;
  const expiresAt = new Date(gallerTill);
  if (Number.isNaN(expiresAt.getTime())) return true;
  return expiresAt.getTime() < Date.now();
}

export function toPublicBookingOffer(row: KundOffertBookingRow): PublicBookingOffer {
  return {
    id: row.id,
    tjanst_typ: row.tjanst_typ,
    offert: row.offert,
    stad: row.stad,
    skapad: row.skapad
  };
}

export function assertBookingAccess(
  row: KundOffertBookingRow | null,
  providedEmail: string
): row is KundOffertBookingRow {
  if (!row) return false;
  if (isBookingTokenExpired(row.boknings_token_galler_till)) return false;
  if (!emailsMatch(row.epost, providedEmail)) return false;
  return true;
}

/** Rensar till enbart siffror (formuläret tillåter inga andra tecken). */
export function normalizePhoneDigits(phone) {
  return String(phone ?? "").replace(/\D/g, "");
}

/** Mobilnummer: exakt 10 siffror som börjar med 07. */
export const MOBILE_PHONE_PATTERN = /^07\d{8}$/;

/**
 * Behåll endast inmatning som kan bli 07XXXXXXXX (max 10 tecken).
 */
export function sanitizeMobilePhoneInput(raw) {
  const digits = normalizePhoneDigits(raw).slice(0, 10);
  if (!digits) return "";
  if (digits === "0") return "0";
  if (digits === "07" || /^07\d{0,8}$/.test(digits)) return digits;
  if (digits.startsWith("07")) return digits.slice(0, 10);
  return "";
}

export function isValidSwedishPhone(phone) {
  return MOBILE_PHONE_PATTERN.test(normalizePhoneDigits(phone));
}

const EMAIL_PATTERN =
  /^[a-zA-Z0-9](?:[a-zA-Z0-9._%+-]{0,62}[a-zA-Z0-9])?@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/;

export function isValidEmail(email) {
  const value = String(email ?? "").trim();
  if (!value || value.length > 254) return false;
  if (/\s/.test(value)) return false;
  if (!EMAIL_PATTERN.test(value)) return false;

  const at = value.lastIndexOf("@");
  if (at <= 0 || at === value.length - 1) return false;

  const local = value.slice(0, at);
  const domain = value.slice(at + 1);

  if (!/[a-zA-Z]/.test(local)) return false;
  if (local.startsWith(".") || local.endsWith(".") || local.includes("..")) return false;
  if (domain.startsWith("-") || domain.endsWith("-") || domain.includes("..")) return false;

  return true;
}

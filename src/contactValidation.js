/** Rensar till enbart siffror (formuläret tillåter inga andra tecken). */
export function normalizePhoneDigits(phone) {
  return String(phone ?? "").replace(/\D/g, "");
}

/**
 * Giltigt svenskt nummer i nationellt format (0701234567) eller med landskod (46701234567).
 * Matchar ungefär samma regler som calculate-offer.
 */
export function isValidSwedishPhone(phone) {
  const cleaned = normalizePhoneDigits(phone);
  if (!cleaned) return false;

  if (cleaned.startsWith("00")) {
    const intl = cleaned.slice(2);
    if (intl.startsWith("46")) {
      const subscriber = intl.slice(2);
      return subscriber.length >= 7 && subscriber.length <= 10 && /^[1-9]\d+$/.test(subscriber);
    }
    return intl.length >= 8 && intl.length <= 15;
  }

  if (cleaned.startsWith("46") && cleaned.length > 2) {
    const subscriber = cleaned.slice(2);
    return subscriber.length >= 7 && subscriber.length <= 10 && /^[1-9]\d+$/.test(subscriber);
  }

  if (cleaned.startsWith("0")) {
    const subscriber = cleaned.slice(1);
    if (subscriber.length < 7 || subscriber.length > 10) return false;
    if (!/^[1-9]\d+$/.test(subscriber)) return false;
    return /^\+\d{8,15}$/.test(`+46${subscriber}`);
  }

  if (/^\d{8,15}$/.test(cleaned)) {
    return /^\+\d{8,15}$/.test(`+${cleaned}`);
  }

  return false;
}

const EMAIL_PATTERN =
  /^[a-zA-Z0-9](?:[a-zA-Z0-9._%+-]{0,62}[a-zA-Z0-9])?@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/;

export function isValidEmail(email) {
  const value = String(email ?? "").trim();
  if (!value || value.length > 254) return false;
  if (/\s/.test(value)) return false;
  return EMAIL_PATTERN.test(value);
}

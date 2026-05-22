export const turnstileSiteKey = String(import.meta.env.VITE_TURNSTILE_SITE_KEY ?? "").trim();

export function isTurnstileConfigured() {
  return Boolean(turnstileSiteKey);
}

const RATE_LIMIT_MESSAGE =
  "Du har nått gränsen för hur många offertförfrågningar som kan skickas per timme. Välkommen tillbaka om cirka en timme – då kan du skicka en ny förfrågan.";

const CAPTCHA_RETRY_MESSAGE =
  "Vi kunde inte verifiera captcha. Vänta tills rutan visar att den är klar, och skicka sedan formuläret igen.";

export function isOfferRateLimitError(detail, error) {
  const text = String(detail ?? "");
  const statusHint = String(error?.message ?? "");
  return text.includes("För många offertförfrågningar") || statusHint.includes("429");
}

export function isOfferCaptchaError(detail) {
  const text = String(detail ?? "").toLowerCase();
  return (
    text.includes("captcha") ||
    text.includes("robot") ||
    text.includes("turnstile")
  );
}

/**
 * Customer-facing submit errors without technical prefixes or English API strings.
 */
export function getOfferSubmitErrorMessage(detail, error) {
  const text = String(detail ?? "").trim();

  if (isOfferRateLimitError(text, error)) {
    return RATE_LIMIT_MESSAGE;
  }

  if (isOfferCaptchaError(text)) {
    return CAPTCHA_RETRY_MESSAGE;
  }

  if (text.includes("consent must be true")) {
    return "Du behöver godkänna samtycket innan du kan skicka.";
  }

  if (text) {
    return text;
  }

  return "Något gick fel när offerten skulle beräknas. Kontrollera uppgifterna och försök igen.";
}

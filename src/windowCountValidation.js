/** pricedMax = högsta antal_fonster_till i fönsterputs_priser; max = formulärgräns. */
export const WINDOW_COUNT_LIMITS = { min: 1, max: 100, pricedMax: 60 };

export function sanitizeWindowCountInput(raw) {
  let digits = String(raw ?? "").replace(/\D/g, "");
  digits = digits.replace(/^0+/, "");
  if (!digits) return "";

  const value = Number(digits);
  if (Number.isFinite(value) && value > WINDOW_COUNT_LIMITS.max) {
    return String(WINDOW_COUNT_LIMITS.max);
  }

  return digits;
}

export function isManualWindowCountQuote(windowCount) {
  if (!Number.isInteger(windowCount)) return false;
  const { pricedMax, max } = WINDOW_COUNT_LIMITS;
  return windowCount > pricedMax && windowCount <= max;
}

export function validateWindowCount(windowCount) {
  const value = String(windowCount ?? "").trim();
  if (!value) return "Ange antal fönster.";
  if (!/^[1-9]\d*$/.test(value)) {
    return value === "0" ? `Ange antal fönster mellan ${WINDOW_COUNT_LIMITS.min} och ${WINDOW_COUNT_LIMITS.max}.` : "Ange endast siffror.";
  }

  const count = Number(value);
  if (count < WINDOW_COUNT_LIMITS.min || count > WINDOW_COUNT_LIMITS.max) {
    return `Ange antal fönster mellan ${WINDOW_COUNT_LIMITS.min} och ${WINDOW_COUNT_LIMITS.max}.`;
  }

  return "";
}

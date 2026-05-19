const WINDOW_COUNT_LIMITS = { min: 1, max: 100, pricedMax: 60 };

export function getWindowCountLimits() {
  return WINDOW_COUNT_LIMITS;
}

export function validateWindowCountForService(windowCount: number): string | null {
  const limits = WINDOW_COUNT_LIMITS;
  if (!Number.isInteger(windowCount)) {
    return `windowCount must be an integer between ${limits.min} and ${limits.max}.`;
  }
  if (windowCount < limits.min || windowCount > limits.max) {
    return `windowCount must be between ${limits.min} and ${limits.max}.`;
  }
  return null;
}

export function isManualWindowCountQuote(windowCount: number): boolean {
  const limits = WINDOW_COUNT_LIMITS;
  if (!Number.isInteger(windowCount)) return false;
  return windowCount > limits.pricedMax && windowCount <= limits.max;
}

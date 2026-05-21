export const MANUAL_LARGE_HOME_QUOTE_MESSAGE =
  "Tack för din förfrågan! För större boenden gör vi en skräddarsydd beräkning – vi återkommer med din offert så fort som möjligt!";

const ROOM_LIMITS: Record<string, { min: number; pricedMax: number; max: number; label: string }> = {
  lagenhet: { min: 1, pricedMax: 7, max: 10, label: "Lägenhet" },
  radhus: { min: 1, pricedMax: 7, max: 10, label: "Radhus" },
  villa: { min: 3, pricedMax: 7, max: 10, label: "Villa" }
};

export function getRoomLimitsForProperty(propertyType: string) {
  return ROOM_LIMITS[propertyType] ?? null;
}

export function validateNumRoomsForProperty(
  propertyType: string,
  numRooms: number
): string | null {
  const limits = getRoomLimitsForProperty(propertyType);
  if (!limits) {
    return "Property type must be one of: lagenhet, radhus, villa.";
  }
  if (!Number.isInteger(numRooms) || numRooms <= 0) {
    return "numRooms must be a positive integer.";
  }
  if (numRooms < limits.min) {
    return `${limits.label} requires at least ${limits.min} room(s).`;
  }
  if (numRooms > limits.max) {
    return `numRooms must be at most ${limits.max}.`;
  }
  return null;
}

/** Rum över prislistans intervall men högst 10 – manuell offert. */
export function isManualHomeRoomQuote(propertyType: string, numRooms: number): boolean {
  const limits = getRoomLimitsForProperty(propertyType);
  if (!limits || !Number.isInteger(numRooms)) return false;
  return numRooms > limits.pricedMax && numRooms <= limits.max;
}

export function isRoomCountAboveFormMaximum(propertyType: string, numRooms: number): boolean {
  const limits = getRoomLimitsForProperty(propertyType);
  if (!limits || !Number.isInteger(numRooms)) return false;
  return numRooms > limits.max;
}

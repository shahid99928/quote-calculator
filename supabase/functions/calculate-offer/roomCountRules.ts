export const MANUAL_LARGE_HOME_QUOTE_MESSAGE =
  "Tack för din förfrågan! För större boenden gör vi en skräddarsydd beräkning – vi återkommer med din offert så fort som möjligt!";

const ROOM_LIMITS: Record<string, { pricedMax: number; max: number }> = {
  lagenhet: { pricedMax: 7, max: 10 },
  radhus: { pricedMax: 7, max: 10 },
  villa: { pricedMax: 7, max: 10 }
};

export function getRoomLimitsForProperty(propertyType: string) {
  return ROOM_LIMITS[propertyType] ?? null;
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

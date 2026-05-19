import { isManualHomeRoomQuote } from "./roomCountRules.ts";
import { isManualSquareMetersQuote } from "./squareMetersRules.ts";
import { isManualWindowCountQuote } from "./windowCountRules.ts";

export { MANUAL_LARGE_HOME_QUOTE_MESSAGE } from "./roomCountRules.ts";

export function requiresManualQuote(
  serviceType: string,
  propertyType: string,
  numRooms: number,
  squareMeters: number,
  windowCount: number,
  isHousingPropertyService: boolean
): boolean {
  return (
    (isHousingPropertyService && isManualHomeRoomQuote(propertyType, numRooms)) ||
    isManualSquareMetersQuote(serviceType, propertyType, squareMeters, isHousingPropertyService) ||
    (serviceType === "Fonsterputs" && isManualWindowCountQuote(windowCount))
  );
}

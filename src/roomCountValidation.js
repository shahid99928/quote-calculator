import { getRoomCountLimits } from "./formConfig";

export function sanitizeRoomCountInput(raw, propertyType) {
  let digits = String(raw ?? "").replace(/\D/g, "");
  digits = digits.replace(/^0+/, "");
  if (!digits) return "";

  const limits = getRoomCountLimits(propertyType);
  const value = Number(digits);
  if (limits && Number.isFinite(value) && value > limits.max) {
    return String(limits.max);
  }

  return digits;
}

export function isManualRoomCountQuote(propertyType, numRooms) {
  const limits = getRoomCountLimits(propertyType);
  if (!limits || !Number.isInteger(numRooms)) return false;
  return numRooms > limits.pricedMax && numRooms <= limits.max;
}

export function validateNumRooms(numRooms, propertyType) {
  const value = String(numRooms ?? "").trim();
  if (!value) return "Ange antal rum.";
  if (value === "0") return "Antal rum måste vara minst 1.";
  if (!/^[1-9]\d*$/.test(value)) return "Ange endast siffror.";

  const count = Number(value);
  if (count < 1) return "Antal rum måste vara minst 1.";

  const limits = getRoomCountLimits(propertyType);
  if (!limits) return "Välj boendetyp.";

  if (count < limits.min) {
    return `${limits.label} har minst ${limits.min} rum.`;
  }
  if (count > limits.max) {
    return `${limits.label} har högst ${limits.max} rum.`;
  }

  return "";
}

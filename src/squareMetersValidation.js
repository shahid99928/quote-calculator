import { servicesRequiringPropertyFields } from "./formConfig";

/** Högsta kvm_till i bostads_priser per boendetyp. */
export const HOUSING_PRICED_MAX_KVM = {
  lagenhet: 150,
  radhus: 250,
  villa: 320
};

export const SQUARE_METERS_LIMITS = {
  stair: { min: 50, max: 500, pricedMax: 500 },
  business: { min: 50, max: 1000, pricedMax: 500 },
  housing: { min: 20, max: 500, pricedMax: 500 }
};

export function getSquareMetersLimits(serviceType) {
  if (serviceType === "Trappstadning BRFer") return SQUARE_METERS_LIMITS.stair;
  if (serviceType === "Foretagsstadning") return SQUARE_METERS_LIMITS.business;
  if (servicesRequiringPropertyFields.includes(serviceType)) {
    return SQUARE_METERS_LIMITS.housing;
  }
  return null;
}

export function getPricedMaxSquareMeters(serviceType, propertyType) {
  if (serviceType === "Foretagsstadning") return SQUARE_METERS_LIMITS.business.pricedMax;
  if (serviceType === "Trappstadning BRFer") return SQUARE_METERS_LIMITS.stair.pricedMax;
  if (servicesRequiringPropertyFields.includes(serviceType)) {
    return HOUSING_PRICED_MAX_KVM[propertyType] ?? null;
  }
  return null;
}

export function isManualSquareMetersQuote(squareMeters, serviceType, propertyType) {
  const limits = getSquareMetersLimits(serviceType);
  const pricedMax = getPricedMaxSquareMeters(serviceType, propertyType);
  if (!limits || pricedMax === null || !Number.isInteger(squareMeters)) return false;
  return squareMeters > pricedMax && squareMeters <= limits.max;
}

export function sanitizeSquareMetersInput(raw, serviceType) {
  let digits = String(raw ?? "").replace(/\D/g, "");
  digits = digits.replace(/^0+/, "");
  if (!digits) return "";

  const limits = getSquareMetersLimits(serviceType);
  const value = Number(digits);
  if (limits && Number.isFinite(value) && value > limits.max) {
    return String(limits.max);
  }

  return digits;
}

export function validateSquareMeters(squareMeters, serviceType) {
  const limits = getSquareMetersLimits(serviceType);
  if (!limits) return "";

  const value = String(squareMeters ?? "").trim();
  if (!value) return "Ange kvadratmeter.";
  if (!/^[1-9]\d*$/.test(value)) {
    return value === "0" ? `Ange kvm mellan ${limits.min} och ${limits.max}.` : "Ange endast siffror.";
  }

  const kvm = Number(value);
  if (kvm < limits.min || kvm > limits.max) {
    return `Ange kvm mellan ${limits.min} och ${limits.max}.`;
  }

  return "";
}

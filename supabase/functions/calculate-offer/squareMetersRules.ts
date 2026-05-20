/** Högsta kvm_till i bostads_priser per boendetyp (alla tjänster i tabellen). */
const HOUSING_PRICED_MAX_KVM: Record<string, number> = {
  lagenhet: 200,
  radhus: 300,
  villa: 500
};

const SQM_LIMITS: Record<string, { min: number; max: number; pricedMax: number }> = {
  stair: { min: 50, max: 500, pricedMax: 500 },
  business: { min: 50, max: 10000, pricedMax: 500 },
  housing: { min: 20, max: 500, pricedMax: 500 }
};

export function getSquareMetersLimitsForService(
  serviceType: string,
  isHousingPropertyService: boolean
): { min: number; max: number } | null {
  if (serviceType === "Trappstadning BRFer") return SQM_LIMITS.stair;
  if (serviceType === "Foretagsstadning") return SQM_LIMITS.business;
  if (isHousingPropertyService) return SQM_LIMITS.housing;
  return null;
}

export function validateSquareMetersForService(
  squareMeters: number,
  limits: { min: number; max: number } | null
): string | null {
  if (!limits) return null;
  if (!Number.isInteger(squareMeters)) {
    return `squareMeters must be an integer between ${limits.min} and ${limits.max}.`;
  }
  if (squareMeters < limits.min || squareMeters > limits.max) {
    return `squareMeters must be between ${limits.min} and ${limits.max}.`;
  }
  return null;
}

/** Kvm över prislistans högsta intervall men inom formulärets max – manuell offert. */
export function isManualSquareMetersQuote(
  serviceType: string,
  propertyType: string,
  squareMeters: number,
  isHousingPropertyService: boolean
): boolean {
  if (!Number.isInteger(squareMeters)) return false;

  if (serviceType === "Foretagsstadning") {
    const limits = SQM_LIMITS.business;
    return squareMeters > limits.pricedMax && squareMeters <= limits.max;
  }

  if (serviceType === "Trappstadning BRFer") {
    const limits = SQM_LIMITS.stair;
    return squareMeters > limits.pricedMax && squareMeters <= limits.max;
  }

  if (isHousingPropertyService) {
    const formLimits = SQM_LIMITS.housing;
    const pricedMax = HOUSING_PRICED_MAX_KVM[propertyType];
    if (!pricedMax) return false;
    return squareMeters > pricedMax && squareMeters <= formLimits.max;
  }

  return false;
}

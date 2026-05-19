function normalizeServiceKey(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const EXKL_MOMS_RUT_SERVICE_KEYS = new Set([
  "trappstadning brfer",
  "foretagsstadning",
  "kontorstadning",
  "butikstadning",
  "industristadning"
]);

export function isExklMomsRutOfferService(...values) {
  return values.some((value) => EXKL_MOMS_RUT_SERVICE_KEYS.has(normalizeServiceKey(value)));
}

export function getOfferPriceSubtext(...serviceValues) {
  if (isExklMomsRutOfferService(...serviceValues)) {
    return "Priset är exkl. moms och RUT-avdrag.";
  }
  return "Priset är inkl. moms och efter RUT-avdraget";
}

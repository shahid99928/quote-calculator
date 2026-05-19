/** Värden skickas oförändrat till API; etiketter visas med korrekta svenska bokstäver. */
export const serviceOptions = [
  { value: "Flyttstadning", label: "Flyttstädning" },
  { value: "Visningsstadning", label: "Visningsstädning" },
  { value: "Fonsterputs", label: "Fönsterputs" },
  { value: "Hemstadning", label: "Hemstädning" },
  { value: "Storstadning", label: "Storstädning" },
  { value: "Trappstadning BRFer", label: "Trappstädning BRF:er" },
  { value: "Byggstadning", label: "Byggstädning" },
  { value: "Foretagsstadning", label: "Företagsstädning" }
];

export const servicesRequiringPropertyFields = [
  "Flyttstadning",
  "Hemstadning",
  "Storstadning",
  "Byggstadning",
  "Visningsstadning"
];

export const servicesRequiringFrequency = ["Foretagsstadning", "Hemstadning"];

export const propertyTypeOptions = [
  { value: "lagenhet", label: "Lägenhet" },
  { value: "radhus", label: "Radhus" },
  { value: "villa", label: "Villa" }
];

export const MANUAL_LARGE_HOME_QUOTE_MESSAGE =
  "Tack för din förfrågan! För större boenden gör vi en skräddarsydd beräkning – vi återkommer med din offert så fort som möjligt!";

/** pricedMax = automatisk kalkyl i bostads_priser; max = högsta tillåtna i formuläret. */
export const roomCountByPropertyType = {
  lagenhet: { min: 1, max: 10, pricedMax: 6, label: "Lägenhet" },
  radhus: { min: 1, max: 10, pricedMax: 7, label: "Radhus" },
  villa: { min: 3, max: 10, pricedMax: 7, label: "Villa" }
};

export function getRoomCountLimits(propertyType) {
  return roomCountByPropertyType[propertyType] ?? null;
}

export const windowTypeOptions = [
  { value: "2-sidiga (In/utvandiga)", label: "2-sidiga (in-/utvändiga)" },
  { value: "4-sidiga (In/utvandiga samt emellan)", label: "4-sidiga (in-/utvändiga samt emellan)" },
  { value: "Annan", label: "Annan" }
];

export const yesNoOptions = ["Ja", "Nej"];

export const frequencyOptions = [
  "Engångsstädning",
  "1 gång/vecka",
  "2 gånger/vecka",
  "Varje dag",
  "1 gång/månad",
  "2 gånger/månad"
];

export const businessLocalTypeOptions = ["Kontor", "Butik", "Industri"];

export const stairFrequencyOptions = ["1 gång/vecka", "Varannan vecka", "1 gång/månad"];

export const initialForm = {
  serviceType: "",
  propertyType: "",
  numRooms: "",
  squareMeters: "",
  frequency: "",
  businessLocalType: "",
  workstations: "",
  stairFrequency: "",
  windowCount: "",
  windowType: "",
  glazedBalcony: "",
  balconyWindowCount: "",
  stairwells: "",
  floors: "",
  elevators: "",
  city: "",
  phone: "",
  email: "",
  consent: false
};

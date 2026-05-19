/** Today's date in Europe/Stockholm as YYYY-MM-DD (matches HTML date input). */
export function getMinBookingDateString(timeZone = "Europe/Stockholm") {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}

export function isBookingDateNotInPast(dateValue, minDate = getMinBookingDateString()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateValue ?? ""))) return false;
  return dateValue >= minDate;
}

export function validateBookingDate(dateValue) {
  if (!dateValue) return "Välj ett datum för bokningen.";
  if (!isBookingDateNotInPast(dateValue)) {
    return "Datumet kan inte ligga i det förflutna.";
  }
  return "";
}

export function toIsoDate(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseIsoDate(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? ""));
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

export function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

/** Monday = 0 … Sunday = 6 (Swedish week). */
export function getMondayBasedWeekday(year, month) {
  const jsDay = new Date(year, month - 1, 1).getDay();
  return (jsDay + 6) % 7;
}

export function monthIndex(year, month) {
  return year * 12 + month;
}

export function isSelectableBookingDate(iso, minDate) {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) && iso >= minDate;
}

export const BOOKING_WEEKDAY_LABELS = ["mån", "tis", "ons", "tors", "fre", "lör", "sön"];

export const BOOKING_MONTH_LABELS = [
  "januari",
  "februari",
  "mars",
  "april",
  "maj",
  "juni",
  "juli",
  "augusti",
  "september",
  "oktober",
  "november",
  "december"
];

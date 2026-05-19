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

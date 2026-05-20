import {
  businessLocalTypeOptions,
  frequencyOptions,
  propertyTypeOptions,
  servicesRequiringFrequency,
  servicesRequiringPropertyFields,
  stairFrequencyOptions,
  windowTypeOptions,
  yesNoOptions
} from "./formConfig";
import { isValidEmail, isValidSwedishPhone, normalizePhoneDigits } from "./contactValidation";
import { validateNumRooms } from "./roomCountValidation";
import { validateSquareMeters } from "./squareMetersValidation";
import { validateWindowCount } from "./windowCountValidation";

export function getFormErrors(form) {
  const propertyFieldsRequired = servicesRequiringPropertyFields.includes(form.serviceType);
  const isStairService = form.serviceType === "Trappstadning BRFer";
  const isWindowService = form.serviceType === "Fonsterputs";
  const isBusinessService = form.serviceType === "Foretagsstadning";
  const isIntString = (value) => /^[0-9]+$/.test(String(value ?? "").trim());
  const toInt = (value) => Number.parseInt(String(value ?? "").trim(), 10);
  const inRange = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;

  return {
    serviceType: form.serviceType ? "" : "Välj en tjänst.",
    propertyType:
      propertyFieldsRequired || isWindowService
        ? propertyTypeOptions.some((option) => option.value === form.propertyType)
          ? ""
          : "Välj boendetyp."
        : "",
    numRooms: propertyFieldsRequired ? validateNumRooms(form.numRooms, form.propertyType) : "",
    squareMeters: isWindowService ? "" : validateSquareMeters(form.squareMeters, form.serviceType),
    stairwells: isStairService
      ? !isIntString(form.stairwells)
        ? "Ange endast siffror."
        : inRange(toInt(form.stairwells), 1, 99)
          ? ""
          : "Ange ett värde mellan 1 och 99."
      : "",
    floors: isStairService
      ? !isIntString(form.floors)
        ? "Ange endast siffror."
        : inRange(toInt(form.floors), 1, 99)
          ? ""
          : "Ange ett värde mellan 1 och 99."
      : "",
    elevators: isStairService
      ? !isIntString(form.elevators)
        ? "Ange endast siffror."
        : inRange(toInt(form.elevators), 0, 99)
          ? ""
          : "Ange ett värde mellan 0 och 99."
      : "",
    frequency: servicesRequiringFrequency.includes(form.serviceType)
      ? frequencyOptions.includes(form.frequency)
        ? ""
        : "Välj städfrekvens."
      : "",
    businessLocalType:
      form.serviceType === "Foretagsstadning"
        ? businessLocalTypeOptions.includes(form.businessLocalType)
          ? ""
          : "Välj typ av lokal."
        : "",
    workstations:
      form.serviceType === "Foretagsstadning" && form.businessLocalType === "Kontor"
        ? !isIntString(form.workstations)
          ? "Ange endast siffror."
          : toInt(form.workstations) > 0
            ? ""
            : "Ange minst 1 arbetsplats."
        : "",
    stairFrequency: isStairService
      ? stairFrequencyOptions.includes(form.stairFrequency)
        ? ""
        : "Välj städfrekvens."
      : "",
    windowCount: isWindowService ? validateWindowCount(form.windowCount) : "",
    windowType: isWindowService
      ? windowTypeOptions.some((option) => option.value === form.windowType)
        ? ""
        : "Välj fönstertyp."
      : "",
    glazedBalcony: isWindowService
      ? yesNoOptions.includes(form.glazedBalcony)
        ? ""
        : "Välj Ja eller Nej."
      : "",
    balconyWindowCount:
      isWindowService && form.glazedBalcony === "Ja"
        ? !isIntString(form.balconyWindowCount)
          ? "Ange endast siffror."
          : toInt(form.balconyWindowCount) > 0
            ? ""
            : "Ange minst 1 balkongfönster."
        : "",
    city: /^[\p{L} ]+$/u.test(form.city.trim()) ? "" : "Ange endast bokstäver.",
    phone: (() => {
      const digits = normalizePhoneDigits(form.phone);
      if (!digits) return "Ange telefonnummer.";
      if (!isValidSwedishPhone(digits)) {
        return "Ange ett korrekt telefonnummer (t.ex. 0701234567).";
      }
      return "";
    })(),
    email: (() => {
      const value = form.email.trim();
      if (!value) return "Ange e-postadress.";
      if (!isValidEmail(value)) return "Ange en korrekt e-postadress.";
      return "";
    })(),
    consent: form.consent ? "" : "Du behöver lämna samtycke för att gå vidare."
  };
}

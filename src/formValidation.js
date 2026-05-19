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

export function getFormErrors(form) {
  const propertyFieldsRequired = servicesRequiringPropertyFields.includes(form.serviceType);
  const isStairService = form.serviceType === "Trappstadning BRFer";
  const isWindowService = form.serviceType === "Fonsterputs";
  const isBusinessService = form.serviceType === "Foretagsstadning";

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
      ? /^[0-9]+$/.test(form.stairwells)
        ? ""
        : "Ange endast siffror."
      : "",
    floors: isStairService
      ? /^[0-9]+$/.test(form.floors)
        ? ""
        : "Ange endast siffror."
      : "",
    elevators: isStairService
      ? /^[0-9]+$/.test(form.elevators)
        ? ""
        : "Ange endast siffror."
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
        ? /^[0-9]+$/.test(form.workstations)
          ? ""
          : "Ange endast siffror."
        : "",
    stairFrequency: isStairService
      ? stairFrequencyOptions.includes(form.stairFrequency)
        ? ""
        : "Välj städfrekvens."
      : "",
    windowCount: isWindowService
      ? /^[0-9]+$/.test(form.windowCount)
        ? ""
        : "Ange endast siffror."
      : "",
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
        ? /^[0-9]+$/.test(form.balconyWindowCount)
          ? ""
          : "Ange endast siffror."
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

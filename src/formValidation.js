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

export function getFormErrors(form) {
  const propertyFieldsRequired = servicesRequiringPropertyFields.includes(form.serviceType);
  const isStairService = form.serviceType === "Trappstadning BRFer";
  const isWindowService = form.serviceType === "Fonsterputs";
  const isBusinessService = form.serviceType === "Foretagsstadning";
  const businessSqm = Number(form.squareMeters);

  return {
    serviceType: form.serviceType ? "" : "Välj en tjänst.",
    propertyType:
      propertyFieldsRequired || isWindowService
        ? propertyTypeOptions.some((option) => option.value === form.propertyType)
          ? ""
          : "Välj boendetyp."
        : "",
    numRooms: propertyFieldsRequired
      ? /^[0-9]+$/.test(form.numRooms)
        ? ""
        : "Ange endast siffror."
      : "",
    squareMeters: isWindowService
      ? ""
      : isStairService
        ? (() => {
            if (!/^[0-9]+$/.test(form.squareMeters)) return "Ange endast siffror.";
            const kvm = Number(form.squareMeters);
            if (kvm < 50 || kvm > 500) return "Ange kvm mellan 50 och 500.";
            return "";
          })()
        : isBusinessService
          ? /^[0-9]+$/.test(form.squareMeters) && Number.isFinite(businessSqm) && businessSqm >= 50
            ? ""
            : "Ange ett nummer som är 50 eller större."
          : /^[0-9]+$/.test(form.squareMeters)
            ? ""
            : "Ange endast siffror.",
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
    phone: /^[0-9]+$/.test(form.phone) ? "" : "Ange endast siffror.",
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) ? "" : "Ange en giltig e-postadress.",
    consent: form.consent ? "" : "Du behöver lämna samtycke för att gå vidare."
  };
}

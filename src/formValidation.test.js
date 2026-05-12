import { describe, expect, it } from "vitest";
import { initialForm } from "./formConfig";
import { getFormErrors } from "./formValidation";

function makeForm(overrides = {}) {
  return {
    ...initialForm,
    serviceType: "Flyttstadning",
    propertyType: "lagenhet",
    numRooms: "2",
    squareMeters: "55",
    city: "Stockholm",
    phone: "0701234567",
    email: "test@example.com",
    consent: true,
    ...overrides
  };
}

describe("getFormErrors", () => {
  it("accepts a valid home-service payload", () => {
    const errors = getFormErrors(makeForm());
    expect(Object.values(errors).every((value) => value === "")).toBe(true);
  });

  it("requires service type and consent", () => {
    const errors = getFormErrors(makeForm({ serviceType: "", consent: false }));
    expect(errors.serviceType).toBe("Välj en tjänst.");
    expect(errors.consent).toBe("Du behöver lämna samtycke för att gå vidare.");
  });

  it("validates Foretagsstadning specific fields", () => {
    const errors = getFormErrors(
      makeForm({
        serviceType: "Foretagsstadning",
        squareMeters: "49",
        businessLocalType: "",
        frequency: "",
        workstations: "abc"
      })
    );

    expect(errors.squareMeters).toBe("Ange ett nummer som är 50 eller större.");
    expect(errors.businessLocalType).toBe("Välj typ av lokal.");
    expect(errors.frequency).toBe("Välj städfrekvens.");
    expect(errors.workstations).toBe("");
  });

  it("requires workstations for office business cleaning", () => {
    const errors = getFormErrors(
      makeForm({
        serviceType: "Foretagsstadning",
        squareMeters: "120",
        businessLocalType: "Kontor",
        frequency: "1 gång/vecka",
        workstations: ""
      })
    );
    expect(errors.workstations).toBe("Ange endast siffror.");
  });

  it("validates Fonsterputs balcony count rules", () => {
    const withBalcony = getFormErrors(
      makeForm({
        serviceType: "Fonsterputs",
        propertyType: "villa",
        windowCount: "12",
        windowType: "2-sidiga (In/utvandiga)",
        glazedBalcony: "Ja",
        balconyWindowCount: ""
      })
    );
    expect(withBalcony.balconyWindowCount).toBe("Ange endast siffror.");

    const withoutBalcony = getFormErrors(
      makeForm({
        serviceType: "Fonsterputs",
        propertyType: "villa",
        windowCount: "12",
        windowType: "2-sidiga (In/utvandiga)",
        glazedBalcony: "Nej",
        balconyWindowCount: ""
      })
    );
    expect(withoutBalcony.balconyWindowCount).toBe("");
  });

  it("tillåter svenska bokstäver i ortnamn", () => {
    const errors = getFormErrors(makeForm({ city: "Malmö" }));
    expect(errors.city).toBe("");
  });

  it("avvisar ortnamn med siffror eller otillåtna tecken", () => {
    const errors = getFormErrors(makeForm({ city: "Stockholm2" }));
    expect(errors.city).toBe("Ange endast bokstäver.");
  });
});

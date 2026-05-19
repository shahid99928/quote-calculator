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
  it("validerar kvadratmeter per tjänst", () => {
    expect(getFormErrors(makeForm({ squareMeters: "19" })).squareMeters).toContain("mellan");
    expect(getFormErrors(makeForm({ squareMeters: "501" })).squareMeters).toContain("mellan");
    expect(
      getFormErrors(
        makeForm({ serviceType: "Foretagsstadning", squareMeters: "49", frequency: "1 gång/vecka" })
      ).squareMeters
    ).toContain("mellan");
    expect(
      getFormErrors(makeForm({ serviceType: "Trappstadning BRFer", squareMeters: "40" })).squareMeters
    ).toContain("mellan");
    expect(getFormErrors(makeForm({ squareMeters: "55" })).squareMeters).toBe("");
  });

  it("validerar antal rum per boendetyp", () => {
    expect(getFormErrors(makeForm({ numRooms: "0" })).numRooms).toBe("Antal rum måste vara minst 1.");
    expect(getFormErrors(makeForm({ propertyType: "lagenhet", numRooms: "7" })).numRooms).toBe("");
    expect(getFormErrors(makeForm({ propertyType: "lagenhet", numRooms: "11" })).numRooms).toContain(
      "högst 10"
    );
    expect(getFormErrors(makeForm({ propertyType: "villa", numRooms: "2" })).numRooms).toContain(
      "minst 3"
    );
    expect(getFormErrors(makeForm({ propertyType: "radhus", numRooms: "10" })).numRooms).toBe("");
  });

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

    expect(errors.squareMeters).toBe("Ange kvm mellan 50 och 1000.");
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

  it("validates Fonsterputs window count range", () => {
    expect(
      getFormErrors(
        makeForm({
          serviceType: "Fonsterputs",
          propertyType: "villa",
          windowCount: "0",
          windowType: "2-sidiga (In/utvandiga)",
          glazedBalcony: "Nej"
        })
      ).windowCount
    ).toContain("mellan");
    expect(
      getFormErrors(
        makeForm({
          serviceType: "Fonsterputs",
          propertyType: "villa",
          windowCount: "101",
          windowType: "2-sidiga (In/utvandiga)",
          glazedBalcony: "Nej"
        })
      ).windowCount
    ).toContain("mellan");
    expect(
      getFormErrors(
        makeForm({
          serviceType: "Fonsterputs",
          propertyType: "villa",
          windowCount: "75",
          windowType: "2-sidiga (In/utvandiga)",
          glazedBalcony: "Nej"
        })
      ).windowCount
    ).toBe("");
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

  it("kräver mobilnummer 07 och exakt 10 siffror", () => {
    expect(getFormErrors(makeForm({ phone: "" })).phone).toBe("Ange telefonnummer.");
    expect(getFormErrors(makeForm({ phone: "0724433" })).phone).toContain("korrekt telefonnummer");
    expect(getFormErrors(makeForm({ phone: "0812345678" })).phone).toContain("korrekt telefonnummer");
    expect(getFormErrors(makeForm({ phone: "46701234567" })).phone).toContain("korrekt telefonnummer");
    expect(getFormErrors(makeForm({ phone: "0701234567" })).phone).toBe("");
  });

  it("kräver korrekt e-postadress", () => {
    expect(getFormErrors(makeForm({ email: "" })).email).toBe("Ange e-postadress.");
    expect(getFormErrors(makeForm({ email: "inte-en-e-post" })).email).toBe(
      "Ange en korrekt e-postadress."
    );
    expect(getFormErrors(makeForm({ email: "a@b" })).email).toBe("Ange en korrekt e-postadress.");
    expect(getFormErrors(makeForm({ email: "1111@gmail.com" })).email).toBe(
      "Ange en korrekt e-postadress."
    );
    expect(getFormErrors(makeForm({ email: "test@example.com" })).email).toBe("");
    expect(getFormErrors(makeForm({ email: "shahid.abdul@outlook.com" })).email).toBe("");
  });
});

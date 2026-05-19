import { describe, expect, it } from "vitest";
import {
  isValidEmail,
  isValidSwedishPhone,
  sanitizeMobilePhoneInput
} from "./contactValidation";

describe("sanitizeMobilePhoneInput", () => {
  it("allows only prefixes toward 07XXXXXXXX", () => {
    expect(sanitizeMobilePhoneInput("0")).toBe("0");
    expect(sanitizeMobilePhoneInput("07")).toBe("07");
    expect(sanitizeMobilePhoneInput("0701234567")).toBe("0701234567");
    expect(sanitizeMobilePhoneInput("070123456789")).toBe("0701234567");
  });

  it("rejects input that does not start with 07", () => {
    expect(sanitizeMobilePhoneInput("8")).toBe("");
    expect(sanitizeMobilePhoneInput("0812345678")).toBe("");
  });
});

describe("isValidSwedishPhone", () => {
  it("requires 07 and exactly 10 digits", () => {
    expect(isValidSwedishPhone("0701234567")).toBe(true);
    expect(isValidSwedishPhone("0724433")).toBe(false);
    expect(isValidSwedishPhone("0812345678")).toBe(false);
  });
});

describe("isValidEmail", () => {
  it("rejects addresses with only digits before @", () => {
    expect(isValidEmail("1111@gmail.com")).toBe(false);
    expect(isValidEmail("shahid.abdul@outlook.com")).toBe(true);
  });
});

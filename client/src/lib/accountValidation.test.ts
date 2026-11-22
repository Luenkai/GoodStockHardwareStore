import { describe, expect, it } from "vitest";
import {
  EMPTY_CUSTOMER_ADDRESS,
  hasCustomerFormChanges,
  isDeliveryAddressStarted,
  normalizeAddressForSave,
  validateCustomerDetails,
} from "./accountValidation";
import {
  readStoredThemePreference,
  resetMemoryThemePreferenceForTests,
  resolveTheme,
  writeStoredThemePreference,
} from "../contexts/ThemeContext";

describe("customer profile & delivery address validation contract", () => {
  it("allows saving profile details without requiring a delivery address when address is blank", () => {
    const result = validateCustomerDetails("Alex Morgan", EMPTY_CUSTOMER_ADDRESS);
    expect(result.valid).toBe(true);
    expect(result.addressStarted).toBe(false);
    expect(result.errors).toEqual({});
    expect(result.firstInvalidField).toBeNull();
  });

  it("rejects whitespace-only full name and focuses name first", () => {
    const result = validateCustomerDetails("   ", EMPTY_CUSTOMER_ADDRESS);
    expect(result.valid).toBe(false);
    expect(result.errors.name).toBe("Enter your full name.");
    expect(result.firstInvalidField).toBe("name");
  });

  it("validates street, city, and postal code together once any address field is started", () => {
    const started = {
      ...EMPTY_CUSTOMER_ADDRESS,
      recipient_name: "Alex Morgan",
      city: "   ",
    };
    expect(isDeliveryAddressStarted(started)).toBe(true);
    const result = validateCustomerDetails("Alex Morgan", started);
    expect(result.valid).toBe(false);
    expect(result.addressStarted).toBe(true);
    expect(result.errors).toEqual({
      line1: "Enter a street address.",
      city: "Enter a city.",
      postal_code: "Enter a postal code.",
    });
    expect(result.firstInvalidField).toBe("line1");
  });

  it("focuses the first remaining invalid address field when street is already provided", () => {
    const partial = {
      ...EMPTY_CUSTOMER_ADDRESS,
      line1: "24 Narra Street",
      city: "",
      postal_code: "1102",
    };
    const result = validateCustomerDetails("Alex Morgan", partial);
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual({ city: "Enter a city." });
    expect(result.firstInvalidField).toBe("city");
  });

  it("normalizes trimmed address values and defaults country to PH on save", () => {
    const payload = normalizeAddressForSave(
      {
        ...EMPTY_CUSTOMER_ADDRESS,
        line1: "  24 Narra Street ",
        city: " Quezon City ",
        postal_code: " 1102 ",
      },
      "user-123",
      " Alex Morgan ",
    );
    expect(payload.recipient_name).toBe("Alex Morgan");
    expect(payload.line1).toBe("24 Narra Street");
    expect(payload.city).toBe("Quezon City");
    expect(payload.postal_code).toBe("1102");
    expect(payload.country).toBe("PH");
  });

  it("detects unsaved profile or delivery address edits accurately", () => {
    const baseline = {
      name: "Alex Morgan",
      phone: "+63 917 123 4567",
      address: EMPTY_CUSTOMER_ADDRESS,
    };
    expect(hasCustomerFormChanges(baseline, baseline)).toBe(false);
    expect(
      hasCustomerFormChanges(
        { ...baseline, address: { ...EMPTY_CUSTOMER_ADDRESS, line1: "24 Narra" } },
        baseline,
      ),
    ).toBe(true);
  });
});

describe("resilient theme preference storage", () => {
  it("retains selected theme preference in memory when localStorage throws", () => {
    resetMemoryThemePreferenceForTests();
    const throwingStorage = {
      getItem() {
        throw new Error("SecurityError: storage blocked");
      },
      setItem() {
        throw new Error("QuotaExceededError");
      },
    };

    expect(readStoredThemePreference(throwingStorage)).toBeNull();
    expect(writeStoredThemePreference("dark", throwingStorage)).toBe(false);
    expect(readStoredThemePreference(throwingStorage)).toBe("dark");
    expect(resolveTheme("system", "dark")).toBe("dark");
    expect(resolveTheme("system", "light")).toBe("light");
    expect(resolveTheme("light", "dark")).toBe("light");
  });
});

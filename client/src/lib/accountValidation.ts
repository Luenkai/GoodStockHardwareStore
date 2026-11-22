export type CustomerAddressDraft = {
  id?: string;
  recipient_name: string;
  label: string;
  line1: string;
  line2: string;
  city: string;
  region: string;
  postal_code: string;
  country: string;
};

export type CustomerProfileFieldKey =
  | "name"
  | "phone"
  | "recipient_name"
  | "line1"
  | "line2"
  | "city"
  | "region"
  | "postal_code"
  | "country";

export type CustomerValidationErrors = Partial<Record<CustomerProfileFieldKey, string>>;

export type CustomerValidationResult = {
  valid: boolean;
  addressStarted: boolean;
  errors: CustomerValidationErrors;
  firstInvalidField: CustomerProfileFieldKey | null;
};

export const EMPTY_CUSTOMER_ADDRESS: CustomerAddressDraft = {
  recipient_name: "",
  label: "Home",
  line1: "",
  line2: "",
  city: "",
  region: "",
  postal_code: "",
  country: "",
};

const EDITABLE_ADDRESS_KEYS: Array<Exclude<keyof CustomerAddressDraft, "id" | "label">> = [
  "recipient_name",
  "line1",
  "line2",
  "city",
  "region",
  "postal_code",
  "country",
];

/**
 * Delivery address is optional until checkout or until the user starts entering any address field
 * (or already has a saved address record on file).
 */
export function isDeliveryAddressStarted(address: CustomerAddressDraft): boolean {
  const anyNonEmpty = EDITABLE_ADDRESS_KEYS.some(key => address[key].trim().length > 0);
  if (anyNonEmpty) return true;
  return Boolean(address.id);
}

export function validateCustomerDetails(
  name: string,
  address: CustomerAddressDraft,
): CustomerValidationResult {
  const errors: CustomerValidationErrors = {};
  const trimmedName = name.trim();

  if (!trimmedName) {
    errors.name = "Enter your full name.";
  }

  const addressStarted = isDeliveryAddressStarted(address);

  if (addressStarted) {
    if (!address.line1.trim()) {
      errors.line1 = "Enter a street address.";
    }
    if (!address.city.trim()) {
      errors.city = "Enter a city.";
    }
    if (!address.postal_code.trim()) {
      errors.postal_code = "Enter a postal code.";
    }
  }

  const fieldOrder: CustomerProfileFieldKey[] = [
    "name",
    "recipient_name",
    "line1",
    "line2",
    "city",
    "region",
    "postal_code",
    "country",
  ];
  const firstInvalidField = fieldOrder.find(field => Boolean(errors[field])) ?? null;

  return {
    valid: firstInvalidField === null,
    addressStarted,
    errors,
    firstInvalidField,
  };
}

export function normalizeAddressForSave(
  address: CustomerAddressDraft,
  userId: string,
  fallbackRecipientName: string,
) {
  return {
    user_id: userId,
    is_default: true,
    recipient_name: address.recipient_name.trim() || fallbackRecipientName.trim(),
    label: address.label.trim() || "Home",
    line1: address.line1.trim(),
    line2: address.line2.trim(),
    city: address.city.trim(),
    region: address.region.trim(),
    postal_code: address.postal_code.trim(),
    country: address.country.trim() || "PH",
  };
}

export function hasCustomerFormChanges(
  current: { name: string; phone: string; address: CustomerAddressDraft },
  saved: { name: string; phone: string; address: CustomerAddressDraft },
): boolean {
  if (current.name !== saved.name) return true;
  if (current.phone !== saved.phone) return true;
  return EDITABLE_ADDRESS_KEYS.some(key => current.address[key] !== saved.address[key]);
}

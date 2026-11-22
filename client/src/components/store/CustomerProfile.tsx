import {
  FormEvent,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { LoaderCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { InlineStatus, TextField } from "@/components/store/GoodstockControls";
import {
  EMPTY_CUSTOMER_ADDRESS,
  hasCustomerFormChanges,
  normalizeAddressForSave,
  validateCustomerDetails,
  type CustomerAddressDraft,
  type CustomerProfileFieldKey,
  type CustomerValidationErrors,
} from "@/lib/accountValidation";
import {
  loadCustomerProfileData,
  saveLocalProfileAndAddress,
  type CustomerUser,
} from "@/lib/storeOperations";

export interface CustomerProfileHandle {
  saveChanges: () => Promise<boolean>;
}

type SaveFeedback =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; body: string }
  | { kind: "error"; title: string; body: string; retryLabel?: string }
  | { kind: "partial_error"; body: string }
  | { kind: "session_expired" };

function isSessionExpiredError(err: {
  message?: string;
  code?: string;
  status?: number;
} | null): boolean {
  if (!err) return false;
  const msg = (err.message ?? "").toLowerCase();
  return (
    err.status === 401 ||
    err.code === "PGRST301" ||
    msg.includes("jwt") ||
    msg.includes("expired") ||
    msg.includes("not authenticated") ||
    msg.includes("session")
  );
}

const CustomerProfile = forwardRef<
  CustomerProfileHandle,
  {
    user: CustomerUser;
    initialDraft?: {
      name: string;
      phone: string;
      address: CustomerAddressDraft;
    } | null;
    onDirtyChange?: (dirty: boolean) => void;
    onProfileSaved?: () => void;
    onSessionExpired?: (draft: {
      name: string;
      phone: string;
      address: CustomerAddressDraft;
    }) => void;
  }
>(function CustomerProfile(
  {
    user,
    initialDraft = null,
    onDirtyChange,
    onProfileSaved,
    onSessionExpired,
  },
  ref,
) {
  const [name, setName] = useState(initialDraft?.name ?? user.displayName);
  const [phone, setPhone] = useState(initialDraft?.phone ?? user.phone ?? "");
  const [address, setAddress] = useState<CustomerAddressDraft>(
    initialDraft?.address ?? EMPTY_CUSTOMER_ADDRESS,
  );
  const [savedSnapshot, setSavedSnapshot] = useState<{
    name: string;
    phone: string;
    address: CustomerAddressDraft;
  }>({
    name: user.displayName,
    phone: user.phone ?? "",
    address: EMPTY_CUSTOMER_ADDRESS,
  });

  const [errors, setErrors] = useState<CustomerValidationErrors>({});
  const [feedback, setFeedback] = useState<SaveFeedback>({ kind: "idle" });

  const fieldRefs = useRef<
    Partial<Record<CustomerProfileFieldKey, HTMLInputElement | null>>
  >({});

  const registerRef = useCallback(
    (key: CustomerProfileFieldKey) => (node: HTMLInputElement | null) => {
      fieldRefs.current[key] = node;
    },
    [],
  );

  useEffect(() => {
    let active = true;
    void loadCustomerProfileData(user).then(loaded => {
      if (!active) return;
      setSavedSnapshot({
        name: loaded.name,
        phone: loaded.phone,
        address: loaded.address,
      });
      if (!initialDraft) {
        setName(loaded.name);
        setPhone(loaded.phone);
        setAddress(loaded.address);
      }
    });
    return () => {
      active = false;
    };
  }, [user, initialDraft]);

  const isDirty = hasCustomerFormChanges(
    { name, phone, address },
    savedSnapshot,
  );

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const clearFieldError = (key: CustomerProfileFieldKey) => {
    setErrors(prev => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const executeSave = useCallback(async (): Promise<boolean> => {
    const validation = validateCustomerDetails(name, address);
    setErrors(validation.errors);

    if (!validation.valid) {
      setFeedback({
        kind: "error",
        title: "Check the highlighted fields",
        body: validation.addressStarted
          ? "Enter your full name and complete street, city, and postal code — or clear the address fields to save only your contact details."
          : "Enter your full name before saving.",
      });
      if (validation.firstInvalidField) {
        fieldRefs.current[validation.firstInvalidField]?.focus();
      }
      return false;
    }

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    if (!supabase) {
      setFeedback({ kind: "saving" });
      await new Promise(resolve => window.setTimeout(resolve, 180));
      const savedAddress = await saveLocalProfileAndAddress(
        user.id,
        trimmedName,
        trimmedPhone,
        validation.addressStarted ? address : null,
      );
      setName(trimmedName);
      setPhone(trimmedPhone);
      setAddress(savedAddress);
      setSavedSnapshot({
        name: trimmedName,
        phone: trimmedPhone,
        address: savedAddress,
      });
      setFeedback({
        kind: "saved",
        body: validation.addressStarted
          ? "Your profile and delivery address are saved and ready for checkout."
          : "Your contact details are saved. Add a delivery address whenever you’re ready.",
      });
      onProfileSaved?.();
      return true;
    }

    setFeedback({ kind: "saving" });

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setFeedback({ kind: "session_expired" });
      return false;
    }

    const profileResult = await supabase
      .from("profiles")
      .update({
        display_name: trimmedName,
        phone: trimmedPhone,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (profileResult.error) {
      if (isSessionExpiredError(profileResult.error)) {
        setFeedback({ kind: "session_expired" });
        return false;
      }
      setFeedback({
        kind: "error",
        title: "Couldn’t save your changes",
        body: "Check your connection and try again. Your edits are still here.",
        retryLabel: "Try again",
      });
      return false;
    }

    if (validation.addressStarted) {
      const payload = normalizeAddressForSave(address, user.id, trimmedName);
      const addrResult = address.id
        ? await supabase
            .from("addresses")
            .update(payload)
            .eq("id", address.id)
            .eq("user_id", user.id)
        : await supabase
            .from("addresses")
            .insert(payload)
            .select("id")
            .single();

      if (addrResult.error) {
        setName(trimmedName);
        setPhone(trimmedPhone);
        setSavedSnapshot(prev => ({
          ...prev,
          name: trimmedName,
          phone: trimmedPhone,
        }));
        if (isSessionExpiredError(addrResult.error)) {
          setFeedback({ kind: "session_expired" });
          return false;
        }
        setFeedback({
          kind: "partial_error",
          body: "Your name and phone were saved, but your delivery address couldn’t be saved yet. Check your connection and try again — your address edits are still here.",
        });
        return false;
      }

      const nextId =
        address.id ??
        (addrResult.data && "id" in addrResult.data
          ? String(addrResult.data.id)
          : undefined);
      const nextAddress: CustomerAddressDraft = {
        ...address,
        id: nextId,
        recipient_name: payload.recipient_name,
        label: payload.label,
        line1: payload.line1,
        line2: payload.line2,
        city: payload.city,
        region: payload.region,
        postal_code: payload.postal_code,
        country: payload.country,
      };
      setName(trimmedName);
      setPhone(trimmedPhone);
      setAddress(nextAddress);
      setSavedSnapshot({
        name: trimmedName,
        phone: trimmedPhone,
        address: nextAddress,
      });
      setFeedback({
        kind: "saved",
        body: "Your profile and delivery address are ready for your next order.",
      });
      onProfileSaved?.();
      return true;
    }

    setName(trimmedName);
    setPhone(trimmedPhone);
    setSavedSnapshot(prev => ({
      ...prev,
      name: trimmedName,
      phone: trimmedPhone,
    }));
    setFeedback({
      kind: "saved",
      body: "Your contact details are saved. Add a delivery address whenever you’re ready.",
    });
    onProfileSaved?.();
    return true;
  }, [name, phone, address, user.id, onProfileSaved]);

  useImperativeHandle(
    ref,
    () => ({
      saveChanges: executeSave,
    }),
    [executeSave],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await executeSave();
  };

  const updateAddressField = (
    key: Exclude<keyof CustomerAddressDraft, "id" | "label">,
    value: string,
  ) => {
    setAddress(current => ({ ...current, [key]: value }));
    clearFieldError(key);
    if (feedback.kind === "saved") setFeedback({ kind: "idle" });
  };

  const saving = feedback.kind === "saving";

  return (
    <section
      id="profile-delivery"
      className="gs-card customer-profile"
      aria-labelledby="customer-profile-title"
    >
      <form className="customer-profile__form" noValidate onSubmit={handleSubmit}>
        <div className="customer-profile__section">
          <div className="customer-profile__heading">
            <h2 id="customer-profile-title">Your details</h2>
            <p>Your contact information for orders and delivery updates.</p>
          </div>

          <div className="gs-form-grid gs-form-grid--two">
            <TextField
              id="profile-full-name"
              label="Full name"
              value={name}
              inputRef={registerRef("name")}
              autoComplete="name"
              required
              error={errors.name}
              onChange={event => {
                setName(event.target.value);
                clearFieldError("name");
                if (feedback.kind === "saved") setFeedback({ kind: "idle" });
              }}
            />
            <TextField
              id="profile-phone"
              label="Phone (optional)"
              type="tel"
              value={phone}
              inputRef={registerRef("phone")}
              autoComplete="tel"
              placeholder="+63 917 123 4567"
              onChange={event => {
                setPhone(event.target.value);
                if (feedback.kind === "saved") setFeedback({ kind: "idle" });
              }}
            />
          </div>

          <TextField
            id="profile-email"
            label="Email"
            type="email"
            value={user.email || ""}
            readOnly
            autoComplete="email"
            hint="Email is linked to your sign-in."
          />
        </div>

        <hr className="gs-divider" />

        <div className="customer-profile__section">
          <div className="customer-profile__heading">
            <h3>Default delivery address</h3>
            <p>Saved here to prefill shipping details automatically at checkout.</p>
          </div>

          <TextField
            id="address-recipient"
            label="Recipient name"
            value={address.recipient_name}
            inputRef={registerRef("recipient_name")}
            autoComplete="name"
            placeholder={name.trim() || "Alex Morgan"}
            onChange={event =>
              updateAddressField("recipient_name", event.target.value)
            }
          />

          <div className="gs-form-grid gs-form-grid--street">
            <TextField
              id="address-line1"
              label="Street address"
              value={address.line1}
              inputRef={registerRef("line1")}
              autoComplete="address-line1"
              placeholder="24 Narra Street"
              error={errors.line1}
              onChange={event => updateAddressField("line1", event.target.value)}
            />
            <TextField
              id="address-line2"
              label="Apartment / unit (optional)"
              value={address.line2}
              inputRef={registerRef("line2")}
              autoComplete="address-line2"
              placeholder="Unit 3B"
              onChange={event => updateAddressField("line2", event.target.value)}
            />
          </div>

          <div className="gs-form-grid gs-form-grid--two">
            <TextField
              id="address-city"
              label="City"
              value={address.city}
              inputRef={registerRef("city")}
              autoComplete="address-level2"
              placeholder="Quezon City"
              error={errors.city}
              onChange={event => updateAddressField("city", event.target.value)}
            />
            <TextField
              id="address-region"
              label="Province / region (optional)"
              value={address.region}
              inputRef={registerRef("region")}
              autoComplete="address-level1"
              placeholder="Metro Manila"
              onChange={event => updateAddressField("region", event.target.value)}
            />
          </div>

          <div className="gs-form-grid gs-form-grid--two">
            <TextField
              id="address-postal"
              label="Postal code"
              value={address.postal_code}
              inputRef={registerRef("postal_code")}
              autoComplete="postal-code"
              placeholder="1102"
              error={errors.postal_code}
              onChange={event =>
                updateAddressField("postal_code", event.target.value)
              }
            />
            <TextField
              id="address-country"
              label="Country / code"
              value={address.country}
              inputRef={registerRef("country")}
              autoComplete="country-name"
              placeholder="PH"
              onChange={event =>
                updateAddressField("country", event.target.value)
              }
            />
          </div>
        </div>

        {feedback.kind === "saving" && (
          <InlineStatus
            status="loading"
            title="Saving your details…"
            body="Keep this page open for a moment."
          />
        )}

        {feedback.kind === "saved" && (
          <InlineStatus
            status="success"
            title="Details saved"
            body={feedback.body}
            onDismiss={() => setFeedback({ kind: "idle" })}
          />
        )}

        {feedback.kind === "error" && (
          <InlineStatus
            status="error"
            title={feedback.title}
            body={feedback.body}
            actionLabel={feedback.retryLabel}
            onAction={feedback.retryLabel ? () => void executeSave() : undefined}
          />
        )}

        {feedback.kind === "partial_error" && (
          <InlineStatus
            status="error"
            title="Contact details saved, but delivery address couldn’t be saved"
            body={feedback.body}
            actionLabel="Retry saving address"
            onAction={() => void executeSave()}
          />
        )}

        {feedback.kind === "session_expired" && (
          <div className="gs-session-expired" role="alert">
            <strong>Your session has expired</strong>
            <p>
              Sign in again to save your changes. Your edits will stay preserved.
            </p>
            <button
              type="button"
              className="gs-btn gs-btn--primary"
              onClick={() =>
                onSessionExpired?.({
                  name,
                  phone,
                  address,
                })
              }
            >
              Sign in again
            </button>
          </div>
        )}

        <div className="customer-profile__footer">
          <p className="customer-profile__privacy">
            Your information is used strictly for order fulfillment and delivery.
          </p>
          <button
            className="gs-btn gs-btn--primary"
            type="submit"
            disabled={saving}
          >
            {saving ? (
              <>
                <LoaderCircle size={16} className="spin" aria-hidden="true" />
                Saving…
              </>
            ) : (
              "Save changes"
            )}
          </button>
        </div>
      </form>
    </section>
  );
});

export default CustomerProfile;

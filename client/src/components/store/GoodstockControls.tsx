import React, { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, Check, Info, LoaderCircle, Moon, Sun } from "lucide-react";
import { useTheme, type ThemePreference } from "@/contexts/ThemeContext";

export function ThemeToggleButton({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  if (!toggleTheme) return null;
  const label = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
  return (
    <button
      type="button"
      className={`gs-icon-btn ${className}`.trim()}
      aria-label={label}
      title={label}
      onClick={toggleTheme}
    >
      {theme === "dark" ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
    </button>
  );
}

export function AppearanceCard({ id = "appearance-settings" }: { id?: string }) {
  const { theme, preference, setPreference } = useTheme();
  const groupName = useId();
  const options: { value: ThemePreference; label: string }[] = [
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
    { value: "system", label: "System" },
  ];

  const statusText =
    preference === "system"
      ? `Following system (${theme === "dark" ? "dark" : "light"} mode is on).`
      : theme === "dark"
        ? "Dark mode is on."
        : "Light mode is on.";

  return (
    <section id={id} className="gs-card gs-side-card" aria-labelledby={`${id}-title`}>
      <div className="gs-side-card__header">
        <h2 id={`${id}-title`} className="gs-side-card__title">
          Appearance
        </h2>
        <p className="gs-side-card__subtitle">
          Choose how Goodstock looks on this device.
        </p>
      </div>
      <fieldset className="gs-theme-radios">
        <legend className="sr-only">Appearance mode</legend>
        {options.map(option => {
          const checked = preference === option.value;
          return (
            <label
              key={option.value}
              className={`gs-theme-radio ${checked ? "is-selected" : ""}`.trim()}
            >
              <input
                type="radio"
                name={groupName}
                value={option.value}
                checked={checked}
                onChange={() => setPreference(option.value)}
              />
              <span>{option.label}</span>
            </label>
          );
        })}
      </fieldset>
      <p className="gs-side-card__meta" role="status" aria-live="polite">
        {statusText}
      </p>
    </section>
  );
}

export interface TextFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label: string;
  error?: string;
  hint?: string;
  inputRef?: React.Ref<HTMLInputElement>;
  wrapperClassName?: string;
}

export function TextField({
  id,
  label,
  error,
  hint,
  readOnly,
  inputRef,
  wrapperClassName = "",
  className = "",
  ...inputProps
}: TextFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  const stateClass = error
    ? "gs-field--error"
    : readOnly
      ? "gs-field--readonly"
      : "";

  return (
    <div className={`gs-field ${stateClass} ${wrapperClassName}`.trim()}>
      <label htmlFor={fieldId} className="gs-field__label">
        {label}
      </label>
      <input
        id={fieldId}
        ref={inputRef}
        readOnly={readOnly}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`gs-field__input ${className}`.trim()}
        {...inputProps}
      />
      {error ? (
        <p id={errorId} className="gs-field__error">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="gs-field__hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function InlineStatus({
  status,
  title,
  body,
  actionLabel,
  onAction,
  onDismiss,
  className = "",
}: {
  status: "success" | "error" | "loading" | "info";
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  className?: string;
}) {
  const isError = status === "error";
  return (
    <div
      className={`gs-inline-status gs-inline-status--${status} ${className}`.trim()}
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
    >
      <span className="gs-inline-status__icon" aria-hidden="true">
        {status === "loading" ? (
          <LoaderCircle size={20} className="spin" />
        ) : status === "success" ? (
          <Check size={18} strokeWidth={2.4} />
        ) : status === "error" ? (
          <AlertCircle size={20} />
        ) : (
          <Info size={19} />
        )}
      </span>
      <div className="gs-inline-status__copy">
        <strong className="gs-inline-status__title">{title}</strong>
        {body && <p className="gs-inline-status__body">{body}</p>}
        {(actionLabel && onAction) || onDismiss ? (
          <div className="gs-inline-status__actions">
            {actionLabel && onAction && (
              <button
                type="button"
                className="gs-btn gs-btn--secondary gs-btn--compact"
                onClick={onAction}
              >
                {actionLabel}
              </button>
            )}
            {onDismiss && (
              <button
                type="button"
                className="gs-link-btn"
                onClick={onDismiss}
              >
                Dismiss
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function UnsavedChangesDialog({
  open,
  busy = false,
  onSaveAndSignOut,
  onDiscardAndSignOut,
  onKeepEditing,
  returnFocusRef,
}: {
  open: boolean;
  busy?: boolean;
  onSaveAndSignOut: () => void;
  onDiscardAndSignOut: () => void;
  onKeepEditing: () => void;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
}) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const keepEditingRef = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const shellNodes = Array.from(
      document.querySelectorAll<HTMLElement>("[data-inert-target='true']"),
    );
    shellNodes.forEach(node => {
      node.setAttribute("inert", "");
      node.setAttribute("aria-hidden", "true");
    });

    const focusTimer = window.setTimeout(() => {
      keepEditingRef.current?.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!busy) {
          onKeepEditing();
          window.setTimeout(() => returnFocusRef?.current?.focus(), 0);
        }
        return;
      }
      if (event.key === "Tab" && dialogRef.current) {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            "button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex='-1'])",
          ),
        );
        if (!focusable.length) return;
        const first = focusable[0]!;
        const last = focusable[focusable.length - 1]!;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      shellNodes.forEach(node => {
        node.removeAttribute("inert");
        node.removeAttribute("aria-hidden");
      });
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, busy, onKeepEditing, returnFocusRef]);

  if (!open || typeof document === "undefined") return null;

  const handleCloseKeepEditing = () => {
    if (busy) return;
    onKeepEditing();
    window.setTimeout(() => returnFocusRef?.current?.focus(), 0);
  };

  return createPortal(
    <div
      className="gs-modal-backdrop"
      role="presentation"
      onMouseDown={event => {
        if (event.target === event.currentTarget) handleCloseKeepEditing();
      }}
    >
      <div
        ref={dialogRef}
        className="gs-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        <div className="gs-modal__header">
          <h2 id={titleId} className="gs-modal__title">
            Save before signing out?
          </h2>
          <p id={descId} className="gs-modal__body">
            You have changes to your profile or delivery address. Choose what to do before you leave.
          </p>
        </div>
        <div className="gs-modal__actions">
          <button
            type="button"
            className="gs-btn gs-btn--primary"
            disabled={busy}
            onClick={onSaveAndSignOut}
          >
            {busy ? (
              <>
                <LoaderCircle size={16} className="spin" aria-hidden="true" />
                Saving…
              </>
            ) : (
              "Save and sign out"
            )}
          </button>
          <button
            type="button"
            className="gs-btn gs-btn--secondary"
            disabled={busy}
            onClick={onDiscardAndSignOut}
          >
            Discard and sign out
          </button>
          <button
            ref={keepEditingRef}
            type="button"
            className="gs-btn gs-btn--ghost"
            disabled={busy}
            onClick={handleCloseKeepEditing}
          >
            Keep editing
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

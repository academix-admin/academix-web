'use client';

import React, { forwardRef, useCallback, useId, useState } from 'react';
import defaults from './TextInput.module.css';

/**
 * TextInput — a Flutter-idiom text field for academix-web (Workstream F-next).
 *
 * Dogfood stage: built app-side first (hot-reload), to be EXTRACTED to
 * `@academix-admin/text-input` once proven across the auth/edit/quiz/footer routes.
 *
 * Model (Flutter `TextField` + `InputDecoration`): decoration props (label, hint,
 * prefix, suffix, helperText, obscureText, keyboardType, counter, …) describe the
 * field; a `classNames` slot-map + `styles` let a route pin its EXACT existing look.
 *
 * Styling is HYBRID:
 *  - Per slot, a caller-supplied class in `classNames` REPLACES the built-in default
 *    for that slot (so a route passes its own CSS-module classes and reproduces its
 *    current pixels exactly — including descendant-scoped theme rules like
 *    `.container_light .input`, which keep working because the <input> stays inside
 *    the route's themed root).
 *  - Slots with no caller class fall back to a sensible built-in default, so brand
 *    new pages get a usable field for free.
 *
 * Coordination: a plain native <input> already drives the keyboard/nav via the
 * document-level `focusin` listener in navigation-stack@0.6.2 (`data-ax-keyboard`).
 * The structured `FocusCoordinator` (region-aware) is the next step and will be wired
 * here without changing this public API.
 */

export type TextInputStatus = 'default' | 'error' | 'valid' | 'info';

export type TextInputKeyboard =
  | 'text' | 'numeric' | 'decimal' | 'tel' | 'email' | 'url' | 'search';

const KEYBOARD_TO_INPUTMODE: Record<TextInputKeyboard, React.HTMLAttributes<HTMLInputElement>['inputMode']> = {
  text: 'text', numeric: 'numeric', decimal: 'decimal',
  tel: 'tel', email: 'email', url: 'url', search: 'search',
};

export interface TextInputClassNames {
  /** outer wrapper (Flutter: the field's column). Default: formGroup-like. */
  root?: string;
  label?: string;
  /** wrapper around input + adornments; only rendered when an adornment/counter exists. */
  field?: string;
  input?: string;
  prefix?: string;
  suffix?: string;
  /** the secure (eye) toggle button. */
  toggle?: string;
  /** helper / error / valid text below the field. */
  helper?: string;
  counter?: string;
}

export interface TextInputProps {
  // ---- value (controlled or uncontrolled) ----
  value?: string;
  defaultValue?: string;
  /** Flutter `onChanged(String)` — receives the new value (and the raw event). */
  onChange?: (value: string, event: React.ChangeEvent<HTMLInputElement>) => void;

  // ---- decoration ----
  label?: React.ReactNode;
  /** placeholder (Flutter `hintText`). */
  hint?: string;
  /** leading adornment inside the box (e.g. `@`, `+`). */
  prefix?: React.ReactNode;
  /** trailing adornment (rendered before the secure toggle if both present). */
  suffix?: React.ReactNode;
  /** helper / error / valid message below the field. */
  helperText?: React.ReactNode;
  /** drives helper color + `aria-invalid`. */
  status?: TextInputStatus;
  /** show a `len/maxLength` counter; or a custom renderer. */
  counter?: boolean | ((len: number, maxLength?: number) => React.ReactNode);

  // ---- behavior ----
  type?: React.HTMLInputTypeAttribute;
  /** password field (Flutter `obscureText`). */
  obscureText?: boolean;
  /** render an eye button to toggle obscure on/off. Implies obscureText default. */
  secureToggle?: boolean;
  /** called when the secure (eye) toggle flips; receives the new revealed state. */
  onSecureToggle?: (revealed: boolean) => void;
  /** maps to `inputMode` (Flutter `keyboardType`). */
  keyboardType?: TextInputKeyboard;
  /** transform typed text (e.g. code fields). */
  transform?: 'none' | 'uppercase' | 'lowercase';
  maxLength?: number;
  pattern?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  required?: boolean;
  readOnly?: boolean;
  name?: string;
  id?: string;
  autoComplete?: string;
  autoCapitalize?: string;
  enterKeyHint?: React.HTMLAttributes<HTMLInputElement>['enterKeyHint'];
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];

  // ---- styling ----
  classNames?: TextInputClassNames;
  /** shortcut for `classNames.root`. */
  className?: string;
  style?: React.CSSProperties;
  /**
   * Theme for the BUILT-IN default styles only. When set, the default class for a slot
   * is composed as `slot` + `slot_theme` (e.g. `input` + `input_dark`) — the same
   * convention as an `applyTheme` helper, but self-contained: this component depends on
   * nothing but React and its own CSS. Ignored for any slot the caller styles via
   * `classNames` (those already carry their own theming). Feed it from whatever theme
   * source you use — in academix that's `useTheme()`; any other developer passes a plain
   * `'light' | 'dark'`, or omits it and styles via `classNames`.
   */
  theme?: 'light' | 'dark';

  // ---- events / escape hatch ----
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onKeyPress?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  /** spread onto the underlying <input> for anything not covered above. */
  inputProps?: Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'value' | 'defaultValue' | 'onChange' | 'className'
  >;
}

/**
 * Pick the class for a slot (hybrid rule): a caller-supplied class REPLACES the
 * built-in default. When falling back to the default and a `theme` is given, compose
 * `slot` + `slot_theme` exactly like ThemeContext's `applyTheme` — so a new page that
 * passes no classes still gets a themed field, consistent with the rest of the site.
 */
function pickSlot(
  caller: string | undefined,
  name: keyof typeof defaults,
  theme?: 'light' | 'dark',
): string | undefined {
  if (caller != null) return caller;
  const base = defaults[name];
  if (!base) return undefined;
  const variant = theme ? defaults[`${name}_${theme}` as keyof typeof defaults] : undefined;
  return variant ? `${base} ${variant}` : base;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  {
    value, defaultValue, onChange,
    label, hint, prefix, suffix, helperText, status = 'default', counter,
    type = 'text', obscureText, secureToggle, onSecureToggle, keyboardType, transform = 'none',
    maxLength, pattern, autoFocus, disabled, required, readOnly, name, id,
    autoComplete, autoCapitalize, enterKeyHint, inputMode,
    classNames = {}, className, style, theme,
    onFocus, onBlur, onKeyDown, onKeyPress, inputProps,
  },
  ref,
) {
  const reactId = useId();
  const fieldId = id ?? `txt-${reactId}`;
  const [reveal, setReveal] = useState(false);

  const secure = obscureText ?? !!secureToggle;
  const resolvedType = secure ? (reveal ? 'text' : 'password') : type;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      let v = e.target.value;
      if (transform === 'uppercase') v = v.toUpperCase();
      else if (transform === 'lowercase') v = v.toLowerCase();
      // reflect the transform back onto the controlled value
      if (v !== e.target.value) e.target.value = v;
      onChange?.(v, e);
    },
    [transform, onChange],
  );

  const len = value?.length ?? 0;
  const hasAdornment = !!prefix || !!suffix || (secure && secureToggle) || !!counter;
  const statusClass =
    status === 'error' ? defaults.statusError
      : status === 'valid' ? defaults.statusValid
        : status === 'info' ? defaults.statusInfo
          : undefined;

  const inputEl = (
    <input
      {...inputProps}
      ref={ref}
      id={fieldId}
      name={name}
      type={resolvedType}
      value={value}
      defaultValue={defaultValue}
      onChange={handleChange}
      placeholder={hint}
      className={pickSlot(classNames.input, 'input', theme)}
      disabled={disabled}
      required={required}
      readOnly={readOnly}
      autoFocus={autoFocus}
      maxLength={maxLength}
      pattern={pattern}
      autoComplete={autoComplete}
      autoCapitalize={autoCapitalize}
      enterKeyHint={enterKeyHint}
      inputMode={inputMode ?? (keyboardType ? KEYBOARD_TO_INPUTMODE[keyboardType] : undefined)}
      aria-invalid={status === 'error' || (inputProps?.['aria-invalid'] as boolean | undefined) || undefined}
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      onKeyPress={onKeyPress}
    />
  );

  return (
    <div className={pickSlot(className ?? classNames.root, 'root', theme)} style={style}>
      {label != null && (
        <label htmlFor={fieldId} className={pickSlot(classNames.label, 'label', theme)}>
          {label}
        </label>
      )}

      {hasAdornment ? (
        <div className={pickSlot(classNames.field, 'field', theme)}>
          {prefix != null && (
            <span className={pickSlot(classNames.prefix, 'prefix', theme)}>{prefix}</span>
          )}
          {inputEl}
          {suffix != null && (
            <span className={pickSlot(classNames.suffix, 'suffix', theme)}>{suffix}</span>
          )}
          {secure && secureToggle && (
            <button
              type="button"
              className={pickSlot(classNames.toggle, 'toggle', theme)}
              onClick={() => { setReveal((r) => !r); onSecureToggle?.(!reveal); }}
              aria-label={reveal ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              {reveal ? <EyeOpen /> : <EyeClosed />}
            </button>
          )}
          {counter && (
            <div className={pickSlot(classNames.counter, 'counter', theme)}>
              {typeof counter === 'function' ? counter(len, maxLength) : `${len}${maxLength ? `/${maxLength}` : ''}`}
            </div>
          )}
        </div>
      ) : (
        inputEl
      )}

      {helperText != null && (
        <p
          className={
            // When a route supplies its own helper class it already carries the status
            // color; only fall back to the default helper + status color otherwise.
            classNames.helper
              ? classNames.helper
              : `${pickSlot(undefined, 'helper', theme)}${statusClass ? ` ${statusClass}` : ''}`
          }
        >
          {helperText}
        </p>
      )}
    </div>
  );
});

/* Default eye icons (match login's SVGs closely; overridable by not using secureToggle
   and passing your own suffix). */
function EyeOpen() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M1 12C1 12 5 20 12 20C19 20 23 12 23 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function EyeClosed() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M10.5858 10.5858C10.2107 10.9609 10 11.4696 10 12C10 13.1046 10.8954 14 12 14C12.5304 14 13.0391 13.7893 13.4142 13.4142" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17.6112 17.6112C16.0556 18.979 14.1364 19.7493 12.0001 19.7493C5.63647 19.7493 2.25011 12.3743 2.25011 12.3743C3.47011 10.1443 5.27761 8.35577 7.38911 7.13965" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20.8892 6.00928C21.8292 6.78928 22.6732 7.70428 23.3892 8.72428C23.7502 9.23428 23.7502 9.91428 23.3892 10.4243C22.6732 11.4443 21.8292 12.3593 20.8892 13.1393" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14.9318 6.00928C13.6618 5.38928 12.2818 5.02928 10.8188 5.00928C9.35585 4.98928 7.93185 5.30928 6.61185 5.88928" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 3L3 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

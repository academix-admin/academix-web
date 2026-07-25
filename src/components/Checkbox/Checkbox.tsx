'use client';

import React, { useId } from 'react';
import defaults from './Checkbox.module.css';

/**
 * Checkbox — a Flutter `Checkbox`/`CheckboxListTile`-idiom control (form family). A
 * hidden native <input type=checkbox> drives a custom box + check icon and a text label,
 * so it stays accessible and form-submittable while looking however the page wants.
 *
 * HYBRID styling + self-contained `theme` prop, same contract as TextInput/SelectField.
 */

export interface CheckboxClassNames {
  /** the wrapping <label>. */
  label?: string;
  /** the (visually-hidden) native input. */
  input?: string;
  /** the custom box that shows the check. */
  box?: string;
  /** the check icon inside the box. */
  icon?: string;
  /** the text beside the box. */
  text?: string;
}

export interface CheckboxProps {
  checked?: boolean;
  defaultChecked?: boolean;
  /** Flutter `onChanged(bool)`. */
  onChange?: (checked: boolean, event: React.ChangeEvent<HTMLInputElement>) => void;
  /** label content beside the box. */
  children?: React.ReactNode;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  id?: string;
  value?: string;
  /** custom check icon (defaults to a checkmark). */
  icon?: React.ReactNode;
  classNames?: CheckboxClassNames;
  className?: string;
  style?: React.CSSProperties;
  theme?: 'light' | 'dark';
}

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

export function Checkbox({
  checked, defaultChecked, onChange, children, disabled, required, name, id, value,
  icon, classNames = {}, className, style, theme,
}: CheckboxProps) {
  const reactId = useId();
  const fieldId = id ?? `chk-${reactId}`;
  const isChecked = checked;

  return (
    <label htmlFor={fieldId} className={pickSlot(className ?? classNames.label, 'label', theme)} style={style}>
      <input
        id={fieldId}
        type="checkbox"
        name={name}
        value={value}
        checked={checked}
        defaultChecked={defaultChecked}
        onChange={(e) => onChange?.(e.target.checked, e)}
        disabled={disabled}
        required={required}
        className={pickSlot(classNames.input, 'input', theme)}
      />
      <span className={pickSlot(classNames.box, 'box', theme)} aria-hidden>
        {isChecked && (icon ?? (
          <svg className={pickSlot(classNames.icon, 'icon', theme)} viewBox="0 0 16 16" fill="none">
            <path
              d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"
              fill="currentColor"
            />
          </svg>
        ))}
      </span>
      {children != null && (
        <span className={pickSlot(classNames.text, 'text', theme)}>{children}</span>
      )}
    </label>
  );
}

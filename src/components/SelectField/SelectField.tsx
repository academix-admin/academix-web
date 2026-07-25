'use client';

import React from 'react';
import defaults from './SelectField.module.css';

/**
 * SelectField — a Flutter `DropdownButtonFormField`-idiom trigger (Workstream F-next
 * form family). It renders only the FIELD (label + optional description + a button that
 * shows the selected value or a placeholder); the actual picker (a SelectionViewer /
 * bottom-sheet) stays owned by the page and is opened via `onOpen`.
 *
 * Same contract as TextInput: HYBRID styling (a `classNames` slot class REPLACES the
 * built-in default for that slot) + a self-contained `theme` prop (no app coupling).
 */

export type SelectFieldStatus = 'default' | 'error' | 'valid' | 'info';

export interface SelectFieldClassNames {
  root?: string;
  label?: string;
  description?: string;
  /** the trigger button. */
  control?: string;
  /** trailing adornment wrapper (e.g. a chevron). */
  trailing?: string;
  helper?: string;
}

export interface SelectFieldProps {
  label?: React.ReactNode;
  description?: React.ReactNode;
  /** the display value; when empty the `placeholder` shows. */
  value?: React.ReactNode;
  placeholder?: React.ReactNode;
  /** open the picker (SelectionViewer). */
  onOpen?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  /** trailing content inside the control (e.g. a chevron icon). */
  trailing?: React.ReactNode;
  disabled?: boolean;
  helperText?: React.ReactNode;
  status?: SelectFieldStatus;
  id?: string;
  name?: string;
  classNames?: SelectFieldClassNames;
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

export function SelectField({
  label, description, value, placeholder = 'Select', onOpen, trailing,
  disabled, helperText, status = 'default', id, name,
  classNames = {}, className, style, theme,
}: SelectFieldProps) {
  const statusClass =
    status === 'error' ? defaults.statusError
      : status === 'valid' ? defaults.statusValid
        : status === 'info' ? defaults.statusInfo
          : undefined;

  const hasValue = value != null && value !== '';

  return (
    <div className={pickSlot(className ?? classNames.root, 'root', theme)} style={style}>
      {label != null && (
        <label htmlFor={id} className={pickSlot(classNames.label, 'label', theme)}>{label}</label>
      )}
      {description != null && (
        <p className={pickSlot(classNames.description, 'description', theme)}>{description}</p>
      )}
      <button
        type="button"
        id={id}
        name={name}
        onClick={onOpen}
        disabled={disabled}
        aria-invalid={status === 'error' || undefined}
        className={pickSlot(classNames.control, 'control', theme)}
      >
        {hasValue ? value : placeholder}
        {trailing != null && (
          <span className={pickSlot(classNames.trailing, 'trailing', theme)}>{trailing}</span>
        )}
      </button>
      {helperText != null && (
        <p
          className={
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
}

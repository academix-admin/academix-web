'use client';

import React from 'react';
import defaults from './RadioGroup.module.css';

/**
 * RadioGroup — a Flutter `Radio`/`RadioListTile` group (form family). Renders a set of
 * selectable "cards": each is a <label> wrapping a native <input type=radio> plus content,
 * with a `selected` class on the active one. Accessible + form-submittable.
 *
 * HYBRID styling + self-contained `theme` prop, same contract as the rest of the family.
 */

export interface RadioOption<V extends string = string> {
  value: V;
  label: React.ReactNode;
  disabled?: boolean;
}

export interface RadioGroupClassNames {
  /** wrapper around all items. */
  group?: string;
  /** each item <label>. */
  item?: string;
  /** appended to the selected item's <label>. */
  itemSelected?: string;
  /** the native radio input. */
  input?: string;
  /** wrapper around an item's label content. */
  content?: string;
  /** the item's text. */
  text?: string;
}

export interface RadioGroupProps<V extends string = string> {
  name: string;
  value?: V;
  onChange?: (value: V) => void;
  options: RadioOption<V>[];
  disabled?: boolean;
  classNames?: RadioGroupClassNames;
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

export function RadioGroup<V extends string = string>({
  name, value, onChange, options, disabled,
  classNames = {}, className, style, theme,
}: RadioGroupProps<V>) {
  const itemBase = pickSlot(classNames.item, 'item', theme);
  const itemSelected = pickSlot(classNames.itemSelected, 'itemSelected', theme);

  return (
    <div className={pickSlot(className ?? classNames.group, 'group', theme)} style={style} role="radiogroup">
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <label
            key={opt.value}
            className={`${itemBase ?? ''}${selected && itemSelected ? ` ${itemSelected}` : ''}`.trim() || undefined}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={selected}
              onChange={() => onChange?.(opt.value)}
              disabled={disabled || opt.disabled}
              className={pickSlot(classNames.input, 'input', theme)}
            />
            <div className={pickSlot(classNames.content, 'content', theme)}>
              <span className={pickSlot(classNames.text, 'text', theme)}>{opt.label}</span>
            </div>
          </label>
        );
      })}
    </div>
  );
}

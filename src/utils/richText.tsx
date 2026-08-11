import React from 'react';

/**
 * Renders the app's tiny `*bold*` markup as React nodes.
 *
 * Replaces the old `dangerouslySetInnerHTML` + regex-to-`<strong>` pattern, which was safe only by
 * accident — the strings happened to be static i18n copy — and would
 * have become a live XSS the moment any of them came from a CMS, an API, or user input. Since the
 * session lives in localStorage as a bearer token, an XSS here is a session theft, so the raw-HTML
 * sink is not worth keeping for bold text (ACADEMIX_PLAN Part V, S15).
 *
 * React escapes every segment, so the output is inert no matter where the string came from.
 */
export function renderBoldMarkup(
  text: string,
  boldStyle?: React.CSSProperties,
): React.ReactNode[] {
  // Split on *…* keeping the delimiters, so odd indices are the emphasised runs.
  return text.split(/\*(.*?)\*/g).map((segment, i) =>
    i % 2 === 1 ? (
      <strong key={i} style={boldStyle}>
        {segment}
      </strong>
    ) : (
      <React.Fragment key={i}>{segment}</React.Fragment>
    ),
  );
}

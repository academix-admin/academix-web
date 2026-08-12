"""Generate every Supabase auth email template from one shared, email-safe layout.

WHY THIS EXISTS
Only `confirmation` and `recovery` were branded; the other 11 were raw Supabase defaults
(`<h2>` + `<p>`, no styling at all). And the two branded ones had a real bug: the OTP chip was
styled by a CLASS in a <head><style> block --

    .token { background-color: #4CAF50; color: white; }

Two things go wrong with that:
  1. Several clients (Outlook.com, some mobile clients) strip <head><style> entirely. The chip
     then loses its green background but ALSO its `color: white`, so the result is unpredictable.
  2. Gmail and Outlook dark modes rewrite colours, and they invert LIGHT backgrounds toward dark.
     A mid-tone green (#4CAF50) with white text lands in the worst place: the background gets
     darkened or dropped while the white text stays, giving washed-out or invisible digits.
     This is the "OTP not clear in dark mode" report.

WHAT THIS DOES DIFFERENTLY
  * Every critical colour is an INLINE style attribute. Inline styles are not stripped, so the
    chip's background and its text colour always travel together -- they can never be separated
    into white-on-white.
  * The OTP chip uses a DARK background (#12481A) with white text. Dark-mode engines invert
    light -> dark; they leave already-dark surfaces alone. So the chip looks the same in both
    modes instead of being rewritten.
  * <meta name="color-scheme"> and <meta name="supported-color-scheme"> tell supporting clients
    the email handles both schemes, which stops the more aggressive auto-inversion.
  * A prefers-color-scheme block restyles the page and card for clients that honour it, while
    the chip deliberately stays put.
  * Table-based layout: Outlook renders with Word, where div/flex layout is unreliable.
  * The code is real text inside the chip, so even if every style is stripped it is still
    readable and still selectable/copyable.

TEMPLATE VARIABLES
Each template reuses ONLY the Go variables already proven present in the live version of that
same template (plus .Token for the three that are already OTP-based). Inventing a variable
Supabase does not supply for a given mail would render empty, so nothing new is introduced.

Run:  python build_templates.py          -> writes ./out/*.html for review
      python build_templates.py --apply  -> PATCHes them into the live project
"""
import io, json, os, sys, urllib.request

PROJECT = 'iewqfmkngcgayxbbnpiz'
WEB = 'c:/Users/ajibe/StudioProjects/academix-project/academix-web'
HERE = os.path.dirname(os.path.abspath(__file__))

BRAND_DARK = '#12481A'   # chip background: dark enough that dark-mode engines leave it alone
BRAND = '#1C6B1E'        # Academix green (matches flutter_native_splash android_12 colour)


def page(title, body, note='If you did not request this, you can safely ignore this email.'):
    """Shared shell. Every colour here is inline; the <style> block only ADDS dark-mode
    refinements for clients that support it and is never load-bearing."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-scheme" content="light dark">
<title>{title}</title>
<style>
  /* Progressive enhancement only. If a client strips this block the email still renders
     correctly, because every essential colour is also set inline below. */
  @media (prefers-color-scheme: dark) {{
    .ax-page {{ background-color: #101010 !important; }}
    .ax-card {{ background-color: #1c1c1c !important; }}
    .ax-title, .ax-text {{ color: #f2f2f2 !important; }}
    .ax-muted, .ax-footer {{ color: #a8a8a8 !important; }}
    /* The OTP chip is intentionally NOT restyled: it is already dark-on-white-text and
       reads identically in both schemes. */
  }}
</style>
</head>
<body class="ax-page" style="margin:0;padding:0;background-color:#f4f4f4;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
       class="ax-page" style="background-color:#f4f4f4;padding:24px 12px;">
  <tr>
    <td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
             class="ax-card"
             style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;
                    padding:32px 28px;font-family:Arial,Helvetica,sans-serif;">
        <tr>
          <td align="center" class="ax-title"
              style="font-size:22px;font-weight:bold;color:#1a1a1a;padding-bottom:16px;">
            {title}
          </td>
        </tr>
        <tr>
          <td align="center" class="ax-text"
              style="font-size:15px;line-height:22px;color:#333333;">
            {body}
          </td>
        </tr>
        <tr>
          <td align="center" class="ax-muted"
              style="font-size:13px;line-height:20px;color:#777777;padding-top:24px;">
            {note}
          </td>
        </tr>
      </table>
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
             style="max-width:600px;width:100%;">
        <tr>
          <td align="center" class="ax-footer"
              style="font-size:12px;color:#888888;padding-top:16px;
                     font-family:Arial,Helvetica,sans-serif;">
            &copy; 2026 Academix. All rights reserved.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>
"""


def otp_chip():
    """The verification code. Background and text colour are both inline on the same element,
    so no client can strip one and keep the other."""
    return f"""
            <table role="presentation" cellpadding="0" cellspacing="0" border="0"
                   style="margin:24px auto 8px auto;">
              <tr>
                <td align="center"
                    style="background-color:{BRAND_DARK};border-radius:8px;padding:16px 28px;">
                  <span style="font-family:'Courier New',Courier,monospace;font-size:30px;
                               font-weight:bold;letter-spacing:8px;color:#ffffff;
                               line-height:34px;">{{{{ .Token }}}}</span>
                </td>
              </tr>
            </table>"""


def button(label, url_var):
    return f"""
            <table role="presentation" cellpadding="0" cellspacing="0" border="0"
                   style="margin:24px auto 8px auto;">
              <tr>
                <td align="center" style="background-color:{BRAND};border-radius:8px;">
                  <a href="{{{{ {url_var} }}}}"
                     style="display:inline-block;padding:14px 30px;font-size:15px;
                            font-weight:bold;color:#ffffff;text-decoration:none;
                            font-family:Arial,Helvetica,sans-serif;">{label}</a>
                </td>
              </tr>
            </table>"""


ALERT = ('If you did not make this change, contact support immediately &mdash; '
         'someone else may have access to your account.')

TEMPLATES = {
  # --- OTP mails (these are the ones with the dark-mode problem) -----------------------------
  'confirmation': page(
      'Confirm your Academix signup',
      'Thanks for signing up. Enter this code to confirm your email address:' + otp_chip()),
  'recovery': page(
      'Reset your Academix security',
      'A security reset was requested for your account. Enter this code to continue:'
      + otp_chip()),
  'reauthentication': page(
      'Confirm it is you',
      'Enter this code to confirm this action on your account:' + otp_chip()),

  # --- Link mails ---------------------------------------------------------------------------
  'magic_link': page(
      'Your Academix sign-in link',
      'Use the button below to sign in to Academix.' + button('Sign in', '.ConfirmationURL')),
  'email_change': page(
      'Confirm your new email address',
      'Confirm changing your Academix email from <strong>{{ .Email }}</strong> to '
      '<strong>{{ .NewEmail }}</strong>.' + button('Confirm change', '.ConfirmationURL')),
  'invite': page(
      'You have been invited to Academix',
      'You have been invited to create an account on Academix.'
      + button('Accept invite', '.ConfirmationURL')),

  # --- Security notifications ---------------------------------------------------------------
  'password_changed_notification': page(
      'Your password has been changed',
      'The password for <strong>{{ .Email }}</strong> was just changed.', ALERT),
  'email_changed_notification': page(
      'Your email address has been changed',
      'Your Academix email was changed from <strong>{{ .OldEmail }}</strong> to '
      '<strong>{{ .Email }}</strong>.', ALERT),
  'phone_changed_notification': page(
      'Your phone number has been changed',
      'The phone number for <strong>{{ .Email }}</strong> was changed from '
      '<strong>{{ .OldPhone }}</strong> to <strong>{{ .Phone }}</strong>.', ALERT),
  'mfa_factor_enrolled_notification': page(
      'A new MFA factor was added',
      'A new factor (<strong>{{ .FactorType }}</strong>) was enrolled on '
      '<strong>{{ .Email }}</strong>.', ALERT),
  'mfa_factor_unenrolled_notification': page(
      'An MFA factor was removed',
      'A factor (<strong>{{ .FactorType }}</strong>) was removed from '
      '<strong>{{ .Email }}</strong>.', ALERT),
  'identity_linked_notification': page(
      'A new sign-in method was linked',
      'A new sign-in method (<strong>{{ .Provider }}</strong>) was linked to '
      '<strong>{{ .Email }}</strong>.', ALERT),
  'identity_unlinked_notification': page(
      'A sign-in method was removed',
      'A sign-in method (<strong>{{ .Provider }}</strong>) was removed from '
      '<strong>{{ .Email }}</strong>.', ALERT),
}


def main():
    out = os.path.join(HERE, 'out')
    os.makedirs(out, exist_ok=True)
    for name, html in TEMPLATES.items():
        io.open(os.path.join(out, f'{name}.html'), 'w', encoding='utf-8').write(html)
    print(f'wrote {len(TEMPLATES)} templates to {out}')

    if '--apply' not in sys.argv:
        print('review pass only; re-run with --apply to PATCH the live project')
        return

    token = None
    for line in io.open(f'{WEB}/.env.local', encoding='utf-8'):
        if line.startswith('SUPABASE_ACCESS_KEY='):
            token = line.split('=', 1)[1].strip().strip('"')
            break

    payload = {f'mailer_templates_{n}_content': h for n, h in TEMPLATES.items()}
    req = urllib.request.Request(
        f'https://api.supabase.com/v1/projects/{PROJECT}/config/auth',
        data=json.dumps(payload).encode('utf-8'),
        headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json',
                 'User-Agent': 'curl/8.4.0'},
        method='PATCH')
    try:
        with urllib.request.urlopen(req) as r:
            cfg = json.loads(r.read().decode('utf-8'))
        ok = sum(1 for n in TEMPLATES
                 if 'ax-card' in (cfg.get(f'mailer_templates_{n}_content') or ''))
        print(f'applied: {ok}/{len(TEMPLATES)} templates confirmed live')
    except urllib.error.HTTPError as e:
        print('ERROR', e.code, e.read().decode('utf-8')[:500])


if __name__ == '__main__':
    main()

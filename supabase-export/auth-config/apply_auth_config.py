"""Apply Academix's auth configuration to the live project.

Kept in the repo (rather than clicked in the dashboard) so the intended state is reviewable and
reproducible. PATCH, so any field not listed here is left untouched.

  password_min_length -> 8
      Was 6. Clients updated in the same change so validation matches the server:
        web   src/app/(auth)/signup/step7, (auth)/login/reset-password,
              (secondary)/main/profile-stack/password-management
        app   features/user_sign_up/.../step_seven_screen,
              features/user_forgot_password/.../user_password_reset_screen
      The LOGIN validators in both clients deliberately stay at 6 -- they check an EXISTING
      password, and raising them would lock out accounts created under the old rule.

  mailer_notifications_password_changed_enabled -> True
      Tells the user their password changed. Primary detection signal for account takeover.

  sms_test_otp -> "" (and its valid_until cleared)
      A fixed OTP (250791845519=123456) was configured. Its window expired 2025-04-01 so it is
      inert today, but a static code bound to a real-looking number is a backdoor the moment
      that date is extended, and it does not belong in production.

DELIBERATELY NOT SET HERE:
  password_hibp_enabled                            -- Pro plan only; the API returns HTTP 402.
  security_update_password_require_reauthentication -- would break password change in BOTH
      clients today: they call updateUser({password}) with no nonce. See ACADEMIX_PLAN Q41.
"""
import io, json, os, sys, urllib.request

PROJECT = 'iewqfmkngcgayxbbnpiz'
WEB = 'c:/Users/ajibe/StudioProjects/academix-project/academix-web'

DESIRED = {
    'password_min_length': 8,
    'mailer_notifications_password_changed_enabled': True,

    # Closes the stolen-session hole: the UI gates the password screen behind an OTP, but the
    # API did not, so any valid access token could change the password.
    #
    # Safe to enable with NO client change, and it cannot strand anyone. From GoTrue v2.195.0
    # (the deployed version), internal/api/user.go:
    #
    #     if config.Security.UpdatePasswordRequireReauthentication {
    #         now := time.Now()
    #         if session == nil || now.After(session.CreatedAt.Add(24*time.Hour)) {
    #             if len(params.Nonce) == 0 { return ...ErrorCodeReauthenticationNeeded }
    #
    # The nonce is demanded ONLY for a missing session or one older than 24h. Both Academix
    # password paths mint a fresh session immediately beforehand (verifyOtp returns a new one):
    #   forgot password  -> resetPasswordForEmail -> verifyOtp(recovery) -> updateUser
    #   change password  -> security_verification -> security_otp -> password_management
    # so both are exempt, while a stale stolen session is not. Worst case is a plain error on
    # the change screen with forgot-password still available -- never a lockout.
    'security_update_password_require_reauthentication': True,
    # Clearing the OTP map is what disables the test code. sms_test_otp_valid_until is left
    # alone on purpose: the API rejects an empty string ("Invalid ISO datetime"), and with no
    # test OTP configured the stale 2025-04-01 timestamp has nothing to apply to.
    'sms_test_otp': '',
}

token = None
for line in io.open(f'{WEB}/.env.local', encoding='utf-8'):
    if line.startswith('SUPABASE_ACCESS_KEY='):
        token = line.split('=', 1)[1].strip().strip('"')
        break


def call(method, payload=None):
    req = urllib.request.Request(
        f'https://api.supabase.com/v1/projects/{PROJECT}/config/auth',
        data=json.dumps(payload).encode('utf-8') if payload else None,
        headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json',
                 'User-Agent': 'curl/8.4.0'},
        method=method)
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode('utf-8'))


if __name__ == '__main__':
    if '--apply' in sys.argv:
        try:
            call('PATCH', DESIRED)
        except urllib.error.HTTPError as e:
            print('ERROR', e.code, e.read().decode('utf-8')[:400]); sys.exit(1)

    cfg = call('GET')
    print('field                                          live value')
    ok = True
    for k, want in DESIRED.items():
        got = cfg.get(k)
        match = (got == want) or (want == '' and not got)
        ok = ok and match
        print(f'  {k:44} {got!r:28} {"OK" if match else f"EXPECTED {want!r}"}')
    # Show the ones we intentionally left alone, so drift is visible.
    for k in ('password_hibp_enabled', 'security_update_password_require_current_password'):
        print(f'  {k:44} {cfg.get(k)!r:28} (intentionally unchanged)')
    print()
    print('ALL MATCH' if ok else 'MISMATCH -- see above')

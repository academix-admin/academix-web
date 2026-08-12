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

    # The stronger half, and what closes the remaining gap: reauthentication above only kicks in
    # for sessions older than 24h, so a FRESH stolen session could still change the password.
    # This one applies regardless of session age.
    #
    # Also safe with NO client change, and it cannot strand anyone. GoTrue v2.195.0
    # internal/api/user.go:
    #
    #     if config.Security.UpdatePasswordRequireCurrentPassword {
    #         // ensure user is not in a password recovery flow
    #         if !session.IsRecovery() {
    #             if params.CurrentPassword == nil || *params.CurrentPassword == "" {
    #                 return ...ErrorCodeCurrentPasswordRequired
    #
    # internal/models/sessions.go -> Session.IsRecovery() scans the session's AMR claims, and
    # internal/models/factor.go:
    #
    #     func (authMethod AuthenticationMethod) IsRecovery() bool {
    #         switch authMethod {
    #         case OTP, MagicLink, Recovery:
    #             return true
    #
    # internal/api/verify.go issues every /verify session with models.OTP (lines 185, 285), so
    # ANY session minted by an OTP verification is recovery-flagged and therefore exempt.
    #
    # Mapping that onto Academix:
    #   forgot password      verifyOtp(recovery)  -> AMR otp  -> exempt, still works
    #   change password      security_otp -> verifyOtp        -> exempt, still works
    #   normal password login                     -> AMR password -> current password REQUIRED
    #   Google OAuth session                      -> AMR oauth    -> current password REQUIRED
    #
    # So the only thing newly refused is a password change from a session that never stepped up
    # -- precisely the stolen-session attack. Both clients reach the change screen only through
    # security_verification -> security_otp, so no real user is ever asked for a password they
    # do not have (including Google-only users, who arrive with a recovery-flagged OTP session).
    #
    # This is the big-app rule: a sensitive change needs a recent step-up factor. Academix's
    # factor is the emailed/SMS OTP rather than the current password, which is equivalent or
    # stronger. Adding a current-password box ON TOP of the OTP would be two factors for one
    # action -- worse UX than the apps being matched -- so the UI is deliberately unchanged.
    #
    # >>> NOT SETTABLE HERE. See BLOCKED below. <<<
    # Clearing the OTP map is what disables the test code. sms_test_otp_valid_until is left
    # alone on purpose: the API rejects an empty string ("Invalid ISO datetime"), and with no
    # test OTP configured the stale 2025-04-01 timestamp has nothing to apply to.
    'sms_test_otp': '',
}

# Settings this API will not apply. Kept here so the intended state stays documented and so a
# later session does not waste time rediscovering why the PATCH "worked" but changed nothing.
BLOCKED = {
    'security_update_password_require_current_password': (
        True,
        'Management API accepts the PATCH (HTTP 200, field present in GET) but silently '
        'ignores it -- the value never changes. Must be toggled in the Supabase dashboard '
        'under Authentication -> Password settings. Rationale for wanting it is in DESIRED '
        'above; it closes the <24h fresh-stolen-session gap that reauthentication leaves open.'),
    'password_hibp_enabled': (
        True,
        'Pro plan only -- the API returns HTTP 402 on the current (Free) plan.'),
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
    print()
    print('BLOCKED (wanted, but this API cannot set them):')
    for k, (want, why) in BLOCKED.items():
        got = cfg.get(k)
        state = 'NOW SET' if got == want else f'still {got!r}, want {want!r}'
        print(f'  {k:44} {state}')
        print(f'      {why}')
    print()
    print('ALL SETTABLE FIELDS MATCH' if ok else 'MISMATCH -- see above')

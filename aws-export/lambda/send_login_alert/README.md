# send_login_alert (Workstream G3 — login notifications)

Emails a user on every new sign-in. Deployed 2026-07-26 (region **eu-north-1**, account 495599741675).

## Pipeline
Two Postgres signals per session; the Lambda sends exactly ONE email, preferring the enriched
'session_device' signal so the email shows the real (registered) device name.
```
login → INSERT auth.sessions
      → trigger public.notify_new_session (AFTER INSERT)  → net.http_post {event:'new_session', session_id, ...}
client → register_session_device() (app + web, after login)
      → on a NEW session → net.http_post {event:'session_device', session_id, device_name, platform, is_known_device, ...}
      → send_login_alert Lambda:
          • 'session_device' → claim session_devices.alerted_at → SES email (device_name · location · IP · time)
          • 'new_session'    → wait ~6s; only if no 'session_device' claimed it → fallback SES email (UA-parsed device)
```
Dedup: `public.session_devices.alerted_at` is claimed atomically (PATCH ... alerted_at IS NULL), so
each session emails at most once. `is_known_device` tailors the copy ("new device" vs "used before").

## Pieces
- **Lambda** `send_login_alert` (nodejs20.x, handler `index.handler`). No bundled deps — AWS
  SDK v3 is in the runtime, `fetch` is global. Env: `SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY`, `SES_SENDER` (academix.app@jimstechinnovations.com),
  `NOTIFY_SECRET`. Role `academix-send-login-alert-role` (basic execution + `ses:SendEmail`).
- **Function URL** (auth NONE) — secured by `NOTIFY_SECRET` checked in the handler body.
- **Postgres trigger** `on_auth_session_created` on `auth.sessions` → `net.http_post` to the
  Function URL with `{ secret, user_id, ip, user_agent, created_at }`. Swallows errors so a
  notification failure never blocks a login.

## SES sandbox — ACTION NEEDED for all-user delivery
SES (eu-north-1) is in **sandbox**, so it only emails **verified** recipients. Verified so far:
`academix.app@jimstechinnovations.com`, `airekanmi@gmail.com`. To alert ALL users, request
SES production access:
```
aws sesv2 put-account-details --region eu-north-1 --production-access-enabled \
  --mail-type TRANSACTIONAL --website-url https://academix-web.vercel.app \
  --use-case-description "Transactional security alerts (new sign-in notifications) to our own registered users." \
  --contact-language EN
```
(AWS reviews within ~24h.) Until then, alerts only reach verified addresses.

## Redeploy the Lambda code
```
# zip just index.mjs, then:
aws lambda update-function-code --region eu-north-1 --function-name send_login_alert --zip-file fileb://send_login_alert.zip
```
`NOTIFY_SECRET` on the DB side now lives in **Supabase Vault** (secret `notify_new_session_secret`,
read via `public.notify_secret()`), no longer hardcoded in `notify_new_session` /
`register_session_device`. Rotate by updating both the Vault secret and this Lambda's `NOTIFY_SECRET`.

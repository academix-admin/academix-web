# Google Sign-In — setup & how it works

The code for "Continue with Google" is shipped. It **will not function until the two
dashboards below are configured** (Supabase can't talk to Google without them). Do these,
then it works on `academix-web.vercel.app` and locally.

## 1. Google Cloud Console (the OAuth client whose ID/secret are in `.env.local`)
APIs & Services → **Credentials** → your OAuth 2.0 Client ID:
- **Authorized JavaScript origins:**
  - `https://academix-web.vercel.app`
  - `http://localhost:3000`
  - (later) `https://academix.com`
- **Authorized redirect URIs** — this is **Supabase's** callback, not the app's:
  - `https://<YOUR-PROJECT-REF>.supabase.co/auth/v1/callback`
    (find the exact value in Supabase → Authentication → Providers → Google → "Callback URL")
- **OAuth consent screen:** set app name + support email, scopes `openid`, `email`,
  `profile`, and **Publish** the app (else only test users can sign in).

## 2. Supabase Dashboard
- **Authentication → Providers → Google → Enable.** Paste `GOOGLE_CLIENT_ID` and
  `GOOGLE_CLIENT_SECRET` (the values already in `.env.local`). Save.
- **Authentication → URL Configuration:**
  - **Site URL:** `https://academix-web.vercel.app` (change to `https://academix.com` later).
  - **Redirect URLs (allow-list)** — add each:
    - `https://academix-web.vercel.app/auth/callback`
    - `http://localhost:3000/auth/callback`
    - (later) `https://academix.com/auth/callback`
- **Account linking (merge):** Supabase automatically links a Google identity to an
  existing email/password user **when the email is verified** (Google verifies it) — same
  `user.id`, one person. Keep email confirmations enabled; no extra setting needed for the
  default linking behavior.

## 3. App env (optional, for the domain swap)
- `NEXT_PUBLIC_SITE_URL` — leave unset and the app uses the current browser origin (works on
  vercel + previews + localhost). When `academix.com` goes live, set it to
  `https://academix.com` (Vercel env) and every OAuth redirect follows — no code change.

---

## How the flow works (implemented)
- **Button:** `SocialAuthButtons` (`src/components/SocialAuthButtons`) on `/login` and signup
  step 1. Provider-extensible — add `facebook`/`github`/`apple` to the `providers` array +
  the `PROVIDERS` map and they render. Calls `supabase.auth.signInWithOAuth` with
  `redirectTo = getSiteUrl()/auth/callback` (`src/lib/site-url.ts`, env-swappable).
- **Callback:** `/auth/callback` (`src/app/auth/callback/page.tsx`) — Supabase parses the
  returned session; then:
  - **has an academix profile** → `/main` (covers merged email+Google users — same id).
  - **no profile yet** → `/signup`.
- **Onboarding (new social users):** signup **step 1** detects the Google session, prefills
  name+email from Google, marks `provider`/`authUserId` in the signup stack, and jumps to
  **step 2**. Steps 2–6 are unchanged. **Step 7** shows the **PIN only** (no password), and
  its submit posts to **`/api/create-oauth-user`** (service-role: role-verify → `users_table`
  → `users_balance_table` → PIN, for the *existing* auth user — no auth-user creation, no
  password), then lands on `/main`. Email-OTP is skipped (Google already verified the email).
- **Returning social users** just hit the callback → `/main`.

## Testing after config
1. Enable everything above.
2. `/login` → "Continue with Google" → pick account → you should land on `/signup` (new) or
   `/main` (returning). New users complete steps 2–6 + PIN → `/main`.
3. To test the merge: sign up classically with an email, sign out, then "Continue with
   Google" using the same Gmail → should go straight to `/main` (same account).

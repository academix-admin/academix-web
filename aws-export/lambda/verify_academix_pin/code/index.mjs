import { createClient } from "@supabase/supabase-js";
import fetch from 'node-fetch';
import bcrypt from "bcryptjs";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Refuse a request whose session has been revoked ("log out this device" from elsewhere).
 *
 * The API Gateway authorizer verifies only the JWT's signature and expiry, and its response is
 * CACHED per token — its own comment defers revocation to "the (uncached) handler". Nothing did it,
 * so a revoked device kept working against every Lambda until its token expired, even though
 * PostgREST was refusing it the whole time. See ACADEMIX_PLAN Part V, S1.
 *
 * Fails OPEN on an error talking to the DB, matching public.enforce_session's own posture: a check
 * that cannot run must not take payments down. It fails CLOSED only on a definite "session gone".
 */
export async function assertSessionNotRevoked(supabase, sessionId) {
  if (!sessionId) return null; // no session claim (trusted Lambda->Lambda invoke) — nothing to check
  try {
    const { data, error } = await supabase.rpc('session_is_live', { p_session_id: sessionId });
    if (error) {
      console.error('session_is_live check failed (allowing):', error.message || error);
      return null;
    }
    if (data === false) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          success: false,
          code: 'AX_SESSION_REVOKED',
          message: 'Session revoked',
        }),
      };
    }
  } catch (e) {
    console.error('session_is_live threw (allowing):', e?.message || e);
  }
  return null;
}

/**
 * Append a security event (ACADEMIX_PLAN Part VI, Q10). Best-effort by design: an audit write must
 * never be able to fail the operation it is observing — a user must not be blocked from unlocking
 * because logging hiccuped. NEVER pass the PIN, a token, or any credential in `detail`.
 */
async function audit(supabase, eventType, userId, sessionId, detail = {}) {
  try {
    await supabase.rpc('log_security_event', {
      p_event_type: eventType,
      p_users_id: userId ?? null,
      p_session_id: sessionId ?? null,
      p_source: 'lambda',
      p_detail: detail,
    });
  } catch (e) {
    console.error('audit log failed (ignored):', e?.message || e);
  }
}

const innerHandler = async (event) => {
  try {
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    const { pin } = body;
    // Identity: prefer the API-Gateway authorizer's verified user_id; fall back to body.userId for
    // TRUSTED Lambda→Lambda direct invokes (e.g. make_payment passes its own authorizer-derived id).
    const userId = event.requestContext?.authorizer?.user_id ?? body.userId;
    // session_id is present only on the browser AppLock path (via the authorizer). When we clear the
    // PIN we also extend that session's server-side app-lock window — this is the ONLY unlock
    // authority (session_unlock is service_role-only), so deleting the client overlay can't bypass it.
    const sessionId = event.requestContext?.authorizer?.session_id || body.sessionId || null;
    const extendAppLock = async () => {
      if (!sessionId || !userId) return;
      try { await supabase.rpc('session_unlock', { p_session_id: sessionId, p_user_id: userId }); }
      catch (e) { console.error('session_unlock failed:', e?.message || e); }
    };

    if (!userId || !pin) {
      return { statusCode: 400, body: JSON.stringify({ success: false, message: "Missing fields" }) };
    }

    // A revoked session must not be able to clear its own app-lock. Checked BEFORE any PIN work so a
    // revoked device cannot even burn attempts against the account.
    const revoked = await assertSessionNotRevoked(supabase, sessionId);
    if (revoked) return revoked;

    // Fetch PIN record
    const { data, error } = await supabase
      .schema("personal")
      .from("users_login_pin_table")
      .select("*")
      .eq("users_id", userId)
      .single();

    if (error || !data) {
      return { statusCode: 404, body: JSON.stringify({ success: false, message: "PIN record not found" }) };
    }

    const {
      pin_hash,
      failed_attempts,
      locked_until
    } = data;

    // Check lockout
    const now = new Date();
    if (locked_until && new Date(locked_until) > now) {
      return {
        statusCode: 403,
        body: JSON.stringify({
          success: false,
          message: "Account locked due to too many attempts",
          locked_until: locked_until
        })
      };
    }

    if (!pin_hash || typeof pin_hash !== "string") {
      // PIN-less account: never trap it behind the app-lock — clear the server window too.
      await extendAppLock();
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          not_set: true,
          message: "PIN not set for this user"
        })
      };
    }

    // Compare PIN with hash
    const match = await bcrypt.compare(pin, pin_hash);

    if (!match) {
      // Increment failed attempt count
      const updatedAttempts = failed_attempts + 1;

      const lockTime =
        updatedAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;

      await supabase
        .schema("personal")
        .from("users_login_pin_table")
        .update({
          failed_attempts: updatedAttempts,
          locked_until: lockTime
        })
        .eq("users_id", userId);

      await audit(
        supabase,
        lockTime ? 'pin.locked_out' : 'pin.failed',
        userId,
        sessionId,
        { attempts_left: Math.max(0, 5 - updatedAttempts), locked_until: lockTime }
      );

      return {
        statusCode: 401,
        body: JSON.stringify({
          success: false,
          attempts_left: Math.max(0, 5 - updatedAttempts),
          locked_until: lockTime
        })
      };
    }

    // Successful login → reset attempts
    await supabase
      .schema("personal")
      .from("users_login_pin_table")
      .update({
        failed_attempts: 0,
        locked_until: null
      })
      .eq("users_id", userId);

    // Correct PIN → extend the app-lock window for this session before responding.
    await extendAppLock();
    await audit(supabase, 'applock.unlocked', userId, sessionId);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };

  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ success: false, message: e.message }) };
  }
};


// CORS wrapper — this endpoint is now called by the browser directly (no Next proxy), so responses
// and the OPTIONS preflight must carry CORS headers. All logic stays in innerHandler.
const _CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization" };
export const handler = async (event) => {
  const method = event.httpMethod || event.requestContext?.http?.method;
  if (method === "OPTIONS") return { statusCode: 200, headers: _CORS, body: "" };
  const r = await innerHandler(event);
  return { ...r, headers: { ...((r && r.headers) || {}), ..._CORS } };
};

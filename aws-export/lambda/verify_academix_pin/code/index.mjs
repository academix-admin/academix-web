import { createClient } from "@supabase/supabase-js";
import fetch from 'node-fetch';
import bcrypt from "bcryptjs";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

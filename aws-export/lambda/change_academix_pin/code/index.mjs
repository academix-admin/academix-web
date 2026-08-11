import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const innerHandler = async (event) => {
  try {
    const { oldPin, newPin } = JSON.parse(event.body);
    // Identity from the VERIFIED JWT (API Gateway authorizer), never the client body.
    const userId = event.requestContext?.authorizer?.user_id;
    // Revocation check (ACADEMIX_PLAN Part VI, Q3). The API Gateway authorizer verifies only the
    // JWT's signature and expiry, and its response is CACHED per token — its own comment defers
    // revocation to the handler. So a device logged out from elsewhere still arrives here with a
    // valid-looking token, even though PostgREST refuses it. Fails OPEN on a DB error (matching
    // public.enforce_session's posture: a check that cannot run must not take the API down) and
    // CLOSED only on a definite "session gone".
    const sessionId = event.requestContext?.authorizer?.session_id || null;
    if (sessionId) {
      try {
        const { data: sessionLive, error: sessionCheckError } = await supabase.rpc(
          "session_is_live",
          { p_session_id: sessionId }
        );
        if (!sessionCheckError && sessionLive === false) {
          return {
            statusCode: 401,
            body: JSON.stringify({
              code: "AX_SESSION_REVOKED",
              error: "Session revoked",
            }),
          };
        }
        if (sessionCheckError) {
          console.error(
            "session_is_live check failed (allowing):",
            sessionCheckError.message || sessionCheckError
          );
        }
      } catch (e) {
        console.error("session_is_live threw (allowing):", e?.message || e);
      }
    }

    if (!userId || !oldPin || !newPin) {
      return { statusCode: 400, body: "userId, oldPin & newPin required" };
    }

    if (oldPin === newPin) {
      return { statusCode: 400, body: "New PIN must be different" };
    }

    // Fetch current record
    const { data, error } = await supabase
      .schema("personal")
      .from("users_login_pin_table")
      .select("*")
      .eq("users_id", userId)
      .single();

    if (error || !data) {
      return { statusCode: 404, body: "PIN record not found" };
    }

    // Compare old PIN
    const match = await bcrypt.compare(oldPin, data.pin_hash);

    if (!match) {
      return {
        statusCode: 401,
        body: JSON.stringify({ success: false, message: "Invalid old PIN" })
      };
    }

    // Hash new PIN
    const hashed = await bcrypt.hash(newPin, 10);

    // Update database
    await supabase
      .schema("personal")
      .from("users_login_pin_table")
      .update({
        pin_hash: hashed,
        failed_attempts: 0,
        locked_until: null,
        users_login_pin_updated_at: new Date().toISOString()
      })
      .eq("users_id", userId);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };

  } catch (e) {
    return { statusCode: 500, body: e.message };
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

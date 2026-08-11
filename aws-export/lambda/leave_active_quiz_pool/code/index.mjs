import { createClient } from "@supabase/supabase-js";
import fetch from 'node-fetch';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Browser calls this API Gateway directly (no Next.js proxy), so every response — and the CORS
// preflight — must carry these headers or the browser blocks the request.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const handlerInner = async (event) => {


  console.log("Leave received input:", JSON.stringify(event, undefined, 2));

  try {
    const body = JSON.parse(event.body);
    const { locale } = body;

    // Identity is taken from the VERIFIED JWT (API Gateway authorizer context, same
    // supabase_flutter_authorizer as /join), never the client body — a caller can't
    // leave another user's pool by passing a different userId.
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
    if (!userId) {
      return {
        statusCode: 401,
        body: JSON.stringify({ status: "PoolStatus.error", error: "Unauthorized", pools_id: null }),
      };
    }

    // p_country/p_gender/p_age are unused by leave_active_quiz_pool (verified against the live
    // function body — it only reads p_user_id/p_locale); pass null rather than forwarding
    // never-sent client fields.
    const { data: leave, error: leaveError } = await supabase.rpc("leave_active_quiz_pool", {
      p_country : null,
      p_locale : locale,
      p_gender : null,
      p_age : null,
      p_user_id : userId
    });
    
    console.log(leave);

    if (leaveError) {
      return {
        statusCode: 500,
        body: JSON.stringify({ status: "PoolStatus.error", error: leaveError.message, pools_id: null }),
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify(leave),
    };
    
  }catch(e){

    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message }),
    };
  }

};

export const handler = async (event) => {
  const method = event?.httpMethod || event?.requestContext?.http?.method;
  if (method === "OPTIONS") return { statusCode: 200, headers: CORS_HEADERS, body: "" };
  const resp = await handlerInner(event);
  return { ...resp, headers: { ...(resp?.headers || {}), ...CORS_HEADERS } };
};

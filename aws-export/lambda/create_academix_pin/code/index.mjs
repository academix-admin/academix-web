import { createClient } from "@supabase/supabase-js";
import fetch from 'node-fetch';
import bcrypt from 'bcryptjs';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const innerHandler = async (event) => {
  try {
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    const { userPin } = body;
    // Identity from the VERIFIED JWT (API Gateway authorizer), never the client body.
    const userId = event.requestContext?.authorizer?.user_id;

    if (!userPin || !userId) {
      return { statusCode: 400, body: JSON.stringify({ success: false, message: "Missing fields" }) };
    }

    const hashed = await bcrypt.hash(userPin, 10);

    const { error } = await supabase
      .schema("personal")
      .from("users_login_pin_table")
      .upsert({
        users_id: userId,
        pin_hash: hashed,
        failed_attempts: 0,
        users_login_pin_updated_at: new Date().toISOString()
      });
   
    if (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({success: false, error: error.message })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: "PIN updated" })
    };

  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: e.message }) };
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

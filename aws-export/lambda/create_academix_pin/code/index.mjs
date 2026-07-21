import { createClient } from "@supabase/supabase-js";
import fetch from 'node-fetch';
import bcrypt from 'bcryptjs';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const handler = async (event) => {
  try {
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    const { userId, userPin } = body;

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

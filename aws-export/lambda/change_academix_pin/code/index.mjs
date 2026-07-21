import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const handler = async (event) => {
  try {
    const { userId, oldPin, newPin } = JSON.parse(event.body);

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

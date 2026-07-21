import { createClient } from "@supabase/supabase-js";
import Flutterwave from "flutterwave-node-v3";

/** Supabase Client */
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

/** Flutterwave Client */
const flw = new Flutterwave(
  process.env.FLUTTERWAVE_PUBLIC_KEY,
  process.env.FLUTTERWAVE_SECRET_KEY
);

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { methodId } = body;

    if (!methodId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          status: 'BankStatus.error',
          error: 'methodId is required',
          banks: []
        })
      };
    }

    const { data: countryCode, error: countryError } = await supabase.rpc("get_method_country_code", {
      p_method_id: methodId
    });

    if (countryError) {
      return {
        statusCode: 500,
        body: JSON.stringify({ status: "BankStatus.error", error: countryError.message, banks: [] }),
      };
    }

    if (!countryCode) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          status: "BankStatus.error",
          error: "No country found for the provided methodId",
          banks: []
        }),
      };
    }

    console.log("Country code: ", countryCode);

    const response = await flw.Bank.country({ country: countryCode });
    const { status, message, data } = response;

    if (status !== 'success') {
      return {
        statusCode: 500,
        body: JSON.stringify({ status: "BankStatus.error", error: message, banks: [] }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ status: "BankStatus.success", error: null, banks: data }),
    };

  } catch (err) {
    console.error("Unexpected error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        status: "BankStatus.error",
        error: err.message || "Unexpected server error",
        banks: []
      }),
    };
  }
};

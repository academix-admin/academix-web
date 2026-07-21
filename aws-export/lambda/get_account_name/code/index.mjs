import Flutterwave from "flutterwave-node-v3";


/** Flutterwave Client */
const flw = new Flutterwave(
  process.env.FLUTTERWAVE_PUBLIC_KEY,
  process.env.FLUTTERWAVE_SECRET_KEY
);

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { accountNumber, bankCode } = body;

    if (!accountNumber || !bankCode) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          status: 'AccountStatus.error',
          error: 'Incomplete fields',
          details: null
        })
      };
    }

    const response = await flw.Misc.verify_Account({
       account_number: accountNumber,
       account_bank: bankCode
    });
    const { status, message, data } = response;

    if (status !== 'success') {
      return {
        statusCode: 500,
        body: JSON.stringify({ status: "AccountStatus.error", error: message, details: null }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ status: "AccountStatus.success", error: null, details: data }),
    };

  } catch (err) {
    console.error("Unexpected error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        status: "AccountStatus.error",
        error: err.message || "Unexpected server error",
        details: null 
      }),
    };
  }
};

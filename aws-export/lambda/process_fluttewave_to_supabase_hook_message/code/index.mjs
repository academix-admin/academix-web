import { createClient } from "@supabase/supabase-js";
import Flutterwave from 'flutterwave-node-v3';
import fetch from 'node-fetch';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const flw      = new Flutterwave(process.env.FLUTTERWAVE_PUBLIC_KEY, process.env.FLUTTERWAVE_SECRET_KEY);

const TransactionType = {
  TOP_UP:   'TransactionType.top_up',
  WITHDRAW: 'TransactionType.withdraw',
};

// VAT rate applied on top of Flutterwave fees.
// Matches the rate used in the wallet-rate-updater for consistency.
const FW_VAT_RATE = 0.075; // 7.5%

// =============================================================================
//  HANDLER ENTRY POINT
// =============================================================================

export const handler = async (event) => {
  const failed = [];

  for (const record of event.Records) {
    try {
      const data = JSON.parse(record.body);
      const { id: paymentId, event: paymentEvent, currency, amount } = data;

      // ── TRANSFER — withdraw confirmed by FW, trust directly ───────────────
      // FW initiates the payout — no re-verification needed.
      // fw_fee for transfers: FW deducts from the payout amount.
      if (paymentEvent === "PaymentEvent.transfer") {
        console.log(data);
        const result = await sendToSupabase({
          id:        data.id,
          event:     paymentEvent,
          amount,
          currency,
          status:    data.status,
          reference: data.reference,
          service:   'FLUTTERWAVE',
          fw_fee:    data.fee * (1 + FW_VAT_RATE)
        });
        continue;
      }

      // ── CHARGE — always re-verify, never trust raw webhook for money ──────
      if (!paymentId) {
        console.warn("Missing paymentId for charge event — skipping:", data);
        continue;
      }

      const verification = await flw.Transaction.verify({ id: paymentId });
      const { status, data: fwData } = verification;

      if (status !== "success") {
        console.warn("FW verification API call failed for id:", paymentId);
        continue;
      }

      const param = {
        id:        fwData.id,
        event:     "PaymentEvent.charge",
        amount:    fwData.amount,
        currency:  fwData.currency,
        status:    fwData.status.toUpperCase(),  // 'SUCCESSFUL' | 'FAILED'
        reference: fwData.tx_ref,
        service:   'FLUTTERWAVE',
        fw_fee:    (fwData.app_fee ?? 0) * (1 + FW_VAT_RATE)  // actual fee charged — stored for ledger
      };

      const result = await sendToSupabase(param);

    } catch (err) {
      console.error("SQS record error:", record.messageId, err.message);
      failed.push({ itemIdentifier: record.messageId });
    }
  }

  if (failed.length > 0) return { batchItemFailures: failed };
};

// =============================================================================
//  SUPABASE
// =============================================================================

async function sendToSupabase(data) {
  console.log("Sending to Supabase:", data);
  const { data: save, error } = await supabase.rpc("update_user_payment", data);
  if (error) {
    console.error("update_user_payment RPC error:", error.message);
    throw error;
  }
  console.log("update_user_payment result:", save);
  return save;
}
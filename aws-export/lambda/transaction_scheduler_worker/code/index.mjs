// import { createClient } from "@supabase/supabase-js";
// import Flutterwave from "flutterwave-node-v3";

// const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
// const flw      = new Flutterwave(
//   process.env.FLUTTERWAVE_PUBLIC_KEY,
//   process.env.FLUTTERWAVE_SECRET_KEY
// );

// // VAT rate applied on top of Flutterwave fees.
// // Matches the rate used in the wallet-rate-updater for consistency.
// const FW_VAT_RATE = 0.075; // 7.5%

// export const handler = async (event) => {
//   console.log("Scheduler fired:", event);

//   const data = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
//   const { reference, amount, currency } = data;

//   if (!reference) {
//     console.error("Missing reference in scheduler payload");
//     return;
//   }

//   console.log("Processing timeout for reference:", reference);

//   try {
//     // Re-verify before marking failed — webhook may have already succeeded
//     const paymentDetails = await flw.Transaction.verify_by_tx({ tx_ref: reference });
//     const { status, data: formattedData } = paymentDetails;

//     if (status !== "success") {
//       // FW API call itself failed — mark failed so user gets ADC back
//       await sendToSupabase({
//         id:        null,
//         event:     "PaymentEvent.general",
//         amount,
//         currency,
//         status:    'FAILED',
//         reference,
//         service:   'FLUTTERWAVE',
//         fw_fee:    null  // failed — no fee to store
//       });
//       return;
//     }

//     const flwStatus = formattedData.status.toLowerCase();

//     // Only mark as SUCCESSFUL if FW confirms it — otherwise FAILED.
//     // update_user_payment's pending guard will reject SUCCESSFUL if the
//     // webhook already processed it, so double-processing is safe.
//     const newStatus = flwStatus === 'successful' ? 'SUCCESSFUL' : 'FAILED';

//     await sendToSupabase({
//       id:        formattedData.id,
//       event:     "PaymentEvent.general",
//       amount:    formattedData.amount,
//       currency:  formattedData.currency,
//       status:    newStatus,
//       reference: formattedData.tx_ref,
//       service:   'FLUTTERWAVE',
//       // If somehow successful here, store the fee so the reconciler can
//       // write the ledger entry. Failed transactions pass null.
//       fw_fee:    newStatus === 'SUCCESSFUL' ? ((formattedData.app_fee ?? 0) * (1 + FW_VAT_RATE)) : null
//     });

//   } catch (error) {
//     console.error("Scheduler worker error:", error);
//     // Still attempt to mark failed so user gets their ADC back
//     await sendToSupabase({
//       id:        null,
//       event:     "PaymentEvent.general",
//       amount,
//       currency,
//       status:    'FAILED',
//       reference,
//       service:   'FLUTTERWAVE',
//       fw_fee:    null
//     });
//   }
// };

// async function sendToSupabase(data) {
//   console.log("Sending to Supabase:", data);
//   const { data: save, error } = await supabase.rpc("update_user_payment", data);
//   if (error) {
//     console.error("Supabase RPC error:", error);
//     return null;
//   }
//   console.log("Supabase update result:", save);
//   return save;
// }

import { createClient } from "@supabase/supabase-js";
import Flutterwave from "flutterwave-node-v3";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const flw      = new Flutterwave(
  process.env.FLUTTERWAVE_PUBLIC_KEY,
  process.env.FLUTTERWAVE_SECRET_KEY
);

const FW_VAT_RATE = 0.075;

export const handler = async (event) => {
  console.log("Scheduler fired:", event);

  const data = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  const { reference, amount, currency, event: paymentEvent } = data;

  if (!reference) {
    console.error("Missing reference in scheduler payload");
    return;
  }

  // =============================================================================
  //  CREDIT RETRY DROP
  //
  //  Fires 24h after a withdrawal was deferred for insufficient platform balance.
  //  Before marking FAILED we check the actual DB state — refresh_transaction
  //  may have already succeeded the transfer in the meantime, in which case
  //  both statuses will be 'success' and we must not touch the row.
  // =============================================================================

  if (paymentEvent === 'credit_retry') {
    console.log('Credit retry drop firing for reference:', reference);

    try {
      // Fetch current row state by receiver reference (REF prefix = withdraw)
      const { data: txRow, error: txError } = await supabase
        .from('transaction_table')
        .select('transaction_id, transaction_sender_status, transaction_receiver_status, transaction_retry_status')
        .eq('transaction_receiver_reference', reference)
        .single();

      if (txError || !txRow) {
        console.error('Credit retry drop: could not fetch transaction for reference:', reference, txError?.message);
        return;
      }

      const { transaction_id, transaction_sender_status, transaction_receiver_status, transaction_retry_status } = txRow;

      // Already settled — refresh_transaction succeeded it before the 24h drop fired
      if (transaction_sender_status   === 'TransactionStatus.success' ||
          transaction_receiver_status === 'TransactionStatus.success') {
        console.log('Credit retry drop: transaction already succeeded, skipping FAILED mark:', transaction_id);
        return;
      }

      // Already failed by another path (e.g. admin manual cancel)
      if (transaction_sender_status   === 'TransactionStatus.failed' ||
          transaction_receiver_status === 'TransactionStatus.failed') {
        console.log('Credit retry drop: transaction already failed, skipping:', transaction_id);
        return;
      }

      // Still pending + retry_status=TRUE — this is the expected drop case
      if (transaction_retry_status    === true
          && transaction_sender_status   === 'TransactionStatus.pending'
          && transaction_receiver_status === 'TransactionStatus.pending') {
        console.log('Credit retry drop: marking FAILED for:', transaction_id);

        await sendToSupabase({
          id:        null,
          event:     'PaymentEvent.transfer',
          amount,
          currency,
          status:    'FAILED',
          reference,
          service:   'SYSTEM',
          fw_fee:    null
        });

        console.log('Credit retry drop complete for:', transaction_id);
        return;
      }

      // Any other state — log and do nothing
      console.warn('Credit retry drop: unexpected state, skipping:', {
        transaction_id,
        transaction_sender_status,
        transaction_receiver_status,
        transaction_retry_status
      });

    } catch (err) {
      console.error('Credit retry drop error for reference:', reference, err.message);
    }

    return;
  }

  // =============================================================================
  //  STANDARD CHARGE TIMEOUT (top_up / buy_in)
  //
  //  Re-verify with FW before marking failed — webhook may have already
  //  succeeded it. update_user_payment's pending guard is a safety net but
  //  we avoid the spurious call entirely when FW confirms success.
  // =============================================================================

  console.log("Processing charge timeout for reference:", reference);

  try {
    const paymentDetails = await flw.Transaction.verify_by_tx({ tx_ref: reference });
    const { status, data: formattedData } = paymentDetails;

    if (status !== "success") {
      await sendToSupabase({
        id:        null,
        event:     "PaymentEvent.general",
        amount,
        currency,
        status:    'FAILED',
        reference,
        service:   'FLUTTERWAVE',
        fw_fee:    null
      });
      return;
    }

    const flwStatus = formattedData.status.toLowerCase();
    const newStatus = flwStatus === 'successful' ? 'SUCCESSFUL' : 'FAILED';

    await sendToSupabase({
      id:        formattedData.id,
      event:     "PaymentEvent.general",
      amount:    formattedData.amount,
      currency:  formattedData.currency,
      status:    newStatus,
      reference: formattedData.tx_ref,
      service:   'FLUTTERWAVE',
      fw_fee:    newStatus === 'SUCCESSFUL' ? ((formattedData.app_fee ?? 0) * (1 + FW_VAT_RATE)) : null
    });

  } catch (error) {
    console.error("Scheduler worker error:", error);
    await sendToSupabase({
      id:        null,
      event:     "PaymentEvent.general",
      amount,
      currency,
      status:    'FAILED',
      reference,
      service:   'FLUTTERWAVE',
      fw_fee:    null
    });
  }
};

async function sendToSupabase(data) {
  console.log("Sending to Supabase:", data);
  const { data: save, error } = await supabase.rpc("update_user_payment", data);
  if (error) {
    console.error("Supabase RPC error:", error);
    return null;
  }
  console.log("Supabase update result:", save);
  return save;
}
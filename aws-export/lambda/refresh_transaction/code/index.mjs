// import { createClient } from "@supabase/supabase-js";
// import Flutterwave from "flutterwave-node-v3";
// import fetch from 'node-fetch';

// const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
// const flw      = new Flutterwave(
//   process.env.FLUTTERWAVE_PUBLIC_KEY,
//   process.env.FLUTTERWAVE_SECRET_KEY
// );

// // VAT rate applied on top of Flutterwave fees.
// // Matches the rate used in the wallet-rate-updater for consistency.
// const FW_VAT_RATE = 0.075; // 7.5%


// // =============================================================================
// //  HANDLER ENTRY POINT
// // =============================================================================

// export const handler = async (event) => {
//   try {
//     const body = JSON.parse(event.body);
//     const { transactionId } = body;

//     if (!transactionId) {
//       return {
//         statusCode: 400,
//         body: JSON.stringify({
//           status: 'RefreshStatus.error',
//           error:  'transactionId is required',
//           transaction_update: null
//         })
//       };
//     }

//     // ── Fetch current transaction state ───────────────────────────────────────
//     const { data: update, error: updateError } = await supabase.rpc(
//       "get_refreshed_transaction",
//       { p_transaction_id: transactionId }
//     );

//     if (updateError) {
//       return {
//         statusCode: 500,
//         body: JSON.stringify({
//           status: "RefreshStatus.error",
//           error:  updateError.message,
//           transaction_update: null
//         }),
//       };
//     }

//     if (!update) {
//       return {
//         statusCode: 400,
//         body: JSON.stringify({
//           status: "RefreshStatus.error",
//           error:  "No data found",
//           transaction_update: null
//         }),
//       };
//     }

//     const {
//       amount,
//       time_out,
//       reference,
//       external_id,
//       transaction_id,
//       transaction_sender_status,
//       transaction_receiver_status
//     } = update;

//     console.log('Transaction state:', update);

//     // ── Already settled — return immediately ─────────────────────────────────
//     if (transaction_sender_status   === 'TransactionStatus.success' &&
//         transaction_receiver_status === 'TransactionStatus.success') {
//       console.log('Transaction already successful:', transaction_id);
//       return {
//         statusCode: 200,
//         body: JSON.stringify({
//           status: "RefreshStatus.success",
//           error:  null,
//           transaction_update: {
//             transaction_id,
//             transaction_sender_status,
//             transaction_receiver_status
//           }
//         }),
//       };
//     }

//     // ── Resolve FW transaction ID ─────────────────────────────────────────────
//     // external_id is the numeric FW ID required by verify().
//     // If not yet stored, look up by tx_ref using Transaction.fetch().
//     let flwTransactionId = external_id;

//     if (!flwTransactionId) {
//       console.log('external_id null — fetching by tx_ref:', reference);

//       const searchResult = await flw.Transaction.fetch({ tx_ref: reference });

//       if (!searchResult?.data?.length) {
//         // No FW record yet — transaction still pending on FW side
//         console.log('No FW record found for tx_ref:', reference);
//         return {
//           statusCode: 200,
//           body: JSON.stringify({
//             status: "RefreshStatus.success",
//             error:  null,
//             transaction_update: {
//               transaction_id,
//               transaction_sender_status,
//               transaction_receiver_status
//             }
//           }),
//         };
//       }

//       flwTransactionId = searchResult.data[0].id;
//       console.log('Resolved FW transaction ID:', flwTransactionId);

//       // Persist so future refreshes skip the fetch() call
//       await supabase
//         .from('transaction_table')
//         .update({ transaction_external_id: String(flwTransactionId) })
//         .eq('transaction_id', transaction_id);
//     }

//     // ── Verify with Flutterwave ───────────────────────────────────────────────
//     const paymentDetails = await flw.Transaction.verify({ id: flwTransactionId });
//     const { status, data: formattedData } = paymentDetails;

//     // ── Timeout check ─────────────────────────────────────────────────────────
//     const createdAt      = new Date(formattedData.created_at);
//     const diffInSeconds  = Math.floor((Date.now() - createdAt) / 1000);

//     if (diffInSeconds >= time_out) {
//       console.log('Transaction timed out:', { transaction_id, diffInSeconds, time_out });

//       await sendToSupabase({
//         id:        String(flwTransactionId),
//         event:     "PaymentEvent.charge",
//         amount:    formattedData.amount,
//         currency:  formattedData.currency,
//         status:    'FAILED',
//         reference: formattedData.tx_ref,
//         service:   'FLUTTERWAVE',
//         fw_fee:    null  // failed — no fee to store
//       });

//       return {
//         statusCode: 200,
//         body: JSON.stringify({
//           status: "RefreshStatus.success",
//           error:  null,
//           transaction_update: {
//             transaction_id,
//             transaction_sender_status:   'TransactionStatus.failed',
//             transaction_receiver_status: 'TransactionStatus.failed'
//           }
//         }),
//       };
//     }

//     if (status !== 'success') {
//       return {
//         statusCode: 500,
//         body: JSON.stringify({
//           status: "RefreshStatus.error",
//           error:  paymentDetails.message || 'Transaction verification failed',
//           transaction_update: null
//         }),
//       };
//     }

//     // ── Save confirmed transaction ────────────────────────────────────────────
//     // Pass app_fee so update_user_payment stores it on the transaction row.
//     const saved = await sendToSupabase({
//       id:        String(formattedData.id),
//       event:     "PaymentEvent.charge",
//       amount:    formattedData.amount,
//       currency:  formattedData.currency,
//       status:    formattedData.status.toUpperCase(),
//       reference: formattedData.tx_ref,
//       service:   'FLUTTERWAVE',
//       fw_fee:    (formattedData.app_fee ?? 0) * (1 + FW_VAT_RATE)  // historical fee stored here
//     });

//     return {
//       statusCode: 200,
//       body: JSON.stringify({
//         status: "RefreshStatus.success",
//         error:  null,
//         transaction_update: {
//           transaction_id:              saved?.transaction_id,
//           transaction_sender_status:   saved?.transaction_sender_status   ?? transaction_sender_status,
//           transaction_receiver_status: saved?.transaction_receiver_status ?? transaction_receiver_status
//         }
//       }),
//     };

//   } catch (err) {
//     console.error("Unexpected error:", err);
//     return {
//       statusCode: 500,
//       body: JSON.stringify({
//         status: "RefreshStatus.error",
//         error:  err.message || "Unexpected server error",
//         transaction_update: null
//       }),
//     };
//   }
// };

// // =============================================================================
// //  SUPABASE
// // =============================================================================

// async function sendToSupabase(data) {
//   const { data: save, error } = await supabase.rpc("update_user_payment", data);
//   if (error) {
//     console.error("Error saving to Supabase:", error);
//     return null;
//   }
//   console.log("Saved to Supabase:", save);
//   return save;
// }


import { createClient } from "@supabase/supabase-js";
import Flutterwave from "flutterwave-node-v3";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { randomUUID } from "crypto";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const flw      = new Flutterwave(
    process.env.FLUTTERWAVE_PUBLIC_KEY,
    process.env.FLUTTERWAVE_SECRET_KEY
);
const lambda   = new LambdaClient({});

const FW_VAT_RATE = 0.075;

// =============================================================================
//  HANDLER ENTRY POINT
// =============================================================================

export const handler = async (event) => {
    try {
        const body = JSON.parse(event.body);
        const { transactionId } = body;

        if (!transactionId) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    status: 'RefreshStatus.error',
                    error:  'transactionId is required',
                    transaction_update: null
                })
            };
        }

        // ── Fetch current transaction state ───────────────────────────────────
        const { data: update, error: updateError } = await supabase.rpc(
            "get_refreshed_transaction",
            { p_transaction_id: transactionId }
        );

        if (updateError) {
            return {
                statusCode: 500,
                body: JSON.stringify({
                    status: "RefreshStatus.error",
                    error:  updateError.message,
                    transaction_update: null
                }),
            };
        }

        if (!update) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    status: "RefreshStatus.error",
                    error:  "No data found",
                    transaction_update: null
                }),
            };
        }

        const {
            amount,
            time_out,
            reference,
            external_id,
            transaction_id,
            transaction_sender_status,
            transaction_receiver_status,
            transaction_retry_status,
            transaction_security_hash_key
        } = update;

        console.log('Transaction state:', update);

        // ── Already settled ───────────────────────────────────────────────────
        if (transaction_sender_status   === 'TransactionStatus.success' &&
            transaction_receiver_status === 'TransactionStatus.success') {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    status: "RefreshStatus.success",
                    error:  null,
                    transaction_update: {
                        transaction_id,
                        transaction_sender_status,
                        transaction_receiver_status
                    }
                }),
            };
        }

        // ── Credit retry branch ───────────────────────────────────────────────
        // Withdraw row stuck pending with retry_status=TRUE and no hash
        // currently set (hash is nulled after each use, so a fresh one is
        // generated each time refresh polls this branch).
        if (transaction_retry_status    === true
            && transaction_sender_status   === 'TransactionStatus.pending'
            && transaction_receiver_status === 'TransactionStatus.pending'
            && !transaction_security_hash_key   // only trigger if key already consumed
        ) {
            console.log('Credit retry branch: generating hash for', transaction_id);

            const hashKey = randomUUID();

            // Stamp the hash atomically — RPC returns FALSE if row no longer eligible
            const { data: stamped, error: stampError } = await supabase.rpc(
                'set_transaction_retry_hash',
                { p_transaction_id: transaction_id, p_hash_key: hashKey }
            );

            if (stampError || !stamped) {
                console.warn('set_transaction_retry_hash failed or row no longer eligible:', stampError?.message);
                // Row may have been settled by webhook — return current state
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        status: "RefreshStatus.success",
                        error:  null,
                        transaction_update: {
                            transaction_id,
                            transaction_sender_status,
                            transaction_receiver_status
                        }
                    }),
                };
            }

            // Invoke make_payment with transactionId + hash (fire-and-forget style —
            // InvocationType RequestResponse so we get a result but don't block client)
            try {
                const invokeCommand = new InvokeCommand({
                    FunctionName:   process.env.MAKE_PAYMENT_LAMBDA_ARN,
                    InvocationType: "RequestResponse",
                    Payload: Buffer.from(JSON.stringify({
                        body: JSON.stringify({
                            transactionId:             transaction_id,
                            transactionSecuredHashKey: hashKey
                        })
                    })),
                });

                const invokeResult  = await lambda.send(invokeCommand);
                const payloadString = new TextDecoder().decode(invokeResult.Payload);
                console.log('make_payment retry invocation result:', payloadString);
            } catch (invokeErr) {
                // Non-fatal — the 24h scheduler drop is still armed as the safety net
                console.error('make_payment Lambda invoke failed:', invokeErr.message);
            }

            // Always return pending to client — make_payment result is internal
            return {
                statusCode: 200,
                body: JSON.stringify({
                    status: "RefreshStatus.success",
                    error:  null,
                    transaction_update: {
                        transaction_id,
                        transaction_sender_status:   'TransactionStatus.pending',
                        transaction_receiver_status: 'TransactionStatus.pending'
                    }
                }),
            };
        }

        // ── Standard charge refresh (top_up / buy_in) ─────────────────────────
        let flwTransactionId = external_id;

        if (!flwTransactionId) {
            console.log('external_id null — fetching by tx_ref:', reference);
            const searchResult = await flw.Transaction.fetch({ tx_ref: reference });

            if (!searchResult?.data?.length) {
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        status: "RefreshStatus.success",
                        error:  null,
                        transaction_update: {
                            transaction_id,
                            transaction_sender_status,
                            transaction_receiver_status
                        }
                    }),
                };
            }

            flwTransactionId = searchResult.data[0].id;
            await supabase
                .from('transaction_table')
                .update({ transaction_external_id: String(flwTransactionId) })
                .eq('transaction_id', transaction_id);
        }

        const paymentDetails = await flw.Transaction.verify({ id: flwTransactionId });
        const { status, data: formattedData } = paymentDetails;

        const createdAt     = new Date(formattedData.created_at);
        const diffInSeconds = Math.floor((Date.now() - createdAt) / 1000);

        if (diffInSeconds >= time_out) {
            console.log('Transaction timed out:', { transaction_id, diffInSeconds, time_out });
            await sendToSupabase({
                id:        String(flwTransactionId),
                event:     "PaymentEvent.charge",
                amount:    formattedData.amount,
                currency:  formattedData.currency,
                status:    'FAILED',
                reference: formattedData.tx_ref,
                service:   'FLUTTERWAVE',
                fw_fee:    null
            });
            return {
                statusCode: 200,
                body: JSON.stringify({
                    status: "RefreshStatus.success",
                    error:  null,
                    transaction_update: {
                        transaction_id,
                        transaction_sender_status:   'TransactionStatus.failed',
                        transaction_receiver_status: 'TransactionStatus.failed'
                    }
                }),
            };
        }

        if (status !== 'success') {
            return {
                statusCode: 500,
                body: JSON.stringify({
                    status: "RefreshStatus.error",
                    error:  paymentDetails.message || 'Transaction verification failed',
                    transaction_update: null
                }),
            };
        }

        const saved = await sendToSupabase({
            id:        String(formattedData.id),
            event:     "PaymentEvent.charge",
            amount:    formattedData.amount,
            currency:  formattedData.currency,
            status:    formattedData.status.toUpperCase(),
            reference: formattedData.tx_ref,
            service:   'FLUTTERWAVE',
            fw_fee:    (formattedData.app_fee ?? 0) * (1 + FW_VAT_RATE)
        });

        return {
            statusCode: 200,
            body: JSON.stringify({
                status: "RefreshStatus.success",
                error:  null,
                transaction_update: {
                    transaction_id:              saved?.transaction_id,
                    transaction_sender_status:   saved?.transaction_sender_status   ?? transaction_sender_status,
                    transaction_receiver_status: saved?.transaction_receiver_status ?? transaction_receiver_status
                }
            }),
        };

    } catch (err) {
        console.error("Unexpected error:", err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                status: "RefreshStatus.error",
                error:  err.message || "Unexpected server error",
                transaction_update: null
            }),
        };
    }
};

async function sendToSupabase(data) {
    const { data: save, error } = await supabase.rpc("update_user_payment", data);
    if (error) { console.error("Error saving to Supabase:", error); return null; }
    console.log("Saved to Supabase:", save);
    return save;
}
// // // =============================================================================
// // //  make_payment (payment initiation Lambda)

// // import { SchedulerClient, CreateScheduleCommand } from "@aws-sdk/client-scheduler";
// // import { createClient } from "@supabase/supabase-js";
// // import Flutterwave from "flutterwave-node-v3";
// // import fetch from "node-fetch";
// // import moment from 'moment-timezone';
// // import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

// // ["FLUTTERWAVE_PUBLIC_KEY", "FLUTTERWAVE_SECRET_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "FLUTTERWAVE_PROXY_URL"]
// //   .forEach((key) => {
// //     if (!process.env[key]) throw new Error(`Missing environment variable: ${key}`);
// //   });

// // const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// // const flw = new Flutterwave(
// //   process.env.FLUTTERWAVE_PUBLIC_KEY,
// //   process.env.FLUTTERWAVE_SECRET_KEY,
// //   { baseUrl: process.env.FLUTTERWAVE_PROXY_URL }
// // );

// // const scheduler = new SchedulerClient({});
// // const lambda = new LambdaClient();

// // // =============================================================================
// // //  CONSTANTS
// // // =============================================================================

// // const DEFAULT_SENDER_META = {
// //   sender: 'Jimstech Innovations',
// //   sender_country: 'NG',
// //   mobile_number: '2348080733030',
// // };

// // const REQUIRED_FIELDS = [
// //   "userId", "locale", "age", "gender", "country",
// //   "senderProfileId", "receiverProfileId", "amount",
// //   "type", "paymentSessionId"
// // ];

// // const TransactionType = {
// //   TOP_UP: "TransactionType.top_up",
// //   WITHDRAW: "TransactionType.withdraw",
// //   BUY_IN: "TransactionType.buy_in"
// // };

// // const TransactionStatus = {
// //   SUCCESS: "TransactionStatus.success",
// //   FAILED: "TransactionStatus.failed",
// //   PENDING: "TransactionStatus.pending",
// // };

// // const PaymentStatus = {
// //   SUCCESS: "Payment.success",
// //   FAILED: "Payment.failed",
// //   PENDING: "Payment.pending",
// //   PINERROR: "Payment.pinError"
// // };

// // const PaymentMethod = {
// //   MOBILE_MONEY: "PaymentMethod.mobile_money",
// //   PRIVATE_ACCOUNT: "PaymentMethod.private_account",
// //   BANK_TRANSFER: "PaymentMethod.bank_transfer",
// //   USSD: "PaymentMethod.ussd",
// //   E_NAIRA: "PaymentMethod.e_naira",
// //   DIRECT_DEBIT: "PaymentMethod.direct_debit",
// //   OPAY: "PaymentMethod.opay"
// // };

// // const PaymentCompletion = {
// //   NONE: "PaymentCompletion.none",
// //   REDIRECT: "PaymentCompletion.redirect",
// //   BANKTRANSFER: "PaymentCompletion.banktransfer",
// //   USSD: "PaymentCompletion.ussd"
// // };

// // const PaymentEvent = {
// //   CHARGE: "PaymentEvent.charge",
// //   TRANSFER: "PaymentEvent.transfer",
// //   GENERAL: "PaymentEvent.general",
// //   ERROR: "PaymentEvent.error"
// // };

// // // VAT rate applied on top of Flutterwave fees.
// // // Matches the rate used in the wallet-rate-updater for consistency.
// // const FW_VAT_RATE = 0.075; // 7.5%

// // // =============================================================================
// // //  GENERAL UTILITIES
// // // =============================================================================

// // const generateTransactionOrderId = () => 'order-' + Date.now();

// // const validateFields = (obj, fields) => fields.every(field => obj?.[field]);

// // const validateTransferData = (data, fields = []) => {
// //   const profile = data.transfer_profile || {};
// //   return fields.every(field => data[field] || profile[field]);
// // };

// // const validateCommonTransferFields = (data) =>
// //   validateTransferData(data, ["transfer_currency", "transfer_amount", "transfer_reference", "transfer_profile", "transfer_time_out"]);

// // const retryRpc = async (fn, attempts = 3, delay = 300) => {
// //   for (let i = 0; i < attempts; i++) {
// //     const { data, error } = await fn();
// //     if (!error) return { data, error };
// //     console.warn(`RPC retry ${i + 1} failed:`, error.message || error);
// //     if (i < attempts - 1) await new Promise(res => setTimeout(res, delay * (i + 1)));
// //   }
// //   return { data: null, error: { message: "RPC retries failed" } };
// // };

// // const failedStatusedTransaction = async (data, event) => {
// //   const param = {
// //     id: null,
// //     event,
// //     amount: data.transfer_amount,
// //     currency: data.transfer_currency,
// //     status: 'FAILED',
// //     reference: data.transfer_reference,
// //     service: 'FLUTTERWAVE'
// //   };

// //   const transactionData = data.transaction_details;
// //   const { data: save, error: saveError } = await supabase.rpc("update_user_payment", param);
// //   if (saveError) console.error("Error saving failed transaction:", saveError);

// //   if (!save) return transactionData;

// //   transactionData.transaction_sender_status = save.transaction_sender_status;
// //   transactionData.transaction_receiver_status = save.transaction_receiver_status;
// //   return transactionData;
// // };

// // function errorResponse(error, code = 500, status = PaymentStatus.FAILED, transactionData) {
// //   console.log("Error:", error);
// //   return {
// //     statusCode: code,
// //     body: JSON.stringify({ status, error, transaction_details: transactionData })
// //   };
// // }

// // async function scheduleTimeOut(data, event) {
// //   try {
// //     if (!data) return;
// //     const { transfer_currency, transfer_amount, transfer_reference, transfer_time_out } = data;
// //     const executionDate = new Date(Date.now() + (transfer_time_out * 1000));
// //     const executionTime = executionDate.toISOString().slice(0, 19);
// //     const scheduleName = `${transfer_reference}-${Date.now()}`;

// //     const scheduleParams = new CreateScheduleCommand({
// //       Name: scheduleName,
// //       FlexibleTimeWindow: { Mode: "OFF" },
// //       GroupName: "transaction_scheduler",
// //       State: "ENABLED",
// //       Target: {
// //         Arn: process.env.TARGET_LAMBDA_ARN,
// //         RoleArn: process.env.EVENTBRIDGE_ROLE_ARN,
// //         Input: JSON.stringify({
// //           body: {
// //             id: null,
// //             event,
// //             amount: transfer_amount,
// //             currency: transfer_currency,
// //             status: 'FAILED',
// //             reference: transfer_reference,
// //             service: 'FLUTTERWAVE'
// //           }
// //         }),
// //       },
// //       ScheduleExpression: `at(${executionTime})`,
// //       ScheduleExpressionTimezone: "UTC",
// //       ActionAfterCompletion: "DELETE",
// //     });

// //     const scheduleResponse = await scheduler.send(scheduleParams);
// //     console.log("Schedule created:", scheduleResponse);
// //   } catch (err) {
// //     console.error("Error scheduling job:", err);
// //   }
// // }

// // const mapToRpcParams = (body) => ({
// //   p_country: body.country,
// //   p_locale: body.locale,
// //   p_gender: body.gender,
// //   p_age: body.age,
// //   p_user_id: body.userId,
// //   p_sender_profile_id: body.senderProfileId,
// //   p_receiver_profile_id: body.receiverProfileId,
// //   p_payment_session_id: body.paymentSessionId,
// //   p_type: body.type,
// //   p_amount: body.amount
// // });

// // // =============================================================================
// // // FLUTTERWAVE API HELPERS
// // // =============================================================================
// // /**
// //  * Fetches the live Flutterwave available balance for a currency.
// //  * Endpoint: GET /v3/balances/{currency}
// //  */
// // async function fetchFlutterwaveBalance(currency) {
// //   try {
// //     const res = await fetch(`https://api.flutterwave.com/v3/balances/${currency}`, {
// //       headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}` }
// //     });
// //     if (!res.ok) throw new Error(`HTTP ${res.status}`);
// //     const json = await res.json();
// //     if (json.status !== 'success') throw new Error(json.message || 'FW balance API error');

// //     const balance = parseFloat(json.data.available_balance);
// //     console.log(`fetchFlutterwaveBalance: ${currency} → ${balance}`);
// //     return balance;
// //   } catch (err) {
// //     console.error(`fetchFlutterwaveBalance failed for ${currency}:`, err.message);
// //     return null;
// //   }
// // }

// // /**
// //  * Used ONLY for pre-flight withdrawal balance check.
// //  */
// // async function fetchExactTransferFee(currency, amount, transferType) {
// //   if (!transferType) {
// //     console.warn('fetchExactTransferFee: no transfer type — skipping');
// //     return null;
// //   }
// //   try {
// //     const url = new URL('https://api.flutterwave.com/v3/transfers/fee');
// //     url.searchParams.set('amount', amount);
// //     url.searchParams.set('currency', currency);
// //     url.searchParams.set('type', transferType);
// //     const res = await fetch(url.toString(), {
// //       headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}` }
// //     });
// //     if (!res.ok) throw new Error(`HTTP ${res.status}`);
// //     const json = await res.json();
// //     if (json.status !== 'success') throw new Error(json.message || 'FW transfer fee API error');
// //     const entry = json.data?.[0];
// //     if (!entry) throw new Error('No fee entry returned');
// //     const fee = entry.fee_type === 'percentage'
// //       ? parseFloat((parseFloat(entry.fee) * amount * (1 + FW_VAT_RATE)).toFixed(4))
// //       : parseFloat((parseFloat(entry.fee) * (1 + FW_VAT_RATE)).toFixed(4));
// //     console.log(`fetchExactTransferFee: ${currency} ${amount} via ${transferType} → ${fee}`);
// //     return fee;
// //   } catch (err) {
// //     console.error('fetchExactTransferFee failed:', err.message);
// //     return null;
// //   }
// // }

// // /**
// //  * Pre-flight withdrawal balance check.
// //  *
// //  * Checks net_available (user_principal + our_profit) — NOT balance_total.
// //  * balance_total includes FW collection fees that FW deducts at settlement
// //  * and are never available for payouts.
// //  *
// //  * Also checks live FW balance as a second guard.
// //  * Falls back to DB-only check if FW fetch fails (network blip should not block).
// //  */
// // async function checkWithdrawalBalance(walletId, totalNeeded, currency) {
// //   const fwBalance = await fetchFlutterwaveBalance(currency);

// //   const { data, error } = await supabase.rpc('check_wallet_balance_for_withdrawal', {
// //     p_wallet_id: walletId,
// //     p_amount: totalNeeded,
// //     p_fw_balance: fwBalance ?? Number.MAX_SAFE_INTEGER
// //   });

// //   if (error) {
// //     console.error('checkWithdrawalBalance RPC error:', error.message);
// //     return { canProceed: false, reason: error.message, safeBalance: 0, netAvailable: 0, fwBalance };
// //   }

// //   return {
// //     canProceed: data.can_proceed,
// //     reason: data.reason ?? null,
// //     safeBalance: data.safe_balance,
// //     netAvailable: data.net_available,
// //     fwBalance,
// //   };
// // }

// // // =============================================================================
// // //  WITHDRAWAL BALANCE PRE-FLIGHT
// // //
// // //  Wraps routeByCurrency() with a balance check for withdrawals.
// // //  top_up passes straight through — inflows never need a balance check.
// // //
// // //  For withdraw:
// // //    1. Resolve wallet + transfer type from DB via payment_method_checker
// // //    2. Check net_available (user_principal + profit) AND live FW balance
// // //    4. Insufficient → mark, retry and leave as pending, schedule 24 hours drop
// // //    5. Sufficient  → proceed to routeByCurrency, passing resolved method
// // // =============================================================================

// // async function resolveTransactionMethod(transactionId) {
// //   const { data, error } = await supabase
// //     .rpc('get_transaction_flutterwave_method', { p_transaction_id: transactionId });
// //   if (error || !data) {
// //     console.error('resolveTransactionMethod failed:', error?.message ?? 'no data returned');
// //     return null;
// //   }
// //   return {
// //     collectionMethod: data.collection_method,
// //     transferType: data.transfer_type,
// //     methodChecker: data.method_checker,
// //     currency: data.currency,
// //     walletId: data.wallet_id,
// //   };
// // }

// // async function routeWithBalanceCheck(transactionData) {
// //   const {
// //     transfer_currency,
// //     transfer_amount,
// //     transfer_type,
// //     transfer_reference,
// //     transaction_details,
// //   } = transactionData;

// //   if (transfer_type === TransactionType.WITHDRAW) {
// //     const transactionId = transaction_details?.transaction_id;

// //     if (transactionId) {
// //       const method = await resolveTransactionMethod(transactionId);

// //       if (method?.transferType && method?.walletId) {
// //         const fwFee = await fetchExactTransferFee(
// //           transfer_currency,
// //           transfer_amount,
// //           method.transferType
// //         );

// //         const totalNeeded = transfer_amount + (fwFee ?? 0);
// //         console.log(`Balance check: need ${totalNeeded} ${transfer_currency} (${transfer_amount} + ${fwFee ?? 0} FW fee)`);

// //         const balanceCheck = await checkWithdrawalBalance(
// //           method.walletId,
// //           totalNeeded,
// //           transfer_currency
// //         );

// //         console.log('Balance check result:', balanceCheck);

// //         if (!balanceCheck.canProceed) {
// //           // Insufficient 
// //           await supabase.rpc('update_user_payment', {
// //             id: null,
// //             event: PaymentEvent.TRANSFER,
// //             amount: transfer_amount,
// //             currency: transfer_currency,
// //             status: 'RETRY',
// //             reference: transfer_reference,
// //             service: 'SYSTEM'
// //           });

// //           return {
// //             statusCode: 200,
// //             body: JSON.stringify({
// //               status: PaymentStatus.PENDING,
// //               error: balanceCheck.reason,
// //               transaction_details: transaction_details
// //             })
// //           };
// //         }
// //       }
// //     }
// //   }

// //   return await routeByCurrency(transfer_currency, transactionData);
// // }

// // // =============================================================================
// // //  HANDLER ENTRY POINT
// // // =============================================================================

// // export const handler = async (event) => {
// //   try {
// //     const body = JSON.parse(event.body);
// //     if (!validateFields(body, REQUIRED_FIELDS)) {
// //       return errorResponse("Missing required fields", 400);
// //     }

// //     console.log("Initiating transaction for user:", body.userId);

// //     // PIN verification
// //     try {
// //       const pinCommand = new InvokeCommand({
// //         FunctionName: "verify_academix_pin",
// //         InvocationType: "RequestResponse",
// //         Payload: Buffer.from(JSON.stringify({
// //           body: JSON.stringify({ userId: body.userId, pin: body.userPin })
// //         })),
// //       });

// //       const response = await lambda.send(pinCommand);
// //       const payloadString = new TextDecoder().decode(response.Payload);
// //       const pinResponse = JSON.parse(payloadString);
// //       const { success: pinResult, message, attempts_left, locked_until, not_set } = JSON.parse(pinResponse.body);

// //       if (!pinResult) {
// //         return {
// //           statusCode: 400,
// //           body: JSON.stringify({
// //             status: PaymentStatus.PINERROR,
// //             error: message,
// //             transaction_details: null,
// //             attempts_left,
// //             locked_until,
// //             not_set
// //           }),
// //         };
// //       }
// //     } catch (pinError) {
// //       console.error("Pin verification error:", pinError);
// //       return {
// //         statusCode: 500,
// //         body: JSON.stringify({ status: PaymentStatus.FAILED, error: pinError.message, transaction_details: null }),
// //       };
// //     }

// //     // Create transaction in DB
// //     const { data: transactionData, error: transactionError } = await retryRpc(() =>
// //       supabase.rpc("handle_user_payment", mapToRpcParams(body))
// //     );

// //     if (transactionError || !transactionData) {
// //       return errorResponse("Payment service unavailable. Please retry.", 502, PaymentStatus.FAILED);
// //     }

// //     const { status, error, transfer_currency = 'unknown' } = transactionData;
// //     if (status !== PaymentStatus.SUCCESS) {
// //       console.log("Transaction failed:", status);
// //       return errorResponse(error || "Payment processing failed", 400, PaymentStatus.FAILED);
// //     }

// //     console.log("Routing transaction:", transfer_currency, transactionData.transfer_type);
// //     return await routeWithBalanceCheck(transactionData);

// //   } catch (e) {
// //     return errorResponse(e.message || "Unexpected server error", 500);
// //   }
// // };

// // // =============================================================================
// // //  CURRENCY ROUTING
// // // =============================================================================

// // const routeByCurrency = async (currency, data) => {
// //   const handlers = {
// //     RWF: handleRWF,
// //     ZMW: handleZMW,
// //     XOF: handleFRANCO,
// //     XAF: handleFRANCO,
// //     NGN: handleNGN,
// //     KES: handleKES,
// //     GHS: handleGHS,
// //     UGX: handleUGX,
// //     TZS: handleTZS
// //   };
// //   const currencyHandler = handlers[currency];
// //   if (!currencyHandler) {
// //     const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.ERROR);
// //     return errorResponse(`Unsupported currency: ${currency}`, 400, PaymentStatus.FAILED, failedTransaction);
// //   }
// //   return currencyHandler(data);
// // };

// // const handleRWF = (data) => handleGenericMobileMoney(data, flw.MobileMoney.rwanda, "RWF");
// // const handleZMW = (data) => handleGenericMobileMoney(data, flw.MobileMoney.zambia, "ZMW");
// // const handleFRANCO = (data) => handleGenericMobileMoney(data, flw.MobileMoney.franco_phone, "FRANCO");
// // const handleKES = (data) => handleGenericMobileMoney(data, flw.MobileMoney.mpesa, "KES");
// // const handleGHS = (data) => handleGenericMobileMoney(data, flw.MobileMoney.ghana, "GHS");
// // const handleUGX = (data) => handleGenericMobileMoney(data, flw.MobileMoney.uganda, "UGX");
// // const handleTZS = (data) => handleGenericMobileMoney(data, flw.MobileMoney.tanzania, "TZS");

// // // =============================================================================
// // //  GENERIC MOBILE MONEY
// // // =============================================================================

// // const handleGenericMobileMoney = async (data, flwMethod, label) => {
// //   const { transfer_profile: profile, transfer_method, transfer_type } = data;

// //   if (!validateCommonTransferFields(data)) {
// //     const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.CHARGE);
// //     return errorResponse(`Invalid ${label} payment data`, 400, PaymentStatus.FAILED, failedTransaction);
// //   }

// //   if ((transfer_type === TransactionType.TOP_UP || transfer_type === TransactionType.BUY_IN ) && transfer_method === PaymentMethod.MOBILE_MONEY) {
// //     return await debitMobileMoneyFlow(flwMethod, profile, data);
// //   }

// //   if (transfer_type === TransactionType.WITHDRAW && transfer_method === PaymentMethod.MOBILE_MONEY) {
// //     return await creditFlow({
// //       account_bank: profile.network,
// //       account_number: profile.phone,
// //       amount: data.transfer_amount,
// //       currency: data.transfer_currency,
// //       beneficiary_name: profile.fullname,
// //       reference: data.transfer_reference,
// //       meta: { ...DEFAULT_SENDER_META }
// //     }, data);
// //   }

// //   const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.CHARGE);
// //   return errorResponse(`Unsupported ${label} flow: ${transfer_type} / ${transfer_method}`, 400, PaymentStatus.FAILED, failedTransaction);
// // };

// // // =============================================================================
// // //  DEBIT (top_up) + CREDIT (withdraw) FLOWS
// // // =============================================================================

// // const debitMobileMoneyFlow = async (flwMethod, profile, data) => {
// //   const payload = {
// //     phone_number: profile.phone,
// //     amount: data.transfer_amount,
// //     fullname: profile.fullname,
// //     currency: data.transfer_currency,
// //     email: profile.email,
// //     tx_ref: data.transfer_reference,
// //     order_id: generateTransactionOrderId(),
// //     country: profile.country
// //   };

// //   try {
// //     const response = await flwMethod(payload);
// //     const { status, message, meta } = response;
// //     const { authorization } = meta || {};

// //     if (status !== 'success') {
// //       const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.CHARGE);
// //       return errorResponse(message, 400, PaymentStatus.FAILED, failedTransaction);
// //     }

// //     await scheduleTimeOut(data, PaymentEvent.CHARGE);
// //     return {
// //       statusCode: 200,
// //       body: JSON.stringify({
// //         status: PaymentStatus.SUCCESS,
// //         error: null,
// //         payment_completion_mode: PaymentCompletion.REDIRECT,
// //         payment_completion_data: { link: authorization?.redirect || authorization?.redirect_url },
// //         transaction_details: data.transaction_details
// //       })
// //     };
// //   } catch (err) {
// //     const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.CHARGE);
// //     return errorResponse(err.message, 500, PaymentStatus.FAILED, failedTransaction);
// //   }
// // };

// // /**
// //  * creditFlow — initiates a Flutterwave transfer (withdraw payout).
// //  *
// //  * On success, writes a ledger entry using the pre-resolved method from
// //  * routeWithBalanceCheck (_resolvedMethod on data) to avoid a second DB call.
// //  * The ledger write is non-fatal — the transfer already succeeded if it fails.
// //  */
// // const creditFlow = async (payload, data) => {
// //   console.log("Credit flow");
// //   try {
// //     const response = await fetch(`${process.env.FLUTTERWAVE_PROXY_URL}/v3/transfers`, {
// //       method: 'POST',
// //       headers: {
// //         Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
// //         'Content-Type': 'application/json',
// //         Host: 'api.flutterwave.com'
// //       },
// //       body: JSON.stringify(payload)
// //     });

// //     const statusCode = response.status;
// //     const body = await response.json();

// //     if (statusCode !== 200 || body.status !== 'success') {
// //       const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.TRANSFER);
// //       return errorResponse(body.message || 'Transfer failed', 400, PaymentStatus.FAILED, failedTransaction);
// //     }

// //     return {
// //       statusCode: 200,
// //       body: JSON.stringify({
// //         status: PaymentStatus.SUCCESS,
// //         error: null,
// //         payment_completion_mode: PaymentCompletion.NONE,
// //         payment_completion_data: null,
// //         transaction_details: data.transaction_details
// //       })
// //     };
// //   } catch (err) {
// //     const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.TRANSFER);
// //     return errorResponse(`Proxy request failed: ${err.message}`, 500, PaymentStatus.FAILED, failedTransaction);
// //   }
// // };

// // // =============================================================================
// // //  NGN HANDLERS
// // // =============================================================================

// // const handleNGN = async (data) => {
// //   const { transfer_profile: profile, transfer_method, transfer_type } = data;

// //   if (!validateCommonTransferFields(data)) {
// //     const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.CHARGE);
// //     return errorResponse("Invalid NGN transaction data", 400, PaymentStatus.FAILED, failedTransaction);
// //   }

// //   if ((transfer_type === TransactionType.TOP_UP || transfer_type === TransactionType.BUY_IN )) return await handleNGNTopUp(profile, data);
// //   if (transfer_type === TransactionType.WITHDRAW) return await handleNGNWithdrawal(profile, data);

// //   const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.CHARGE);
// //   return errorResponse(`Unsupported NGN flow: ${transfer_type} / ${transfer_method}`, 400, PaymentStatus.FAILED, failedTransaction);
// // };

// // const handleNGNTopUp = async (profile, data) => {
// //   switch (data.transfer_method) {
// //     case PaymentMethod.PRIVATE_ACCOUNT: return await handleNGNPrivateAccount(profile, data);
// //     case PaymentMethod.USSD: return await handleNGNUSSD(profile, data);
// //     case PaymentMethod.DIRECT_DEBIT: return await handleNGNDirectDebit(profile, data);
// //     case PaymentMethod.E_NAIRA: return await handleNGNeNaira(profile, data);
// //     case PaymentMethod.OPAY: return await handleNGNOpay(profile, data);
// //     default: {
// //       const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.CHARGE);
// //       return errorResponse(`Unsupported NGN top-up method: ${data.transfer_method}`, 400, PaymentStatus.FAILED, failedTransaction);
// //     }
// //   }
// // };

// // const handleNGNUSSD = async (profile, data) => {
// //   try {
// //     const response = await flw.Charge.ussd({
// //       tx_ref: data.transfer_reference,
// //       account_bank: profile.bank_code,
// //       amount: data.transfer_amount,
// //       currency: data.transfer_currency,
// //       email: profile.email,
// //       phone_number: profile.phone,
// //       fullname: profile.fullname
// //     });
// //     const { status, message, meta } = response;
// //     if (status !== 'success') {
// //       const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.CHARGE);
// //       return errorResponse(message, 400, PaymentStatus.FAILED, failedTransaction);
// //     }
// //     await scheduleTimeOut(data, PaymentEvent.CHARGE);
// //     return {
// //       statusCode: 200,
// //       body: JSON.stringify({
// //         status: PaymentStatus.SUCCESS,
// //         error: null,
// //         payment_completion_mode: PaymentCompletion.USSD,
// //         payment_completion_data: { code: meta?.authorization?.note },
// //         transaction_details: data.transaction_details
// //       })
// //     };
// //   } catch (err) {
// //     const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.CHARGE);
// //     return errorResponse(err.message, 500, PaymentStatus.FAILED, failedTransaction);
// //   }
// // };

// // const handleNGNOpay = async (profile, data) => {
// //   try {
// //     const response = await fetch('https://api.flutterwave.com/v3/charges?type=opay', {
// //       method: 'POST',
// //       headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`, 'Content-Type': 'application/json' },
// //       body: JSON.stringify({
// //         tx_ref: data.transfer_reference,
// //         amount: data.transfer_amount,
// //         currency: data.transfer_currency,
// //         email: profile.email,
// //         phone_number: profile.phone,
// //         fullname: profile.fullname
// //       })
// //     });
// //     const opayResponse = await response.json();
// //     const { status, message, data: flutterwaveData } = opayResponse;
// //     if (status !== 'success') {
// //       const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.CHARGE);
// //       return errorResponse(message, 400, PaymentStatus.FAILED, failedTransaction);
// //     }
// //     await scheduleTimeOut(data, PaymentEvent.CHARGE);
// //     return {
// //       statusCode: 200,
// //       body: JSON.stringify({
// //         status: PaymentStatus.SUCCESS,
// //         error: null,
// //         payment_completion_mode: PaymentCompletion.REDIRECT,
// //         payment_completion_data: { link: flutterwaveData?.meta?.authorization?.redirect },
// //         transaction_details: data.transaction_details
// //       })
// //     };
// //   } catch (err) {
// //     const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.CHARGE);
// //     return errorResponse(err.message, 500, PaymentStatus.FAILED, failedTransaction);
// //   }
// // };

// // const handleNGNDirectDebit = async (profile, data) => {
// //   try {
// //     const response = await flw.Charge.ng({
// //       tx_ref: data.transfer_reference,
// //       amount: data.transfer_amount,
// //       currency: data.transfer_currency,
// //       email: profile.email,
// //       phone_number: profile.phone,
// //       fullname: profile.fullname
// //     });
// //     const { status, message, data: flutterwaveData } = response;
// //     if (status !== 'success') {
// //       const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.CHARGE);
// //       return errorResponse(message, 400, PaymentStatus.FAILED, failedTransaction);
// //     }
// //     await scheduleTimeOut(data, PaymentEvent.CHARGE);
// //     return {
// //       statusCode: 200,
// //       body: JSON.stringify({
// //         status: PaymentStatus.SUCCESS,
// //         error: null,
// //         payment_completion_mode: PaymentCompletion.REDIRECT,
// //         payment_completion_data: { link: flutterwaveData?.meta?.authorization?.redirect },
// //         transaction_details: data.transaction_details
// //       })
// //     };
// //   } catch (err) {
// //     const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.CHARGE);
// //     return errorResponse(err.message, 500, PaymentStatus.FAILED, failedTransaction);
// //   }
// // };

// // const handleNGNeNaira = async (profile, data) => {
// //   try {
// //     const response = await flw.Charge.enaira({
// //       tx_ref: data.transfer_reference,
// //       amount: data.transfer_amount,
// //       currency: data.transfer_currency,
// //       email: profile.email,
// //       fullname: profile.fullname,
// //       phone_number: profile.phone
// //     });
// //     const { status, message, data: flutterwaveData } = response;
// //     if (status !== 'success') {
// //       const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.CHARGE);
// //       return errorResponse(message, 400, PaymentStatus.FAILED, failedTransaction);
// //     }
// //     await scheduleTimeOut(data, PaymentEvent.CHARGE);
// //     return {
// //       statusCode: 200,
// //       body: JSON.stringify({
// //         status: PaymentStatus.SUCCESS,
// //         error: null,
// //         payment_completion_mode: PaymentCompletion.REDIRECT,
// //         payment_completion_data: { link: flutterwaveData?.meta?.authorization?.redirect },
// //         transaction_details: data.transaction_details
// //       })
// //     };
// //   } catch (err) {
// //     const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.CHARGE);
// //     return errorResponse(err.message, 500, PaymentStatus.FAILED, failedTransaction);
// //   }
// // };

// // function convertNigeriaTimeToUTC(nigeriaTimeStr) {
// //   if (!nigeriaTimeStr) return null;
// //   return moment.tz(nigeriaTimeStr, 'YYYY-MM-DD HH:mm:ss', 'Africa/Lagos')
// //     .utc()
// //     .format('YYYY-MM-DD HH:mm:ss');
// // }

// // const handleNGNPrivateAccount = async (profile, data) => {
// //   try {
// //     const response = await flw.Charge.bank_transfer({
// //       phone_number: profile.phone,
// //       amount: data.transfer_amount,
// //       fullname: profile.fullname,
// //       currency: data.transfer_currency,
// //       email: profile.email,
// //       tx_ref: data.transfer_reference
// //     });
// //     const { status, message, meta } = response;
// //     if (status !== 'success') {
// //       const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.CHARGE);
// //       return errorResponse(message, 400, PaymentStatus.FAILED, failedTransaction);
// //     }
// //     await scheduleTimeOut(data, PaymentEvent.CHARGE);
// //     return {
// //       statusCode: 200,
// //       body: JSON.stringify({
// //         status: PaymentStatus.SUCCESS,
// //         error: null,
// //         payment_completion_mode: PaymentCompletion.BANKTRANSFER,
// //         payment_completion_data: {
// //           bank: meta?.authorization?.transfer_bank,
// //           account: meta?.authorization?.transfer_account,
// //           reference: meta?.authorization?.transfer_reference,
// //           note: meta?.authorization?.transfer_note,
// //           amount: meta?.authorization?.transfer_amount,
// //           expire: convertNigeriaTimeToUTC(meta?.authorization?.account_expiration)
// //         },
// //         transaction_details: data.transaction_details
// //       })
// //     };
// //   } catch (err) {
// //     const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.CHARGE);
// //     return errorResponse(err.message, 500, PaymentStatus.FAILED, failedTransaction);
// //   }
// // };

// // const handleNGNWithdrawal = async (profile, data) => {
// //   if (data.transfer_method === PaymentMethod.BANK_TRANSFER) {
// //     return await creditFlow({
// //       account_bank: profile.bank_code,
// //       account_number: profile.account_number,
// //       amount: data.transfer_amount,
// //       narration: `Withdrawal to ${profile.fullname}`,
// //       currency: data.transfer_currency,
// //       reference: data.transfer_reference,
// //       debit_currency: data.transfer_currency
// //     }, data);
// //   }
// //   const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.TRANSFER);
// //   return errorResponse(`Unsupported NGN withdrawal method: ${data.transfer_method}`, 400, PaymentStatus.FAILED, failedTransaction);
// // };



// // =============================================================================
// //  make_payment (payment initiation Lambda)
// // =============================================================================

// import { SchedulerClient, CreateScheduleCommand } from "@aws-sdk/client-scheduler";
// import { createClient } from "@supabase/supabase-js";
// import Flutterwave from "flutterwave-node-v3";
// import fetch from "node-fetch";
// import moment from 'moment-timezone';
// import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

// ["FLUTTERWAVE_PUBLIC_KEY", "FLUTTERWAVE_SECRET_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "FLUTTERWAVE_PROXY_URL"]
//   .forEach((key) => {
//     if (!process.env[key]) throw new Error(`Missing environment variable: ${key}`);
//   });

// const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// const flw = new Flutterwave(
//   process.env.FLUTTERWAVE_PUBLIC_KEY,
//   process.env.FLUTTERWAVE_SECRET_KEY,
//   { baseUrl: process.env.FLUTTERWAVE_PROXY_URL }
// );

// const scheduler = new SchedulerClient({});
// const lambda = new LambdaClient();

// // =============================================================================
// //  CONSTANTS
// // =============================================================================

// const DEFAULT_SENDER_META = {
//   sender: 'Jimstech Innovations',
//   sender_country: 'NG',
//   mobile_number: '2348080733030',
// };

// const REQUIRED_FIELDS = [
//   "userId", "locale", "age", "gender", "country",
//   "senderProfileId", "receiverProfileId", "amount",
//   "type", "paymentSessionId"
// ];

// const TransactionType = {
//   TOP_UP:   "TransactionType.top_up",
//   WITHDRAW: "TransactionType.withdraw",
//   BUY_IN:   "TransactionType.buy_in"
// };

// const TransactionStatus = {
//   SUCCESS: "TransactionStatus.success",
//   FAILED:  "TransactionStatus.failed",
//   PENDING: "TransactionStatus.pending",
// };

// const PaymentStatus = {
//   SUCCESS:  "Payment.success",
//   FAILED:   "Payment.failed",
//   PENDING:  "Payment.pending",
//   PINERROR: "Payment.pinError"
// };

// const PaymentMethod = {
//   MOBILE_MONEY:    "PaymentMethod.mobile_money",
//   PRIVATE_ACCOUNT: "PaymentMethod.private_account",
//   BANK_TRANSFER:   "PaymentMethod.bank_transfer",
//   USSD:            "PaymentMethod.ussd",
//   E_NAIRA:         "PaymentMethod.e_naira",
//   DIRECT_DEBIT:    "PaymentMethod.direct_debit",
//   OPAY:            "PaymentMethod.opay"
// };

// const PaymentCompletion = {
//   NONE:        "PaymentCompletion.none",
//   REDIRECT:    "PaymentCompletion.redirect",
//   BANKTRANSFER:"PaymentCompletion.banktransfer",
//   USSD:        "PaymentCompletion.ussd"
// };

// const PaymentEvent = {
//   CHARGE:   "PaymentEvent.charge",
//   TRANSFER: "PaymentEvent.transfer",
//   GENERAL:  "PaymentEvent.general",
//   ERROR:    "PaymentEvent.error"
// };

// // VAT rate applied on top of Flutterwave fees.
// const FW_VAT_RATE = 0.075; // 7.5%

// // FIX #1: CREDIT_RETRY_TIMEOUT_SECONDS was never declared.
// // scheduleCreditRetryDrop referenced this constant at runtime, causing a
// // ReferenceError that the surrounding try/catch silently swallowed —
// // meaning the 24-hour safety-net scheduler drop was NEVER actually armed.
// const CREDIT_RETRY_TIMEOUT_SECONDS = 24 * 60 * 60; // 24 hours

// // =============================================================================
// //  GENERAL UTILITIES
// // =============================================================================

// const generateTransactionOrderId = () => 'order-' + Date.now();

// const validateFields = (obj, fields) => fields.every(field => obj?.[field]);

// const validateTransferData = (data, fields = []) => {
//   const profile = data.transfer_profile || {};
//   return fields.every(field => data[field] || profile[field]);
// };

// const validateCommonTransferFields = (data) =>
//   validateTransferData(data, ["transfer_currency", "transfer_amount", "transfer_reference", "transfer_profile", "transfer_time_out"]);

// const retryRpc = async (fn, attempts = 3, delay = 300) => {
//   for (let i = 0; i < attempts; i++) {
//     const { data, error } = await fn();
//     if (!error) return { data, error };
//     console.warn(`RPC retry ${i + 1} failed:`, error.message || error);
//     if (i < attempts - 1) await new Promise(res => setTimeout(res, delay * (i + 1)));
//   }
//   return { data: null, error: { message: "RPC retries failed" } };
// };

// const failedStatusedTransaction = async (data, event) => {
//   const param = {
//     id: null,
//     event,
//     amount: data.transfer_amount,
//     currency: data.transfer_currency,
//     status: 'FAILED',
//     reference: data.transfer_reference,
//     service: 'FLUTTERWAVE'
//   };

//   const transactionData = data.transaction_details;
//   const { data: save, error: saveError } = await supabase.rpc("update_user_payment", param);
//   if (saveError) console.error("Error saving failed transaction:", saveError);

//   if (!save) return transactionData;

//   transactionData.transaction_sender_status   = save.transaction_sender_status;
//   transactionData.transaction_receiver_status = save.transaction_receiver_status;
//   return transactionData;
// };

// function errorResponse(error, code = 500, status = PaymentStatus.FAILED, transactionData) {
//   console.log("Error:", error);
//   return {
//     statusCode: code,
//     body: JSON.stringify({ status, error, transaction_details: transactionData })
//   };
// }

// async function scheduleTimeOut(data, event) {
//   try {
//     if (!data) return;
//     const { transfer_currency, transfer_amount, transfer_reference, transfer_time_out } = data;
//     const executionDate = new Date(Date.now() + (transfer_time_out * 1000));
//     const executionTime = executionDate.toISOString().slice(0, 19);
//     const scheduleName  = `${transfer_reference}-${Date.now()}`;

//     const scheduleParams = new CreateScheduleCommand({
//       Name: scheduleName,
//       FlexibleTimeWindow: { Mode: "OFF" },
//       GroupName: "transaction_scheduler",
//       State: "ENABLED",
//       Target: {
//         Arn:    process.env.TARGET_LAMBDA_ARN,
//         RoleArn:process.env.EVENTBRIDGE_ROLE_ARN,
//         Input: JSON.stringify({
//           body: {
//             id: null,
//             event,
//             amount:    transfer_amount,
//             currency:  transfer_currency,
//             status:    'FAILED',
//             reference: transfer_reference,
//             service:   'FLUTTERWAVE'
//           }
//         }),
//       },
//       ScheduleExpression:         `at(${executionTime})`,
//       ScheduleExpressionTimezone: "UTC",
//       ActionAfterCompletion:      "DELETE",
//     });

//     const scheduleResponse = await scheduler.send(scheduleParams);
//     console.log("Schedule created:", scheduleResponse);
//   } catch (err) {
//     console.error("Error scheduling job:", err);
//   }
// }

// // =============================================================================
// //  scheduleCreditRetryDrop
// // =============================================================================

// async function scheduleCreditRetryDrop(reference, amount, currency) {
//   try {
//     // FIX #1 (continued): now that CREDIT_RETRY_TIMEOUT_SECONDS is defined
//     // above, this arithmetic no longer throws a ReferenceError at runtime.
//     const executionDate = new Date(Date.now() + CREDIT_RETRY_TIMEOUT_SECONDS * 1000);
//     const executionTime = executionDate.toISOString().slice(0, 19);
//     const scheduleName  = `credit-retry-${reference}-${Date.now()}`;

//     const scheduleParams = new CreateScheduleCommand({
//       Name: scheduleName,
//       FlexibleTimeWindow: { Mode: "OFF" },
//       GroupName: "transaction_scheduler",
//       State: "ENABLED",
//       Target: {
//         Arn:    process.env.TARGET_LAMBDA_ARN,
//         RoleArn:process.env.EVENTBRIDGE_ROLE_ARN,
//         Input: JSON.stringify({
//           body: {
//             event:     'credit_retry',
//             reference,
//             amount,
//             currency,
//             status:    'FAILED',
//             service:   'SYSTEM'
//           }
//         }),
//       },
//       ScheduleExpression:         `at(${executionTime})`,
//       ScheduleExpressionTimezone: "UTC",
//       ActionAfterCompletion:      "DELETE",
//     });

//     const res = await scheduler.send(scheduleParams);
//     console.log("Credit retry drop scheduled:", scheduleName, res);
//   } catch (err) {
//     console.error("scheduleCreditRetryDrop failed:", err);
//   }
// }

// const mapToRpcParams = (body) => ({
//   p_country:            body.country,
//   p_locale:             body.locale,
//   p_gender:             body.gender,
//   p_age:                body.age,
//   p_user_id:            body.userId,
//   p_sender_profile_id:  body.senderProfileId,
//   p_receiver_profile_id:body.receiverProfileId,
//   p_payment_session_id: body.paymentSessionId,
//   p_type:               body.type,
//   p_amount:             body.amount
// });

// // =============================================================================
// //  FLUTTERWAVE API HELPERS
// // =============================================================================

// async function fetchFlutterwaveBalance(currency) {
//   try {
//     const res = await fetch(`https://api.flutterwave.com/v3/balances/${currency}`, {
//       headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}` }
//     });
//     if (!res.ok) throw new Error(`HTTP ${res.status}`);
//     const json = await res.json();
//     if (json.status !== 'success') throw new Error(json.message || 'FW balance API error');

//     const balance = parseFloat(json.data.available_balance);
//     console.log(`fetchFlutterwaveBalance: ${currency} → ${balance}`);
//     return balance;
//   } catch (err) {
//     console.error(`fetchFlutterwaveBalance failed for ${currency}:`, err.message);
//     return null;
//   }
// }

// async function fetchExactTransferFee(currency, amount, transferType) {
//   if (!transferType) {
//     console.warn('fetchExactTransferFee: no transfer type — skipping');
//     return null;
//   }
//   try {
//     const url = new URL('https://api.flutterwave.com/v3/transfers/fee');
//     url.searchParams.set('amount',   amount);
//     url.searchParams.set('currency', currency);
//     url.searchParams.set('type',     transferType);
//     const res = await fetch(url.toString(), {
//       headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}` }
//     });
//     if (!res.ok) throw new Error(`HTTP ${res.status}`);
//     const json = await res.json();
//     if (json.status !== 'success') throw new Error(json.message || 'FW transfer fee API error');
//     const entry = json.data?.[0];
//     if (!entry) throw new Error('No fee entry returned');
//     const fee = entry.fee_type === 'percentage'
//       ? parseFloat((parseFloat(entry.fee) * amount * (1 + FW_VAT_RATE)).toFixed(4))
//       : parseFloat((parseFloat(entry.fee) * (1 + FW_VAT_RATE)).toFixed(4));
//     console.log(`fetchExactTransferFee: ${currency} ${amount} via ${transferType} → ${fee}`);
//     return fee;
//   } catch (err) {
//     console.error('fetchExactTransferFee failed:', err.message);
//     return null;
//   }
// }

// async function checkWithdrawalBalance(walletId, totalNeeded, currency) {
//   const fwBalance = await fetchFlutterwaveBalance(currency);

//   const { data, error } = await supabase.rpc('check_wallet_balance_for_withdrawal', {
//     p_wallet_id:  walletId,
//     p_amount:     totalNeeded,
//     p_fw_balance: fwBalance ?? Number.MAX_SAFE_INTEGER
//   });

//   if (error) {
//     console.error('checkWithdrawalBalance RPC error:', error.message);
//     return { canProceed: false, reason: error.message, safeBalance: 0, netAvailable: 0, fwBalance };
//   }

//   return {
//     canProceed:   data.can_proceed,
//     reason:       data.reason ?? null,
//     safeBalance:  data.safe_balance,
//     netAvailable: data.net_available,
//     fwBalance,
//   };
// }

// // =============================================================================
// //  WITHDRAWAL BALANCE PRE-FLIGHT
// // =============================================================================

// async function resolveTransactionMethod(transactionId) {
//   const { data, error } = await supabase
//     .rpc('get_transaction_flutterwave_method', { p_transaction_id: transactionId });
//   if (error || !data) {
//     console.error('resolveTransactionMethod failed:', error?.message ?? 'no data returned');
//     return null;
//   }
//   return {
//     collectionMethod: data.collection_method,
//     transferType:     data.transfer_type,
//     methodChecker:    data.method_checker,
//     currency:         data.currency,
//     walletId:         data.wallet_id,
//   };
// }

// async function routeWithBalanceCheck(transactionData) {
//   const {
//     transfer_currency,
//     transfer_amount,
//     transfer_type,
//     transfer_reference,
//     transaction_details,
//   } = transactionData;

//   if (transfer_type === TransactionType.WITHDRAW) {
//     const transactionId = transaction_details?.transaction_id;

//     if (transactionId) {
//       const method = await resolveTransactionMethod(transactionId);

//       if (method?.transferType && method?.walletId) {
//         const fwFee = await fetchExactTransferFee(
//           transfer_currency,
//           transfer_amount,
//           method.transferType
//         );

//         const totalNeeded = transfer_amount + (fwFee ?? 0);
//         console.log(`Balance check: need ${totalNeeded} ${transfer_currency} (${transfer_amount} + ${fwFee ?? 0} FW fee)`);

//         const balanceCheck = await checkWithdrawalBalance(
//           method.walletId,
//           totalNeeded,
//           transfer_currency
//         );

//         console.log('Balance check result:', balanceCheck);

//         if (!balanceCheck.canProceed) {
//           const { data: txRow } = await supabase
//             .from('transaction_table')
//             .select('transaction_retry_status')
//             .eq('transaction_id', transactionId)
//             .single();

//           const alreadyRetrying = txRow?.transaction_retry_status === true;

//           if (!alreadyRetrying) {
//             await supabase.rpc('update_user_payment', {
//               id:        null,
//               event:     PaymentEvent.TRANSFER,
//               amount:    transfer_amount,
//               currency:  transfer_currency,
//               status:    'RETRY',
//               reference: transfer_reference,
//               service:   'SYSTEM'
//             });

//             await scheduleCreditRetryDrop(transfer_reference, transfer_amount, transfer_currency);
//             console.log('Credit retry armed for reference:', transfer_reference);
//           } else {
//             console.log('Credit retry still insufficient, scheduler still armed:', transfer_reference);
//           }

//           return {
//             statusCode: 200,
//             body: JSON.stringify({
//               status:              PaymentStatus.PENDING,
//               error:               balanceCheck.reason,
//               transaction_details: transaction_details
//             })
//           };
//         }

//         // FIX #3: Attach the resolved method onto transactionData so that
//         // downstream helpers (creditFlow or any future ledger write that reads
//         // _resolvedMethod) do not need to re-query the DB for the same row.
//         // Previously this was documented in a comment but never actually done,
//         // making the comment misleading and the optimisation dead code.
//         transactionData._resolvedMethod = method;
//       }
//     }
//   }

//   return await routeByCurrency(transfer_currency, transactionData);
// }

// // =============================================================================
// //  CREDIT RETRY HANDLER
// // =============================================================================

// async function handleCreditRetry(transactionId, hashKey) {
//   console.log('handleCreditRetry for:', transactionId);

//   const { data: retryData, error: retryError } = await supabase.rpc(
//     'get_transaction_for_credit_retry',
//     { p_transaction_id: transactionId, p_hash_key: hashKey }
//   );

//   if (retryError || !retryData) {
//     console.error('get_transaction_for_credit_retry rejected:', retryError?.message ?? 'null — hash mismatch or row not eligible');
//     return {
//       statusCode: 400,
//       body: JSON.stringify({
//         status:              PaymentStatus.FAILED,
//         error:               'Transaction not eligible for retry or invalid security key',
//         transaction_details: null
//       })
//     };
//   }

//   // FIX #2: The original code built a single-field stub:
//   //   transaction_details: { transaction_id: transactionId }
//   //
//   // When creditFlow (or any path through routeWithBalanceCheck) fails and
//   // calls failedStatusedTransaction, that function returns transaction_details
//   // directly as the error payload.  The client received a near-empty object
//   // with no status fields, which caused null-dereference crashes on the
//   // Flutter side when it tried to read transaction_sender_status /
//   // transaction_receiver_status.
//   //
//   // We now pre-populate the known fields from retryData so the client always
//   // receives a well-formed object even in the failure path.  The statuses are
//   // set to their current DB values (pending/pending); failedStatusedTransaction
//   // will overwrite them with 'failed' after update_user_payment succeeds.
//   const transactionData = {
//     transfer_amount:    retryData.transfer_amount,
//     transfer_currency:  retryData.transfer_currency,
//     transfer_reference: retryData.transfer_reference,
//     transfer_method:    retryData.transfer_method,
//     transfer_type:      retryData.transfer_type,
//     transfer_time_out:  retryData.transfer_time_out,
//     transfer_profile:   retryData.transfer_profile,
//     transaction_details: {
//       transaction_id:              transactionId,
//       // Pre-fill statuses with the current pending values so the client can
//       // render a meaningful state even if the update_user_payment RPC fails.
//       transaction_sender_status:   TransactionStatus.PENDING,
//       transaction_receiver_status: TransactionStatus.PENDING,
//       transaction_type:            retryData.transfer_type,
//     }
//   };

//   console.log('Credit retry reconstructed transactionData:', transactionData);
//   return await routeWithBalanceCheck(transactionData);
// }

// // =============================================================================
// //  HANDLER ENTRY POINT
// // =============================================================================

// export const handler = async (event) => {
//   try {
//     const body = JSON.parse(event.body);

//     // ── Retry path (from refresh_transaction or admin worker) ─────────────
//     if (body.transactionId && body.transactionSecuredHashKey) {
//       return await handleCreditRetry(body.transactionId, body.transactionSecuredHashKey);
//     }

//     // ── Fresh payment path ────────────────────────────────────────────────
//     if (!validateFields(body, REQUIRED_FIELDS)) {
//       return errorResponse("Missing required fields", 400);
//     }

//     console.log("Initiating transaction for user:", body.userId);

//     // PIN verification
//     try {
//       const pinCommand = new InvokeCommand({
//         FunctionName:   "verify_academix_pin",
//         InvocationType: "RequestResponse",
//         Payload: Buffer.from(JSON.stringify({
//           body: JSON.stringify({ userId: body.userId, pin: body.userPin })
//         })),
//       });

//       const response      = await lambda.send(pinCommand);
//       const payloadString = new TextDecoder().decode(response.Payload);
//       const pinResponse   = JSON.parse(payloadString);
//       const { success: pinResult, message, attempts_left, locked_until, not_set } = JSON.parse(pinResponse.body);

//       if (!pinResult) {
//         return {
//           statusCode: 400,
//           body: JSON.stringify({
//             status:              PaymentStatus.PINERROR,
//             error:               message,
//             transaction_details: null,
//             attempts_left,
//             locked_until,
//             not_set
//           }),
//         };
//       }
//     } catch (pinError) {
//       console.error("Pin verification error:", pinError);
//       return {
//         statusCode: 500,
//         body: JSON.stringify({ status: PaymentStatus.FAILED, error: pinError.message, transaction_details: null }),
//       };
//     }

//     // Create transaction in DB
//     const { data: transactionData, error: transactionError } = await retryRpc(() =>
//       supabase.rpc("handle_user_payment", mapToRpcParams(body))
//     );

//     if (transactionError || !transactionData) {
//       return errorResponse("Payment service unavailable. Please retry.", 502, PaymentStatus.FAILED);
//     }

//     const { status, error, transfer_currency = 'unknown' } = transactionData;
//     if (status !== PaymentStatus.SUCCESS) {
//       console.log("Transaction failed:", status);
//       return errorResponse(error || "Payment processing failed", 400, PaymentStatus.FAILED);
//     }

//     console.log("Routing transaction:", transfer_currency, transactionData.transfer_type);
//     return await routeWithBalanceCheck(transactionData);

//   } catch (e) {
//     return errorResponse(e.message || "Unexpected server error", 500);
//   }
// };

// // =============================================================================
// //  CURRENCY ROUTING
// // =============================================================================

// const routeByCurrency = async (currency, data) => {
//   const handlers = {
//     RWF: handleRWF,
//     ZMW: handleZMW,
//     XOF: handleFRANCO,
//     XAF: handleFRANCO,
//     NGN: handleNGN,
//     KES: handleKES,
//     GHS: handleGHS,
//     UGX: handleUGX,
//     TZS: handleTZS
//   };
//   const currencyHandler = handlers[currency];
//   if (!currencyHandler) {
//     const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.ERROR);
//     return errorResponse(`Unsupported currency: ${currency}`, 400, PaymentStatus.FAILED, failedTransaction);
//   }
//   return currencyHandler(data);
// };

// const handleRWF    = (data) => handleGenericMobileMoney(data, flw.MobileMoney.rwanda,      "RWF");
// const handleZMW    = (data) => handleGenericMobileMoney(data, flw.MobileMoney.zambia,      "ZMW");
// const handleFRANCO = (data) => handleGenericMobileMoney(data, flw.MobileMoney.franco_phone,"FRANCO");
// const handleKES    = (data) => handleGenericMobileMoney(data, flw.MobileMoney.mpesa,       "KES");
// const handleGHS    = (data) => handleGenericMobileMoney(data, flw.MobileMoney.ghana,       "GHS");
// const handleUGX    = (data) => handleGenericMobileMoney(data, flw.MobileMoney.uganda,      "UGX");
// const handleTZS    = (data) => handleGenericMobileMoney(data, flw.MobileMoney.tanzania,    "TZS");

// // =============================================================================
// //  GENERIC MOBILE MONEY
// // =============================================================================

// const handleGenericMobileMoney = async (data, flwMethod, label) => {
//   const { transfer_profile: profile, transfer_method, transfer_type } = data;

//   if (!validateCommonTransferFields(data)) {
//     const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.CHARGE);
//     return errorResponse(`Invalid ${label} payment data`, 400, PaymentStatus.FAILED, failedTransaction);
//   }

//   if ((transfer_type === TransactionType.TOP_UP || transfer_type === TransactionType.BUY_IN) && transfer_method === PaymentMethod.MOBILE_MONEY) {
//     return await debitMobileMoneyFlow(flwMethod, profile, data);
//   }

//   if (transfer_type === TransactionType.WITHDRAW && transfer_method === PaymentMethod.MOBILE_MONEY) {
//     return await creditFlow({
//       account_bank:    profile.network,
//       account_number:  profile.phone,
//       amount:          data.transfer_amount,
//       currency:        data.transfer_currency,
//       beneficiary_name:profile.fullname,
//       reference:       data.transfer_reference,
//       meta:            { ...DEFAULT_SENDER_META }
//     }, data);
//   }

//   const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.CHARGE);
//   return errorResponse(`Unsupported ${label} flow: ${transfer_type} / ${transfer_method}`, 400, PaymentStatus.FAILED, failedTransaction);
// };

// // =============================================================================
// //  DEBIT (top_up) + CREDIT (withdraw) FLOWS
// // =============================================================================

// const debitMobileMoneyFlow = async (flwMethod, profile, data) => {
//   const payload = {
//     phone_number: profile.phone,
//     amount:       data.transfer_amount,
//     fullname:     profile.fullname,
//     currency:     data.transfer_currency,
//     email:        profile.email,
//     tx_ref:       data.transfer_reference,
//     order_id:     generateTransactionOrderId(),
//     country:      profile.country
//   };

//   try {
//     const response = await flwMethod(payload);
//     const { status, message, meta } = response;
//     const { authorization } = meta || {};

//     if (status !== 'success') {
//       const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.CHARGE);
//       return errorResponse(message, 400, PaymentStatus.FAILED, failedTransaction);
//     }

//     await scheduleTimeOut(data, PaymentEvent.CHARGE);
//     return {
//       statusCode: 200,
//       body: JSON.stringify({
//         status:                  PaymentStatus.SUCCESS,
//         error:                   null,
//         payment_completion_mode: PaymentCompletion.REDIRECT,
//         payment_completion_data: { link: authorization?.redirect || authorization?.redirect_url },
//         transaction_details:     data.transaction_details
//       })
//     };
//   } catch (err) {
//     const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.CHARGE);
//     return errorResponse(err.message, 500, PaymentStatus.FAILED, failedTransaction);
//   }
// };

// /**
//  * creditFlow — initiates a Flutterwave transfer (withdraw payout).
//  *
//  * data._resolvedMethod is now reliably set by routeWithBalanceCheck (FIX #3),
//  * so any future ledger write can read it here without a second DB round-trip.
//  */
// const creditFlow = async (payload, data) => {
//   console.log("Credit flow");
//   try {
//     const response = await fetch(`${process.env.FLUTTERWAVE_PROXY_URL}/v3/transfers`, {
//       method:  'POST',
//       headers: {
//         Authorization:  `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
//         'Content-Type': 'application/json',
//         Host:           'api.flutterwave.com'
//       },
//       body: JSON.stringify(payload)
//     });

//     const statusCode = response.status;
//     const body       = await response.json();

//     if (statusCode !== 200 || body.status !== 'success') {
//       const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.TRANSFER);
//       return errorResponse(body.message || 'Transfer failed', 400, PaymentStatus.FAILED, failedTransaction);
//     }

//     return {
//       statusCode: 200,
//       body: JSON.stringify({
//         status:                  PaymentStatus.SUCCESS,
//         error:                   null,
//         payment_completion_mode: PaymentCompletion.NONE,
//         payment_completion_data: null,
//         transaction_details:     data.transaction_details
//       })
//     };
//   } catch (err) {
//     const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.TRANSFER);
//     return errorResponse(`Proxy request failed: ${err.message}`, 500, PaymentStatus.FAILED, failedTransaction);
//   }
// };

// // =============================================================================
// //  NGN HANDLERS
// // =============================================================================

// const handleNGN = async (data) => {
//   const { transfer_profile: profile, transfer_method, transfer_type } = data;

//   if (!validateCommonTransferFields(data)) {
//     const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.CHARGE);
//     return errorResponse("Invalid NGN transaction data", 400, PaymentStatus.FAILED, failedTransaction);
//   }

//   if ((transfer_type === TransactionType.TOP_UP || transfer_type === TransactionType.BUY_IN)) return await handleNGNTopUp(profile, data);
//   if (transfer_type === TransactionType.WITHDRAW)                                              return await handleNGNWithdrawal(profile, data);

//   const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.CHARGE);
//   return errorResponse(`Unsupported NGN flow: ${transfer_type} / ${transfer_method}`, 400, PaymentStatus.FAILED, failedTransaction);
// };

// const handleNGNTopUp = async (profile, data) => {
//   switch (data.transfer_method) {
//     case PaymentMethod.PRIVATE_ACCOUNT: return await handleNGNPrivateAccount(profile, data);
//     case PaymentMethod.USSD:            return await handleNGNUSSD(profile, data);
//     case PaymentMethod.DIRECT_DEBIT:    return await handleNGNDirectDebit(profile, data);
//     case PaymentMethod.E_NAIRA:         return await handleNGNeNaira(profile, data);
//     case PaymentMethod.OPAY:            return await handleNGNOpay(profile, data);
//     default: {
//       const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.CHARGE);
//       return errorResponse(`Unsupported NGN top-up method: ${data.transfer_method}`, 400, PaymentStatus.FAILED, failedTransaction);
//     }
//   }
// };

// const handleNGNUSSD = async (profile, data) => {
//   try {
//     const response = await flw.Charge.ussd({
//       tx_ref:       data.transfer_reference,
//       account_bank: profile.bank_code,
//       amount:       data.transfer_amount,
//       currency:     data.transfer_currency,
//       email:        profile.email,
//       phone_number: profile.phone,
//       fullname:     profile.fullname
//     });
//     const { status, message, meta } = response;
//     if (status !== 'success') {
//       const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.CHARGE);
//       return errorResponse(message, 400, PaymentStatus.FAILED, failedTransaction);
//     }
//     await scheduleTimeOut(data, PaymentEvent.CHARGE);
//     return {
//       statusCode: 200,
//       body: JSON.stringify({
//         status:                  PaymentStatus.SUCCESS,
//         error:                   null,
//         payment_completion_mode: PaymentCompletion.USSD,
//         payment_completion_data: { code: meta?.authorization?.note },
//         transaction_details:     data.transaction_details
//       })
//     };
//   } catch (err) {
//     const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.CHARGE);
//     return errorResponse(err.message, 500, PaymentStatus.FAILED, failedTransaction);
//   }
// };

// const handleNGNOpay = async (profile, data) => {
//   try {
//     const response = await fetch('https://api.flutterwave.com/v3/charges?type=opay', {
//       method:  'POST',
//       headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`, 'Content-Type': 'application/json' },
//       body: JSON.stringify({
//         tx_ref:       data.transfer_reference,
//         amount:       data.transfer_amount,
//         currency:     data.transfer_currency,
//         email:        profile.email,
//         phone_number: profile.phone,
//         fullname:     profile.fullname
//       })
//     });
//     const opayResponse = await response.json();
//     const { status, message, data: flutterwaveData } = opayResponse;
//     if (status !== 'success') {
//       const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.CHARGE);
//       return errorResponse(message, 400, PaymentStatus.FAILED, failedTransaction);
//     }
//     await scheduleTimeOut(data, PaymentEvent.CHARGE);
//     return {
//       statusCode: 200,
//       body: JSON.stringify({
//         status:                  PaymentStatus.SUCCESS,
//         error:                   null,
//         payment_completion_mode: PaymentCompletion.REDIRECT,
//         payment_completion_data: { link: flutterwaveData?.meta?.authorization?.redirect },
//         transaction_details:     data.transaction_details
//       })
//     };
//   } catch (err) {
//     const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.CHARGE);
//     return errorResponse(err.message, 500, PaymentStatus.FAILED, failedTransaction);
//   }
// };

// const handleNGNDirectDebit = async (profile, data) => {
//   try {
//     const response = await flw.Charge.ng({
//       tx_ref:       data.transfer_reference,
//       amount:       data.transfer_amount,
//       currency:     data.transfer_currency,
//       email:        profile.email,
//       phone_number: profile.phone,
//       fullname:     profile.fullname
//     });
//     const { status, message, data: flutterwaveData } = response;
//     if (status !== 'success') {
//       const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.CHARGE);
//       return errorResponse(message, 400, PaymentStatus.FAILED, failedTransaction);
//     }
//     await scheduleTimeOut(data, PaymentEvent.CHARGE);
//     return {
//       statusCode: 200,
//       body: JSON.stringify({
//         status:                  PaymentStatus.SUCCESS,
//         error:                   null,
//         payment_completion_mode: PaymentCompletion.REDIRECT,
//         payment_completion_data: { link: flutterwaveData?.meta?.authorization?.redirect },
//         transaction_details:     data.transaction_details
//       })
//     };
//   } catch (err) {
//     const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.CHARGE);
//     return errorResponse(err.message, 500, PaymentStatus.FAILED, failedTransaction);
//   }
// };

// const handleNGNeNaira = async (profile, data) => {
//   try {
//     const response = await flw.Charge.enaira({
//       tx_ref:       data.transfer_reference,
//       amount:       data.transfer_amount,
//       currency:     data.transfer_currency,
//       email:        profile.email,
//       fullname:     profile.fullname,
//       phone_number: profile.phone
//     });
//     const { status, message, data: flutterwaveData } = response;
//     if (status !== 'success') {
//       const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.CHARGE);
//       return errorResponse(message, 400, PaymentStatus.FAILED, failedTransaction);
//     }
//     await scheduleTimeOut(data, PaymentEvent.CHARGE);
//     return {
//       statusCode: 200,
//       body: JSON.stringify({
//         status:                  PaymentStatus.SUCCESS,
//         error:                   null,
//         payment_completion_mode: PaymentCompletion.REDIRECT,
//         payment_completion_data: { link: flutterwaveData?.meta?.authorization?.redirect },
//         transaction_details:     data.transaction_details
//       })
//     };
//   } catch (err) {
//     const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.CHARGE);
//     return errorResponse(err.message, 500, PaymentStatus.FAILED, failedTransaction);
//   }
// };

// function convertNigeriaTimeToUTC(nigeriaTimeStr) {
//   if (!nigeriaTimeStr) return null;
//   return moment.tz(nigeriaTimeStr, 'YYYY-MM-DD HH:mm:ss', 'Africa/Lagos')
//     .utc()
//     .format('YYYY-MM-DD HH:mm:ss');
// }

// const handleNGNPrivateAccount = async (profile, data) => {
//   try {
//     const response = await flw.Charge.bank_transfer({
//       phone_number: profile.phone,
//       amount:       data.transfer_amount,
//       fullname:     profile.fullname,
//       currency:     data.transfer_currency,
//       email:        profile.email,
//       tx_ref:       data.transfer_reference
//     });
//     const { status, message, meta } = response;
//     if (status !== 'success') {
//       const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.CHARGE);
//       return errorResponse(message, 400, PaymentStatus.FAILED, failedTransaction);
//     }
//     await scheduleTimeOut(data, PaymentEvent.CHARGE);
//     return {
//       statusCode: 200,
//       body: JSON.stringify({
//         status:                  PaymentStatus.SUCCESS,
//         error:                   null,
//         payment_completion_mode: PaymentCompletion.BANKTRANSFER,
//         payment_completion_data: {
//           bank:      meta?.authorization?.transfer_bank,
//           account:   meta?.authorization?.transfer_account,
//           reference: meta?.authorization?.transfer_reference,
//           note:      meta?.authorization?.transfer_note,
//           amount:    meta?.authorization?.transfer_amount,
//           expire:    convertNigeriaTimeToUTC(meta?.authorization?.account_expiration)
//         },
//         transaction_details: data.transaction_details
//       })
//     };
//   } catch (err) {
//     const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.CHARGE);
//     return errorResponse(err.message, 500, PaymentStatus.FAILED, failedTransaction);
//   }
// };

// const handleNGNWithdrawal = async (profile, data) => {
//   if (data.transfer_method === PaymentMethod.BANK_TRANSFER) {
//     return await creditFlow({
//       account_bank:    profile.bank_code,
//       account_number:  profile.account_number,
//       amount:          data.transfer_amount,
//       narration:       `Withdrawal to ${profile.fullname}`,
//       currency:        data.transfer_currency,
//       reference:       data.transfer_reference,
//       debit_currency:  data.transfer_currency
//     }, data);
//   }
//   const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.TRANSFER);
//   return errorResponse(`Unsupported NGN withdrawal method: ${data.transfer_method}`, 400, PaymentStatus.FAILED, failedTransaction);
// };

// =============================================================================
//  make_payment.js
//  Payment initiation Lambda.
//
//  Float alert path:
//    check_wallet_balance_for_withdrawal (RPC) stamps alert_fired = TRUE
//    in Postgres (with 1h cooldown) when effective_float < float_minimum.
//    make_payment then drops a lightweight message to SQS (fire-and-forget).
//    float_alert_worker picks it up and publishes the SNS email.
//    The payment response path never awaits SNS directly.
// =============================================================================

import { SchedulerClient, CreateScheduleCommand } from "@aws-sdk/client-scheduler";
import { createClient } from "@supabase/supabase-js";
import Flutterwave from "flutterwave-node-v3";
import fetch from "node-fetch";
import moment from "moment-timezone";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

// ---------------------------------------------------------------------------
//  Environment guard
// ---------------------------------------------------------------------------

[
  "FLUTTERWAVE_PUBLIC_KEY",
  "FLUTTERWAVE_SECRET_KEY",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "FLUTTERWAVE_PROXY_URL",
  "FLOAT_ALERT_SQS_URL",   // SQS queue URL — float_alert_worker consumes this
].forEach((key) => {
  if (!process.env[key]) throw new Error(`Missing environment variable: ${key}`);
});

// ---------------------------------------------------------------------------
//  Clients
// ---------------------------------------------------------------------------

const supabase  = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const flw = new Flutterwave(
  process.env.FLUTTERWAVE_PUBLIC_KEY,
  process.env.FLUTTERWAVE_SECRET_KEY,
  { baseUrl: process.env.FLUTTERWAVE_PROXY_URL }
);
const scheduler = new SchedulerClient({});
const lambda    = new LambdaClient({});
const sqs       = new SQSClient({ region: 'eu-north-1' });

// ---------------------------------------------------------------------------
//  Constants
// ---------------------------------------------------------------------------

const DEFAULT_SENDER_META = {
  sender:         "Jimstech Innovations",
  sender_country: "NG",
  mobile_number:  "2348080733030",
};

const REQUIRED_FIELDS = [
  "userId", "locale", "age", "gender", "country",
  "senderProfileId", "receiverProfileId", "amount",
  "type", "paymentSessionId",
];

const TransactionType = {
  TOP_UP:   "TransactionType.top_up",
  WITHDRAW: "TransactionType.withdraw",
  BUY_IN:   "TransactionType.buy_in",
};

const TransactionStatus = {
  SUCCESS: "TransactionStatus.success",
  FAILED:  "TransactionStatus.failed",
  PENDING: "TransactionStatus.pending",
};

const PaymentStatus = {
  SUCCESS:  "Payment.success",
  FAILED:   "Payment.failed",
  PENDING:  "Payment.pending",
  PINERROR: "Payment.pinError",
};

const PaymentMethod = {
  MOBILE_MONEY:    "PaymentMethod.mobile_money",
  PRIVATE_ACCOUNT: "PaymentMethod.private_account",
  BANK_TRANSFER:   "PaymentMethod.bank_transfer",
  USSD:            "PaymentMethod.ussd",
  E_NAIRA:         "PaymentMethod.e_naira",
  DIRECT_DEBIT:    "PaymentMethod.direct_debit",
  OPAY:            "PaymentMethod.opay",
};

const PaymentCompletion = {
  NONE:         "PaymentCompletion.none",
  REDIRECT:     "PaymentCompletion.redirect",
  BANKTRANSFER: "PaymentCompletion.banktransfer",
  USSD:         "PaymentCompletion.ussd",
};

const PaymentEvent = {
  CHARGE:   "PaymentEvent.charge",
  TRANSFER: "PaymentEvent.transfer",
  GENERAL:  "PaymentEvent.general",
  ERROR:    "PaymentEvent.error",
};

const FW_VAT_RATE = 0.075;

// ---------------------------------------------------------------------------
//  General utilities
// ---------------------------------------------------------------------------

const generateTransactionOrderId = () => "order-" + Date.now();

const validateFields = (obj, fields) => fields.every((f) => obj?.[f]);

const validateTransferData = (data, fields = []) => {
  const profile = data.transfer_profile || {};
  return fields.every((f) => data[f] || profile[f]);
};

const validateCommonTransferFields = (data) =>
  validateTransferData(data, [
    "transfer_currency",
    "transfer_amount",
    "transfer_reference",
    "transfer_profile",
    "transfer_time_out",
  ]);

const retryRpc = async (fn, attempts = 3, delay = 300) => {
  for (let i = 0; i < attempts; i++) {
    const { data, error } = await fn();
    if (!error) return { data, error };
    console.warn(`RPC retry ${i + 1} failed:`, error.message || error);
    if (i < attempts - 1)
      await new Promise((res) => setTimeout(res, delay * (i + 1)));
  }
  return { data: null, error: { message: "RPC retries exhausted" } };
};

const failedStatusedTransaction = async (data, event) => {
  const param = {
    id:        null,
    event,
    amount:    data.transfer_amount,
    currency:  data.transfer_currency,
    status:    "FAILED",
    reference: data.transfer_reference,
    service:   "FLUTTERWAVE",
  };

  const transactionData = { ...data.transaction_details };
  const { data: save, error: saveError } = await supabase.rpc(
    "update_user_payment",
    param
  );
  if (saveError) console.error("Error saving failed transaction:", saveError);

  if (!save) return transactionData;

  transactionData.transaction_sender_status   = save.transaction_sender_status;
  transactionData.transaction_receiver_status = save.transaction_receiver_status;
  return transactionData;
};

function errorResponse(error, code = 500, status = PaymentStatus.FAILED, transactionData) {
  console.log("Error:", error);
  return {
    statusCode: code,
    body: JSON.stringify({ status, error, transaction_details: transactionData }),
  };
}

async function scheduleTimeOut(data, event) {
  try {
    if (!data) return;
    const { transfer_currency, transfer_amount, transfer_reference, transfer_time_out } = data;

    const executionDate = new Date(Date.now() + transfer_time_out * 1000);
    const executionTime = executionDate.toISOString().slice(0, 19);
    const scheduleName  = `${transfer_reference}-${Date.now()}`;

    await scheduler.send(
      new CreateScheduleCommand({
        Name:               scheduleName,
        FlexibleTimeWindow: { Mode: "OFF" },
        GroupName:          "transaction_scheduler",
        State:              "ENABLED",
        Target: {
          Arn:     process.env.TARGET_LAMBDA_ARN,
          RoleArn: process.env.EVENTBRIDGE_ROLE_ARN,
          Input: JSON.stringify({
            body: {
              id:        null,
              event,
              amount:    transfer_amount,
              currency:  transfer_currency,
              status:    "FAILED",
              reference: transfer_reference,
              service:   "FLUTTERWAVE",
            },
          }),
        },
        ScheduleExpression:         `at(${executionTime})`,
        ScheduleExpressionTimezone: "UTC",
        ActionAfterCompletion:      "DELETE",
      })
    );
  } catch (err) {
    console.error("scheduleTimeOut failed:", err);
  }
}

// ---------------------------------------------------------------------------
//  scheduleCreditRetryDrop
//  Uses corridor-specific settlement hours from wallet_settlement_hours so
//  the drop fires after the actual FW settlement cycle, not a hard-coded 24h.
// ---------------------------------------------------------------------------

async function scheduleCreditRetryDrop(reference, amount, currency, settlementHours = 24) {
  try {
    const timeoutSeconds = settlementHours * 60 * 60;
    const executionDate  = new Date(Date.now() + timeoutSeconds * 1000);
    const executionTime  = executionDate.toISOString().slice(0, 19);
    const scheduleName   = `credit-retry-${reference}-${Date.now()}`;

    console.log(
      `scheduleCreditRetryDrop: ${currency} settlementHours=${settlementHours}, fires at ${executionTime}`
    );

    await scheduler.send(
      new CreateScheduleCommand({
        Name:               scheduleName,
        FlexibleTimeWindow: { Mode: "OFF" },
        GroupName:          "transaction_scheduler",
        State:              "ENABLED",
        Target: {
          Arn:     process.env.TARGET_LAMBDA_ARN,
          RoleArn: process.env.EVENTBRIDGE_ROLE_ARN,
          Input: JSON.stringify({
            body: {
              event:     "credit_retry",
              reference,
              amount,
              currency,
              status:    "FAILED",
              service:   "SYSTEM",
            },
          }),
        },
        ScheduleExpression:         `at(${executionTime})`,
        ScheduleExpressionTimezone: "UTC",
        ActionAfterCompletion:      "DELETE",
      })
    );

    console.log("Credit retry drop scheduled:", scheduleName);
  } catch (err) {
    console.error("scheduleCreditRetryDrop failed:", err);
  }
}

// ---------------------------------------------------------------------------
//  enqueueFloatAlert
//
//  Fire-and-forget: drops a message to SQS and returns immediately.
//  The payment response path never blocks on this.
//  float_alert_worker.js consumes the queue and publishes the SNS email.
//
//  The DB cooldown (1h) is enforced in check_wallet_balance_for_withdrawal,
//  so alert_fired is already rate-limited before we even reach here.
// ---------------------------------------------------------------------------

async function enqueueFloatAlert({
  currency,
  walletId,
  effectiveFloat,
  floatMinimum,
  floatTarget,
  fwBalance,
  netPendingOut,
}) {
  try {
    await sqs.send(
      new SendMessageCommand({
        QueueUrl:    process.env.FLOAT_ALERT_SQS_URL,
        MessageBody: JSON.stringify({
          type:          "float_alert",
          currency,
          walletId,
          effectiveFloat,
          floatMinimum,
          floatTarget,
          fwBalance,
          netPendingOut,
          enqueuedAt:    new Date().toISOString(),
        }),
        // Group by walletId so alerts for the same wallet stay ordered.
        // Only relevant if queue is FIFO — safe to omit for standard queues.
        // MessageGroupId: walletId,
      })
    );
    console.log(`Float alert enqueued for ${currency} wallet ${walletId}`);
  } catch (err) {
    // Non-fatal. The retry queue is already armed; a dropped alert message
    // is operationally recoverable.
    console.error("enqueueFloatAlert failed:", err.message);
  }
}

// ---------------------------------------------------------------------------
//  Flutterwave helpers
// ---------------------------------------------------------------------------

async function fetchFlutterwaveBalance(currency) {
  try {
    const res = await fetch(`https://api.flutterwave.com/v3/balances/${currency}`, {
      headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.status !== "success") throw new Error(json.message || "FW balance API error");

    const balance = parseFloat(json.data.available_balance);
    console.log(`fetchFlutterwaveBalance: ${currency} → ${balance}`);
    return balance;
  } catch (err) {
    console.error(`fetchFlutterwaveBalance failed for ${currency}:`, err.message);
    return null;
  }
}

async function fetchExactTransferFee(currency, amount, transferType) {
  if (!transferType) {
    console.warn("fetchExactTransferFee: no transfer type — skipping");
    return null;
  }
  try {
    const url = new URL("https://api.flutterwave.com/v3/transfers/fee");
    url.searchParams.set("amount",   amount);
    url.searchParams.set("currency", currency);
    url.searchParams.set("type",     transferType);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.status !== "success") throw new Error(json.message || "FW transfer fee error");

    const entry = json.data?.[0];
    if (!entry) throw new Error("No fee entry returned");

    const fee =
      entry.fee_type === "percentage"
        ? parseFloat((parseFloat(entry.fee) * amount * (1 + FW_VAT_RATE)).toFixed(4))
        : parseFloat((parseFloat(entry.fee) * (1 + FW_VAT_RATE)).toFixed(4));

    console.log(`fetchExactTransferFee: ${currency} ${amount} via ${transferType} → ${fee}`);
    return fee;
  } catch (err) {
    console.error("fetchExactTransferFee failed:", err.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
//  checkWithdrawalBalance
//  Calls the Postgres RPC which reads float thresholds from wallet_balance_table
//  (co-located with live state) and settlement_hours from payment_wallet_table.
// ---------------------------------------------------------------------------

async function checkWithdrawalBalance(walletId, totalNeeded, currency) {
  const fwBalance = await fetchFlutterwaveBalance(currency);

  const { data, error } = await supabase.rpc("check_wallet_balance_for_withdrawal", {
    p_wallet_id:  walletId,
    p_amount:     totalNeeded,
    p_fw_balance: fwBalance ?? Number.MAX_SAFE_INTEGER,
  });

  if (error) {
    console.error("checkWithdrawalBalance RPC error:", error.message);
    return {
      canProceed:      false,
      reason:          error.message,
      safeBalance:     0,
      netAvailable:    0,
      fwBalance:       fwBalance ?? 0,
      settlementHours: 24,
      replenishNeeded: false,
      alertFired:      false,
      effectiveFloat:  0,
      netPendingOut:   0,
      floatMinimum:    0,
      floatTarget:     0,
    };
  }

  return {
    canProceed:      data.can_proceed,
    reason:          data.reason           ?? null,
    safeBalance:     data.safe_balance,
    netAvailable:    data.net_available,
    fwBalance:       fwBalance             ?? 0,
    settlementHours: data.settlement_hours  ?? 24,
    replenishNeeded: data.replenish_needed  ?? false,
    alertFired:      data.alert_fired       ?? false,
    effectiveFloat:  data.effective_float   ?? 0,
    netPendingOut:   data.net_pending_out   ?? 0,
    floatMinimum:    data.float_minimum     ?? 0,
    floatTarget:     data.float_target      ?? 0,
  };
}

// ---------------------------------------------------------------------------
//  resolveTransactionMethod
// ---------------------------------------------------------------------------

async function resolveTransactionMethod(transactionId) {
  const { data, error } = await supabase.rpc(
    "get_transaction_flutterwave_method",
    { p_transaction_id: transactionId }
  );
  if (error || !data) {
    console.error(
      "resolveTransactionMethod failed:",
      error?.message ?? "no data returned"
    );
    return null;
  }
  return {
    collectionMethod: data.collection_method,
    transferType:     data.transfer_type,
    methodChecker:    data.method_checker,
    currency:         data.currency,
    walletId:         data.wallet_id,
  };
}

// ---------------------------------------------------------------------------
//  routeWithBalanceCheck
//  For withdrawals: checks FW balance, handles float alert and retry queuing.
//  For all transaction types: delegates to routeByCurrency.
// ---------------------------------------------------------------------------

async function routeWithBalanceCheck(transactionData) {
  const {
    transfer_currency,
    transfer_amount,
    transfer_type,
    transfer_reference,
    transaction_details,
  } = transactionData;

  if (transfer_type === TransactionType.WITHDRAW) {
    const transactionId = transaction_details?.transaction_id;

    if (transactionId) {
      const method = await resolveTransactionMethod(transactionId);

      if (method?.transferType && method?.walletId) {
        const fwFee = await fetchExactTransferFee(
          transfer_currency,
          transfer_amount,
          method.transferType
        );

        const totalNeeded = transfer_amount + (fwFee ?? 0);
        console.log(
          `Balance check: need ${totalNeeded} ${transfer_currency}`,
          `(${transfer_amount} + ${fwFee ?? 0} FW fee)`
        );

        const balanceCheck = await checkWithdrawalBalance(
          method.walletId,
          totalNeeded,
          transfer_currency
        );

        console.log("Balance check result:", balanceCheck);

        // -- Enqueue float alert (fire-and-forget, never awaited on the hot path)
        if (balanceCheck.alertFired) {
          // Do not await — drop to SQS and continue immediately
          enqueueFloatAlert({
            currency:       transfer_currency,
            walletId:       method.walletId,
            effectiveFloat: balanceCheck.effectiveFloat,
            floatMinimum:   balanceCheck.floatMinimum,
            floatTarget:    balanceCheck.floatTarget,
            fwBalance:      balanceCheck.fwBalance,
            netPendingOut:  balanceCheck.netPendingOut,
          });
        }

        if (!balanceCheck.canProceed) {
          const { data: txRow } = await supabase
            .from("transaction_table")
            .select("transaction_retry_status")
            .eq("transaction_id", transactionId)
            .single();

          const alreadyRetrying = txRow?.transaction_retry_status === true;

          if (!alreadyRetrying) {
            await supabase.rpc("update_user_payment", {
              id:        null,
              event:     PaymentEvent.TRANSFER,
              amount:    transfer_amount,
              currency:  transfer_currency,
              status:    "RETRY",
              reference: transfer_reference,
              service:   "SYSTEM",
            });

            // Drop scheduled using actual corridor settlement hours
            await scheduleCreditRetryDrop(
              transfer_reference,
              transfer_amount,
              transfer_currency,
              balanceCheck.settlementHours
            );

            console.log(
              `Credit retry armed for ${transfer_reference},`,
              `drop in ${balanceCheck.settlementHours}h`
            );
          } else {
            console.log("Already retrying, scheduler still armed:", transfer_reference);
          }

          return {
            statusCode: 200,
            body: JSON.stringify({
              status:              PaymentStatus.PENDING,
              error:               balanceCheck.reason,
              transaction_details: transaction_details,
              pending_reason:      "queued",
            }),
          };
        }

        // Balance sufficient — attach resolved method for creditFlow
        transactionData._resolvedMethod = method;
      }
    }
  }

  return await routeByCurrency(transfer_currency, transactionData);
}

// ---------------------------------------------------------------------------
//  Credit retry handler
// ---------------------------------------------------------------------------

async function handleCreditRetry(transactionId, hashKey) {
  console.log("handleCreditRetry for:", transactionId);

  const { data: retryData, error: retryError } = await supabase.rpc(
    "get_transaction_for_credit_retry",
    { p_transaction_id: transactionId, p_hash_key: hashKey }
  );

  if (retryError || !retryData) {
    console.error(
      "get_transaction_for_credit_retry rejected:",
      retryError?.message ?? "null — hash mismatch or row not eligible"
    );
    return {
      statusCode: 400,
      body: JSON.stringify({
        status:              PaymentStatus.FAILED,
        error:               "Transaction not eligible for retry or invalid security key",
        transaction_details: null,
      }),
    };
  }

  if (retryData.error) {
    const msgs = { 1: "Transaction not eligible for retry", 2: "Invalid security key" };
    return {
      statusCode: 400,
      body: JSON.stringify({
        status:              PaymentStatus.FAILED,
        error:               msgs[retryData.error] ?? "Retry rejected",
        transaction_details: null,
      }),
    };
  }

  const transactionData = {
    transfer_amount:     retryData.transfer_amount,
    transfer_currency:   retryData.transfer_currency,
    transfer_reference:  retryData.transfer_reference,
    transfer_method:     retryData.transfer_method,
    transfer_type:       retryData.transfer_type,
    transfer_time_out:   retryData.transfer_time_out,
    transfer_profile:    retryData.transfer_profile,
    transaction_details: {
      transaction_id:              transactionId,
      transaction_sender_status:   TransactionStatus.PENDING,
      transaction_receiver_status: TransactionStatus.PENDING,
      transaction_type:            retryData.transfer_type,
    },
  };

  return await routeWithBalanceCheck(transactionData);
}

// ---------------------------------------------------------------------------
//  Handler entry point
// ---------------------------------------------------------------------------

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body);

    // Retry path
    if (body.transactionId && body.transactionSecuredHashKey) {
      return await handleCreditRetry(
        body.transactionId,
        body.transactionSecuredHashKey
      );
    }

    // Fresh payment path
    if (!validateFields(body, REQUIRED_FIELDS)) {
      return errorResponse("Missing required fields", 400);
    }

    console.log("Initiating transaction for user:", body.userId);

    // PIN verification
    try {
      const pinCommand = new InvokeCommand({
        FunctionName:   "verify_academix_pin",
        InvocationType: "RequestResponse",
        Payload: Buffer.from(
          JSON.stringify({
            body: JSON.stringify({ userId: body.userId, pin: body.userPin }),
          })
        ),
      });

      const response      = await lambda.send(pinCommand);
      const payloadString = new TextDecoder().decode(response.Payload);
      const pinResponse   = JSON.parse(payloadString);
      const {
        success: pinResult,
        message,
        attempts_left,
        locked_until,
        not_set,
      } = JSON.parse(pinResponse.body);

      if (!pinResult) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            status:              PaymentStatus.PINERROR,
            error:               message,
            transaction_details: null,
            attempts_left,
            locked_until,
            not_set,
          }),
        };
      }
    } catch (pinError) {
      console.error("Pin verification error:", pinError);
      return {
        statusCode: 500,
        body: JSON.stringify({
          status:              PaymentStatus.FAILED,
          error:               pinError.message,
          transaction_details: null,
        }),
      };
    }

    // Create transaction in DB
    const { data: transactionData, error: transactionError } = await retryRpc(() =>
      supabase.rpc("handle_user_payment", {
        p_country:             body.country,
        p_locale:              body.locale,
        p_gender:              body.gender,
        p_age:                 body.age,
        p_user_id:             body.userId,
        p_sender_profile_id:   body.senderProfileId,
        p_receiver_profile_id: body.receiverProfileId,
        p_payment_session_id:  body.paymentSessionId,
        p_type:                body.type,
        p_amount:              body.amount,
      })
    );

    if (transactionError || !transactionData) {
      return errorResponse(
        "Payment service unavailable. Please retry.",
        502,
        PaymentStatus.FAILED
      );
    }

    const { status, error, transfer_currency = "unknown" } = transactionData;
    if (status !== PaymentStatus.SUCCESS) {
      return errorResponse(error || "Payment processing failed", 400, PaymentStatus.FAILED);
    }

    console.log("Routing transaction:", transfer_currency, transactionData.transfer_type);
    return await routeWithBalanceCheck(transactionData);
  } catch (e) {
    return errorResponse(e.message || "Unexpected server error", 500);
  }
};

// ---------------------------------------------------------------------------
//  Currency routing
// ---------------------------------------------------------------------------

const routeByCurrency = async (currency, data) => {
  const handlers = {
    RWF: handleRWF,
    ZMW: handleZMW,
    XOF: handleFRANCO,
    XAF: handleFRANCO,
    NGN: handleNGN,
    KES: handleKES,
    GHS: handleGHS,
    UGX: handleUGX,
    TZS: handleTZS,
  };

  const currencyHandler = handlers[currency];
  if (!currencyHandler) {
    const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.ERROR);
    return errorResponse(
      `Unsupported currency: ${currency}`,
      400,
      PaymentStatus.FAILED,
      failedTransaction
    );
  }
  return currencyHandler(data);
};

const handleRWF    = (data) => handleGenericMobileMoney(data, flw.MobileMoney.rwanda,       "RWF");
const handleZMW    = (data) => handleGenericMobileMoney(data, flw.MobileMoney.zambia,       "ZMW");
const handleFRANCO = (data) => handleGenericMobileMoney(data, flw.MobileMoney.franco_phone, "FRANCO");
const handleKES    = (data) => handleGenericMobileMoney(data, flw.MobileMoney.mpesa,        "KES");
const handleGHS    = (data) => handleGenericMobileMoney(data, flw.MobileMoney.ghana,        "GHS");
const handleUGX    = (data) => handleGenericMobileMoney(data, flw.MobileMoney.uganda,       "UGX");
const handleTZS    = (data) => handleGenericMobileMoney(data, flw.MobileMoney.tanzania,     "TZS");

// ---------------------------------------------------------------------------
//  Generic mobile money
// ---------------------------------------------------------------------------

const handleGenericMobileMoney = async (data, flwMethod, label) => {
  const { transfer_profile: profile, transfer_method, transfer_type } = data;

  if (!validateCommonTransferFields(data)) {
    const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.CHARGE);
    return errorResponse(
      `Invalid ${label} payment data`,
      400,
      PaymentStatus.FAILED,
      failedTransaction
    );
  }

  if (
    (transfer_type === TransactionType.TOP_UP ||
      transfer_type === TransactionType.BUY_IN) &&
    transfer_method === PaymentMethod.MOBILE_MONEY
  ) {
    return await debitMobileMoneyFlow(flwMethod, profile, data);
  }

  if (
    transfer_type === TransactionType.WITHDRAW &&
    transfer_method === PaymentMethod.MOBILE_MONEY
  ) {
    return await creditFlow(
      {
        account_bank:     profile.network,
        account_number:   profile.phone,
        amount:           data.transfer_amount,
        currency:         data.transfer_currency,
        beneficiary_name: profile.fullname,
        reference:        data.transfer_reference,
        meta:             { ...DEFAULT_SENDER_META },
      },
      data
    );
  }

  const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.CHARGE);
  return errorResponse(
    `Unsupported ${label} flow: ${transfer_type} / ${transfer_method}`,
    400,
    PaymentStatus.FAILED,
    failedTransaction
  );
};

// ---------------------------------------------------------------------------
//  Debit flow (top_up / buy_in)
// ---------------------------------------------------------------------------

const debitMobileMoneyFlow = async (flwMethod, profile, data) => {
  const payload = {
    phone_number: profile.phone,
    amount:       data.transfer_amount,
    fullname:     profile.fullname,
    currency:     data.transfer_currency,
    email:        profile.email,
    tx_ref:       data.transfer_reference,
    order_id:     generateTransactionOrderId(),
    country:      profile.country,
  };

  try {
    const response = await flwMethod(payload);
    const { status, message, meta } = response;
    const { authorization } = meta || {};

    if (status !== "success") {
      const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.CHARGE);
      return errorResponse(message, 400, PaymentStatus.FAILED, failedTransaction);
    }

    await scheduleTimeOut(data, PaymentEvent.CHARGE);
    return {
      statusCode: 200,
      body: JSON.stringify({
        status:                  PaymentStatus.SUCCESS,
        error:                   null,
        payment_completion_mode: PaymentCompletion.REDIRECT,
        payment_completion_data: {
          link: authorization?.redirect || authorization?.redirect_url,
        },
        transaction_details: data.transaction_details,
      }),
    };
  } catch (err) {
    const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.CHARGE);
    return errorResponse(err.message, 500, PaymentStatus.FAILED, failedTransaction);
  }
};

// ---------------------------------------------------------------------------
//  Credit flow (withdraw) — proxied to avoid FW IP restrictions
// ---------------------------------------------------------------------------

const creditFlow = async (payload, data) => {
  console.log("Credit flow");
  try {
    const response = await fetch(`${process.env.FLUTTERWAVE_PROXY_URL}/v3/transfers`, {
      method:  "POST",
      headers: {
        Authorization:  `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
        "Content-Type": "application/json",
        Host:           "api.flutterwave.com",
      },
      body: JSON.stringify(payload),
    });

    const statusCode = response.status;
    const body       = await response.json();
    
    console.log("creditFlow FW response:", statusCode, JSON.stringify(body)); // add this

    if (statusCode !== 200 || body.status !== "success") {
      const failedTransaction = await failedStatusedTransaction(
        data,
        PaymentEvent.TRANSFER
      );
      return errorResponse(
        body.message || "Transfer failed",
        400,
        PaymentStatus.FAILED,
        failedTransaction
      );
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        status:                  PaymentStatus.SUCCESS,
        error:                   null,
        payment_completion_mode: PaymentCompletion.NONE,
        payment_completion_data: null,
        transaction_details:     data.transaction_details,
      }),
    };
  } catch (err) {
    const failedTransaction = await failedStatusedTransaction(
      data,
      PaymentEvent.TRANSFER
    );
    return errorResponse(
      `Proxy request failed: ${err.message}`,
      500,
      PaymentStatus.FAILED,
      failedTransaction
    );
  }
};

// ---------------------------------------------------------------------------
//  NGN handlers
// ---------------------------------------------------------------------------

const handleNGN = async (data) => {
  const { transfer_profile: profile, transfer_method, transfer_type } = data;

  if (!validateCommonTransferFields(data)) {
    const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.CHARGE);
    return errorResponse(
      "Invalid NGN transaction data",
      400,
      PaymentStatus.FAILED,
      failedTransaction
    );
  }

  if (
    transfer_type === TransactionType.TOP_UP ||
    transfer_type === TransactionType.BUY_IN
  )
    return await handleNGNTopUp(profile, data);

  if (transfer_type === TransactionType.WITHDRAW)
    return await handleNGNWithdrawal(profile, data);

  const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.CHARGE);
  return errorResponse(
    `Unsupported NGN flow: ${transfer_type} / ${transfer_method}`,
    400,
    PaymentStatus.FAILED,
    failedTransaction
  );
};

const handleNGNTopUp = async (profile, data) => {
  switch (data.transfer_method) {
    case PaymentMethod.PRIVATE_ACCOUNT: return await handleNGNPrivateAccount(profile, data);
    case PaymentMethod.USSD:            return await handleNGNUSSD(profile, data);
    case PaymentMethod.DIRECT_DEBIT:    return await handleNGNDirectDebit(profile, data);
    case PaymentMethod.E_NAIRA:         return await handleNGNeNaira(profile, data);
    case PaymentMethod.OPAY:            return await handleNGNOpay(profile, data);
    default: {
      const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.CHARGE);
      return errorResponse(
        `Unsupported NGN top-up method: ${data.transfer_method}`,
        400,
        PaymentStatus.FAILED,
        failedTransaction
      );
    }
  }
};

const handleNGNUSSD = async (profile, data) => {
  try {
    const response = await flw.Charge.ussd({
      tx_ref:       data.transfer_reference,
      account_bank: profile.bank_code,
      amount:       data.transfer_amount,
      currency:     data.transfer_currency,
      email:        profile.email,
      phone_number: profile.phone,
      fullname:     profile.fullname,
    });
    const { status, message, meta } = response;
    if (status !== "success") {
      const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.CHARGE);
      return errorResponse(message, 400, PaymentStatus.FAILED, failedTransaction);
    }
    await scheduleTimeOut(data, PaymentEvent.CHARGE);
    return {
      statusCode: 200,
      body: JSON.stringify({
        status:                  PaymentStatus.SUCCESS,
        error:                   null,
        payment_completion_mode: PaymentCompletion.USSD,
        payment_completion_data: { code: meta?.authorization?.note },
        transaction_details:     data.transaction_details,
      }),
    };
  } catch (err) {
    const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.CHARGE);
    return errorResponse(err.message, 500, PaymentStatus.FAILED, failedTransaction);
  }
};

const handleNGNOpay = async (profile, data) => {
  try {
    const response = await fetch("https://api.flutterwave.com/v3/charges?type=opay", {
      method:  "POST",
      headers: {
        Authorization:  `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tx_ref:       data.transfer_reference,
        amount:       data.transfer_amount,
        currency:     data.transfer_currency,
        email:        profile.email,
        phone_number: profile.phone,
        fullname:     profile.fullname,
      }),
    });
    const opayResponse = await response.json();
    const { status, message, data: flutterwaveData } = opayResponse;
    if (status !== "success") {
      const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.CHARGE);
      return errorResponse(message, 400, PaymentStatus.FAILED, failedTransaction);
    }
    await scheduleTimeOut(data, PaymentEvent.CHARGE);
    return {
      statusCode: 200,
      body: JSON.stringify({
        status:                  PaymentStatus.SUCCESS,
        error:                   null,
        payment_completion_mode: PaymentCompletion.REDIRECT,
        payment_completion_data: {
          link: flutterwaveData?.meta?.authorization?.redirect,
        },
        transaction_details: data.transaction_details,
      }),
    };
  } catch (err) {
    const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.CHARGE);
    return errorResponse(err.message, 500, PaymentStatus.FAILED, failedTransaction);
  }
};

const handleNGNDirectDebit = async (profile, data) => {
  try {
    const response = await flw.Charge.ng({
      tx_ref:       data.transfer_reference,
      amount:       data.transfer_amount,
      currency:     data.transfer_currency,
      email:        profile.email,
      phone_number: profile.phone,
      fullname:     profile.fullname,
    });
    const { status, message, data: flutterwaveData } = response;
    if (status !== "success") {
      const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.CHARGE);
      return errorResponse(message, 400, PaymentStatus.FAILED, failedTransaction);
    }
    await scheduleTimeOut(data, PaymentEvent.CHARGE);
    return {
      statusCode: 200,
      body: JSON.stringify({
        status:                  PaymentStatus.SUCCESS,
        error:                   null,
        payment_completion_mode: PaymentCompletion.REDIRECT,
        payment_completion_data: {
          link: flutterwaveData?.meta?.authorization?.redirect,
        },
        transaction_details: data.transaction_details,
      }),
    };
  } catch (err) {
    const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.CHARGE);
    return errorResponse(err.message, 500, PaymentStatus.FAILED, failedTransaction);
  }
};

const handleNGNeNaira = async (profile, data) => {
  try {
    const response = await flw.Charge.enaira({
      tx_ref:       data.transfer_reference,
      amount:       data.transfer_amount,
      currency:     data.transfer_currency,
      email:        profile.email,
      fullname:     profile.fullname,
      phone_number: profile.phone,
    });
    const { status, message, data: flutterwaveData } = response;
    if (status !== "success") {
      const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.CHARGE);
      return errorResponse(message, 400, PaymentStatus.FAILED, failedTransaction);
    }
    await scheduleTimeOut(data, PaymentEvent.CHARGE);
    return {
      statusCode: 200,
      body: JSON.stringify({
        status:                  PaymentStatus.SUCCESS,
        error:                   null,
        payment_completion_mode: PaymentCompletion.REDIRECT,
        payment_completion_data: {
          link: flutterwaveData?.meta?.authorization?.redirect,
        },
        transaction_details: data.transaction_details,
      }),
    };
  } catch (err) {
    const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.CHARGE);
    return errorResponse(err.message, 500, PaymentStatus.FAILED, failedTransaction);
  }
};

function convertNigeriaTimeToUTC(nigeriaTimeStr) {
  if (!nigeriaTimeStr) return null;
  return moment
    .tz(nigeriaTimeStr, "YYYY-MM-DD HH:mm:ss", "Africa/Lagos")
    .utc()
    .format("YYYY-MM-DD HH:mm:ss");
}

const handleNGNPrivateAccount = async (profile, data) => {
  try {
    const response = await flw.Charge.bank_transfer({
      phone_number: profile.phone,
      amount:       data.transfer_amount,
      fullname:     profile.fullname,
      currency:     data.transfer_currency,
      email:        profile.email,
      tx_ref:       data.transfer_reference,
    });
    const { status, message, meta } = response;
    if (status !== "success") {
      const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.CHARGE);
      return errorResponse(message, 400, PaymentStatus.FAILED, failedTransaction);
    }
    await scheduleTimeOut(data, PaymentEvent.CHARGE);
    return {
      statusCode: 200,
      body: JSON.stringify({
        status:                  PaymentStatus.SUCCESS,
        error:                   null,
        payment_completion_mode: PaymentCompletion.BANKTRANSFER,
        payment_completion_data: {
          bank:      meta?.authorization?.transfer_bank,
          account:   meta?.authorization?.transfer_account,
          reference: meta?.authorization?.transfer_reference,
          note:      meta?.authorization?.transfer_note,
          amount:    meta?.authorization?.transfer_amount,
          expire:    convertNigeriaTimeToUTC(meta?.authorization?.account_expiration),
        },
        transaction_details: data.transaction_details,
      }),
    };
  } catch (err) {
    const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.CHARGE);
    return errorResponse(err.message, 500, PaymentStatus.FAILED, failedTransaction);
  }
};

const handleNGNWithdrawal = async (profile, data) => {
  if (data.transfer_method === PaymentMethod.BANK_TRANSFER) {
    return await creditFlow(
      {
        account_bank:   profile.bank_code,
        account_number: profile.account_number,
        amount:         data.transfer_amount,
        narration:      `Withdrawal to ${profile.fullname}`,
        currency:       data.transfer_currency,
        reference:      data.transfer_reference,
        debit_currency: data.transfer_currency,
      },
      data
    );
  }
  const failedTransaction = await failedStatusedTransaction(data, PaymentEvent.TRANSFER);
  return errorResponse(
    `Unsupported NGN withdrawal method: ${data.transfer_method}`,
    400,
    PaymentStatus.FAILED,
    failedTransaction
  );
};
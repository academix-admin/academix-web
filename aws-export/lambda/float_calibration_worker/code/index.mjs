// // =============================================================================
// //  float_calibration_worker.js
// //  EventBridge-triggered Lambda.
// //
// //  Calls the calibrate_wallet_floats() Postgres function which:
// //    - Queries 30 days of withdrawal + top-up history per wallet
// //    - Computes P95 daily withdrawal volume
// //    - Subtracts 70% of average daily top-up (expected same-day settlement)
// //    - Writes wallet_float_minimum and wallet_float_target back to
// //      wallet_balance_table
// //
// //  Results are logged to CloudWatch structured as JSON so you can build
// //  a CloudWatch metric filter or Insights query over them.
// //
// //  Environment variables required:
// //    SUPABASE_URL              — Supabase project URL
// //    SUPABASE_SERVICE_ROLE_KEY — service role key (never the anon key)
// //
// //  Optional:
// //    CALIBRATION_SNS_ARN       — if set, publishes a summary email after
// //                                each successful calibration run
// // =============================================================================

// import { createClient } from "@supabase/supabase-js";
// import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

// [
//   "SUPABASE_URL",
//   "SUPABASE_SERVICE_ROLE_KEY",
// ].forEach((key) => {
//   if (!process.env[key]) throw new Error(`Missing environment variable: ${key}`);
// });

// const supabase = createClient(
//   process.env.SUPABASE_URL,
//   process.env.SUPABASE_SERVICE_ROLE_KEY
// );

// const sns = new SNSClient({});


// const getCurrentTimestamp = () => {
//   return new Date().toISOString();
// };

// // ---------------------------------------------------------------------------
// //  formatSummaryEmail
// //  Plain-text summary of what changed in this calibration run.
// // ---------------------------------------------------------------------------

// function formatSummaryEmail(results, runAt) {
//   const fmt    = (n) => Number(n ?? 0).toFixed(2);
//   const header = [
//     `Float calibration run: ${runAt}`,
//     `Wallets updated: ${results.length}`,
//     ``,
//     `${"Currency".padEnd(10)} ${"P95 withdrawal".padStart(16)} ${"Avg top-up".padStart(12)} ${"New minimum".padStart(14)} ${"New target".padStart(12)} ${"Days".padStart(6)}`,
//     `${"─".repeat(74)}`,
//   ];

//   const rows = results.map((r) =>
//     [
//       r.currency.padEnd(10),
//       fmt(r.p95_withdrawal).padStart(16),
//       fmt(r.avg_topup).padStart(12),
//       fmt(r.new_float_minimum).padStart(14),
//       fmt(r.new_float_target).padStart(12),
//       String(r.days_of_data).padStart(6),
//     ].join(" ")
//   );

//   return [...header, ...rows].join("\n");
// }

// // ---------------------------------------------------------------------------
// //  Handler
// // ---------------------------------------------------------------------------

// export const handler = async (event) => {

//   console.log("float_calibration_worker: starting calibration run");

//   // Call the Postgres function. It returns one row per wallet updated.
//   const { data: results, error } = await supabase.rpc("calibrate_wallet_floats");

//   if (error) {
//     console.error("float_calibration_worker: calibration RPC failed", error.message);
//     // Rethrow so Lambda marks the invocation as failed and EventBridge
//     // retry policy fires (up to 2 retries by default).
//     throw new Error(`calibrate_wallet_floats() failed: ${error.message}`);
//   }

//   // Structured log — queryable via CloudWatch Logs Insights
//   console.log(
//     "float_calibration_worker: calibration complete",
//     JSON.stringify({
//       walletsUpdated: results?.length ?? 0,
//       results: (results ?? []).map((r) => ({
//         walletId:        r.wallet_id,
//         currency:        r.currency,
//         p95Withdrawal:   Number(r.p95_withdrawal),
//         avgTopup:        Number(r.avg_topup),
//         sameDayCredit:  Number(r.same_day_credit),
//         newFloatMinimum: Number(r.new_float_minimum),
//         newFloatTarget:  Number(r.new_float_target),
//         daysOfData:      Number(r.days_of_data),
//       })),
//     })
//   );


//   // Optional summary email
//   if (process.env.CALIBRATION_SNS_ARN && results?.length) {
//     try {
//       const runTimestamp = getCurrentTimestamp();
//       await sns.send(
//         new PublishCommand({
//           TopicArn: process.env.CALIBRATION_SNS_ARN,
//           Subject:  `[Float calibration] ${results.length} wallet(s) updated — ${runTimestamp.slice(0, 10)}`,
//           Message:  formatSummaryEmail(results, runTimestamp),
//         })
//       );
//       console.log("float_calibration_worker: summary email sent");
//     } catch (snsErr) {
//       // Non-fatal — calibration succeeded even if the summary email fails
//       console.error("float_calibration_worker: summary SNS publish failed", {
//         error: snsErr.message,
//       });
//     }
//   }

//   if (!results?.length) {
//     console.warn(
//       "float_calibration_worker: no wallets updated — " +
//       "all wallets may have fewer than 3 days of transaction history"
//     );
//   }

//   return {
//     statusCode:     200,
//     walletsUpdated: results?.length ?? 0,
//   };
// };


// =============================================================================
//  float_calibration_worker.js
//  EventBridge-triggered Lambda.
//
//  Calls run_wallet_calibration() which sequences:
//    1. calibrate_wallet_settlement_rates() — measures observed per-corridor
//       settlement rates from 30 days of transaction history
//    2. calibrate_wallet_floats()           — uses those rates to recompute
//       wallet_float_minimum and wallet_float_target per wallet
//
//  Results are logged to CloudWatch as structured JSON and optionally
//  published as a formatted SNS summary email.
//
//  Environment variables required:
//    SUPABASE_URL              — Supabase project URL
//    SUPABASE_SERVICE_ROLE_KEY — service role key (never the anon key)
//
//  Optional:
//    CALIBRATION_SNS_ARN       — if set, publishes a summary email after
//                                each successful calibration run
// =============================================================================

import { createClient } from "@supabase/supabase-js";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].forEach((key) => {
  if (!process.env[key]) throw new Error(`Missing environment variable: ${key}`);
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const sns = new SNSClient({});

// ---------------------------------------------------------------------------
//  formatSummaryEmail
// ---------------------------------------------------------------------------

function formatSummaryEmail({ rates, floats, runAt }) {
  const fmt  = (n, d = 2) => Number(n ?? 0).toFixed(d);
  const eq   = "=".repeat(40);
  const dash = "-".repeat(40);

  // ── Header ────────────────────────────────────────────────────────────────
  const header = [
    eq,
    `Float Calibration Run`,
    eq,
    `Timestamp : ${runAt}`,
    dash,
    `Wallets updated (rates) : ${rates.length}`,
    `[${rates.map((r) => r.out_currency ?? "—").join(", ") || "none"}]`,
    dash,
    `Wallets updated (floats): ${floats.length}`,
    `[${floats.map((r) => r.currency ?? "—").join(", ") || "none"}]`,
    dash,
  ];

  // ── Settlement Rates ──────────────────────────────────────────────────────
  const rateSection = [
    ``,
    eq,
    `Settlement Rates`,
    eq,
  ];

  if (rates.length) {
    rates.forEach((r) => {
      rateSection.push(
        `Currency         : ${r.out_currency ?? "—"}`,
        `Observed Rate    : ${fmt(r.out_observed_rate, 4)}`,
        `Settled / SLA    : ${r.out_settled_within_sla ?? 0}`,
        `Total Top-ups    : ${r.out_total_topups ?? 0}`,
        dash
      );
    });
  } else {
    rateSection.push(
      `No wallets had enough top-up history to update rates.`,
      dash
    );
  }

  // ── Float Thresholds ──────────────────────────────────────────────────────
  const floatSection = [
    ``,
    eq,
    `Float Thresholds`,
    eq,
  ];

  if (floats.length) {
    floats.forEach((r) => {
      floatSection.push(
        `Currency         : ${r.currency ?? "—"}`,
        `Settlement Rate  : ${fmt(r.settlement_rate, 4)}`,
        `P95 Withdrawal   : ${fmt(r.p95_withdrawal)}`,
        `Avg Top-up       : ${fmt(r.avg_topup)}`,
        `Same-day Credit  : ${fmt(r.same_day_credit)}`,
        `Float Minimum    : ${fmt(r.new_float_minimum)}`,
        `Float Target     : ${fmt(r.new_float_target)}`,
        `Days of Data     : ${r.days_of_data ?? 0}`,
        dash
      );
    });
  } else {
    floatSection.push(
      `No wallets had enough withdrawal history to update thresholds.`,
      dash
    );
  }

  return [
    ...header,
    ...rateSection,
    ...floatSection,
    ``,
    eq,
    `End of report`,
    eq,
  ].join("\n");
}

// ---------------------------------------------------------------------------
//  Handler
// ---------------------------------------------------------------------------

export const handler = async (event) => {
  const runAt = new Date().toISOString();
  console.log("float_calibration_worker: starting calibration run", { runAt });

  // ── Step 1: settlement rates ──────────────────────────────────────────────
  const { data: rateResults, error: rateError } = await supabase.rpc(
    "calibrate_wallet_settlement_rates"
  );

  if (rateError) {
    console.error(
      "float_calibration_worker: calibrate_wallet_settlement_rates failed",
      rateError.message
    );
    throw new Error(`calibrate_wallet_settlement_rates() failed: ${rateError.message}`);
  }

  console.log("float_calibration_worker: settlement rates calibrated", {
    walletsUpdated: rateResults?.length ?? 0,
    results: (rateResults ?? []).map((r) => ({
      walletId:         r.wallet_id,
      currency:         r.currency,
      observedRate:     Number(r.observed_rate),
      settledWithinSla: Number(r.settled_within_sla),
      totalTopups:      Number(r.total_topups),
    })),
  });

  // ── Step 2: float thresholds ──────────────────────────────────────────────
  const { data: floatResults, error: floatError } = await supabase.rpc(
    "calibrate_wallet_floats"
  );

  if (floatError) {
    console.error(
      "float_calibration_worker: calibrate_wallet_floats failed",
      floatError.message
    );
    throw new Error(`calibrate_wallet_floats() failed: ${floatError.message}`);
  }

  console.log("float_calibration_worker: float thresholds calibrated", {
    walletsUpdated: floatResults?.length ?? 0,
    results: (floatResults ?? []).map((r) => ({
      walletId:        r.wallet_id,
      currency:        r.currency,
      settlementRate:  Number(r.settlement_rate),
      p95Withdrawal:   Number(r.p95_withdrawal),
      avgTopup:        Number(r.avg_topup),
      sameDayCredit:   Number(r.same_day_credit),
      newFloatMinimum: Number(r.new_float_minimum),
      newFloatTarget:  Number(r.new_float_target),
      daysOfData:      Number(r.days_of_data),
    })),
  });

  // ── Warnings ──────────────────────────────────────────────────────────────
  if (!rateResults?.length) {
    console.warn(
      "float_calibration_worker: no settlement rates updated — " +
      "wallets may have fewer than 5 settled top-ups in the last 30 days"
    );
  }

  if (!floatResults?.length) {
    console.warn(
      "float_calibration_worker: no float thresholds updated — " +
      "wallets may have fewer than 3 days of withdrawal history"
    );
  }

  // ── Optional SNS summary ──────────────────────────────────────────────────
  if (process.env.CALIBRATION_SNS_ARN) {
    try {
      const totalUpdated = (floatResults?.length ?? 0);
      await sns.send(
        new PublishCommand({
          TopicArn: process.env.CALIBRATION_SNS_ARN,
          Subject: [
            `[Float calibration]`,
            `${totalUpdated} wallet(s) updated —`,
            runAt.slice(0, 10),
          ].join(" "),
          Message: formatSummaryEmail({
            rates:  rateResults  ?? [],
            floats: floatResults ?? [],
            runAt,
          }),
        })
      );
      console.log("float_calibration_worker: summary email sent");
    } catch (snsErr) {
      // Non-fatal — calibration succeeded even if the email fails
      console.error("float_calibration_worker: summary SNS publish failed", {
        error: snsErr.message,
      });
    }
  }

  return {
    statusCode:            200,
    ratesUpdated:          rateResults?.length  ?? 0,
    thresholdsUpdated:     floatResults?.length ?? 0,
  };
};
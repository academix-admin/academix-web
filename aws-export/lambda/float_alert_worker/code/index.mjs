// =============================================================================
//  float_alert_worker.js
//  SQS-triggered Lambda.
//
//  Consumes float alert messages dropped by make_payment.js and publishes
//  a formatted SNS email to the ops team. Runs entirely off the payment
//  hot path — a slow SNS call here never delays a user.
//
//  SQS configuration (see cloudformation.yaml):
//    - Standard queue (not FIFO) — alerts don't need strict ordering
//    - Visibility timeout: 30s (Lambda timeout is 15s, 2× headroom)
//    - Message retention: 1 day (alerts older than 24h are stale)
//    - DLQ: float-alert-dlq, maxReceiveCount: 3
//    - Batch size: 1 (each alert gets its own SNS publish for clarity)
//
//  Environment variables required:
//    FLOAT_ALERT_SNS_ARN   — SNS topic ARN subscribed by the ops email
// =============================================================================

import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

if (!process.env.FLOAT_ALERT_SNS_ARN) {
  throw new Error("Missing environment variable: FLOAT_ALERT_SNS_ARN");
}

const sns = new SNSClient({});

// ---------------------------------------------------------------------------
//  formatAlertEmail
//  Produces a plain-text email body with all the numbers ops needs to act.
// ---------------------------------------------------------------------------

function formatAlertEmail({
  currency,
  walletId,
  effectiveFloat,
  floatMinimum,
  floatTarget,
  fwBalance,
  netPendingOut,
  enqueuedAt,
}) {
  const deficit  = floatMinimum  - effectiveFloat;
  const toTarget = floatTarget   - effectiveFloat;
  const fmt      = (n) => Number(n).toFixed(2);

  return [
    `Float alert: ${currency} payout wallet is below minimum threshold.`,
    ``,
    `───────────────────────────────`,
    `Wallet ID:         ${walletId}`,
    `Currency:          ${currency}`,
    `───────────────────────────────`,
    `FW raw balance:    ${fmt(fwBalance)} ${currency}`,
    `Pending out:       ${fmt(netPendingOut)} ${currency}`,
    `Effective float:   ${fmt(effectiveFloat)} ${currency}`,
    `───────────────────────────────`,
    `Minimum threshold: ${fmt(floatMinimum)} ${currency}`,
    `Float target:      ${fmt(floatTarget)} ${currency}`,
    `───────────────────────────────`,
    `Deficit to min:    ${fmt(deficit)} ${currency}`,
    `Deficit to target: ${fmt(toTarget)} ${currency}`,
    ``,
    `Action required:`,
    `  Top up the Flutterwave ${currency} payout wallet.`,
    `  Minimum top-up: ${fmt(deficit)} ${currency}`,
    `  Recommended:    ${fmt(toTarget)} ${currency} (to reach target)`,
    ``,
    `Affected withdrawals are queued and will auto-retry`,
    `after the settlement window closes.`,
    ``,
    `Alert triggered at: ${enqueuedAt}`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
//  processRecord
//  Handles one SQS message. Returns true on success, throws on failure
//  (SQS will retry up to maxReceiveCount times before sending to DLQ).
// ---------------------------------------------------------------------------

async function processRecord(record) {
  let payload;

  try {
    payload = JSON.parse(record.body);
  } catch (err) {
    // Malformed JSON — do not retry, just log and swallow.
    // Retrying a malformed message will never succeed.
    console.error("float_alert_worker: malformed SQS message body, discarding", {
      messageId: record.messageId,
      body:      record.body,
      error:     err.message,
    });
    return; // returning without throwing skips this record's retry
  }

  if (payload.type !== "float_alert") {
    console.warn("float_alert_worker: unexpected message type, discarding", {
      messageId: record.messageId,
      type:      payload.type,
    });
    return;
  }

  const {
    currency,
    walletId,
    effectiveFloat,
    floatMinimum,
    floatTarget,
    fwBalance,
    netPendingOut,
    enqueuedAt,
  } = payload;

  const message = formatAlertEmail({
    currency,
    walletId,
    effectiveFloat,
    floatMinimum,
    floatTarget,
    fwBalance,
    netPendingOut,
    enqueuedAt,
  });

  console.log("float_alert_worker: publishing SNS alert", {
    messageId: record.messageId,
    currency,
    walletId,
    effectiveFloat,
    floatMinimum,
    deficit: floatMinimum - effectiveFloat,
  });

  await sns.send(
    new PublishCommand({
      TopicArn: process.env.FLOAT_ALERT_SNS_ARN,
      Subject:  `[Float alert] ${currency} below minimum — top up required`,
      Message:  message,
    })
  );

  console.log("float_alert_worker: SNS alert sent", {
    messageId: record.messageId,
    currency,
    walletId,
  });
}

// ---------------------------------------------------------------------------
//  Handler
//  Batch size is 1 in the event source mapping, so Records will almost
//  always contain exactly one item. The loop handles the edge case where
//  AWS delivers a small batch during high-throughput periods.
//
//  Partial batch failure reporting is enabled (FunctionResponseTypes:
//  ReportBatchItemFailures). On SNS failure we return the messageId in
//  batchItemFailures so SQS retries only that record, not the whole batch.
// ---------------------------------------------------------------------------

export const handler = async (event) => {
  const batchItemFailures = [];

  for (const record of event.Records) {
    try {
      await processRecord(record);
    } catch (err) {
      // SNS publish failed — report this record for retry
      console.error("float_alert_worker: failed to process record", {
        messageId: record.messageId,
        error:     err.message,
      });
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  // Returning batchItemFailures allows SQS to retry only failed records.
  // An empty array means all records were processed successfully.
  return { batchItemFailures };
};
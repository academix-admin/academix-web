import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const sqsClient = new SQSClient({ region: 'eu-north-1' });


export const handler = async (event) => {
  console.log("Received event:", JSON.stringify(event));

  // ── [1] Parse body ─────────────────────────────────────────────────────────
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (err) {
    console.error("Failed to parse webhook body:", err.message);
    // Return 200 so FW doesn't retry a malformed payload indefinitely
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Invalid payload — ignored' })
    };
  }

  console.log("Webhook body:", JSON.stringify(body));

  // ── [2] Format event ───────────────────────────────────────────────────────
  const data = formatEventData(body);

  // Unrecognised event type — acknowledge immediately so FW stops retrying.
  // We only process charge.completed and transfer.completed.
  if (!data) {
    console.log("Unrecognised event type — acknowledging without processing:", body.event);
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Event type not handled' })
    };
  }

  console.log("Formatted data:", JSON.stringify(data));

  // ── [4] Queue to SQS ───────────────────────────────────────────────────────
  try {
    const command = new SendMessageCommand({
      QueueUrl: process.env.PROCESS_FLUTTERWAVE_HOOK_URL,
      MessageBody: JSON.stringify(data),
    });
    const sentMessage = await sqsClient.send(command);
    console.log('Message sent to SQS:', sentMessage.MessageId);
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Message queued' })
    };
  } catch (err) {
    console.error('Failed to send message to SQS:', err);
    // Return 500 so FW retries — this is a genuine infrastructure failure
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to queue message' })
    };
  }
};

// =============================================================================
//  EVENT FORMATTER
//
//  Returns null for unrecognised event types so the handler can acknowledge
//  them with 200 without queuing anything.
//
//  fw_fee is NOT extracted here — the raw webhook payload does not include
//  app_fee reliably. flw_webhook_processor re-verifies via the FW API and
//  extracts app_fee from the verify response, which is the authoritative source.
// =============================================================================

const formatEventData = (eventData) => {
  if (eventData.event === "charge.completed") {
    return {
      id: eventData.data.id,
      event: "PaymentEvent.charge",
      amount: eventData.data.amount,
      currency: eventData.data.currency,
      // Normalize to uppercase — update_user_payment expects 'SUCCESSFUL' | 'FAILED'
      status: eventData.data.status?.toUpperCase(),
      reference: eventData.data.tx_ref,
      service: 'FLUTTERWAVE'
    };
  }

  if (eventData.event === "transfer.completed") {
    return {
      id: eventData.data.id,
      event: "PaymentEvent.transfer",
      amount: eventData.data.amount,
      currency: eventData.data.currency,
      status: eventData.data.status?.toUpperCase(),
      reference: eventData.data.reference,
      service: 'FLUTTERWAVE',
      fee: eventData.data.fee,
    };
  }

  // Return null for anything else — handler will 200 without queuing
  return null;
};
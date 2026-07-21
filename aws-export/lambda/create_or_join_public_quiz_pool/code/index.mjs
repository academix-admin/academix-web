// import { createClient } from "@supabase/supabase-js";
// import fetch from 'node-fetch';
// import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

// const supabase = createClient(
//   process.env.SUPABASE_URL,
//   process.env.SUPABASE_SERVICE_ROLE_KEY
// );

// const lambda = new LambdaClient();

// export const handler = async (event) => {


//   try {
//     const body = JSON.parse(event.body);
//     const {
//       userId,
//       locale,
//       age,
//       gender,
//       country,
//       challengeId,
//       topicsId,
//       poolsId,
//       redeemCode,
//       userPin
//     } = body;

    

//     if (!userId || !locale || !age || !gender || !country || !challengeId || !topicsId || !userPin) {
//       return {
//         statusCode: 400,
//         body: JSON.stringify({ status: "PoolStatus.error", error: "Missing required parameters", transaction_details: null, quiz_pool: null }),
//       }
//     }

//     // Call AWS Lambda function to create verify pin
//     try {

//       const pinPayload = {
//         body: JSON.stringify({
//           userId: userId,
//           pin: userPin
//         })
//       };

//       const pinCommand = new InvokeCommand({
//         FunctionName: "verify_academix_pin",
//         InvocationType: "RequestResponse",
//         Payload: Buffer.from(JSON.stringify(pinPayload)),
//       });

//       const response = await lambda.send(pinCommand);

//       // Convert Buffer to string → parse JSON
//       const payloadString = new TextDecoder().decode(response.Payload);
//       const pinResponse = JSON.parse(payloadString);

//       const { success: pinResult, message, attempts_left, locked_until, not_set } = JSON.parse(pinResponse.body);

//       if (!pinResult) {
//         return {
//           statusCode: 400,
//           body: JSON.stringify({ status: "PoolStatus.pinError", error: message, transaction_details: null, quiz_pool: null, attempts_left: attempts_left, locked_until: locked_until, not_set: not_set  }),
//         }
//       }
//     } catch (pinError) {
//       return {
//         statusCode: 500,
//         body: JSON.stringify({ status: "PoolStatus.error", error: pinError.message, transaction_details: null, quiz_pool: null }),
//       }
//     }


//     const { data: join, error: joinError } = await supabase.rpc("create_or_join_public_quiz_pool", {
//       p_country: country,
//       p_locale: locale,
//       p_gender: gender,
//       p_age: age,
//       p_user_id: userId,
//       p_topic_id: topicsId,
//       p_challenge_id: challengeId,
//       p_pool_id: poolsId,
//       p_redeem_code: redeemCode
//     });


//     if (joinError) {
//       return {
//         statusCode: 400,
//         body: JSON.stringify({ status: "PoolStatus.error", error: joinError.message, transaction_details: null, quiz_pool: null }),
//       }
//     }

//     return {
//       statusCode: 200,
//       body: JSON.stringify(join),
//     };

//   } catch (e) {
//       return {
//         statusCode: 500,
//         body: JSON.stringify({ status: "PoolStatus.error", error: e.message, transaction_details: null, quiz_pool: null }),
//       }
//     }
// };


import { createClient } from "@supabase/supabase-js";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const lambda = new LambdaClient();

// ── Helpers ───────────────────────────────────────────────────────────────────

// const errorResponse = (statusCode, status, error) => ({
//   statusCode,
//   body: JSON.stringify({
//     status,
//     error,
//     transaction_details: null,
//     quiz_pool: null
//   })
// });

const errorResponse = (statusCode, status, error, meta = {}) => {
  const errorPayload = {
    status,
    error: error || "Unknown error",
    transaction_details: null,
    quiz_pool: null
  };

  // 🔍 Structured logging
  console.error("ERROR_RESPONSE", {
    statusCode,
    ...errorPayload,
    meta, // extra context (userId, step, etc.)
    timestamp: new Date().toISOString()
  });

  return {
    statusCode,
    body: JSON.stringify(errorPayload)
  };
};

// const successResponse = (data) => ({
//   statusCode: 200,
//   body: JSON.stringify(data)
// });

const successResponse = (data, meta = {}) => {
  // 🔍 Structured logging
  console.log("SUCCESS_RESPONSE", {
    ...data,
    meta,
    timestamp: new Date().toISOString()
  });

  return {
    statusCode: 200,
    body: JSON.stringify(data)
  };
};

// ── Handler ───────────────────────────────────────────────────────────────────

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const {
      userId,
      locale,
      age,
      gender,
      country,
      challengeId,
      topicsId,
      poolsId,
      redeemCode,
      userPin
    } = body;

    // ── Required field validation ─────────────────────────────────────────────
    if (!userId || !locale || !age || !gender || !country
        || !challengeId || !topicsId || !userPin) {
      return errorResponse(400, "PoolStatus.error", "Missing required parameters");
    }


    // ── Step 1: Verify PIN ────────────────────────────────────────────────────
    // Runs before any DB connection is opened. A Lambda-to-Lambda call
    // can take 100-300ms — holding a Postgres connection open during that
    // wait would consume a connection slot for no reason.
    try {
      const pinCommand = new InvokeCommand({
        FunctionName: "verify_academix_pin",
        InvocationType: "RequestResponse",
        Payload: Buffer.from(JSON.stringify({
          body: JSON.stringify({ userId, pin: userPin })
        }))
      });

      const pinResponse  = await lambda.send(pinCommand);
      const pinPayload   = JSON.parse(new TextDecoder().decode(pinResponse.Payload));
      const {
        success,
        message,
        attempts_left,
        locked_until,
        not_set
      } = JSON.parse(pinPayload.body);

      if (!success) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            status:              "PoolStatus.pinError",
            error:               message,
            transaction_details: null,
            quiz_pool:           null,
            attempts_left,
            locked_until,
            not_set
          })
        };
      }
    } catch (pinError) {
      return errorResponse(500, "PoolStatus.error", pinError.message);
    }

    // ── Step 2: Validate — read-only, no transaction, no locks ───────────────
    // Rejects ineligible users (wrong pool, full pool, already joined,
    // insufficient questions) before any payment or DB write is attempted.
    // At 1M+ users the majority of rejections happen here at near-zero cost.
    const { data: validation, error: validationError } = await supabase.rpc(
      "validate_quiz_pool_entry",
      {
        p_user_id:      userId,
        p_topic_id:     topicsId,
        p_challenge_id: challengeId,
        p_locale:       locale,
        p_country:      country,
        p_gender:       gender,
        p_age:          age,
        p_pool_id:      poolsId
      }
    );
   

    if (validationError) {
      return errorResponse(500, "PoolStatus.error", validationError.message);
    }

    if (validation.status !== "PoolStatus.valid") {
      return successResponse({
        status:              validation.status,
        error:               validation.error ?? null,
        quiz_pool:           null,
        transaction_details: null
      });
    }

    console.log("VALIDATION_RESULT", validation);
    // ── Step 3: Commit — short transaction ────────────────────────────────────
    // Only work that requires atomicity happens here:
    // question load → payment → pool find/create → member insert → seal check.
    // get_active_quiz and fetch_user_transaction_by_id are deliberately
    // excluded — they are reads that can run after the transaction commits.
    const { data: commit, error: commitError } = await supabase.rpc(
      "commit_quiz_pool_entry",
      {
        p_user_id:      userId,
        p_topic_id:     topicsId,
        p_challenge_id: challengeId,
        p_locale:       locale,
        p_country:      country,
        p_gender:       gender,
        p_age:          age,
        p_pool_id:      poolsId,
        p_redeem_code:  redeemCode ?? null
      }
    );

    console.log("COMMIT_RESULT", commit);
    console.log("COMMIT_ERROR", commitError);

    if (commitError) {
      return errorResponse(500, "PoolStatus.error", commitError.message);
    }

    if (
      commit.status !== "PoolStatus.engaged" &&
      commit.status !== "PoolStatus.this_active"
    ) {
      return successResponse({
        status:              commit.status,
        error:               commit.error ?? null,
        quiz_pool:           null,
        transaction_details: null
      });
    }

    // ── Step 4: Fetch response data ───────────────────────────────────────────
    // Runs after the transaction commits — both calls are pure reads with
    // no locks. Running them in parallel via Promise.allSettled means
    // a failure in one does not block the other. The user already has
    // confirmed membership from Step 3 regardless of what happens here.
    const [activeQuizResult, transactionResult] = await Promise.allSettled([
      supabase.rpc("get_active_quiz", {
        p_user_id: userId,
        p_country: country,
        p_locale:  locale,
        p_gender:  gender,
        p_age:     age
      }),
      commit.transaction_id
        ? supabase.rpc("fetch_user_transaction_by_id", {
            p_user_id:        userId,
            p_country:        country,
            p_locale:         locale,
            p_gender:         gender,
            p_age:            age,
            p_transaction_id: commit.transaction_id
          })
        : Promise.resolve({ data: null, error: null })
    ]);

    const activeQuiz = activeQuizResult.status === "fulfilled"
      ? (activeQuizResult.value.data ?? null)
      : null;

    const transactionDetails = transactionResult.status === "fulfilled"
      ? (transactionResult.value.data ?? null)
      : null;

    return successResponse({
      status:              commit.status,
      quiz_pool:           activeQuiz,
      transaction_details: transactionDetails
    });

  } catch (e) {
    return errorResponse(500, "PoolStatus.error", e.message);
  }
};
// import { createClient } from "@supabase/supabase-js";
// import  fetch  from 'node-fetch';

// const API_KEY = process.env.EDENAI_API_KEY;
// const URL = process.env.EDENAI_URL;
// const MODEL = 'openai/gpt-4o';

// const supabase = createClient(
//   process.env.SUPABASE_URL,
//   process.env.SUPABASE_SERVICE_ROLE_KEY
// );

// export const handler = async (event) => {
//   console.log("Submit Question received input:", JSON.stringify(event, undefined, 2));

//   try {
//     const body = JSON.parse(event.body);
//     const {
//       userId,
//       locale,
//       setPublic,
//       age,
//       gender,
//       country,
//       topicsId,
//       questionText,
//       options,
//       timeId,
//       typeId,
//       languageControl,
//       ageControl,
//       genderControl,
//       countryControl
//     } = body;

//     // Check if questionText exists
//     const { data: questionCheck, error: existsError } = await supabase.rpc("get_question_exists", {
//       p_name: questionText,
//       p_user_id: userId,
//       p_topic_id: topicsId,
//       p_public: (setPublic || true),
//       p_locale: locale
//     });

//     if (existsError) {
//       return {
//         statusCode: 500,
//         body: JSON.stringify({ status: "ContentSubmission.error", error: existsError.message }),
//       };
//     }

//     const { exists , allowed, is_public, topic } = questionCheck;
    
//     if (exists) {
//       return {
//         statusCode: 200,
//         body: JSON.stringify({ status: "ContentSubmission.exists" }),
//       };
//     }

//     if (!allowed) {
//       return {
//         statusCode: 200,
//         body: JSON.stringify({ status: "ContentSubmission.blocked" }),
//       };
//     }

//     // Get Locales
//     const { data: locales, error: localesError } = await supabase.rpc("get_supabase_locales");

//     if (localesError) {
//       return {
//         statusCode: 500,
//         body: JSON.stringify({ status: "ContentSubmission.error", error: localesError.message }),
//       };
//     }

//     // Build prompt
//     const prompt = buildPrompt(questionText, topic, options,locales, is_public);


//     // Send to EdenAI
//     const {response, error: promptError} = await sendPrompt(prompt, URL, API_KEY, MODEL);

//     console.log(response);

//     if (promptError){
//       return {
//         statusCode: 200,
//         body: JSON.stringify({
//           status: "ContentSubmission.failed",
//           error: promptError
//         }),
//       };
//     }


//     const {verified, supports, optionsSupports} = response;

//     if (!verified){
//       return {
//         statusCode: 200,
//         body: JSON.stringify({
//           status: "ContentSubmission.failed",
//           response
//         }),
//       };
//     }

//     // Send name, supports,controls for saving
//     const { data: submission, error: sumbissionError } = await supabase.rpc("submit_question_content", {
//       p_country : country, 
//       p_locale : locale, 
//       p_gender : gender, 
//       p_age : age, 
//       p_country_control : countryControl, 
//       p_language_control : languageControl, 
//       p_gender_control : genderControl, 
//       p_age_control : ageControl, 
//       p_user_id : userId,
//       p_topic_id: topicsId,
//       p_time_id: timeId,
//       p_type_id: typeId,
//       p_public : is_public,
//       p_options: options,
//       p_supports : supports,
//       p_options_supports: optionsSupports
//     });
    
//     console.log(submission);

//     if (sumbissionError) {
//       return {
//         statusCode: 500,
//         body: JSON.stringify({ status: "ContentSubmission.error", error: sumbissionError.message }),
//       }
//     }
    
//     const { error , status, questions_details, options_id_details } = submission;

//     if (status != "ContentSubmission.success") {
//       return {
//         statusCode: 500,
//         body: JSON.stringify({ status, error }),
//       }
//     }

//     return {
//       statusCode: 200,
//       body: JSON.stringify({
//         status: "ContentSubmission.submitted",
//         questions_details,
//         options_id_details
//       }),
//     };

//   } catch (err) {
//     console.error("Unexpected error:", err);
//     return {
//       statusCode: 500,
//       body: JSON.stringify({ status: "ContentSubmission.exception", error: err.message }),
//     };
//   }
// };

// // 🧠 Build Prompt
// // function buildPrompt(questionText, topic, options, locales, isPublic) {
// //   const supports = {};
// //   for (const locale of locales) {
// //     supports[locale] = "";
// //   }
// //   supports["default"] = questionText;

// //   const supportsString = JSON.stringify(supports, null, 2);

// //   const optionsList = [];
// //   const optionSupports = [];

// //   for (const option of options) {
// //     const osupports = {};
// //     for (const olocale of locales) {
// //       osupports[olocale] = "";
// //     }
// //     osupports["default"] = option.option;
// //     optionSupports.push({
// //       id: option.id,
// //       support: osupports
// //     });
// //     optionsList.push({
// //       id: option.id,
// //       is_correct: option.is_correct,
// //       option: option.option
// //     });
// //   }

// //   return `Evaluate the inputs question: **"${questionText}"**, options: **${JSON.stringify(optionsList, null, 2)}** against the following criteria and respond in strict JSON format:

// // ### Question-Level Scope Rules (Apply **only to the question**):
// // ${isPublic
// //     ? `1. **(R5) Educationally Related** - The question must be related to **"${topic}"** irrespective of detected languages.`
// //     : '1. **(R0) General** - The question is appropriate and meaningful'}
// // 2. **(R2) Correct Grammer** - The question is grammatically correct according to the detected language's dictionary.  
// // 3. **(R3) No Abbreviations** - The question has no term that is shortened, clipped, or colloquial (e.g., "Technology" not "Tech").  
// // 4. **(R4) Non-offensive** - The question is free of racism, nudity, or inappropriate content.  

// // ### Option-Level Scope Rules (Apply **only to the options**):
// // 5. **(R6) Valid Options** - The question options contain an answer.  
// // 6. **(R7) Correct Grammer** - All options are grammatically correct according to the detected language's dictionary.  
// // 7. **(R8) No Abbreviations** - All options have no term that is shortened, clipped, or colloquial (e.g., "Technology" not "Tech").  
// // 8. **(R9) Non-offensive** - All options are free of racism, nudity, or inappropriate content. 

// // **Important**:  
// // - Do **not confuse (R2 and R7), (R3 and R8) and (R4 and R9) **. Violation issues in the question should only trigger **R0-R5**. Violation issues in any option should only trigger **R6-R9**.  
// // - Apply **each rule only to its target scope** (question or options). 

// // ### **Expected JSON Response Structure:**  
// // \`\`\`json  
// // {  
// //   "verified": true/false,  
// //   "violated": [] (list of violated rules, if any),  
// //   "suggested": "" (verified correction in detected language if R2 or R3 or R7 or R8 are violated, else empty string),  
// //   "supports": ${supportsString} (when verified, provide translation values for all locale keys, else {}),  
// //   "optionsSupports": ${JSON.stringify(optionSupports, null, 2)} (when verified, provide translation values for all locale keys, else [])
// // }  
// // \`\`\``;
// // }

// function buildPrompt(questionText, topic, options, locales, isPublic) {
//   const supports = {};
//   for (const locale of locales) {
//     supports[locale] = "";
//   }
//   supports["default"] = questionText;

//   const supportsString = JSON.stringify(supports, null, 2);

//   const optionsList = [];
//   const optionSupports = [];

//   for (const option of options) {
//     const osupports = {};
//     for (const olocale of locales) {
//       osupports[olocale] = "";
//     }
//     osupports["default"] = option.option;
//     optionSupports.push({
//       id: option.id,
//       support: osupports
//     });
//     optionsList.push({
//       id: option.id,
//       is_correct: option.is_correct,
//       option: option.option
//     });
//   }

//   const localeList = locales.join(", ");

//   return `Evaluate the inputs question: **"${questionText}"**, options: **${JSON.stringify(optionsList, null, 2)}** against the following criteria and respond in strict JSON format:

// ### Question-Level Scope Rules (Apply **only to the question**):
// ${isPublic
//     ? `1. **(R5) Educationally Related** - The question must be related to **"${topic}"** irrespective of detected languages.`
//     : '1. **(R0) General** - The question is appropriate and meaningful.'}
// 2. **(R2) Correct Grammar** - The question is grammatically correct according to the detected language's dictionary.  
// 3. **(R3) No Abbreviations** - The question has no term that is shortened, clipped, or colloquial (e.g., "Technology" not "Tech").  
// 4. **(R4) Non-offensive** - The question is free of racism, nudity, or inappropriate content.  

// ### Option-Level Scope Rules (Apply **only to the options**):
// 5. **(R6) Valid Options** - The question options contain an answer.  
// 6. **(R7) Correct Grammar** - All options are grammatically correct according to the detected language's dictionary.  
// 7. **(R8) No Abbreviations** - All options have no term that is shortened, clipped, or colloquial (e.g., "Technology" not "Tech").  
// 8. **(R9) Non-offensive** - All options are free of racism, nudity, or inappropriate content.  

// ---

// ### Important:

// - Do **not confuse (R2 and R7), (R3 and R8), or (R4 and R9)**.  
//   Violation issues in the **question** should only trigger rules **R0–R5**.  
//   Violation issues in **options** should only trigger **R6–R9**.

// - Apply **each rule strictly to its correct scope** (question vs. options).

// - When \`"verified": true\`, you **must**:
//   - Fill in every locale key (**${localeList}**) in \`supports\` with the correct translation of the \`default\` question text.
//   - Fill in every locale key for each option in \`optionsSupports\` with the correct translation of that option's \`default\` text.
//   - If a high-quality translation is not possible, **copy the \`default\` value into the locale** as a fallback.

// - When \`"verified": false\`, set:
//   - \`supports\` as: \`{}\`
//   - \`optionsSupports\` as: \`[]\`

// ---

// ### Expected JSON Response Structure:

// \`\`\`json
// {
//   "verified": true/false,
//   "violated": ["R2", "R6"], 
//   "suggested": "Corrected version of the question if applicable, else empty string",
//   "supports": ${supportsString},
//   "optionsSupports": ${JSON.stringify(optionSupports, null, 2)}
// }
// \`\`\``;
// }


// // 🛰️ Send Prompt to EdenAI
// async function sendPrompt(prompt, url, apiKey, model) {
//   const headers = {
//     'Authorization': `Bearer ${apiKey}`,
//     'Content-Type': 'application/json',
//     'Accept': 'application/json',
//   };

//   const requestBody = {
//     providers: [model],
//     response_as_dict: true,
//     attributes_as_list: false,
//     show_base_64: true,
//     show_original_response: false,
//     temperature: 0,
//     max_tokens: 16000,
//     messages: [
//       {
//         role: 'user',
//         content: [
//           {
//             type: 'text',
//             content: {text: prompt}
//           }
//         ]
//       }
//     ]
//   };

//   try {
//     const response = await fetch(url, {
//       method: 'POST',
//       headers,
//       body: JSON.stringify(requestBody),
//     });

//     const result = await response.json();
//     console.log("EdenAI response:", result);
//     return {
//       response: extractJsonFromCodeBlock(result?.[model]?.generated_text || ''),
//       cost: result['cost'],
//       status: result['status'],
//       messages: result['messages']
//     };
//   } catch (error) {
//     console.error("EdenAI request failed:", error);
//     return { error: error.message };
//   }
// }

// function extractJsonFromCodeBlock(text) {
//   try {
//     const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
//     if (jsonMatch && jsonMatch[1]) {
//       return JSON.parse(jsonMatch[1]);
//     }
//     return null;
//   } catch (e) {
//     return null;
//   }
// }


import { createClient } from "@supabase/supabase-js";
import fetch from 'node-fetch';

const API_KEY = process.env.EDENAI_API_KEY;
const URL = process.env.EDENAI_URL;
const MODEL = 'openai/gpt-4o';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const handler = async (event) => {
  console.log("Submit Question received input:", JSON.stringify(event, undefined, 2));

  try {
    const body = JSON.parse(event.body);
    const {
      userId,
      locale,
      setPublic,
      age,
      gender,
      country,
      topicsId,
      questionText,
      options,
      timeId,
      typeId,
      languageControl,
      ageControl,
      genderControl,
      countryControl,
      questionsId
    } = body;

    // Check if questionText exists
    const { data: questionCheck, error: existsError } = await supabase.rpc("get_question_exists", {
      p_name: questionText,
      p_user_id: userId,
      p_topic_id: topicsId,
      p_public: (setPublic || true),
      p_locale: locale
    });

    if (existsError) {
      return {
        statusCode: 500,
        body: JSON.stringify({ status: "ContentSubmission.error", error: existsError.message }),
      };
    }

    const { exists, allowed, is_public, topic } = questionCheck;

    if (exists) {
      return {
        statusCode: 200,
        body: JSON.stringify({ status: "ContentSubmission.exists" }),
      };
    }

    if (!allowed) {
      return {
        statusCode: 200,
        body: JSON.stringify({ status: "ContentSubmission.blocked" }),
      };
    }

    // Build prompt
    const prompt = buildPrompt(questionText, topic, options, locale, is_public);

    // Send to EdenAI
    const { response, error: promptError } = await sendPrompt(prompt, URL, API_KEY, MODEL);

    console.log(response);

    if (promptError) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          status: "ContentSubmission.failed",
          error: promptError
        }),
      };
    }

    // Guard against null response if AI output could not be parsed
    if (!response) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          status: "ContentSubmission.failed",
          error: "Failed to parse AI response"
        }),
      };
    }

    const { verified } = response;

    if (!verified) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          status: "ContentSubmission.failed",
          response
        }),
      };
    }

    // Send question and options for saving
    const { data: submission, error: submissionError } = await supabase.rpc("submit_question_content", {
      p_country: country,
      p_locale: locale,
      p_gender: gender,
      p_age: age,
      p_country_control: countryControl,
      p_language_control: languageControl,
      p_gender_control: genderControl,
      p_age_control: ageControl,
      p_user_id: userId,
      p_topic_id: topicsId,
      p_time_id: timeId,
      p_type_id: typeId,
      p_public: is_public,
      p_options: options,
      p_question_text: questionText,
      p_questions_id: questionsId ?? null
    });

    console.log(submission);

    if (submissionError) {
      return {
        statusCode: 500,
        body: JSON.stringify({ status: "ContentSubmission.error", error: submissionError.message }),
      };
    }

    const { error, status, questions_details, options_id_details } = submission;

    if (status !== "ContentSubmission.success") {
      return {
        statusCode: 500,
        body: JSON.stringify({ status, error }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: "ContentSubmission.submitted",
        questions_details,
        options_id_details
      }),
    };

  } catch (err) {
    console.error("Unexpected error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ status: "ContentSubmission.exception", error: err.message }),
    };
  }
};

function buildPrompt(questionText, topic, options, locale, isPublic) {
  const optionsList = options.map(option => ({
    id: option.id,
    is_correct: option.is_correct,
    option: option.option
  }));

  return `Evaluate the inputs question: **"${questionText}"**, options: **${JSON.stringify(optionsList, null, 2)}** against the following criteria and respond in strict JSON format:

### Question-Level Scope Rules (Apply **only to the question**):
${isPublic
    ? `1. **(R5) Educationally Related** - The question must be related to **"${topic}"** irrespective of detected languages.`
    : '1. **(R0) General** - The question is appropriate and meaningful.'}
2. **(R2) Correct Grammar** - The question is grammatically correct according to the detected language locale **"${locale}"**.  
3. **(R3) No Abbreviations** - The question has no term that is shortened, clipped, or colloquial (e.g., "Technology" not "Tech").  
4. **(R4) Non-offensive** - The question is free of racism, nudity, or inappropriate content.  

### Option-Level Scope Rules (Apply **only to the options**):
5. **(R6) Valid Options** - The question options contain an answer.  
6. **(R7) Correct Grammar** - All options are grammatically correct according to the detected language's dictionary.  
7. **(R8) No Abbreviations** - All options have no term that is shortened, clipped, or colloquial (e.g., "Technology" not "Tech").  
8. **(R9) Non-offensive** - All options are free of racism, nudity, or inappropriate content.  

---

### Important:

- Do **not confuse (R2 and R7), (R3 and R8), or (R4 and R9)**.  
  Violation issues in the **question** should only trigger rules **R0–R5**.  
  Violation issues in **options** should only trigger **R6–R9**.

---

### Expected JSON Response Structure:

\`\`\`json
{
  "verified": true/false,
  "violated": ["R2", "R6"], 
  "suggested": "Corrected version of the question if applicable, else empty string"
}
\`\`\``;
}

// 🛰️ Send Prompt to EdenAI
async function sendPrompt(prompt, url, apiKey, model) {
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  const requestBody = {
    providers: [model],
    response_as_dict: true,
    attributes_as_list: false,
    show_base_64: true,
    show_original_response: false,
    temperature: 0,
    max_tokens: 16000,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            content: { text: prompt }
          }
        ]
      }
    ]
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();
    console.log("EdenAI response:", result);
    return {
      response: extractJsonFromCodeBlock(result?.[model]?.generated_text || ''),
      cost: result['cost'],
      status: result['status'],
      messages: result['messages']
    };
  } catch (error) {
    console.error("EdenAI request failed:", error);
    return { error: error.message };
  }
}

function extractJsonFromCodeBlock(text) {
  try {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      return JSON.parse(jsonMatch[1]);
    }
    // Fallback: try parsing raw text directly if no code fences
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}
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
//   console.log("Submit Category received input:", JSON.stringify(event, undefined, 2));

//   try {
//     const body = JSON.parse(event.body);
//     const {
//       userId,
//       locale,
//       setPublic,
//       age,
//       gender,
//       country,
//       groupId,
//       categoryName,
//       languageControl,
//       ageControl,
//       genderControl,
//       countryControl,
//       topicCategoryId
//     } = body;

//     // Check if categoryName exists
//     const { data: categoryCheck, error: existsError } = await supabase.rpc("get_category_exists", {
//       p_name: categoryName,
//       p_user_id: userId,
//       p_group_id: groupId,
//       p_public: (setPublic || true),
//       p_locale: locale
//     });

//     if (existsError) {
//       return {
//         statusCode: 500,
//         body: JSON.stringify({ status: "ContentSubmission.error", error: existsError.message }),
//       };
//     }

//     const { exists , allowed, is_public, group } = categoryCheck;
    
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


//     // Build prompt
//     const prompt = buildPrompt(categoryName, group, locale, is_public);

//     console.log(prompt);

//     console.log('Sending to eden');


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


//     const { verified } = response;

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
//     const { data: submission, error: sumbissionError } = await supabase.rpc("submit_category_content", {
//       p_country : country, 
//       p_locale : locale, 
//       p_gender : gender, 
//       p_age : age, 
//       p_country_control : countryControl, 
//       p_language_control : languageControl, 
//       p_gender_control : genderControl, 
//       p_age_control : ageControl, 
//       p_user_id : userId,
//       p_group_id: groupId,
//       p_public : is_public,
//       p_topic_category_text : categoryName,
//       p_topic_category_id : topicCategoryId ?? null
//     });
    
//     console.log(submission);

//     if (sumbissionError) {
//       return {
//         statusCode: 500,
//         body: JSON.stringify({ status: "ContentSubmission.error", error: sumbissionError.message }),
//       }
//     }
    
//     const { error , status, category_details } = submission;

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
//         category_details
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
// function buildPrompt(categoryName, group, locale, isPublic) {
 
//   return `Evaluate the term **"${categoryName}"** against the following criteria and respond in strict JSON format:  

// ${ 
//   isPublic
//   ? `1. **(R5) Educationally Related** - The term must be related to **"${group}"** irrespective of detected languages.`
//   : '1. **(R0) General** - The term must be appropriate and meaningful'
// }
// 2. **(R2) Correct Spelling** - The term must be spelled correctly in both singular and plural forms according to the detected language locale **"${locale}"**.  
// 3. **(R3) No Abbreviations** - The term must not be shortened, clipped, or colloquial (e.g., "Technology" not "Tech").  
// 4. **(R4) Non-offensive** - The term must be free of racism, nudity, or inappropriate content.  

// ### **Expected JSON Response Structure:**  
// \`\`\`json  
// {  
//   "verified": true/false,  
//   "violated": [] (list of violated rules, if any),  
//   "suggested": "" (verified correction in detected lanaguage if R2 or R3 are violated, else empty string)  
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
//     max_tokens: 10000,
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
  console.log("Submit Category received input:", JSON.stringify(event, undefined, 2));

  try {
    const body = JSON.parse(event.body);
    const {
      userId,
      locale,
      setPublic,
      age,
      gender,
      country,
      groupId,
      categoryName,
      languageControl,
      ageControl,
      genderControl,
      countryControl,
      topicCategoryId
    } = body;

    // Check if categoryName exists
    const { data: categoryCheck, error: existsError } = await supabase.rpc("get_category_exists", {
      p_name: categoryName,
      p_user_id: userId,
      p_group_id: groupId,
      p_public: (setPublic || true),
      p_locale: locale
    });

    if (existsError) {
      return {
        statusCode: 500,
        body: JSON.stringify({ status: "ContentSubmission.error", error: existsError.message }),
      };
    }

    const { exists, allowed, is_public, group } = categoryCheck;

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
    const prompt = buildPrompt(categoryName, group, locale, is_public);

    console.log(prompt);
    console.log('Sending to eden');

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

    // Bug fix 1: guard against null response if AI output could not be parsed
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

    // Send name, supports, controls for saving
    const { data: submission, error: submissionError } = await supabase.rpc("submit_category_content", {
      p_country: country,
      p_locale: locale,
      p_gender: gender,
      p_age: age,
      p_country_control: countryControl,
      p_language_control: languageControl,
      p_gender_control: genderControl,
      p_age_control: ageControl,
      p_user_id: userId,
      p_group_id: groupId,
      p_public: is_public,
      p_topic_category_text: categoryName,
      p_topic_category_id: topicCategoryId ?? null
    });

    console.log(submission);

    if (submissionError) {
      return {
        statusCode: 500,
        body: JSON.stringify({ status: "ContentSubmission.error", error: submissionError.message }),
      };
    }

    const { error, status, category_details } = submission;

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
        category_details
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

// 🧠 Build Prompt
function buildPrompt(categoryName, group, locale, isPublic) {
  return `Evaluate the term **"${categoryName}"** against the following criteria and respond in strict JSON format:  

${
  isPublic
    ? `1. **(R5) Educationally Related** - The term must be related to **"${group}"** irrespective of detected languages.`
    : '1. **(R0) General** - The term must be appropriate and meaningful'
}
2. **(R2) Correct Spelling** - The term must be spelled correctly in both singular and plural forms according to the detected language locale **"${locale}"**.  
3. **(R3) No Abbreviations** - The term must not be shortened, clipped, or colloquial (e.g., "Technology" not "Tech").  
4. **(R4) Non-offensive** - The term must be free of racism, nudity, or inappropriate content.  

### **Expected JSON Response Structure:**  
\`\`\`json  
{  
  "verified": true/false,  
  "violated": [] (list of violated rules, if any),  
  "suggested": "" (verified correction in detected language if R2 or R3 are violated, else empty string)  
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
    max_tokens: 10000,
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
    // Bug fix 2: fallback to raw JSON parse if no code fences
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}
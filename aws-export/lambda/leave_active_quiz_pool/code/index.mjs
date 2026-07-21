import { createClient } from "@supabase/supabase-js";
import fetch from 'node-fetch';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const handler = async (event) => {


  console.log("Leave received input:", JSON.stringify(event, undefined, 2));

  try {
    const body = JSON.parse(event.body);
    const {
      userId,
      locale,
      age,
      gender,
      country
    } = body;

    
    const { data: leave, error: leaveError } = await supabase.rpc("leave_active_quiz_pool", {
      p_country : country, 
      p_locale : locale, 
      p_gender : gender, 
      p_age : age, 
      p_user_id : userId
    });
    
    console.log(leave);

    if (leaveError) {
      return {
        statusCode: 500,
        body: JSON.stringify({ status: "PoolStatus.error", error: leaveError.message, pools_id: null }),
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify(leave),
    };
    
  }catch(e){

    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message }),
    };
  }

};

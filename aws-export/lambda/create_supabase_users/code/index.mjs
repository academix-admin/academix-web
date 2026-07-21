import { createClient } from "@supabase/supabase-js";
import fetch from 'node-fetch';
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const lambda = new LambdaClient();

export const handler = async (event) => {

  try {
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;

    // Extract all required fields from the request body
    const {
      users_login_type,
      users_email,
      users_phone,
      users_password,
      users_dob,
      users_sex,
      users_username,
      users_names,
      country_id,
      language_id,
      users_referred_id,
      roles_id,
      users_pin
    } = body;


    // Validate required fields
    if (!users_login_type || !users_password || !users_pin || !users_username || !users_email || !users_phone || !users_names || !roles_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          message: "Missing required fields"
        })
      };
    }

    if (users_login_type === 'UserLoginType.email' && !users_email) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          message: "Email is required for email-based registration"
        })
      };
    }

    if (users_login_type === 'UserLoginType.phone' && !users_phone) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: "Phone number is required for phone-based registration"
        })
      };
    }


    const { data: roleData, error: roleError } = await supabase.rpc(
      'check_role_verification',
      { p_roles_id: roles_id }  
    );
    
    if (roleError) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          message: `RPC failed: ${roleError.message}`
        })
      };
    }
    
    if (roleData.status !== "RolesVerification.success") {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          message: `Role verification failed: ${roleData.error}`
        })
      };
    }
    
    const {
      verification,
      roles_id: verified_role_id,
      roles_checker,
      roles_level,
      roles_access
    } = roleData.data;
    

    // Create the user in Supabase Auth
    let authResponse;

    if (users_login_type === 'UserLoginType.email') {
      authResponse = await supabase.auth.signUp({
        email: users_email,
        password: users_password
      });
    } else if (users_login_type === 'UserLoginType.phone') {
      authResponse = await supabase.auth.signUp({
        phone: users_phone,
        password: users_password
      });
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          message: "Invalid login type"
        })
      };
    }

    const { data: authData, error } = authResponse;

    if (error) {
      console.error('Auth creation error:', error);
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          message: `Failed to create auth user: ${error.message}`
        })
      };
    }

    const userId = authData.user.id;


    // Insert user data into users_table
    const userData = {
      users_id: userId,
      users_username,
      users_names,
      users_email: users_email,
      users_phone: users_phone,
      users_dob,
      users_sex,
      users_login_type: users_login_type,
      users_image: null,
      users_referred_id: users_referred_id || null,
      users_verified: verification,
      country_id,
      language_id,
      users_created_at: new Date().toISOString()
    };

    const { error: usersError } = await supabase
      .from("users_table")
      .insert([{ 
        ...userData, 
        roles_id: verified_role_id, 
        users_roles_access: roles_access,
        users_referred_status: users_referred_id ? 'Referral.active' : 'Referral.none' 
      }]);


    const { error: balanceError } = await supabase
      .schema("personal")
      .from("users_balance_table")
      .insert({ users_id: userId });

    if (usersError || balanceError) {
      console.error('Database insertion error:', usersError || balanceError);

      // Rollback: delete the auth user if database insertion fails
      await supabase.auth.admin.deleteUser(userId);

      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          message: `Failed to insert user data: ${usersError?.message || balanceError?.message}`
        })
      };
    }

    // Call AWS Lambda function to create academix pin
    try {

      const pinPayload = {
        body: JSON.stringify({
          userId: userId,
          userPin: users_pin
        })
      };

      const pinCommand = new InvokeCommand({
        FunctionName: "create_academix_pin",
        InvocationType: "RequestResponse",
        Payload: Buffer.from(JSON.stringify(pinPayload)),
      });

      const response = await lambda.send(pinCommand);

      // Convert Buffer to string → parse JSON
      const payloadString = new TextDecoder().decode(response.Payload);
      const pinResponse = JSON.parse(payloadString);

      const { success: pinResult, message } = JSON.parse(pinResponse.body);  

      if (!pinResult) {
        console.error('PIN creation failed:', message);
      }
    } catch (pinError) {
      console.error('Error calling PIN Lambda:', pinError);
    }

    // Return success response with user data
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: "User registered successfully",
        user: {
          ...userData,
          roles_table: {
            roles_id: roles_id,
            roles_level: roles_level,
            roles_checker: roles_checker,
            roles_access: roles_access
          }
        }
      })
    };

  } catch (error) {
    console.error('Unexpected error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: "Internal server error",
        error: error.message
      })
    };
  }
};
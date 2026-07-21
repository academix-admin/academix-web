export const handler = async (event) => {
  try {
    // Extract Authorization header
    const token = event.headers?.Authorization?.split(' ')[1] || event.headers?.authorization?.split(' ')[1];

    console.log('Received Token:', token);
    console.log('Expected Token:', process.env.BEARER_TOKEN);

    if (!token || token !== process.env.BEARER_TOKEN) {
      return {
        principalId: "none",
        policyDocument: {
          Version: "2012-10-17",
          Statement: [
            {
              Action: "execute-api:Invoke",
              Effect: "Deny",
              Resource: ["arn:aws:execute-api:eu-north-1:495599741675:335m87qluc/*/POST/pools/schedule",
            "arn:aws:execute-api:eu-north-1:495599741675:ny1y2b50jh/*/POST/async-rpc"
            ]
            }
          ]
        }
      };
    }

    // Return authorization policy
    return {
      principalId: "supabase",
      policyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: "execute-api:Invoke",
            Effect: "Allow",
            Resource: ["arn:aws:execute-api:eu-north-1:495599741675:335m87qluc/*/POST/pools/schedule",
            "arn:aws:execute-api:eu-north-1:495599741675:ny1y2b50jh/*/POST/async-rpc"
          ]
          }
        ]
      }
    };

  } catch (error) {
    console.error("Authorization error:", error);

    return {
      principalId: "error",
      policyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: "execute-api:Invoke",
            Effect: "Deny",
            Resource: "*"
          }
        ]
      }
    };
  }
};

const FLUTTERWAVE_SECRET_HASH = process.env.FLUTTERWAVE_SECRET_HASH;

export const handler = async (event) => {
  const methodArn = event.methodArn;
  const receivedHash =
    event.headers?.['verif-hash'] ||
    event.headers?.['Verif-Hash'] ||
    event.headers?.['VERIF-HASH'];

  if (!FLUTTERWAVE_SECRET_HASH) {
    console.error('Missing FLUTTERWAVE_SECRET_HASH environment variable');
    return generatePolicy('unauthorized', 'Deny', methodArn);
  }

  if (!receivedHash || receivedHash !== FLUTTERWAVE_SECRET_HASH) {
    console.warn('Invalid or missing verif-hash');
    return generatePolicy('unauthorized', 'Deny', methodArn);
  }

  console.log('Verified');
  // Valid request from Flutterwave
  return generatePolicy('flutterwave', 'Allow', methodArn, {
    source: 'flutterwave',
    verified: 'true',
  });
};

function generatePolicy(principalId, effect, resource, context = {}) {
  return {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [{
        Action: 'execute-api:Invoke',
        Effect: effect,
        Resource: resource,
      }],
    },
    context,
  };
}


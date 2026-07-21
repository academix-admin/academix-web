import jwt from 'jsonwebtoken';

// Your Supabase secret key
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;


export const handler = async (event) => {
  const token = extractToken(event);
  if (!token) {
    console.warn('Authorization header missing or malformed');
    return generatePolicy('unauthorized', 'Deny', event.methodArn);
  }

  console.log('Received token:', token);

  try {
    const decoded = await verifyToken(token);
    console.log('Arn:', event.methodArn);
    console.log('Token verified:', decoded);

    return generatePolicy(decoded.sub, 'Allow', event.methodArn, {
      user_id: decoded.sub,
      email: decoded.email || '',
      role: decoded.role || '',
      iss: decoded.iss || '',
    });

  } catch (err) {
    console.error('JWT verification failed:', err.message || err);
    return generatePolicy('unauthorized', 'Deny', event.methodArn);
  }
};

function verifyToken(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, SUPABASE_SECRET_KEY, { algorithms: ['HS256'] }, (err, decoded) => {
      if (err) return reject(err);
      resolve(decoded);
    });
  });
}

function extractToken(event) {
  const authHeader = event.headers?.authorization || event.headers?.Authorization;
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  return parts.length === 2 && parts[0] === 'Bearer' ? parts[1] : null;
}

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

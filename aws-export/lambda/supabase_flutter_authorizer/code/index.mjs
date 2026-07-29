import jwt from 'jsonwebtoken';

// Your Supabase secret key
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

export const handler = async (event) => {
  const token = extractToken(event);
  if (!token) {
    console.warn('Authorization header missing or malformed');
    return generatePolicy('unauthorized', 'Deny', event.methodArn);
  }

  try {
    const decoded = await verifyToken(token);

    // Geolocate the REAL client IP once, here, so every downstream Lambda gets `country` for free
    // (alongside user_id) — no per-Lambda ip-api call. FAIL-OPEN: any geo hiccup → '' (never blocks
    // auth); gate_check then falls back to the user's registration country.
    const sourceIp = event.requestContext?.identity?.sourceIp
      || (event.headers?.['X-Forwarded-For'] || event.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
    const country = await ipCountry(sourceIp);

    // WILDCARD resource — the authorizer response is CACHED per-JWT (cacheTtl), so the Allow policy
    // must cover EVERY method/resource in the stage; a per-methodArn policy would 403 the next
    // different endpoint the same token hits.
    return generatePolicy(decoded.sub, 'Allow', stageWildcard(event.methodArn), {
      user_id: decoded.sub,
      email: decoded.email || '',
      role: decoded.role || '',
      iss: decoded.iss || '',
      // session_id lets downstream Lambdas extend the app-lock window (session_unlock) and check
      // liveness. NOTE: this authorizer response is CACHED per-JWT, so revocation must be checked in
      // the (uncached) handler, not here.
      session_id: decoded.session_id || '',
      country,
      source_ip: sourceIp || '',
    });
  } catch (err) {
    console.error('JWT verification failed:', err.message || err);
    return generatePolicy('unauthorized', 'Deny', event.methodArn);
  }
};

// Best-effort IP → ISO-2 country (lowercase). Short timeout + fail-open so it never blocks auth.
async function ipCountry(ip) {
  if (!ip || /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|127\.|::1)/.test(ip)) return '';
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2000);
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,countryCode`, { signal: ctrl.signal });
    clearTimeout(timer);
    const j = await res.json();
    return j.status === 'success' && j.countryCode ? String(j.countryCode).toLowerCase() : '';
  } catch {
    return '';
  }
}

// arn:aws:execute-api:region:acct:apiId/stage/METHOD/path  →  arn:...:apiId/stage/*/*
function stageWildcard(methodArn) {
  try {
    const parts = methodArn.split(':');
    const [apiId, stage] = parts[5].split('/');
    return `${parts.slice(0, 5).join(':')}:${apiId}/${stage}/*/*`;
  } catch {
    return methodArn;
  }
}

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

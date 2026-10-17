// supabase-authorization-checker, v2 (prepared 2026-10-17; replaces code/index.mjs at runbook step B1).
//
// Changes from v1:
//   * Never logs the received or the expected token. v1 printed both on every call (H5), so the
//     token sat in CloudWatch, in a log group with no retention.
//   * Constant-time comparison.
//   * Accepts BEARER_TOKEN, or BEARER_TOKEN_NEXT while a rotation is in progress, so the token in
//     Vault and the one here can change without a window where the pool scheduler is refused.
// Unchanged: the header is parsed exactly as v1 did (the text after the first space), and the
// Allow/Deny policies cover the same two resources.
import { timingSafeEqual } from 'node:crypto';

const RESOURCES = [
  'arn:aws:execute-api:eu-north-1:495599741675:335m87qluc/*/POST/pools/schedule',
  'arn:aws:execute-api:eu-north-1:495599741675:ny1y2b50jh/*/POST/async-rpc',
];

function sameToken(given, expected) {
  if (!given || !expected) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function policy(principalId, effect, resource) {
  return {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [{ Action: 'execute-api:Invoke', Effect: effect, Resource: resource }],
    },
  };
}

export const handler = async (event) => {
  try {
    const header = event.headers?.Authorization || event.headers?.authorization || '';
    const token = header.split(' ')[1];
    const allowed = sameToken(token, process.env.BEARER_TOKEN)
                 || sameToken(token, process.env.BEARER_TOKEN_NEXT);
    if (!allowed) {
      console.warn('Denied: bearer token missing or not recognised');
      return policy('none', 'Deny', RESOURCES);
    }
    return policy('supabase', 'Allow', RESOURCES);
  } catch (error) {
    console.error('Authorization error:', error?.message);
    return policy('error', 'Deny', '*');
  }
};

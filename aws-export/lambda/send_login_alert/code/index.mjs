// send_login_alert — emails the user on a new sign-in (Workstream G3).
// Triggered via pg_net.http_post to this Lambda's Function URL by TWO Postgres signals per session:
//   • 'new_session'    — AFTER INSERT trigger on auth.sessions (fires immediately; no device name).
//   • 'session_device' — register_session_device() after the client reports its friendly device name
//                        (fires ~1-2s later; carries device_name, platform, is_known_device).
// We send exactly ONE email per session, preferring the enriched 'session_device' signal so the
// email shows the real device name. Dedup is a claim on public.session_devices.alerted_at.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SES_SENDER, NOTIFY_SECRET.
// Execution role needs ses:SendEmail. SES must be out of sandbox to reach arbitrary users.

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const ses = new SESClient({ region: process.env.AWS_REGION || 'eu-north-1' });
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SENDER = process.env.SES_SENDER;
const SECRET = process.env.NOTIFY_SECRET;

// Grace period the 'new_session' fallback waits for the enriched 'session_device' signal to arrive.
const FALLBACK_GRACE_MS = 6000;

function describeDevice(ua) {
  if (!ua) return 'Unknown device';
  const os = /iPhone|iPad|iPod/i.test(ua) ? 'iOS'
    : /Android/i.test(ua) ? 'Android'
    : /Windows/i.test(ua) ? 'Windows'
    : /CrOS/i.test(ua) ? 'ChromeOS'
    : /Mac OS X|Macintosh/i.test(ua) ? 'macOS'
    : /Linux/i.test(ua) ? 'Linux' : '';
  const browser = /EdgiOS|EdgA|Edg\//i.test(ua) ? 'Edge'
    : /CriOS|Chrome\//i.test(ua) ? 'Chrome'
    : /FxiOS|Firefox\//i.test(ua) ? 'Firefox'
    : /OPiOS|OPR\/|Opera/i.test(ua) ? 'Opera'
    : /Safari\//i.test(ua) ? 'Safari' : 'Browser';
  return [browser, os].filter(Boolean).join(' · ');
}

const sbHeaders = { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}`, 'Content-Type': 'application/json' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Atomically claim the single email for this session (PostgREST PATCH ... alerted_at IS NULL).
// Returns true iff THIS call won the claim and should send.
async function claimAlert(sessionId) {
  if (!sessionId) return true; // no session_id (legacy payload) — can't dedup, just send.
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/session_devices?session_id=eq.${sessionId}&alerted_at=is.null`,
      { method: 'PATCH', headers: { ...sbHeaders, Prefer: 'return=representation' },
        body: JSON.stringify({ alerted_at: new Date().toISOString() }) }
    );
    const rows = await res.json();
    return Array.isArray(rows) && rows.length > 0;
  } catch { return false; }
}

// Fallback claim when the client never registered a device (no session_devices row exists yet):
// insert a minimal row so the basic email is sent at most once. Returns true iff we created it.
async function claimFallback(sessionId, userId) {
  if (!sessionId) return true;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/session_devices`, {
      method: 'POST',
      headers: { ...sbHeaders, Prefer: 'return=representation,resolution=ignore-duplicates' },
      body: JSON.stringify({ session_id: sessionId, user_id: userId, alerted_at: new Date().toISOString() }),
    });
    const rows = await res.json();
    return Array.isArray(rows) && rows.length > 0;
  } catch { return false; }
}

async function sendEmail({ email, device, place, ip, when, known }) {
  const rows = [
    ['Device', device],
    ['Location', place || 'Unknown'],
    ['IP address', ip || 'Unknown'],
    ['Time', when],
  ];
  const recognised = known
    ? `This is a device you've used before.`
    : `This looks like a new device.`;
  const text =
    `New sign-in to your Academix account\n\n` +
    `${recognised}\n\n` +
    rows.map(([k, v]) => `${k}: ${v}`).join('\n') +
    `\n\nIf this was you, no action is needed. If you don't recognise it, open Academix ` +
    `→ Profile → Devices & sessions, log out that device, and change your password.`;
  const html =
    `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;color:#0f172a">
      <h2 style="color:#1c6b1e;margin:0 0 8px">New sign-in to your Academix account</h2>
      <p style="color:#475569;margin:0 0 16px">${recognised} If this was you, you can ignore this email.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        ${rows.map(([k, v]) => `<tr><td style="padding:6px 0;color:#64748b;width:110px">${k}</td><td style="padding:6px 0;font-weight:600">${v}</td></tr>`).join('')}
      </table>
      <p style="color:#475569;margin:16px 0 0;font-size:13px">Don't recognise this? Open Academix → Profile → Devices &amp; sessions, log out that device, and change your password.</p>
    </div>`;
  await ses.send(new SendEmailCommand({
    Source: SENDER,
    Destination: { ToAddresses: [email] },
    Message: { Subject: { Data: 'New sign-in to your Academix account' }, Body: { Text: { Data: text }, Html: { Data: html } } },
  }));
}

export const handler = async (event) => {
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : (event.body ?? event);
    if (!SECRET || body?.secret !== SECRET) return { statusCode: 401, body: 'unauthorized' };

    const evt = body.event || 'new_session';
    const { user_id, session_id, ip, user_agent, created_at, device_name, platform, is_known_device } = body;
    if (!user_id) return { statusCode: 400, body: 'missing user_id' };

    // The enriched signal is the preferred email; the immediate one only sends as a fallback if no
    // enriched signal arrives within the grace window (client never reported a device name).
    if (evt === 'new_session') {
      await sleep(FALLBACK_GRACE_MS);
      const mine = await claimFallback(session_id, user_id);
      if (!mine) return { statusCode: 200, body: 'superseded-by-session_device' };
    } else { // 'session_device'
      const mine = await claimAlert(session_id);
      if (!mine) return { statusCode: 200, body: 'already-alerted' };
    }

    // user email (GoTrue admin API)
    const uRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user_id}`, { headers: sbHeaders });
    const user = await uRes.json();
    const email = user?.email;
    if (!email) return { statusCode: 200, body: 'no-email' };

    // geolocate IP → city, country (best-effort)
    let place = '';
    try {
      if (ip) {
        const g = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,city`);
        const gj = await g.json();
        if (gj.status === 'success') place = [gj.city, gj.country].filter(Boolean).join(', ');
      }
    } catch { /* ignore */ }

    // Prefer the friendly registered device name; fall back to parsing the user agent.
    const device = (device_name && String(device_name).trim()) || describeDevice(user_agent);
    const when = created_at ? new Date(created_at).toUTCString() : new Date().toUTCString();

    await sendEmail({ email, device, place, ip, when, known: is_known_device === true });
    return { statusCode: 200, body: 'sent' };
  } catch (e) {
    console.error('send_login_alert error', e);
    return { statusCode: 500, body: String(e?.message || e) };
  }
};

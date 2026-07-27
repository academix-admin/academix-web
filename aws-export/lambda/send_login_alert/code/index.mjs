// send_login_alert — emails the user on a new sign-in (Workstream G3).
// Triggered by a Postgres AFTER INSERT trigger on auth.sessions via pg_net.http_post to this
// Lambda's Function URL. No bundled deps: AWS SDK v3 is in the Node 20 runtime, fetch is global.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SES_SENDER, NOTIFY_SECRET.
// Execution role needs ses:SendEmail. SES must be out of sandbox to reach arbitrary users.

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const ses = new SESClient({ region: process.env.AWS_REGION || 'eu-north-1' });
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SENDER = process.env.SES_SENDER;
const SECRET = process.env.NOTIFY_SECRET;

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

export const handler = async (event) => {
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : (event.body ?? event);
    if (!SECRET || body?.secret !== SECRET) return { statusCode: 401, body: 'unauthorized' };

    const { user_id, ip, user_agent, created_at } = body;
    if (!user_id) return { statusCode: 400, body: 'missing user_id' };

    // 1) user email (GoTrue admin API)
    const uRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user_id}`, {
      headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` },
    });
    const user = await uRes.json();
    const email = user?.email;
    if (!email) return { statusCode: 200, body: 'no-email' };

    // 2) geolocate IP (best-effort)
    let place = '';
    try {
      if (ip) {
        const g = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,city`);
        const gj = await g.json();
        if (gj.status === 'success') place = [gj.city, gj.country].filter(Boolean).join(', ');
      }
    } catch { /* ignore */ }

    const device = describeDevice(user_agent);
    const when = created_at ? new Date(created_at).toUTCString() : new Date().toUTCString();
    const rows = [
      ['Device', device],
      ['Location', place || 'Unknown'],
      ['IP address', ip || 'Unknown'],
      ['Time', when],
    ];

    const text =
      `New sign-in to your Academix account\n\n` +
      rows.map(([k, v]) => `${k}: ${v}`).join('\n') +
      `\n\nIf this was you, no action is needed. If you don't recognise it, open Academix ` +
      `→ Profile → Devices & sessions, log out that device, and change your password.`;

    const html =
      `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;color:#0f172a">
        <h2 style="color:#1c6b1e;margin:0 0 8px">New sign-in to your Academix account</h2>
        <p style="color:#475569;margin:0 0 16px">We noticed a new sign-in. If this was you, you can ignore this email.</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          ${rows.map(([k, v]) => `<tr><td style="padding:6px 0;color:#64748b;width:110px">${k}</td><td style="padding:6px 0;font-weight:600">${v}</td></tr>`).join('')}
        </table>
        <p style="color:#475569;margin:16px 0 0;font-size:13px">Don't recognise this? Open Academix → Profile → Devices &amp; sessions, log out that device, and change your password.</p>
      </div>`;

    await ses.send(new SendEmailCommand({
      Source: SENDER,
      Destination: { ToAddresses: [email] },
      Message: {
        Subject: { Data: 'New sign-in to your Academix account' },
        Body: { Text: { Data: text }, Html: { Data: html } },
      },
    }));

    return { statusCode: 200, body: 'sent' };
  } catch (e) {
    console.error('send_login_alert error', e);
    return { statusCode: 500, body: String(e?.message || e) };
  }
};

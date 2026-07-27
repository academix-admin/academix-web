import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * Verify a user's 6-digit money PIN (idle app-lock, workstream G1).
 *
 * Forwards to the same AWS Lambda the rest of the PIN flow uses (`verify_academix_pin`, now
 * exposed at /prod/pin/verify) — ONE source of truth for the bcrypt check + 5-attempt/15-min
 * lockout, consistent with /pin/new and /pin/change.
 *
 * The user id is derived from the VERIFIED Supabase JWT here (not trusted from the client), so
 * a caller can't ask the Lambda to verify a PIN against someone else's account id.
 */

export const runtime = 'nodejs';

const VERIFY_URL = 'https://fz0b8vmhba.execute-api.eu-north-1.amazonaws.com/prod/pin/verify';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const jwt = authHeader?.replace(/^Bearer\s+/i, '').trim();
    if (!jwt) return NextResponse.json({ success: false, message: 'Authorization required' }, { status: 401, headers: CORS });

    const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(jwt);
    if (userErr || !userRes.user) return NextResponse.json({ success: false, message: 'Invalid session' }, { status: 401, headers: CORS });

    const { pin } = await request.json();
    if (!pin) return NextResponse.json({ success: false, message: 'Missing fields' }, { status: 400, headers: CORS });

    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userRes.user.id, pin }),
    });
    const data = await res.json().catch(() => ({ success: false, message: 'Bad upstream response' }));
    return NextResponse.json(data, { status: res.status, headers: CORS });
  } catch (e) {
    return NextResponse.json({ success: false, message: e instanceof Error ? e.message : 'Internal error' }, { status: 500, headers: CORS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS });
}

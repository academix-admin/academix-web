import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * Profile creation for a social (OAuth) user.
 *
 * Unlike /api/create-user (which forwards to a Lambda that CREATES the Supabase auth user
 * from email+password), the auth user here ALREADY exists — Supabase created it during the
 * Google OAuth handshake (and auto-linked it to any prior email/password account with the
 * same verified email, so it's one person). So we skip auth-user creation + password and
 * just attach the academix profile to the authenticated user's id, mirroring the Lambda's
 * data shape: role-verify → users_table → personal.users_balance_table → PIN.
 *
 * Identity is taken from the caller's Supabase JWT (never trusted from the body).
 */

const PIN_NEW_URL = 'https://fz0b8vmhba.execute-api.eu-north-1.amazonaws.com/prod/pin/new';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface Body {
  users_phone: string;
  users_dob: string;
  users_sex: string;
  users_username: string;
  users_names: string;
  country_id: string;
  language_id: string;
  users_referred_id?: string | null;
  roles_id: string;
  users_pin: string;
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const jwt = authHeader?.replace(/^Bearer\s+/i, '').trim();
    if (!jwt) {
      return NextResponse.json({ success: false, message: 'Authorization required' }, { status: 401, headers: CORS });
    }

    // Identity from the verified token — NOT from the body.
    const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(jwt);
    if (userErr || !userRes.user) {
      return NextResponse.json({ success: false, message: 'Invalid session' }, { status: 401, headers: CORS });
    }
    const authUser = userRes.user;
    const userId = authUser.id;
    const users_email = authUser.email;

    const body: Body = await request.json();
    const {
      users_phone, users_dob, users_sex, users_username, users_names,
      country_id, language_id, users_referred_id, roles_id, users_pin,
    } = body;

    if (!users_email || !users_pin || !users_username || !users_phone || !users_names || !roles_id) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400, headers: CORS });
    }

    // Idempotency: if a profile already exists for this auth user, don't double-insert.
    const { data: existing } = await supabaseAdmin
      .from('users_table')
      .select('users_id')
      .eq('users_id', userId)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ success: false, message: 'Profile already exists', code: 'PROFILE_EXISTS' }, { status: 409, headers: CORS });
    }

    // Role verification (same RPC the Lambda uses).
    const { data: roleData, error: roleError } = await supabaseAdmin.rpc('check_role_verification', { p_roles_id: roles_id });
    if (roleError) {
      return NextResponse.json({ success: false, message: `RPC failed: ${roleError.message}` }, { status: 400, headers: CORS });
    }
    if (roleData?.status !== 'RolesVerification.success') {
      return NextResponse.json({ success: false, message: `Role verification failed: ${roleData?.error}` }, { status: 400, headers: CORS });
    }
    const { verification, roles_id: verified_role_id, roles_checker, roles_level, roles_access } = roleData.data;

    const userData = {
      users_id: userId,
      users_username,
      users_names,
      users_email,
      users_phone,
      users_dob,
      users_sex,
      users_login_type: 'UserLoginType.email',
      users_image: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null,
      users_referred_id: users_referred_id || null,
      users_verified: verification,
      country_id,
      language_id,
      users_created_at: new Date().toISOString(),
    };

    const { error: usersError } = await supabaseAdmin
      .from('users_table')
      .insert([{
        ...userData,
        roles_id: verified_role_id,
        users_roles_access: roles_access,
        users_referred_status: users_referred_id ? 'Referral.active' : 'Referral.none',
      }]);

    const { error: balanceError } = await supabaseAdmin
      .schema('personal')
      .from('users_balance_table')
      .insert({ users_id: userId });

    if (usersError || balanceError) {
      // Roll back the profile row — but NEVER delete the auth user (it's the user's Google
      // identity; deleting it would orphan their sign-in). Just undo what we inserted.
      await supabaseAdmin.from('users_table').delete().eq('users_id', userId);
      await supabaseAdmin.schema('personal').from('users_balance_table').delete().eq('users_id', userId);
      return NextResponse.json(
        { success: false, message: `Failed to insert user data: ${usersError?.message || balanceError?.message}` },
        { status: 500, headers: CORS },
      );
    }

    // Create the PIN (same AWS endpoint /api/pin/new uses), authorized as this user.
    try {
      const pinRes = await fetch(PIN_NEW_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, userPin: users_pin }),
      });
      const pinJson = await pinRes.json().catch(() => ({}));
      if (!pinRes.ok || pinJson?.success === false) {
        console.error('PIN creation failed for OAuth user:', pinJson);
      }
    } catch (pinError) {
      console.error('Error calling PIN endpoint:', pinError);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'User registered successfully',
        user: {
          ...userData,
          roles_table: { roles_id, roles_level, roles_checker, roles_access },
        },
      },
      { status: 200, headers: CORS },
    );
  } catch (error) {
    console.error('[create-oauth-user] error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: CORS },
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS });
}

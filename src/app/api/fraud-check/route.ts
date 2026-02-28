import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface FraudCheckRequest {
  userId: string;
  poolId: string;
  deviceFingerprint: string;
  ipAddress: string;
  userAgent: string;
  action: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: FraudCheckRequest = await request.json();
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown';

    const fraudCheck = await performFraudCheck({
      ...body,
      ipAddress,
    }, supabase);

    await logFraudCheck(body.userId, body.poolId, fraudCheck, supabase);

    return NextResponse.json(fraudCheck);
  } catch (error) {
    console.error('Fraud check error:', error);
    return NextResponse.json(
      { allowed: true, riskScore: 0, reasons: [], requiresVerification: false },
      { status: 200 }
    );
  }
}

async function performFraudCheck(data: FraudCheckRequest, supabase: any) {
  let riskScore = 0;
  const reasons: string[] = [];

  // Rule 1: Multiple accounts from same device
  const { count: deviceCount } = await supabase
    .from('fraud_logs')
    .select('*', { count: 'exact', head: true })
    .eq('device_fingerprint', data.deviceFingerprint)
    .neq('user_id', data.userId)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  if (deviceCount && deviceCount > 2) {
    riskScore += 30;
    reasons.push('Multiple accounts detected from same device');
  }

  // Rule 2: Multiple accounts from same IP
  const { count: ipCount } = await supabase
    .from('fraud_logs')
    .select('*', { count: 'exact', head: true })
    .eq('ip_address', data.ipAddress)
    .neq('user_id', data.userId)
    .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

  if (ipCount && ipCount > 3) {
    riskScore += 25;
    reasons.push('Multiple accounts from same IP');
  }

  // Rule 3: Rapid submissions
  const { count: recentActions } = await supabase
    .from('fraud_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', data.userId)
    .eq('action', data.action)
    .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());

  if (recentActions && recentActions > 10) {
    riskScore += 40;
    reasons.push('Suspicious activity rate');
  }

  // Rule 4: New account check
  const { data: userData } = await supabase
    .from('users_table')
    .select('users_created_at')
    .eq('users_id', data.userId)
    .single();

  if (userData) {
    const accountAge = Date.now() - new Date(userData.users_created_at).getTime();
    const hoursSinceCreation = accountAge / (1000 * 60 * 60);
    
    if (hoursSinceCreation < 1 && data.action === 'withdraw') {
      riskScore += 50;
      reasons.push('New account attempting withdrawal');
    }
  }

  // Rule 5: Same pool, multiple devices
  if (data.action === 'join_pool') {
    const { count: poolDeviceCount } = await supabase
      .from('fraud_logs')
      .select('*', { count: 'exact', head: true })
      .eq('pool_id', data.poolId)
      .eq('user_id', data.userId)
      .neq('device_fingerprint', data.deviceFingerprint);

    if (poolDeviceCount && poolDeviceCount > 0) {
      riskScore += 35;
      reasons.push('Multiple devices for same quiz');
    }
  }

  const allowed = riskScore < 50;
  const requiresVerification = riskScore >= 30 && riskScore < 50;

  return {
    allowed,
    riskScore,
    reasons,
    requiresVerification,
  };
}

async function logFraudCheck(
  userId: string,
  poolId: string,
  result: any,
  supabase: any
) {
  await supabase.from('fraud_logs').insert({
    user_id: userId,
    pool_id: poolId,
    risk_score: result.riskScore,
    allowed: result.allowed,
    reasons: result.reasons,
  });
}

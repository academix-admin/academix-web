# Anti-Fraud System Implementation Guide

## 📋 Overview
This anti-fraud system protects Academix from:
- Multiple account abuse
- Collusion between players
- Rapid automated submissions
- New account fraud
- Device/IP spoofing

## 🚀 Implementation Steps

### Step 1: Database Setup (Supabase)

1. Go to your Supabase Dashboard → SQL Editor
2. Run the migration file: `database/migrations/fraud_detection.sql`
3. Verify tables created:
   - `fraud_logs` - Stores all fraud checks
   - `suspicious_activities` - Flags high-risk users

### Step 2: Environment Variables

Already configured in `.env.local`:
```
SUPABASE_URL=<your_url>
SUPABASE_SERVICE_ROLE_KEY=<your_key>
```

### Step 3: Test the System

#### Test Device Fingerprinting:
```typescript
import { FraudDetectionService } from '@/utils/fraudDetection';

// Initialize on app load
await FraudDetectionService.initialize();

// Get fingerprint
const fingerprint = FraudDetectionService.getDeviceFingerprint();
console.log('Device Fingerprint:', fingerprint);
```

#### Test Fraud Check:
```typescript
const result = await FraudDetectionService.checkAction(
  'user-id-here',
  'pool-id-here',
  'submit_question'
);

console.log('Fraud Check Result:', result);
// { allowed: true, riskScore: 0, reasons: [], requiresVerification: false }
```

### Step 4: Integration Points

#### A. Quiz Submission (Already Integrated)
File: `src/app/(secondary)/quiz/[poolsId]/page.tsx`
- Fraud check runs before every question submission
- Blocks submission if risk score >= 50

#### B. Pool Join (Add this)
```typescript
// In your pool join logic
const fraudCheck = await FraudDetectionService.checkAction(
  userData.usersId,
  poolId,
  'join_pool'
);

if (!fraudCheck.allowed) {
  alert('Unable to join quiz. Please contact support.');
  return;
}
```

#### C. Withdrawal (Add this)
```typescript
// In your withdrawal logic
const fraudCheck = await FraudDetectionService.checkAction(
  userData.usersId,
  'withdrawal-id',
  'withdraw'
);

if (!fraudCheck.allowed) {
  alert('Withdrawal requires verification. Please contact support.');
  return;
}
```

## 🔍 Fraud Detection Rules

### Rule 1: Multiple Accounts from Same Device
- **Trigger**: >2 different accounts from same device in 24 hours
- **Risk Score**: +30
- **Action**: Flag for review

### Rule 2: Multiple Accounts from Same IP
- **Trigger**: >3 different accounts from same IP in 1 hour
- **Risk Score**: +25
- **Action**: Flag for review

### Rule 3: Rapid Submissions
- **Trigger**: >10 actions of same type in 5 minutes
- **Risk Score**: +40
- **Action**: Block temporarily

### Rule 4: New Account Withdrawal
- **Trigger**: Account <1 hour old attempting withdrawal
- **Risk Score**: +50
- **Action**: Block and require verification

### Rule 5: Multiple Devices for Same Quiz
- **Trigger**: Same user, same quiz, different devices
- **Risk Score**: +35
- **Action**: Flag for review

## 📊 Risk Score Thresholds

- **0-29**: Low risk - Allow
- **30-49**: Medium risk - Allow with verification flag
- **50-69**: High risk - Block action
- **70+**: Critical risk - Block and auto-flag for admin review

## 🛠️ Admin Dashboard Queries

### View High-Risk Users
```sql
SELECT * FROM suspicious_activities 
WHERE status = 'pending' 
ORDER BY severity DESC, created_at DESC;
```

### View Fraud Analytics
```sql
SELECT * FROM fraud_analytics 
WHERE avg_risk_score > 30 
ORDER BY max_risk_score DESC;
```

### View Recent Fraud Logs
```sql
SELECT 
  fl.*,
  u.users_username,
  u.users_email
FROM fraud_logs fl
JOIN users_table u ON fl.user_id = u.users_id
WHERE fl.created_at > NOW() - INTERVAL '24 hours'
ORDER BY fl.risk_score DESC;
```

## 🔧 Customization

### Adjust Risk Thresholds
Edit `src/app/api/fraud-check/route.ts`:

```typescript
// Change device count threshold
if (deviceCount && deviceCount > 5) { // Was 2
  riskScore += 20; // Was 30
  reasons.push('Multiple accounts detected from same device');
}
```

### Add New Rules
```typescript
// Rule 6: Suspicious timing patterns
const { data: timingData } = await supabase
  .from('fraud_logs')
  .select('created_at')
  .eq('user_id', data.userId)
  .order('created_at', { ascending: false })
  .limit(10);

if (timingData && timingData.length >= 5) {
  const intervals = [];
  for (let i = 1; i < timingData.length; i++) {
    const diff = new Date(timingData[i-1].created_at).getTime() - 
                 new Date(timingData[i].created_at).getTime();
    intervals.push(diff);
  }
  
  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  
  // If actions are too regular (bot-like)
  if (avgInterval < 2000) { // Less than 2 seconds apart
    riskScore += 45;
    reasons.push('Bot-like behavior detected');
  }
}
```

## 🧪 Testing Scenarios

### Test 1: Normal User
```bash
# Should pass all checks
curl -X POST http://localhost:3000/api/fraud-check \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-1",
    "poolId": "pool-1",
    "deviceFingerprint": "abc123",
    "userAgent": "Mozilla/5.0...",
    "action": "submit_question"
  }'
```

### Test 2: Multiple Accounts
```bash
# Run 3 times with different userIds, same deviceFingerprint
# 4th request should be flagged
```

### Test 3: Rapid Submissions
```bash
# Run 11 times quickly with same userId and action
# Should be blocked
```

## 📈 Monitoring

### Key Metrics to Track
1. **Fraud Detection Rate**: % of actions flagged
2. **False Positive Rate**: Legitimate users blocked
3. **Average Risk Score**: Trending up = more fraud attempts
4. **Unique Devices per User**: >3 = suspicious

### Alerts to Set Up
- Email when suspicious_activities has new 'critical' severity
- Slack notification when >10 users blocked in 1 hour
- Daily report of fraud analytics

## 🔒 Security Best Practices

1. **Never expose fraud rules to client**: Keep logic server-side
2. **Rotate fingerprinting algorithm**: Change canvas text monthly
3. **Monitor for false positives**: Review blocked legitimate users
4. **Update rules based on patterns**: Adapt to new fraud techniques
5. **Log everything**: Audit trail for disputes

## 🚨 Incident Response

### If Fraud Detected:
1. Check `suspicious_activities` table
2. Review user's `fraud_logs` history
3. Check `fraud_analytics` for patterns
4. Suspend account if risk_score > 80
5. Manual review for accounts with 50-80 risk score

### If False Positive:
1. Update `suspicious_activities.status = 'false_positive'`
2. Whitelist user temporarily
3. Adjust rule thresholds
4. Notify user of resolution

## 📝 Next Steps

1. ✅ Run database migration
2. ✅ Test fraud detection API
3. ✅ Integrate into pool join flow
4. ✅ Integrate into withdrawal flow
5. ⬜ Set up admin dashboard
6. ⬜ Configure monitoring alerts
7. ⬜ Train support team on fraud handling
8. ⬜ Document user appeal process

## 🆘 Troubleshooting

### Issue: Fraud check always returns allowed=true
- Check if `fraud_logs` table exists
- Verify Supabase service role key is correct
- Check API route logs for errors

### Issue: All users getting blocked
- Risk thresholds too low
- Check if test data is polluting production
- Review rule logic in `performFraudCheck()`

### Issue: Device fingerprint not generating
- Check browser compatibility (needs crypto.subtle)
- Verify HTTPS (required for crypto API)
- Check console for errors

## 📚 Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Device Fingerprinting Best Practices](https://fingerprintjs.com/blog/)
- [Fraud Detection Patterns](https://stripe.com/docs/disputes/prevention)

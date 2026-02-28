# 🛡️ Anti-Fraud System - Quick Reference

## Files Created

```
src/
├── utils/
│   ├── deviceFingerprint.ts      # Device fingerprinting
│   └── fraudDetection.ts         # Client-side fraud service
├── models/
│   └── fraud-model.ts            # TypeScript types
└── app/
    └── api/
        └── fraud-check/
            └── route.ts          # Fraud detection API

database/
└── migrations/
    └── fraud_detection.sql       # Database schema

FRAUD_DETECTION_GUIDE.md          # Full documentation
```

## Quick Start

### 1. Run Database Migration
```sql
-- Copy contents of database/migrations/fraud_detection.sql
-- Paste into Supabase SQL Editor
-- Execute
```

### 2. Test API
```bash
# Start dev server
npm run dev

# Test endpoint
curl http://localhost:3000/api/fraud-check -X POST \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","poolId":"test","deviceFingerprint":"test","userAgent":"test","action":"submit_question"}'
```

### 3. Integration Example
```typescript
import { FraudDetectionService } from '@/utils/fraudDetection';

// Check before critical action
const check = await FraudDetectionService.checkAction(
  userId,
  poolId,
  'submit_question' // or 'join_pool' or 'withdraw'
);

if (!check.allowed) {
  // Block action
  alert('Action blocked for security reasons');
  return;
}

// Proceed with action
```

## Risk Scores

| Score | Level | Action |
|-------|-------|--------|
| 0-29  | Low   | ✅ Allow |
| 30-49 | Medium| ⚠️ Allow + Flag |
| 50-69 | High  | 🚫 Block |
| 70+   | Critical | 🚨 Block + Auto-report |

## Fraud Rules

1. **Multiple Devices** (+30): >2 accounts, same device, 24h
2. **Multiple IPs** (+25): >3 accounts, same IP, 1h
3. **Rapid Actions** (+40): >10 actions, 5 minutes
4. **New Account** (+50): <1h old, attempting withdrawal
5. **Device Switching** (+35): Same quiz, different devices

## Admin Queries

```sql
-- View flagged users
SELECT * FROM suspicious_activities WHERE status='pending';

-- View fraud stats
SELECT * FROM fraud_analytics WHERE avg_risk_score > 30;

-- Recent high-risk actions
SELECT * FROM fraud_logs WHERE risk_score > 50 ORDER BY created_at DESC;
```

## Next Steps

- [ ] Run database migration
- [ ] Test fraud API endpoint
- [ ] Add to pool join flow
- [ ] Add to withdrawal flow
- [ ] Set up monitoring
- [ ] Train support team

## Support

See `FRAUD_DETECTION_GUIDE.md` for full documentation.

-- Fraud Detection Tables Migration
-- Run this in your Supabase SQL Editor

-- 1. Create fraud_logs table
CREATE TABLE IF NOT EXISTS fraud_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users_table(users_id) ON DELETE CASCADE,
  pool_id UUID REFERENCES pools_table(pools_id) ON DELETE SET NULL,
  device_fingerprint TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  action TEXT NOT NULL CHECK (action IN ('join_pool', 'submit_question', 'withdraw')),
  risk_score INTEGER NOT NULL DEFAULT 0,
  allowed BOOLEAN NOT NULL DEFAULT true,
  reasons TEXT[],
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create indexes for performance
CREATE INDEX idx_fraud_logs_user_id ON fraud_logs(user_id);
CREATE INDEX idx_fraud_logs_device_fingerprint ON fraud_logs(device_fingerprint);
CREATE INDEX idx_fraud_logs_ip_address ON fraud_logs(ip_address);
CREATE INDEX idx_fraud_logs_pool_id ON fraud_logs(pool_id);
CREATE INDEX idx_fraud_logs_created_at ON fraud_logs(created_at DESC);
CREATE INDEX idx_fraud_logs_action ON fraud_logs(action);

-- 3. Create suspicious_activities table for flagged users
CREATE TABLE IF NOT EXISTS suspicious_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users_table(users_id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'false_positive')),
  reviewed_by UUID REFERENCES users_table(users_id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create indexes for suspicious_activities
CREATE INDEX idx_suspicious_activities_user_id ON suspicious_activities(user_id);
CREATE INDEX idx_suspicious_activities_status ON suspicious_activities(status);
CREATE INDEX idx_suspicious_activities_severity ON suspicious_activities(severity);
CREATE INDEX idx_suspicious_activities_created_at ON suspicious_activities(created_at DESC);

-- 5. Create function to auto-flag suspicious users
CREATE OR REPLACE FUNCTION flag_suspicious_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.risk_score >= 70 THEN
    INSERT INTO suspicious_activities (
      user_id,
      activity_type,
      description,
      severity,
      metadata
    ) VALUES (
      NEW.user_id,
      NEW.action,
      'High risk score detected: ' || NEW.risk_score || '. Reasons: ' || array_to_string(NEW.reasons, ', '),
      CASE 
        WHEN NEW.risk_score >= 90 THEN 'critical'
        WHEN NEW.risk_score >= 70 THEN 'high'
        ELSE 'medium'
      END,
      jsonb_build_object(
        'fraud_log_id', NEW.id,
        'risk_score', NEW.risk_score,
        'reasons', NEW.reasons
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger
DROP TRIGGER IF EXISTS trigger_flag_suspicious_user ON fraud_logs;
CREATE TRIGGER trigger_flag_suspicious_user
  AFTER INSERT ON fraud_logs
  FOR EACH ROW
  EXECUTE FUNCTION flag_suspicious_user();

-- 7. Create view for fraud analytics
CREATE OR REPLACE VIEW fraud_analytics AS
SELECT 
  user_id,
  COUNT(*) as total_checks,
  AVG(risk_score) as avg_risk_score,
  MAX(risk_score) as max_risk_score,
  COUNT(CASE WHEN allowed = false THEN 1 END) as blocked_count,
  COUNT(DISTINCT device_fingerprint) as unique_devices,
  COUNT(DISTINCT ip_address) as unique_ips,
  MAX(created_at) as last_check
FROM fraud_logs
GROUP BY user_id;

-- 8. Enable Row Level Security (RLS)
ALTER TABLE fraud_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE suspicious_activities ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies (admin/manager only access)
CREATE POLICY "Admin can view fraud logs" ON fraud_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users_table u
      JOIN roles_table r ON u.roles_id = r.roles_id
      WHERE u.users_id = auth.uid() 
      AND r.roles_checker IN ('Roles.administrator', 'Roles.manager')
    )
  );

CREATE POLICY "Service role can insert fraud logs" ON fraud_logs
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admin can view suspicious activities" ON suspicious_activities
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users_table u
      JOIN roles_table r ON u.roles_id = r.roles_id
      WHERE u.users_id = auth.uid() 
      AND r.roles_checker IN ('Roles.administrator', 'Roles.manager')
    )
  );

-- 10. Grant permissions
GRANT SELECT ON fraud_analytics TO authenticated;

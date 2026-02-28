export interface FraudCheckRequest {
  userId: string;
  poolId: string;
  deviceFingerprint: string;
  ipAddress: string;
  userAgent: string;
  action: 'join_pool' | 'submit_question' | 'withdraw';
  metadata?: Record<string, any>;
}

export interface FraudCheckResponse {
  allowed: boolean;
  riskScore: number;
  reasons: string[];
  requiresVerification: boolean;
}

export interface FraudRule {
  id: string;
  name: string;
  check: (data: FraudCheckRequest, history: FraudHistory) => Promise<FraudRuleResult>;
}

export interface FraudRuleResult {
  passed: boolean;
  riskScore: number;
  reason?: string;
}

export interface FraudHistory {
  sameDeviceCount: number;
  sameIpCount: number;
  recentSubmissions: number;
  accountAge: number;
  totalQuizzes: number;
  suspiciousPatterns: string[];
}

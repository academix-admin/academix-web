import { generateDeviceFingerprint, DeviceFingerprint } from '@/utils/deviceFingerprint';

interface FraudCheckResponse {
  allowed: boolean;
  riskScore: number;
  reasons: string[];
  requiresVerification: boolean;
}

export class FraudDetectionService {
  private static deviceFingerprint: DeviceFingerprint | null = null;

  static async initialize() {
    if (!this.deviceFingerprint) {
      this.deviceFingerprint = await generateDeviceFingerprint();
    }
  }

  static async checkAction(
    userId: string,
    poolId: string,
    action: 'join_pool' | 'submit_question' | 'withdraw'
  ): Promise<FraudCheckResponse> {
    await this.initialize();

    try {
      const response = await fetch('/api/fraud-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          poolId,
          deviceFingerprint: this.deviceFingerprint!.fingerprint,
          userAgent: this.deviceFingerprint!.userAgent,
          action,
        }),
      });

      return await response.json();
    } catch (error) {
      console.error('Fraud check failed:', error);
      return {
        allowed: true,
        riskScore: 0,
        reasons: [],
        requiresVerification: false,
      };
    }
  }

  static getDeviceFingerprint(): string | null {
    return this.deviceFingerprint?.fingerprint || null;
  }
}

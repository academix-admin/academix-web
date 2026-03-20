import { generateDeviceFingerprint, DeviceFingerprint } from '@/utils/deviceFingerprint';

interface FraudCheckResponse {
  allowed: boolean;
  riskScore: number;
  reasons: string[];
  requiresVerification: boolean;
}

export class FraudDetectionService {
  private static deviceFingerprint: DeviceFingerprint | null = null;
  private static initializationPromise: Promise<void> | null = null;

  static async initialize() {
    if (this.deviceFingerprint) return;
    
    if (this.initializationPromise) {
      await this.initializationPromise;
      return;
    }

    this.initializationPromise = this.doInitialize();
    await this.initializationPromise;
  }

  private static async doInitialize() {
    try {
      console.log('[FraudDetection] Initializing device fingerprint...');
      this.deviceFingerprint = await generateDeviceFingerprint();
      console.log('[FraudDetection] Device fingerprint generated successfully');
    } catch (error) {
      console.error('[FraudDetection] Failed to initialize device fingerprint:', error);
      // Create a minimal fallback fingerprint
      this.deviceFingerprint = {
        fingerprint: 'error_fallback_' + Date.now().toString(36),
        userAgent: navigator.userAgent || 'unknown',
        screenResolution: '0x0',
        timezone: 'unknown',
        language: 'unknown',
        platform: 'unknown',
        hardwareConcurrency: 0,
        deviceMemory: undefined,
        colorDepth: 0,
        pixelRatio: 1,
        touchSupport: false,
        timestamp: Date.now(),
      };
    }
  }

  static async checkAction(
    userId: string,
    poolId: string,
    action: 'join_pool' | 'submit_question' | 'withdraw'
  ): Promise<FraudCheckResponse> {
    try {
      await this.initialize();

      if (!this.deviceFingerprint) {
        console.warn('[FraudDetection] Device fingerprint not available, allowing action');
        return {
          allowed: true,
          riskScore: 0,
          reasons: ['device_fingerprint_unavailable'],
          requiresVerification: false,
        };
      }

      const response = await fetch('/api/fraud-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          poolId,
          deviceFingerprint: this.deviceFingerprint.fingerprint,
          userAgent: this.deviceFingerprint.userAgent,
          action,
        }),
      });

      if (!response.ok) {
        throw new Error(`Fraud check API returned ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[FraudDetection] Fraud check failed:', error);
      // Allow the action but log the failure
      return {
        allowed: true,
        riskScore: 0,
        reasons: ['fraud_check_failed'],
        requiresVerification: false,
      };
    }
  }

  static getDeviceFingerprint(): string | null {
    return this.deviceFingerprint?.fingerprint || null;
  }
}

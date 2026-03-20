// Device Fingerprinting Utility
export interface DeviceFingerprint {
  fingerprint: string;
  userAgent: string;
  screenResolution: string;
  timezone: string;
  language: string;
  platform: string;
  hardwareConcurrency: number;
  deviceMemory?: number;
  colorDepth: number;
  pixelRatio: number;
  touchSupport: boolean;
  timestamp: number;
}

export async function generateDeviceFingerprint(): Promise<DeviceFingerprint> {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    let canvasFingerprint = '';
    
    if (ctx) {
      try {
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Academix', 2, 2);
        canvasFingerprint = canvas.toDataURL().slice(-50);
      } catch (error) {
        console.warn('[DeviceFingerprint] Canvas fingerprinting failed:', error);
        canvasFingerprint = 'canvas_unavailable';
      }
    }

    const components = [
      navigator.userAgent || 'unknown',
      navigator.language || 'unknown',
      screen.colorDepth || 0,
      (screen.width || 0) + 'x' + (screen.height || 0),
      new Date().getTimezoneOffset() || 0,
      navigator.platform || 'unknown',
      navigator.hardwareConcurrency || 0,
      canvasFingerprint,
    ].join('|');

    const fingerprint = await hashString(components);

    return {
      fingerprint,
      userAgent: navigator.userAgent || 'unknown',
      screenResolution: `${screen.width || 0}x${screen.height || 0}`,
      timezone: getTimezone(),
      language: navigator.language || 'unknown',
      platform: navigator.platform || 'unknown',
      hardwareConcurrency: navigator.hardwareConcurrency || 0,
      deviceMemory: (navigator as any).deviceMemory,
      colorDepth: screen.colorDepth || 0,
      pixelRatio: window.devicePixelRatio || 1,
      touchSupport: 'ontouchstart' in window,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('[DeviceFingerprint] Failed to generate device fingerprint:', error);
    
    // Return a minimal fallback fingerprint
    return {
      fingerprint: 'fallback_' + Date.now().toString(36),
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

// Safe timezone detection
function getTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    return 'unknown';
  }
}

async function hashString(str: string): Promise<string> {
  try {
    // Check if crypto.subtle is available
    if (!crypto || !crypto.subtle) {
      console.warn('[DeviceFingerprint] crypto.subtle not available, using fallback hash');
      return fallbackHash(str);
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    console.warn('[DeviceFingerprint] crypto.subtle.digest failed, using fallback:', error);
    return fallbackHash(str);
  }
}

// Simple fallback hash function for when crypto.subtle is not available
function fallbackHash(str: string): string {
  let hash = 0;
  if (str.length === 0) return hash.toString(16);
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(16).padStart(8, '0');
}

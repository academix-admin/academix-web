import type { Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Real UI login. The session gate rejects API-minted tokens, so the credentials have to go
 * through the actual sign-in screen — there is no shortcut worth maintaining here.
 *
 * Credentials come from .env.local (TEST_USERNAME / TEST_PASSWORD / TEST_PIN) and are never
 * logged, so a failing run cannot leak them into CI output.
 */
export function readTestCredentials() {
  const envPath = path.join(process.cwd(), '.env.local');
  const raw = fs.readFileSync(envPath, 'utf8');
  const get = (key: string) => {
    const m = raw.match(new RegExp(`^${key}=(.*)$`, 'm'));
    return m ? m[1].trim().replace(/^"|"$/g, '') : '';
  };
  const creds = {
    username: get('TEST_USERNAME'),
    password: get('TEST_PASSWORD'),
    pin: get('TEST_PIN'),
  };
  if (!creds.username || !creds.password) {
    throw new Error('TEST_USERNAME / TEST_PASSWORD missing from .env.local');
  }
  return creds;
}

/** Sign in through the UI and land on /main. Idempotent: returns immediately if already there. */
export async function login(page: Page): Promise<void> {
  const { username, password, pin } = readTestCredentials();

  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Already authenticated (storage state reused) — nothing to do.
  if (page.url().includes('/main')) return;

  // Field selection is by input type rather than a test id, since the app has none here.
  const user = page.locator('input[type="text"], input[type="email"]').first();
  const pass = page.locator('input[type="password"]').first();
  await user.waitFor({ state: 'visible', timeout: 15_000 });
  await user.fill(username);
  await pass.fill(password);

  await page.locator('button[type="submit"], button:has-text("Log in"), button:has-text("Login")')
    .first()
    .click();

  // Either we land on /main, or the app-lock PIN screen appears first.
  await page.waitForTimeout(3000);

  if (pin) {
    const pinInput = page.locator('input[inputmode="numeric"], input[type="tel"]').first();
    if (await pinInput.isVisible().catch(() => false)) {
      await pinInput.fill(pin);
      await page.waitForTimeout(2500);
    }
  }

  await page.waitForURL(/\/main/, { timeout: 30_000 });
  await page.waitForLoadState('networkidle');
}

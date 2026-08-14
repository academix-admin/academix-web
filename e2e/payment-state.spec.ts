import { test, expect } from '@playwright/test';
import { installNavDevtools, navStack } from '@academix-admin/navigation-stack/playwright';
import { login } from './fixtures/auth';

/**
 * Regression guard for the top-up/withdraw state flicker.
 *
 * The cause was an infinite auto-retry loop, not a rendering problem: `userWalletState` was a
 * dependency of `handleUserTopUpWallet`'s useCallback, so every state change produced a new
 * callback identity, which re-fired the effect that calls it. The in-callback guard blocked
 * re-entry while 'loading' but NOT after 'error', so a failure looped
 * error → loading → error → loading …
 *
 * These sample the page over time rather than asserting a single frame, because a stable page and
 * a looping one look identical in any one snapshot — the bug is only visible as a SEQUENCE.
 */

async function sampleStates(page: import('@playwright/test').Page, ms: number) {
  const seen: string[] = [];
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    const s = await page.evaluate(() => {
      const txt = document.body.innerText || '';
      const loading = !!document.querySelector('[class*="loading" i], [class*="Loading" i]');
      const error = /error occurred/i.test(txt) || /try again/i.test(txt);
      return error ? 'error' : loading ? 'loading' : 'idle';
    });
    if (seen[seen.length - 1] !== s) seen.push(s);
    await page.waitForTimeout(150);
  }
  return seen;
}

test('top-up page settles instead of looping loading↔error', async ({ page }) => {
  await installNavDevtools(page);
  await login(page);

  await page.getByRole('button', { name: 'Payment' }).click();
  await page.waitForTimeout(1200);

  await navStack(page, 'payment-stack').push('top_up_page');
  await page.waitForTimeout(800);

  const seen = await sampleStates(page, 6000);
  console.log('top-up state sequence:', seen.join(' → '));

  // The signature of the bug: the same state returning after having left it. A healthy page moves
  // through each state at most once (idle → loading → idle/error) and then stays put.
  const loadingRuns = seen.filter((s) => s === 'loading').length;
  const errorRuns = seen.filter((s) => s === 'error').length;

  expect(loadingRuns, `loading re-entered ${loadingRuns}x — sequence: ${seen.join(' → ')}`)
    .toBeLessThanOrEqual(1);
  expect(errorRuns, `error re-entered ${errorRuns}x — sequence: ${seen.join(' → ')}`)
    .toBeLessThanOrEqual(1);
});

test('withdraw page settles instead of looping loading↔error', async ({ page }) => {
  await installNavDevtools(page);
  await login(page);

  await page.getByRole('button', { name: 'Payment' }).click();
  await page.waitForTimeout(1200);

  await navStack(page, 'payment-stack').push('withdraw_page');
  await page.waitForTimeout(800);

  const seen = await sampleStates(page, 6000);
  console.log('withdraw state sequence:', seen.join(' → '));

  expect(seen.filter((s) => s === 'loading').length,
    `loading re-entered — sequence: ${seen.join(' → ')}`).toBeLessThanOrEqual(1);
  expect(seen.filter((s) => s === 'error').length,
    `error re-entered — sequence: ${seen.join(' → ')}`).toBeLessThanOrEqual(1);
});

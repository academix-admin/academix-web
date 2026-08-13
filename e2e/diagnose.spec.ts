import { test } from '@playwright/test';
import { installNavDevtools, navStack } from '@academix-admin/navigation-stack/playwright';

/**
 * Diagnostic: what happens across a real browser Back?
 *
 * isActiveStack() is fixed, so the popstate handler should now run. If depth stays at 2, the
 * question is what the handler re-derives FROM — i.e. what ?nav= says on the restored entry.
 */
// On demand only: this asserts nothing, it just prints. Run it with
//   npx playwright test e2e/diagnose.spec.ts --grep-invert @never
// or flip .skip to .only while investigating. Kept in the repo because it is the fastest way to
// see what the stack, the URL and the event log each believe during a navigation.
test.skip('diagnose: browser Back', async ({ page }) => {
  await installNavDevtools(page);
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  const nav = navStack(page, 'login');
  const url = () => page.evaluate(() => ({ href: location.href, len: history.length }));

  console.log('\n============ BACK DIAGNOSIS ============');
  console.log('start        :', JSON.stringify(await url()));

  await nav.push('forgot_password');
  await page.waitForTimeout(500);
  console.log('after push   :', JSON.stringify(await url()));
  console.log('  depth      :', await nav.depth(), 'owned:', await nav.ownedHistoryEntries());

  await page.goBack();
  await page.waitForTimeout(1200);
  console.log('after goBack :', JSON.stringify(await url()));
  console.log('  depth      :', await nav.depth(), 'top:', await nav.top());

  const dbg = (await nav.debug()) as { events: unknown[] };
  console.log('EVENTS       :', JSON.stringify(dbg.events, null, 1));
  console.log('=======================================\n');
});

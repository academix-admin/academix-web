import { test, expect } from '@playwright/test';
import { installNavDevtools, navStack } from '@academix-admin/navigation-stack/playwright';
import { login } from './fixtures/auth';

/**
 * The other half of making onExit fire on browser Back: what now runs that never ran before.
 *
 * top-up and withdraw clear their state-stack scope in onExit. Until navigation-stack 0.11.3 that
 * binding was dead for browser Back, so backing out of top-up left the scope populated. Now it
 * fires — and it fires while the page is still animating out, with its children still mounted and
 * still reading that scope.
 *
 * So the fix creates a new failure mode in the same place the old flicker lived: an exiting page
 * flashing its error state because the data underneath it was cleared a frame too early. Nothing
 * about "onExit now fires" guarantees the timing is safe, and a passing unit test would not show it
 * — the exit animation only exists in a real browser.
 */

async function sampleForError(page: import('@playwright/test').Page, ms: number) {
  const seen: string[] = [];
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    const s = await page.evaluate(() => {
      const txt = document.body.innerText || '';
      return /error occurred/i.test(txt) || /try again/i.test(txt) ? 'error' : 'ok';
    });
    if (seen[seen.length - 1] !== s) seen.push(s);
    await page.waitForTimeout(80);
  }
  return seen;
}

test('backing out of top-up clears its scope without flashing an error on the way out', async ({ page }) => {
  await installNavDevtools(page);
  await login(page);

  await page.getByRole('button', { name: 'Payment' }).click();
  await page.waitForTimeout(1200);

  const nav = navStack(page, 'payment-stack');
  await nav.push('top_up_page');
  await page.waitForTimeout(2500);
  expect(await nav.depth()).toBe(2);

  await page.evaluate(() =>
    (window as never as { __NAV_STACK__: { clearEvents(): void } }).__NAV_STACK__.clearEvents());

  // Sample ACROSS the back gesture, not after it: the risk window is the exit animation itself.
  const [seen] = await Promise.all([
    sampleForError(page, 2500),
    (async () => { await page.waitForTimeout(150); await page.goBack(); })(),
  ]);
  console.log('states across back:', seen.join(' → '));

  const events = await page.evaluate(
    () => (window as never as { __NAV_STACK__: { events(): unknown[] } }).__NAV_STACK__.events(),
  ) as Array<{ stackId: string; kind: string }>;

  expect(events.some((e) => e.kind === 'lifecycle:onExit'),
    `back must fire onExit so the scope is cleared — kinds: ${events.map((e) => e.kind).join(',')}`)
    .toBe(true);

  expect(seen.includes('error'),
    `an error state appeared while backing out — the scope was cleared before its readers unmounted. Sequence: ${seen.join(' → ')}`)
    .toBe(false);

  expect(await nav.depth(), 'back must pop exactly one page').toBe(1);

  // Re-entering must work off a cleared scope: a cleanup that leaves the flow unable to reload is
  // no better than one that never ran.
  await nav.push('top_up_page');
  await page.waitForTimeout(2500);
  const after = await sampleForError(page, 1500);
  expect(after.includes('error'),
    `re-entering top-up after the scope was cleared showed an error: ${after.join(' → ')}`).toBe(false);
});

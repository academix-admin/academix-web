import { test, expect } from '@playwright/test';
import { installNavDevtools, navStack, navStackIds } from '@academix-admin/navigation-stack/playwright';
import { login } from './fixtures/auth';

/**
 * Reproduces the reported Forward bug on the real path:
 *
 *   profile page (A) → Redeem codes (B) → giveback page (C)
 *   Back C→B→A all correct, but from A the FIRST Forward shows A again and the SECOND shows C.
 *
 * i.e. the middle history entry describes A instead of B — something overwrote it during the Back
 * walk. Asserting the whole walk in one test, because the corruption only becomes visible on the
 * way forward.
 */
const STACK = 'profile-stack';

test('forward walk after backing out of profile → redeem → giveback', async ({ page }) => {
  await installNavDevtools(page);
  await login(page);

  // GroupNavigationStack mounts only the ACTIVE tab (preloadAll is off), so profile-stack does
  // not exist until the Profile tab is selected. Landing on Home and pushing into profile-stack
  // silently targets a stack that was never registered.
  await page.getByRole('button', { name: 'Profile' }).click();
  await page.waitForTimeout(1500);

  const ids = await navStackIds(page);
  console.log('registered stacks:', ids.join(', '));
  expect(ids, 'profile stack should be registered after selecting the Profile tab').toContain(STACK);

  const nav = navStack(page, STACK);
  const probe = async (label: string) => {
    const snap = await nav.snapshot();
    const url = new URL(page.url());
    console.log(
      `${label.padEnd(18)} depth=${snap.depth} top=${String(snap.top)} ` +
      `owned=${snap.pushDepth} nav=${url.searchParams.get('nav')}`,
    );
    return snap;
  };

  await probe('start');

  await nav.push('redeem_codes');
  await page.waitForTimeout(600);
  const atB = await probe('after push B');

  await nav.push('giveback_page');
  await page.waitForTimeout(600);
  const atC = await probe('after push C');
  expect(atC.depth, 'should be three deep').toBeGreaterThan(atB.depth);

  await page.goBack();
  await page.waitForTimeout(800);
  const back1 = await probe('back -> B');

  await page.goBack();
  await page.waitForTimeout(800);
  const back2 = await probe('back -> A');

  await page.goForward();
  await page.waitForTimeout(800);
  const fwd1 = await probe('forward -> ?');

  console.log('EVENTS:', JSON.stringify((await nav.debug() as { events: unknown[] }).events, null, 1));

  // The bug: this first Forward lands back on A instead of B.
  expect(fwd1.depth, 'first Forward must return to B (depth 2), not stay on A')
    .toBe(back1.depth);
  expect(fwd1.top, 'first Forward must show B').toBe(back1.top);
  expect(back2.depth, 'two Backs should reach the root').toBeLessThan(back1.depth);
});

import { test, expect } from '@playwright/test';
import { installNavDevtools, navStack, navStackIds } from '@academix-admin/navigation-stack/playwright';

/**
 * Navigation behaviour, against a real browser.
 *
 * Routes are driven with the SAME keys the app itself pushes (login.tsx pushes 'forgot_password').
 * An earlier version of this spec pushed 'recovery' directly, which is guarded: it popToRoot'ed
 * itself 43ms later, and the resulting failure looked exactly like a broken history push. The
 * devtools event log is what distinguished the two -- worth remembering when adding specs here.
 *
 * Run on the LOGIN stack rather than /main: it is a genuine multi-page stack
 * (login → recovery → otp → reset_password, see src/app/(auth)/login/page.tsx) and it is public,
 * so these specs need no auth fixture and cannot be broken by session policy changes. It is also
 * the stack whose missing `syncHistory` was fixed in 94fca42, so it is worth pinning.
 *
 * Everything here asserts NAVIGATION STATE, not the DOM. Rendering and navigation fail
 * independently — a pop can update the stack correctly and still leave the old page mounted — and
 * a DOM-only assertion reports the wrong cause.
 */

const STACK = 'login';

test.beforeEach(async ({ page }) => {
  // Must precede goto: devtools are off in a production build, and addInitScript survives the
  // reloads the deep-link specs perform.
  await installNavDevtools(page);
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
});

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    try {
      await testInfo.attach('navigation-stack-debug', {
        body: JSON.stringify(await navStack(page, STACK).debug(), null, 2),
        contentType: 'application/json',
      });
    } catch { /* page may already be closed */ }
  }
});

test('devtools are reachable and the login stack is registered', async ({ page }) => {
  const ids = await navStackIds(page);
  expect(ids, `registered stacks: ${ids.join(', ')}`).toContain(STACK);

  const nav = navStack(page, STACK);
  await nav.expectDepth(1);
  await nav.expectTop('login');
});

test('pushing a page creates a real history entry', async ({ page }) => {
  const nav = navStack(page, STACK);

  const before = await page.evaluate(() => history.length);
  await nav.push('forgot_password');
  await nav.waitForDepth(2);

  // The direct question: does Back have anything to pop? Asserted BEFORE pressing Back, so a
  // failure here says "nothing was pushed" rather than the vaguer "wrong page after Back".
  expect(await nav.ownedHistoryEntries(),
    'stack owns no history entries — browser Back would leave the site').toBeGreaterThan(0);

  const after = await page.evaluate(() => history.length);
  expect(after, 'history.length should grow on push').toBeGreaterThan(before);
});

test('browser Back pops one page instead of leaving the site', async ({ page }) => {
  const nav = navStack(page, STACK);

  await nav.push('forgot_password');
  await nav.waitForDepth(2);
  await nav.expectTop('forgot_password');

  await page.goBack();
  await nav.waitForDepth(1);

  await nav.expectTop('login');
  expect(page.url(), 'should still be inside the app').toContain('/login');
});

test('a programmatic pop removes the page and does not resurrect it', async ({ page }) => {
  const nav = navStack(page, STACK);

  await nav.push('forgot_password');
  await nav.waitForDepth(2);

  const res = await nav.pop();
  expect(res.popped, `pop reported before=${res.before} after=${res.after}`).toBe(true);

  // Give any popstate/re-derive a chance to (incorrectly) restore it. This is the shape of the
  // live "swipe back to A and B returns" report.
  await page.waitForTimeout(600);   // exit transition is 220ms; allow well past it
  await nav.expectDepth(1);
  await nav.expectPoppedCleanly('forgot_password');

  // The DOM half of the same question. The stack popping is not enough: the reported symptom was
  // the popped PAGE still being on screen, which is a separate failure from a stale stack.
  const pageEls = await page.locator('[data-nav-uid]').count();
  expect(pageEls, 'the popped page element must be unmounted, not left mid-exit-transition').toBe(1);
});

test('reload restores the same stack from the URL', async ({ page }) => {
  const nav = navStack(page, STACK);

  await nav.push('forgot_password');
  await nav.waitForDepth(2);
  const before = await nav.keys();

  await page.reload();
  await page.waitForLoadState('networkidle');

  await nav.waitForDepth(before.length);
  expect(await nav.keys()).toEqual(before);
});

test('popToRoot from a deep link does not throw the user off the site', async ({ page }) => {
  const nav = navStack(page, STACK);

  // Arrive several pages deep in one navigation — the user pushed none of these entries.
  await nav.push('forgot_password');
  await nav.waitForDepth(2);

  await nav.popToRoot();
  await nav.waitForDepth(1);

  expect(page.url(), 'popToRoot must never navigate away from the app').toContain('/login');
});

test('the navigation timeline records what happened', async ({ page }) => {
  const nav = navStack(page, STACK);

  await nav.push('forgot_password');
  await nav.waitForDepth(2);
  await nav.pop();
  await nav.waitForDepth(1);

  const events = (await nav.events()) as { kind: string; from: number; to: number }[];
  const push = events.find((e) => e.kind === 'push');
  const pop = events.find((e) => e.kind === 'pop');

  expect(push, 'push should be recorded').toBeTruthy();
  expect(pop, 'pop should be recorded').toBeTruthy();
  expect(push!.to).toBeGreaterThan(push!.from);
  expect(pop!.to, 'a pop that does not reduce depth is the bug signature').toBeLessThan(pop!.from);
});

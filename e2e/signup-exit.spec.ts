import { test, expect } from '@playwright/test';
import { installNavDevtools, navStack } from '@academix-admin/navigation-stack/playwright';

/**
 * Does leaving the signup flow actually fire an exit?
 *
 * signup binds `StateStack.core.clearScope('signup_flow')` to `onExitStack`, so a user who abandons
 * signup does not find the previous attempt's answers pre-filled on the next one. That binding was
 * dead for the path it was written for: browser Back and the edge-swipe changed the stack WITHOUT
 * going through emit(), where both lifecycle triggers and subscriber notification live — and
 * onExitStack is implemented as a subscriber watching for the stack reaching length 0.
 *
 * This asserts on the devtools timeline rather than on the DOM, because "the cleanup ran" is not
 * observable in the rendered output — which is exactly why the gap survived so long unnoticed.
 */
test('leaving signup via browser Back is reported as a navigation event', async ({ page }) => {
  await installNavDevtools(page);
  await page.goto('/signup');
  await page.waitForTimeout(1500);

  const nav = navStack(page, 'signup');

  // step2 guards itself: with no fullName in the signup scope it calls nav.go('step1') and bounces
  // straight back, so a devtools push cannot be used to set this up. Driving the real form is not
  // incidental here -- the scope this test is about is populated BY that form, and an empty scope
  // would make the cleanup trivially "work".
  const boxes = page.getByRole('textbox');
  await boxes.nth(0).fill('Nav Exit Test');
  await boxes.nth(1).fill(`nav-exit-${Date.now()}@example.com`);
  await page.waitForTimeout(500);

  // The continue button is disabled until the form validates, and Playwright's actionability check
  // waits on that rather than failing loudly -- so an incomplete fill surfaces as a click timeout
  // that reads like a missing button. Assert enabled first so the real cause is legible.
  const cont = page.getByRole('button', { name: /continue|next/i }).first();
  await expect(cont, 'continue stays disabled until step1 validates').toBeEnabled({ timeout: 10000 });
  await cont.click();
  await page.waitForTimeout(2500);
  expect(await nav.depth(), 'step1 must advance to step2 before Back can be tested').toBe(2);

  await page.evaluate(() => (window as never as { __NAV_STACK__: { clearEvents(): void } }).__NAV_STACK__.clearEvents());

  await page.goBack();
  await page.waitForTimeout(900);

  const events = await page.evaluate(
    () => (window as never as { __NAV_STACK__: { events(): unknown[] } }).__NAV_STACK__.events(),
  ) as Array<{ stackId: string; kind: string; from: number; to: number }>;

  console.log('signup events after Back:', JSON.stringify(events, null, 1));

  const popstate = events.filter((e) => e.stackId === 'signup' && e.kind === 'popstate');
  expect(popstate.length,
    `browser Back must emit a popstate event for the signup stack — got: ${JSON.stringify(events)}`)
    .toBeGreaterThan(0);
  expect(popstate.some((e) => e.to < e.from), 'the event must record the stack shrinking').toBe(true);

  const lifecycle = events.filter((e) => e.stackId === 'signup' && e.kind.startsWith('lifecycle:'));
  expect(lifecycle.some((e) => e.kind === 'lifecycle:onExit'),
    `browser Back must fire onExit — kinds seen: ${events.map((e) => e.kind).join(',')}`).toBe(true);

  expect(await nav.depth(), 'Back must pop exactly one page, not leave the flow').toBe(1);
});

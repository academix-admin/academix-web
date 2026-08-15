import { test, expect } from '@playwright/test';
import { installNavDevtools, navStack } from '@academix-admin/navigation-stack/playwright';
import { login } from './fixtures/auth';

/**
 * The reported sequence, reproduced exactly: payment deep, profile deep, Back on profile, return to
 * payment, pop there.
 *
 * `_pushDepth` counts entries per stack, but `history.go(-n)` is positional over the browser's one
 * GLOBAL list, and entries from different tabs interleave. Popping payment while profile's entries
 * sit between it and its target travels the counted distance and arrives inside profile's state —
 * restoring profile's URL and the `group=` that was active then. Hence "I popped on one tab and
 * landed on another".
 *
 * It is intermittent by construction: pop the most recently pushed stack and the count is
 * accidentally correct. So this drives the interleaving deliberately rather than hoping for it, and
 * asserts the invariant that must hold every time — a pop leaves you on the SAME tab, one page
 * shallower, with the other tab untouched.
 */

async function group(page: import('@playwright/test').Page) {
  return page.evaluate(() => new URL(location.href).searchParams.get('group'));
}

test('a pop stays on its own tab when another tab pushed in between', async ({ page }) => {
  await installNavDevtools(page);
  await login(page);

  await page.getByRole('button', { name: 'Payment' }).first().click();
  await page.waitForTimeout(1200);
  const payment = navStack(page, 'payment-stack');
  await payment.push('top_up_page');
  await page.waitForTimeout(1500);
  expect(await payment.depth(), 'setup: payment must be 2 deep').toBe(2);

  // Profile's entries are what a payment pop then has to travel past.
  await page.getByRole('button', { name: 'Profile' }).first().click();
  await page.waitForTimeout(1200);
  const profile = navStack(page, 'profile-stack');
  await profile.push('redeem_codes');
  await page.waitForTimeout(1500);
  expect(await profile.depth(), 'setup: profile must be 2 deep').toBe(2);

  await page.goBack();
  await page.waitForTimeout(1500);
  expect(await profile.depth(), 'Back must pop profile by one').toBe(1);

  await page.getByRole('button', { name: 'Payment' }).first().click();
  await page.waitForTimeout(1500);
  expect(await payment.depth(), 'payment must keep its depth across the tab switch').toBe(2);

  await page.evaluate(() =>
    (window as never as { __NAV_STACK__: { clearEvents(): void } }).__NAV_STACK__.clearEvents());

  await payment.pop();
  await page.waitForTimeout(1800);

  const events = await page.evaluate(
    () => (window as never as { __NAV_STACK__: { events(): unknown[] } }).__NAV_STACK__.events(),
  ) as Array<{ stackId: string; kind: string; from: number; to: number }>;

  expect(await group(page),
    `the pop left the payment tab — events: ${JSON.stringify(events)}`).toBe('payment-stack');
  expect(await payment.depth(), 'the pop must leave payment one page shallower').toBe(1);
  expect(await profile.depth(),
    `popping payment disturbed profile's stack — events: ${JSON.stringify(events)}`).toBe(1);
});

/**
 * Scroll restoration across a width change.
 *
 * The precise arithmetic is unit-tested on `resolveScrollTarget`; what only a browser can show is
 * that a restore after a real reflow lands somewhere the document actually reaches. An offset
 * captured at 1280px and replayed verbatim at 430px points past where the user was — and if it
 * exceeds the new document height the browser silently clamps it, so reading the value back cannot
 * tell you it was wrong.
 */
test('scroll restoration after a width change stays inside the document', async ({ page }) => {
  await installNavDevtools(page);
  await login(page);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole('button', { name: 'Profile' }).first().click();
  await page.waitForTimeout(1500);

  // Find the element that actually scrolls, rather than assuming which one it is.
  const findScroller = () =>
    page.evaluate(() => {
      const all = Array.from(document.querySelectorAll<HTMLElement>('*'));
      let best: HTMLElement | null = null;
      let bestMax = 0;
      for (const el of all) {
        const max = el.scrollHeight - el.clientHeight;
        const oy = getComputedStyle(el).overflowY;
        if (max > bestMax && (oy === 'auto' || oy === 'scroll')) { best = el; bestMax = max; }
      }
      const de = document.scrollingElement as HTMLElement | null;
      const docMax = de ? de.scrollHeight - de.clientHeight : 0;
      if (docMax > bestMax) return { doc: true, max: docMax };
      if (!best) return { doc: true, max: docMax };
      best.setAttribute('data-e2e-scroller', '1');
      return { doc: false, max: bestMax };
    });

  const scroller = await findScroller();
  test.skip(scroller.max < 200, 'nothing on this page scrolls far enough to test restoration');

  await page.evaluate((doc) => {
    const el = doc
      ? (document.scrollingElement as HTMLElement)
      : document.querySelector<HTMLElement>('[data-e2e-scroller="1"]')!;
    el.scrollTop = Math.round((el.scrollHeight - el.clientHeight) * 0.4);
  }, scroller.doc);
  await page.waitForTimeout(900);

  const profile = navStack(page, 'profile-stack');
  await profile.push('redeem_codes');
  await page.waitForTimeout(1500);

  // The width change happens while the page is off-screen — the case the fix is about.
  await page.setViewportSize({ width: 430, height: 900 });
  await page.waitForTimeout(800);

  await profile.pop();
  await page.waitForTimeout(2000);

  const after = await page.evaluate(() => {
    const el =
      document.querySelector<HTMLElement>('[data-e2e-scroller="1"]') ??
      (document.scrollingElement as HTMLElement);
    const max = el.scrollHeight - el.clientHeight;
    return { top: el.scrollTop, max };
  });

  expect(after.top, `restored past the end of the document: ${after.top} > ${after.max}`)
    .toBeLessThanOrEqual(after.max + 1);
  expect(after.top, 'restored to a negative offset').toBeGreaterThanOrEqual(0);
});

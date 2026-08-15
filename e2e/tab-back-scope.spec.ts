import { test, expect } from '@playwright/test';
import { installNavDevtools, navStack } from '@academix-admin/navigation-stack/playwright';
import { login } from './fixtures/auth';

/**
 * Three separate reports from one devtools dump, verified against a real browser because none of
 * them are reproducible in jsdom: they need genuine history semantics, a real IndexedDB, and React
 * running against an actual paint schedule.
 *
 *  1. Back on a tab lands on a DIFFERENT tab once that tab's stack is deeper than 2.
 *  2. `*_flow` scopes (mission_flow, secondary_flow) are not removed from IndexedDB on exit.
 *  3. A "useInsertionEffect must not schedule updates" console error during navigation.
 */

type NavEvt = { stackId: string; kind: string; from: number; to: number; topKey: string | null };

async function events(page: import('@playwright/test').Page) {
  return page.evaluate(
    () => (window as never as { __NAV_STACK__: { events(): unknown[] } }).__NAV_STACK__.events(),
  ) as Promise<NavEvt[]>;
}

async function groupOf(page: import('@playwright/test').Page) {
  return page.evaluate(() => new URL(location.href).searchParams.get('group'));
}

test('Back pops the active tab instead of jumping to another tab, at depth > 2', async ({ page }) => {
  await installNavDevtools(page);
  await login(page);

  // Visit other tabs first. This is what made the bug reachable: it seeds history entries whose
  // `group=` differs, so an over-long history.go(-n) has somewhere wrong to land. A test that only
  // ever touches one tab cannot fail no matter how broken the ledger is.
  await page.getByRole('button', { name: 'Reward' }).click();
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: 'Home' }).click();
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: 'Profile' }).click();
  await page.waitForTimeout(1200);

  const nav = navStack(page, 'profile-stack');

  // Depth 3: the reported threshold. Two owned entries behind us.
  await nav.push('redeem_codes');
  await page.waitForTimeout(900);
  await nav.push('rules_page');
  await page.waitForTimeout(900);
  expect(await nav.depth(), 'setup: profile-stack must be 3 deep').toBe(3);
  expect(await groupOf(page)).toBe('profile-stack');

  // A browser Back, then a PROGRAMMATIC pop. The second one is where the over-count paid out: the
  // ledger still counted the entry the browser had just crossed, so the pop travelled two entries.
  await page.goBack();
  await page.waitForTimeout(1200);
  expect(await nav.depth(), 'browser Back must pop exactly one page').toBe(2);
  expect(await groupOf(page), 'Back must not change which tab is active').toBe('profile-stack');

  await page.evaluate(() =>
    (window as never as { __NAV_STACK__: { clearEvents(): void } }).__NAV_STACK__.clearEvents());

  await nav.pop();
  await page.waitForTimeout(1200);

  const seen = await events(page);
  const foreign = seen.filter((e) => e.stackId !== 'profile-stack' && e.kind === 'popstate');

  expect(await groupOf(page),
    `the pop landed on another tab — foreign popstates: ${JSON.stringify(foreign)}`)
    .toBe('profile-stack');
  expect(await nav.depth(), 'the pop must leave profile-stack at its root').toBe(1);
  expect(foreign.length,
    `a pop on one tab disturbed other stacks: ${JSON.stringify(foreign)}`).toBe(0);
});

test('leaving the mission flow removes its persisted data from IndexedDB', async ({ page }) => {
  await installNavDevtools(page);
  await login(page);

  await page.getByRole('button', { name: 'Reward' }).click();
  await page.waitForTimeout(1200);

  const nav = navStack(page, 'rewards-stack');
  await nav.push('mission_page');
  await page.waitForTimeout(3000);

  const readScopeKeys = (scope: string) =>
    page.evaluate(async (s) => {
      const keys = await new Promise<string[]>((resolve) => {
        const req = indexedDB.open('StateStackDB', 1);
        req.onerror = () => resolve([]);
        req.onsuccess = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('state')) return resolve([]);
          const kr = db.transaction(['state'], 'readonly').objectStore('state').getAllKeys();
          kr.onerror = () => resolve([]);
          kr.onsuccess = () => resolve(kr.result as string[]);
        };
      });
      return keys.filter((k) => k.startsWith(`${s}::`));
    }, scope);

  const before = await readScopeKeys('mission_flow');
  console.log('mission_flow keys while inside the flow:', before);

  // If the flow never persisted anything there is nothing to prove; say so rather than passing
  // vacuously, which is how a cleanup test quietly stops testing anything.
  test.skip(before.length === 0, 'mission_flow persisted nothing — nothing to assert about clearing it');

  await page.goBack();
  await page.waitForTimeout(2500);

  const after = await readScopeKeys('mission_flow');
  console.log('mission_flow keys after leaving:', after);

  expect(after,
    `leaving the mission flow left persisted keys behind; they rehydrate stale on the next load: ${after.join(', ')}`)
    .toEqual([]);
});

test('navigating does not produce React insertion-effect errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));

  await installNavDevtools(page);
  await login(page);

  // Exercise the paths the dump was taken across: tab switches, a push, a Back.
  for (const tab of ['Reward', 'Quiz', 'Payment', 'Profile']) {
    // .first(): once inside a tab, a page can carry a control with the same name as the tab.
    await page.getByRole('button', { name: tab }).first().click();
    await page.waitForTimeout(800);
  }
  await navStack(page, 'profile-stack').push('redeem_codes');
  await page.waitForTimeout(900);
  await page.goBack();
  await page.waitForTimeout(1200);

  const insertion = errors.filter((e) => /useInsertionEffect/i.test(e));
  expect(insertion,
    `React reported an insertion-effect violation during navigation:\n${insertion.join('\n')}`)
    .toEqual([]);
});

/**
 * The part of the upgrade that carried real risk: eight minors of navigation changes — uid
 * identity, the history ledger, axPushed, adoptable entries, the browser-driven animation flag.
 * A build cannot see any of it. This pushes, pops, and walks back with the browser's own Back.
 */
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:3102';
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }),
);

let failed = 0;
const check = (what, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${what}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failed += 1;
};

const browser = await chromium.launch();
const p = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const thrown = [];
p.on('pageerror', (e) => thrown.push(String(e).split('\n')[0]));

/** Every mounted page, by stack, from the library's own fingerprint. */
const stacks = () =>
  p.evaluate(() => {
    const byStack = {};
    for (const el of document.querySelectorAll('[data-nav-uid]')) {
      const uid = el.getAttribute('data-nav-uid');
      const stack = uid.split(':').slice(0, 2).join(':');
      (byStack[stack] ??= []).push(uid);
    }
    return byStack;
  });

try {
  await p.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(7000);
  await p.locator('input:visible').first().fill(env.TEST_USERNAME ?? '');
  const pw = p.locator('input[type="password"]:visible').first();
  if (await pw.count()) await pw.fill(env.TEST_PASSWORD ?? '');
  await p.locator('button:visible').filter({ hasText: /log ?in|continue|sign in/i }).first().click();
  await p.waitForTimeout(14000);

  const before = await stacks();
  const depthsBefore = Object.fromEntries(Object.entries(before).map(([k, v]) => [k, v.length]));
  console.log('  depths after sign-in:', JSON.stringify(depthsBefore));
  check('every tab has exactly its root', Object.values(depthsBefore).every((d) => d === 1), JSON.stringify(depthsBefore));

  // Push: the first thing on the home screen that opens a page.
  const candidates = p.locator('button:visible, a:visible');
  const n = await candidates.count();
  let pushed = false;
  for (let i = 0; i < Math.min(n, 25) && !pushed; i += 1) {
    const el = candidates.nth(i);
    const label = ((await el.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
    if (!label || /log ?out|sign out|EN|💻/i.test(label)) continue;
    await el.click().catch(() => {});
    await p.waitForTimeout(3500);
    const now = await stacks();
    if (Object.values(now).some((v) => v.length > 1)) {
      const deepened = Object.entries(now).find(([, v]) => v.length > 1);
      console.log(`  pushed via "${label.slice(0, 32)}" →`, deepened[0], `depth ${deepened[1].length}`);
      pushed = true;
    }
  }
  check('a push deepens exactly one stack', pushed);

  if (pushed) {
    const deep = await stacks();
    const uids = Object.values(deep).flat();
    check('every uid names a position', uids.every((u) => /:at\d+$/.test(u)), uids.find((u) => !/:at\d+$/.test(u)) ?? 'all do');

    await p.goBack();
    await p.waitForTimeout(3500);
    const after = await stacks();
    const depthsAfter = Object.fromEntries(Object.entries(after).map(([k, v]) => [k, v.length]));
    check("the browser's Back popped it", JSON.stringify(depthsAfter) === JSON.stringify(depthsBefore), JSON.stringify(depthsAfter));
  }

  check('nothing threw during the walk', thrown.length === 0, thrown.slice(0, 2).join(' | '));
} catch (e) {
  console.log('STOPPED:', String(e).split('\n')[0]);
  failed += 1;
} finally {
  await browser.close();
  console.log(failed ? `\n${failed} failed` : '\nall passed');
  process.exit(failed ? 1 : 0);
}

/**
 * Does academix-web still work after the library upgrade?
 *
 * It has no probes of its own, so this is the minimum worth having: load it, open the login screen,
 * sign in with the test account, and watch what the page throws. A type-check and a build see none
 * of it. Run against the upgraded build AND against the control, and compare.
 */
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:3102';
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
    }),
);

let failed = 0;
const check = (what, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${what}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failed += 1;
};

/** Asset 404s and the CSP report-only note are noise; what matters is code throwing. */
const noise = (e) => e.includes('404') || e.includes('Content Security Policy');

const errors = [];
const browser = await chromium.launch();
const p = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
p.on('pageerror', (e) => errors.push('threw: ' + String(e).split('\n')[0]));
p.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 160)); });

try {
  await p.goto(BASE, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(6000);
  const first = (await p.locator('body').innerText()).replace(/\s+/g, ' ');
  check('the app renders', first.trim().length > 20, first.slice(0, 70));
  check('nothing threw on the landing page', errors.filter((e) => !noise(e)).length === 0, errors.filter((e) => !noise(e))[0] ?? '');

  await p.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(7000);
  const loginText = (await p.locator('body').innerText()).replace(/\s+/g, ' ');
  console.log('  login screen:', loginText.slice(0, 80));

  const field = p.locator('input:visible').first();
  if (await field.count()) {
    await field.fill(env.TEST_USERNAME ?? '');
    const pw = p.locator('input[type="password"]:visible').first();
    if (await pw.count()) await pw.fill(env.TEST_PASSWORD ?? '');
    const submit = p.locator('button[type="submit"]:visible, button:visible').filter({ hasText: /log ?in|continue|sign in/i }).first();
    if (await submit.count()) await submit.click();
    await p.waitForTimeout(14000);
  }

  const after = (await p.locator('body').innerText()).replace(/\s+/g, ' ');
  console.log('  after sign-in:', new URL(p.url()).pathname, '|', after.slice(0, 80));
  check('no application error', !/Application error|client-side exception/i.test(after), after.slice(0, 60));

  const uids = await p.evaluate(() => [...document.querySelectorAll('[data-nav-uid]')].map((e) => e.getAttribute('data-nav-uid')));
  console.log(`  stacks mounted: ${uids.length}${uids.length ? ' — ' + uids.slice(0, 3).join(', ') : ''}`);

  const real = errors.filter((e) => !noise(e));
  check('nothing threw during the walk', real.length === 0, real.slice(0, 3).join(' | '));
} catch (e) {
  console.log('STOPPED:', String(e).split('\n')[0]);
  failed += 1;
} finally {
  const real = errors.filter((e) => !noise(e));
  if (real.length) {
    console.log('\n  real errors:');
    real.slice(0, 8).forEach((e) => console.log('   -', e));
  }
  console.log(`  (noise ignored: ${errors.length - real.length} asset 404s / CSP notes)`);
  await browser.close();
  console.log(failed ? `\n${failed} failed` : '\nall passed');
  process.exit(failed ? 1 : 0);
}

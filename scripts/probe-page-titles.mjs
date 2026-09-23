/**
 * The tabs say what they are.
 *
 * Every screen shared one browser title, because the app is one URL. The five stack roots now name
 * themselves with `nav.title()`, so the browser tab, the back/forward list and anything reading the
 * document title follow the screen.
 *
 * The part worth guarding is the tab switch: five stacks are mounted at once, so each could believe
 * it owns the title, and the winner would be whichever rendered last.
 *
 *     node scripts/probe-page-titles.mjs [http://localhost:3102]
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

try {
  await p.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(7000);
  await p.locator('input:visible').first().fill(env.TEST_USERNAME ?? '');
  const pw = p.locator('input[type="password"]:visible').first();
  if (await pw.count()) await pw.fill(env.TEST_PASSWORD ?? '');
  await p.locator('button:visible').filter({ hasText: /log ?in|continue|sign in/i }).first().click();
  await p.waitForTimeout(14000);

  const first = await p.title();
  check('the first tab names itself', first.trim().length > 0, first);

  /*
   * Walk the tab bar and watch the title follow. Which stack is "active" is deliberately NOT read
   * from the DOM: an inactive stack is not inert — only a page underneath another one is — so there
   * is no attribute that says which tab is showing. The title is the observable, and it is the one
   * being tested.
   */
  const titles = [first];
  const tabs = p.locator('nav button:visible, [role="tablist"] button:visible, .nav-item');
  const n = Math.min(await tabs.count(), 6);
  for (let i = 0; i < n; i += 1) {
    await tabs.nth(i).click().catch(() => {});
    await p.waitForTimeout(3500);
    titles.push(await p.title());
  }

  const distinct = [...new Set(titles)];
  console.log('  titles seen:', JSON.stringify(titles));
  check('the title follows the tab', distinct.length > 1, distinct.join(' | '));
  check('and every one of them is a real name', titles.every((t) => t && t.trim().length > 0));
  /*
   * AND IN FRENCH. The names come from the translation table, so this is the check that they are
   * translated rather than merely spelled in English: the same screens, a different language, and
   * different words.
   */
  await p.evaluate(() => localStorage.setItem('language', 'fr'));
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(12000);

  const french = [await p.title()];
  for (let i = 0; i < n; i += 1) {
    await tabs.nth(i).click().catch(() => {});
    await p.waitForTimeout(3500);
    french.push(await p.title());
  }
  console.log('  in French:', JSON.stringify([...new Set(french)]));
  check('French gives French names', french.includes('Accueil') || french.includes('Récompenses'), [...new Set(french)].join(' | '));
  check('and they are not the English ones', new Set(french).size > 1 && [...new Set(french)].join() !== distinct.join());

  await p.evaluate(() => localStorage.setItem('language', 'en'));

  check('nothing threw', thrown.length === 0, thrown.slice(0, 2).join(' | '));
} catch (e) {
  console.log('STOPPED:', String(e).split('\n')[0]);
  failed += 1;
} finally {
  await browser.close();
  console.log(failed ? `\n${failed} failed` : '\nall passed');
  process.exit(failed ? 1 : 0);
}

#!/usr/bin/env node
/**
 * The page leg of the Release Impact data-travel test (decision 0141 harness): a real Chrome signs in through the
 * panel's own login page, opens /release-impact, and checks that what the page prints is what the endpoint answered,
 * on desktop and at phone width (390 px). Screenshots go to the folder given.
 *
 * Needs: the branch backend on :18085 (ops/harness/release-impact/run.sh <jar> keep, in invotick-apis), this panel on
 * :3000 built with NEXT_PUBLIC_API_BASE_URL=http://localhost:18085.
 *
 * Run: node tools/release-impact-page-check.mjs <admin email> <password file> <screenshot folder>
 * Output is ASCII only.
 */
import { readFileSync, mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const [email, pwFile, outDir] = process.argv.slice(2);
if (!email || !pwFile || !outDir) {
  console.log('usage: release-impact-page-check.mjs <email> <password file> <screenshot folder>');
  process.exit(2);
}
mkdirSync(outDir, { recursive: true });
const password = readFileSync(pwFile, 'utf8').trim();
const PANEL = 'http://localhost:3000';
const API = 'http://localhost:18085';

let failed = 0;
const ok = (name, cond, detail = '') => {
  if (!cond) failed++;
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${name} ${detail}`);
};

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--no-first-run'],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto(`${PANEL}/login`, { waitUntil: 'networkidle0' });
  await page.type('input[type="email"]', email);
  await page.type('input[type="password"]', password);
  await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => null), page.click('button[type="submit"]')]);

  // The endpoint's own answer for the page's default range, read with the page's own token.
  const token = await page.evaluate(() => {
    for (let i = 0; i < localStorage.length; i++) {
      const v = localStorage.getItem(localStorage.key(i)) || '';
      if (v.split('.').length === 3 && v.length > 100) return v;
    }
    return null;
  });
  ok('signed in through the login page', Boolean(token));

  await page.goto(`${PANEL}/release-impact`, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => document.body.innerText.includes('Releases ki timeline') || document.body.innerText.includes('HISAAB NAHI'), { timeout: 90000 });
  const text = await page.evaluate(() => document.body.innerText);

  const res = await fetch(`${API}/v1/webpanel/release-impact?platform=Android`, { headers: { Authorization: `Bearer ${token}` } });
  ok('endpoint answers 200', res.status === 200, `(HTTP ${res.status})`);
  const data = (await res.json()).data;

  ok('sidebar has the entry after A/B Tests', /A\/B Tests\s*\n\s*Release Impact/.test(text));
  ok('timeline card', text.includes('Releases ki timeline'));
  ok('scorecard card', text.includes('Hifazati numbers: har release ke wahi aath'));
  ok('four goals in the scorecard', /chaar maqsad/i.test(text));
  ok('section title', text.includes(`${data.section.currentName} (${data.section.current}) bamuqabla ${data.section.previousName} (${data.section.previous})`));
  const g1 = data.section.kpis.find((k) => k.id === 'g1_24h');
  ok('G1 row n as the endpoint says', text.includes(`n ${g1.a.n.toLocaleString('en-US')} / ${g1.b.n.toLocaleString('en-US')}`), `(n ${g1.a.n} / ${g1.b.n})`);
  ok('our own phones counted in the header', text.includes(`${data.section.excluded.cohortPhones} naye aur ${data.section.excluded.activePhones} active hamare apne phones nikale`));
  ok('Play rows say source baqi, no number', text.includes('Play ka source baqi'));
  ok('balance first opens as the endpoint says', text.includes(`${data.section.balance.a.toLocaleString('en-US')} / ${(data.section.balance.a + data.section.balance.b).toLocaleString('en-US')} pehli baar khulne`));
  ok('no ad removal advice anywhere', !/ad hata/i.test(text.split("koi 'ad hata dein' ka mashwara nahi").join('')));
  await page.screenshot({ path: `${outDir}/release-impact-desktop.png`, fullPage: true });

  await page.setViewport({ width: 390, height: 844, isMobile: true });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForFunction(() => document.body.innerText.includes('Releases ki timeline'), { timeout: 90000 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok('phone: no sideways page scroll', overflow <= 1, `(${overflow}px)`);
  const listShown = await page.evaluate(() => {
    const el = [...document.querySelectorAll('div')].find((d) => d.innerText.startsWith('Roz kitne phone kis version par (list shakal)') || d.innerText.includes('aaj ke phones'));
    return Boolean(el && el.offsetParent !== null);
  });
  ok('phone: the timeline is a list', listShown);
  await page.screenshot({ path: `${outDir}/release-impact-phone.png`, fullPage: true });
} finally {
  await browser.close();
}
console.log(failed ? `\n${failed} page check(s) failed` : '\nall release-impact page checks passed');
process.exit(failed ? 1 : 0);

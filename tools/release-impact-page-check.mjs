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

  // Round 2: the "Doosri invoice" section (decision 0227), in whichever state its own endpoint is in.
  const r2 = await fetch(`${API}/v1/webpanel/release-impact/second-invoice?platform=Android`, { headers: { Authorization: `Bearer ${token}` } });
  ok('second-invoice endpoint answers 200', r2.status === 200, `(HTTP ${r2.status})`);
  const si = (await r2.json()).data;
  ok('second-invoice section on the page', text.includes('Doosri invoice: teen nudge, ek holdout'));
  ok('the closed "Doosri invoice" card is gone (the section replaced it)', !text.includes('1.5.4 abhi cut nahi hui. Nudges ke saath hi banega'));
  if (si.state === 'not_started') {
    ok('not started: the honest state, no number', text.includes('Is waqt mein kisi phone ko nudge ka guroh nahi mila') && text.includes('ABHI SHURU NAHI'));
    ok('not started: no per-arm table', !text.includes('Har nudge ke qadam'));
  } else {
    ok('running: the arms as the endpoint says', text.includes(`Guroh: ${si.holdout.on.toLocaleString('en-US')} nudge ke saath · ${si.holdout.off.toLocaleString('en-US')} control`));
    const k = si.kpis.find((x) => x.id === 'second_7d');
    ok('running: primary n as the endpoint says', text.includes(`n ${k.a.n.toLocaleString('en-US')} / ${k.b.n.toLocaleString('en-US')}`), `(n ${k.a.n} / ${k.b.n})`);
    ok('running: mechanism shown', text.includes('Har nudge ke qadam'));
  }
  ok(`second-invoice state seen: ${si.state}`, true);

  // Round 3: the "Signup at exit" section (decision 0232).
  const r3 = await fetch(`${API}/v1/webpanel/release-impact/signup-at-exit?platform=Android`, { headers: { Authorization: `Bearer ${token}` } });
  ok('signup-at-exit endpoint answers 200', r3.status === 200, `(HTTP ${r3.status})`);
  const su = (await r3.json()).data;
  ok('signup-at-exit section on the page', text.includes('Signup at exit: dawat aur Account safety'));
  if (su.state === 'not_started') {
    ok('signup not started: the honest state, no number', text.includes('1.5.5 abhi ship nahi hui') && !text.includes('Dawat ke qadam'));
  } else {
    ok('signup running: the arms as the endpoint says', text.includes(`Guroh: ${su.population.invited.toLocaleString('en-US')} dawat · ${su.population.holdout.toLocaleString('en-US')} holdout`));
    ok('signup running: the steps shown', text.includes('Dawat ke qadam'));
  }
  ok(`signup-at-exit state seen: ${su.state}`, true);

  // Round 4: the "First invoice gate" section (decision 0233).
  const r4 = await fetch(`${API}/v1/webpanel/release-impact/first-invoice-gate?platform=Android`, { headers: { Authorization: `Bearer ${token}` } });
  ok('first-invoice-gate endpoint answers 200', r4.status === 200, `(HTTP ${r4.status})`);
  const fg = (await r4.json()).data;
  ok('first-invoice-gate section on the page', text.includes('Pehli invoice ka gate: ad save ke baad dashboard par'));
  if (fg.state === 'not_started') {
    ok('gate not started: the honest state, no number', text.includes('Gate ka test abhi shuru nahi') && !text.includes('Aap se sawal:'));
  } else {
    ok('gate running: the arms as the endpoint says', text.includes(`Guroh: ${fg.population.move.toLocaleString('en-US')} move · ${fg.population.show.toLocaleString('en-US')} show`));
    ok('gate running: the price is printed as a question', text.includes('Aap se sawal:') && text.includes('Qeemat: har 1,000 naye phones par'));
  }
  ok('the page never tells the owner to remove the gate', !/gate hata dein|remove the gate/i.test(text));
  ok(`first-invoice-gate state seen: ${fg.state}`, true);

  // Round 5: the "First invoice forms" section (decision 0234).
  const r5 = await fetch(`${API}/v1/webpanel/release-impact/first-invoice-forms?platform=Android`, { headers: { Authorization: `Bearer ${token}` } });
  ok('first-invoice-forms endpoint answers 200', r5.status === 200, `(HTTP ${r5.status})`);
  const ff = (await r5.json()).data;
  ok('first-invoice-forms section on the page', text.includes('Pehli invoice ke forms: tabs aur preview pehle'));
  if (ff.state === 'not_started') {
    ok('forms not started: the honest state, no number', text.includes('Forms ka test abhi shuru nahi') && !text.includes('Raasta: '));
  } else {
    const a = ff.population.forms.order_a ?? 0;
    ok('forms running: the arms as the endpoint says', a === 0 || text.includes(`Order A: item, business, client ${a.toLocaleString('en-US')}`));
    ok('forms running: each comparison is shown', ff.comparisons.every((c) => text.includes(c.key === 'preview_first' ? 'Preview pehle bamuqabla Aaj jaisa' : `bamuqabla Control (aaj ki teen sheets)`)));
    ok('forms running: the road is counted in phones', ff.funnels.length === 0 || text.includes('Raasta: '));
  }
  ok(`first-invoice-forms state seen: ${ff.state}`, true);
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

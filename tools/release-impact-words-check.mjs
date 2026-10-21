#!/usr/bin/env node
/**
 * Checks the sentences and number formats of the Release Impact page (`features/release-impact/words.ts`, decisions
 * 0228 and 0229). The backend sends codes and numbers; every sentence the owner reads is written in the panel, so a
 * wrong sign, a missing row name or a recommendation that tells him to remove an ad would read as a fact.
 *
 * Run: `npm run check:release-impact`
 */
import {
  ROW_WORDS,
  breachWords,
  cellValue,
  diffText,
  intervalText,
  recommendationWords,
  resultLine,
  secondInvoiceResult,
  secondInvoiceRowWords,
  MECHANISM_WORDS,
  sg,
} from '../features/release-impact/words.ts';

let failed = 0;
const eq = (name, got, want) => {
  if (got !== want) {
    failed++;
    console.log(`FAIL ${name}\n  got:  ${got}\n  want: ${want}`);
  } else console.log(`ok   ${name}`);
};
const yes = (name, cond) => eq(name, Boolean(cond), true);

// Every row the backend sends (ReleaseImpactReport.kpis) has a name and a meaning.
const IDS = ['g1_24h', 'g1_7d', 'pdf_24h', 'active_days', 'real_action_7d', 'uninstall_play', 'gone_14d', 'return_2_7', 'return_d7',
  'return_d30', 'ltv_phone_day', 'ad_phone_day', 'paywall_net_viewer', 'anr', 'crash', 'errors_seen', 'sync_defects', 'splash_pass',
  'second_7d', 'second_7d_sharers', 'second_24h', 'first_share_24h', 'duplicate_number'];
for (const id of IDS) yes(`words for ${id}`, ROW_WORDS[id]?.name && ROW_WORDS[id]?.mean);

eq('a real minus sign', sg(-4), '−4.0');
eq('plus', sg(2), '+2.0');
const k = { diff: -4.0, lo: -7.1, hi: 0.0, diffUnit: 'pp' };
eq('difference in points', diffText(k), '−4.0 pt');
eq('interval in points', intervalText(k), '−7.1 se 0.0 pt');
eq('per 1,000', cellValue('per1000', { value: 18.18 }), '18.2 / 1,000');
eq('dollars per phone-day', cellValue('usd', { value: 0.0037 }), '$0.0037');
eq('no value', cellValue('percent', null), '—');

// The monetisation rule: a fall in ad money is a question, never "remove an ad".
const q = breachWords('question_owner');
yes('ad breach is a question for the owner', q.includes('faisla aap ka'));
yes('ad breach never proposes removing an ad', q.includes("koi 'ad hata dein' ka mashwara nahi"));
eq('a Remote Config switch is named', breachWords('exit_question_enabled'), 'Band karne ke liye: Remote Config exit_question_enabled = false.');
yes('no switch: halt the staged rollout', breachWords('halt_staged_rollout').includes('staged rollout rok dein'));

const base = (rec, kpis = []) => ({ section: { recommendation: rec, kpis, currentName: '1.5.3' } });
const iterate = recommendationWords(base({ code: 'ITERATE', at: '7d', rows: ['return_d7'], switches: [], days: null }));
yes('ITERATE is a question', iterate.title.includes('aap se sawal'));
yes('ITERATE never proposes removing an ad or paywall', iterate.body.includes('Koi ad ya paywall hataane ka mashwara nahi'));
const wait = recommendationWords(base({ code: 'WAIT', at: '7d', rows: ['g1_24h'], switches: [], days: 17 }));
yes('WAIT says how many days', wait.body.includes('takreeban 17 din aur'));
eq('no read date, no recommendation', recommendationWords(base(null)), null);

const line = resultLine(base(null, [
  { id: 'g1_24h', status: 'thin', a: { n: 60 }, b: { n: 60 } },
  { id: 'anr', status: 'pending' },
  { id: 'crash', status: 'pending' },
]), 'g1_24h');
eq('result line, thin and pending', line, 'koi toota nahi. ASLI invoice, 24 ghante mein: data kam (n 60 · 60). 2 ka source baqi (Play).');

// Round 2 (decision 0227).
for (const k of ['card_shown', 'card_pressed', 'card_copy_saved', 'repeat_opened', 'repeat_failed', 'optin_shown', 'optin_on',
  'permission_denied', 'reminder_shared', 'reminder_stopped', 'second_repeat_origin']) yes(`mechanism words for ${k}`, MECHANISM_WORDS[k]?.name);
yes('goal rows read from the first invoice', secondInvoiceRowWords('return_2_7').mean.includes('pehli invoice'));
eq('the holdout switch is 100, never false', breachWords('nudges_holdout_percent'), 'Band karne ke liye: Remote Config nudges_holdout_percent = 100 (sab phone control mein, teeno nudge band).');
const ns = secondInvoiceResult({ state: 'not_started', kpis: [] });
yes('not started says no number', ns.includes('koi number nahi') && !/[0-9]/.test(ns));

if (failed) {
  console.log(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log('\nall release-impact word checks passed');

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
  SIGNUP_MECHANISM_WORDS,
  signupResult,
  signupRowWords,
  sg,
  GATE_OUTCOME_WORDS,
  gatePriceSentence,
  gateRecommendationWords,
  gateResult,
  gateRowWords,
  FORMS_STEP_WORDS,
  formsRecommendationWords,
  formsResult,
  formsRowWords,
  msText,
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

// Round 3 (decision 0232).
for (const id of ['signup_14d', 'signup_7d', 'signup_1d', 'exit_confirmed', 'invoices_per_phone', 'shared_14d', 'paywall_seen', 'premium_net_phone',
  'merge_failed', 'errors_seen_phones', 'gone_14d', 'active_days', 'return_d7_signed', 'return_d30_signed', 'ltv_phone_day', 'ad_phone_day']) {
  yes(`signup words for ${id}`, signupRowWords(id).name && signupRowWords(id).mean);
}
for (const k of ['invite_shown', 'signin_pressed', 'signin_done', 'work_joined', 'stay_pressed', 'exit_pressed', 'cancelled', 'error']) yes(`signup step ${k}`, SIGNUP_MECHANISM_WORDS[k]);
eq('the signup switch', breachWords('signup_exit_invite_enabled'), 'Band karne ke liye: Remote Config signup_exit_invite_enabled = false (exit dialog purana ho jata hai).');
const sn = signupResult({ state: 'not_started', kpis: [] });
yes('signup not started says no number', sn.includes('koi number nahi') && !/[0-9]/.test(sn));

// Round 4 (decision 0233): the price is a question, never a verdict, and nothing says "remove the gate".
for (const id of ['g1_24h', 'created_24h', 'g1_7d', 'created_7d', 'return_d2_7', 'return_d7', 'errors_seen_phones', 'paywall_seen_7d',
  'premium_door_7d', 'buyers_7d', 'active_days', 'gone_14d', 'return_d30', 'ltv_phone_7d']) {
  yes(`gate words for ${id}`, gateRowWords(id).name && gateRowWords(id).mean);
}
for (const k of ['shown', 'ad_watched', 'premium_tapped', 'dismissed', 'not_reached']) yes(`gate outcome ${k}`, GATE_OUTCOME_WORDS[k]);
eq('the gate switch is 0, never false', breachWords('first_invoice_gate_move_percent'),
  'Wapas karne ke liye: Remote Config first_invoice_gate_move_percent = 0 (dialog phir save se pehle; ad wahi rehta hai, band nahi hota).');
const price = { horizonDays: 7, phonesMove: 400, phonesShow: 1600, adPhonesMove: 400, adPhonesShow: 1600, usdPer1000Move: 20, usdPer1000Show: 30,
  usdDiffPer1000: -10, usdDiffLo: -11.1, usdDiffHi: -8.9, capUsd: 0.04, sharesPer1000Move: 150, sharesPer1000Show: 90, extraSharesPer1000: 60,
  extraSharesLo: 25, extraSharesHi: 100.5, movedSeen: 300, movedOwed: 400, thin: false };
const ps = gatePriceSentence(price);
eq('the price sentence', ps, 'Move wale guroh ne har 1,000 naye phones par pehle 7 din mein ad se $10.00 kam kamaya (hadd −$11.10 se −$8.90) aur 60.0 pehle share zyada paaye (hadd +25.0 se +100.5). Kya ye sauda aap ko qubool hai? Faisla aap ka.');
yes('the price is a question to the owner', ps.includes('?') && ps.includes('Faisla aap ka'));
yes('the price never says remove', !/hata|remove|band kar/i.test(ps));
yes('a thin price makes no sentence of meaning', gatePriceSentence({ ...price, thin: true }).startsWith('Qeemat abhi dhundli'));
const gr = (code, rows = ['g1_24h'], switches = []) => gateRecommendationWords({ recommendation: { code, at: '7d', rows, switches, days: 12 } });
yes('gate ITERATE is the owner question', gr('ITERATE').title.includes('aap se sawal') && gr('ITERATE').body.includes('faisla aap ka'));
yes('gate ITERATE never proposes removing an ad', gr('ITERATE').body.includes('koi ad ya paywall hataane ka mashwara nahi') && !gr('ITERATE').body.includes('KEEP'));
yes('gate ROLL_BACK names the key = 0', gr('ROLL_BACK', ['return_d7'], ['first_invoice_gate_move_percent']).body.includes('first_invoice_gate_move_percent = 0'));
yes('gate WAIT says the days', gr('WAIT').body.includes('takreeban 12 din aur'));
const gn = gateResult({ state: 'not_started', kpis: [] });
yes('gate not started says no number', gn.includes('koi number nahi') && !/[0-9]/.test(gn));

// Round 5 (decision 0234).
for (const id of ['g1_24h', 'created_24h', 'g1_7d', 'created_7d', 'time_to_invoice', 'return_d2_7', 'errors_seen_phones', 'paywall_seen_7d', 'buyers_7d',
  'active_days', 'gone_14d', 'return_d30', 'ltv_phone_7d']) yes(`forms words for ${id}`, formsRowWords(id).name && formsRowWords(id).mean);
for (const k of ['typed', 'create_pressed', 'completed', 'save_pressed', 'invoice_created', 'g1']) yes(`forms step ${k}`, FORMS_STEP_WORDS[k]);
eq('the forms switch goes back to control, never false', breachWords('first_forms_order'),
  'Band karne ke liye: Remote Config first_forms_order = control (jo phone abhi pehli invoice tak nahi pahunche, aaj ki sheets par wapas).');
eq('the post switch goes back to today', breachWords('first_invoice_post_arm'), 'Band karne ke liye: Remote Config first_invoice_post_arm = today (preview khud nahi khulta, aaj jaisa).');
const fr = (code, switches = []) => formsRecommendationWords({ recommendation: { code, at: '24h', rows: ['g1_24h'], switches, days: 9 } });
yes('forms ROLL_BACK names first_forms_order = control', fr('ROLL_BACK', ['first_forms_order']).body.includes('first_forms_order = control'));
yes('forms WAIT says the days', fr('WAIT').body.includes('takreeban 9 din aur'));
const red = formsResult({ kpis: [{ id: 'g1_24h', status: 'red', diff: -9, lo: -12.8, hi: -5.4, diffUnit: 'pp', a: { value: 3, n: 400 }, b: { value: 12, n: 400 } }] });
yes('a G1 fall past -2 points is said as a breach', red.includes('toot') && red.includes('−9.0 pt'));
eq('ms as seconds', msText(1050), '1.1 s');
eq('ms as minutes', msText(300000), '5.0 min');

if (failed) {
  console.log(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log('\nall release-impact word checks passed');

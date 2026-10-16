#!/usr/bin/env node
/**
 * Checks the sentences and number formats of the A/B Tests page (`features/ab-tests/words.ts`, decision 0222).
 *
 * ## Why this exists
 *
 * The backend sends codes and numbers; every sentence the owner reads is written in the panel. A wrong sign, a badge
 * that says "proven" for a leaning test, or a leak sentence on a test that is not leaking would read as a fact and be
 * acted on. The specimens are the 2026-10-15 report's own numbers (kaam/research/ab-tests-status-2026-10-15.md), and
 * the expected sentences are the approved mockup's (kaam/research/ab-tests-page-mockup.html).
 *
 * Run: `npm run check:ab-tests`
 */
import {
  badgeText,
  barPos,
  barTone,
  day,
  leakLine,
  moreLine,
  percentLine,
  pts,
  pValue,
  recLine,
  setAsideLine,
  statusText,
  summary,
  verdictLine,
  weakReason,
} from '../features/ab-tests/words.ts';

let failures = 0;
const ok = (name) => console.log(`  ok   ${name}`);
const fail = (name, detail) => {
  failures++;
  console.log(`  FAIL ${name}`);
  if (detail) console.log(`       ${detail}`);
};
function eq(name, actual, expected) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) ok(name);
  else fail(name, `expected ${JSON.stringify(expected)}\n              got ${JSON.stringify(actual)}`);
}

const prop = (n, x) => ({ n, x, rate: n ? x / n : null, lo: null, hi: null });
const metric = (metricName, window, primary, a, b, diffPts, diffLo, diffHi, z, p, valid) => ({
  metric: metricName, window, primary, a, b, diffPts, diffLo, diffHi, z, p, valid,
});
const arm = (role, key, assigned, share, extra = {}) => ({
  key, role, assigned, assignedNewInstalls: assigned, observedShare: share, pending24: 0, pending7: 0, values: [{ value: key, phones: assigned }], ...extra,
});
const base = (over) => ({
  status: 'RUNNING', intendedOff: false, touchesAds: false, newInstallsOnly: true, metricsBuilt: true,
  startedAt: '2026-09-30T00:00:00Z', lastAssignmentAt: '2026-10-15T14:00:00Z', leak: null, unknownArm: 0,
  notNewInstall: 0, breakdown: null, released: 0, ourOwnSetAside: 0,
  percent: { means: 'ARM_B', remoteKey: 'k', remoteState: 'absent', remoteValue: null, appDefaultSeen: [], sources: null, sourceRows: null },
  ...over,
});

const tour = base({
  id: 'tour', intendedOff: true,
  arms: [arm('A', 'on', 3811, 0.955), arm('B', 'off', 394, 0.045)],
  metrics: [
    metric('g1', '24h', true, prop(3811, 454), prop(394, 31), 4.0, 0.8, 6.6, 2.39, 0.017, true),
    metric('g1', '7d', true, prop(2141, 283), prop(305, 27), 4.4, 0.4, 7.5, 2.14, 0.032, true),
    metric('saved', '24h', false, prop(3811, 808), prop(394, 51), 8.3, 4.4, 11.5, 3.87, 0.0001, true),
  ],
  verdict: { state: 'PROVEN', direction: 'A', basis: 'g1_24h_and_7d', moreDays: null, moreDaysReason: 'already_proven', neededPerArm: null, daysBasis: null, perDayA: 280, perDayB: 13 },
  percent: {
    means: 'ARM_B', remoteKey: 'onboarding_overlay_holdout_percent', remoteState: 'set', remoteValue: '0',
    appDefaultSeen: [{ appVersionCode: 116, percent: '20', rows: 412 }], sources: { remote: 0.74, missing: 0.26 }, sourceRows: null,
  },
  leak: { since: '2026-10-04T16:57:00Z', sinceSource: 'phones', armPhones: 149, perDay: 13.6, shareOfNewInstalls: 0.045 },
});

const fr = base({
  id: 'ui_fr',
  arms: [arm('A', 'fr', 416, 0.545), arm('B', 'en_holdout', 347, 0.455)],
  metrics: [
    metric('g1', '24h', true, prop(392, 30), prop(324, 23), 0.6, -3.5, 4.4, 0.28, 0.778, true),
    metric('g1', '7d', true, prop(230, 24), prop(205, 14), 3.6, -1.8, 9.0, 1.33, 0.184, true),
  ],
  verdict: { state: 'LEANING', direction: 'A', basis: 'leaning', moreDays: 36, moreDaysReason: null, neededPerArm: 951, daysBasis: 'g1_7d', perDayA: 25, perDayB: 25 },
  percent: {
    means: 'ARM_B', remoteKey: 'french_ui_holdout_percent', remoteState: 'absent', remoteValue: null,
    appDefaultSeen: [{ appVersionCode: 116, percent: '50', rows: 930 }], sources: { missing: 1 }, sourceRows: null,
  },
  notNewInstall: 157,
});

const translated = base({
  id: 'ui_translated',
  arms: [arm('A', 'translated', 337, 0.47), arm('B', 'en_holdout', 378, 0.53)],
  metrics: [
    metric('g1', '24h', true, prop(322, 49), prop(348, 34), 5.4, 0.4, 10.5, 2.14, 0.032, true),
    metric('g1', '7d', true, prop(184, 29), prop(212, 27), 3.0, -3.9, 10.1, 0.86, 0.389, false),
  ],
  verdict: { state: 'LEANING', direction: 'A', basis: 'leaning', moreDays: 10, moreDaysReason: null, neededPerArm: 578, daysBasis: 'g1_24h', perDayA: 25, perDayB: 25 },
});

const splash = base({
  id: 'splash_wait', status: 'NOT_STARTED', touchesAds: true, newInstallsOnly: false, metricsBuilt: false, startedAt: null,
  arms: [arm('A', 'wait_4s', 0, null), arm('B', 'wait_6s', 0, null)], metrics: [],
  verdict: { state: 'NOT_ENOUGH_DATA', direction: null, basis: 'not_started', moreDays: null, moreDaysReason: 'not_started', neededPerArm: null, daysBasis: null, perDayA: 0, perDayB: 0 },
});

console.log('numbers');
eq('points with a real minus', [pts(4), pts(-2.6), pts(0), pts(null)], ['+4.0', '−2.6', '0.0', '—']);
eq('p to three places, tiny as <0.001', [pValue(0.017), pValue(0.0004), pValue(0.3), pValue(null)], ['0.017', '<0.001', '0.3', '—']);
eq('a day in UTC', day('2026-09-30T00:00:00Z'), '30 Sep');
eq('bar positions on ±15', [barPos(0), barPos(15), barPos(-30), barPos(7.5)], [50, 100, 0, 75]);
eq('bar colour', [barTone(tour.metrics[0]), barTone(fr.metrics[1]), barTone(translated.metrics[1])], ['pos', '', 'dash']);
eq('grey row says why', [weakReason(translated.metrics[1]), weakReason(tour.metrics[0])], ['kam data 184 < 200', null]);

console.log('the four tests of 2026-10-15, as the mockup says them');
eq('tour badge', badgeText(tour), 'Sabit hua');
eq('tour line', verdictLine(tour), 'Tour wale zyada asli invoice bhejte hain: G1 +4.0 points (24 ghante), +4.4 (7 din).');
eq('tour status: meant to be off, so no split', statusText(tour), 'Chal raha hai');
eq('French status: the split it is set to deal', statusText(fr), 'Chal raha hai · 50/50');
eq('tour more', moreLine(tour), 'Faisla ho chuka. Aur intezar ki zaroorat nahi.');
eq('tour leak', leakLine(tour, tour.leak),
  '04 Oct se 149 naye phones bina tour rahe: roz ~13.6, naye installs ka 4.5%. Remote Config inhein waqt par nahi pohanchta, is liye sirf app release isay band kar sakti hai.');
eq('tour recommendation', recLine(tour), 'Tour jeet gaya: agli app release mein app ka apna hissa 20% → 0 karein taake leak band ho.');
eq('tour percent', percentLine(tour),
  'Remote Config onboarding_overlay_holdout_percent = 0. App ka apna hissa (Bina tour): 20%, builds 116. 26.0% phones ne Remote Config aane se pehle faisla kiya, un par app ka apna hissa chala.');
eq('French badge', badgeText(fr), 'Aage, magar sabit nahi');
eq('French line', verdictLine(fr), 'French aage hai (G1 7 din +3.6 points), magar ye farq abhi ittefaq bhi ho sakta hai.');
eq('French more', moreLine(fr, new Date('2026-10-16T09:00:00Z')),
  'Takreeban 36 din aur (lagbhag 21 Nov), aaj ki raftaar par: roz ~25 / ~25 naye phones.');
eq('French percent', percentLine(fr),
  'Remote Config mein french_ui_holdout_percent nahi hai, is liye app ka apna hissa chalta hai. App ka apna hissa (English): 50%, builds 116. Sab phones ne Remote Config aane se pehle faisla kiya.');
eq('French recommendation', recLine(fr), 'Chalne dein.');
eq('French set aside', setAsideLine(fr), 'Nahi gine gaye: 157 update wale phones (naye install nahi).');
eq('translated line', verdictLine(translated),
  'Tarjuma aage hai (G1 24 ghante +5.4 points), magar ye farq abhi ittefaq bhi ho sakta hai; 7 din wala hisaab abhi kam data par hai.');
eq('splash badge', badgeText(splash), 'Abhi data nahi');
eq('splash line', verdictLine(splash), 'Ye test app mein maujood hai magar kabhi chala nahi: 0 phones.');
eq('splash never recommends', recLine(splash), null);
eq('summary pills', summary([tour, fr, translated, splash]), [
  { text: '1 sabit' }, { text: '2 aage, sabit nahi' }, { text: '1 shuru nahi hua' }, { text: '1 band hona tha, chal raha hai', warn: true },
]);

if (failures) {
  console.log(`\n${failures} failed`);
  process.exit(1);
}
console.log('\nall passed');

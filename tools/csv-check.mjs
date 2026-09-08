#!/usr/bin/env node
/**
 * Round-trip check for the CSV the Live Events breakdown copies.
 *
 * ## Why this exists
 *
 * A broken CSV does not throw. It opens, the columns shift by one, and the count sitting next to a
 * value belongs to a different value — silently, in the export the owner pastes into a chat to make
 * a decision from. There is no error to notice and no screen that looks wrong. So the check cannot
 * be "does it look right"; it has to be "does the text come back out as the text that went in".
 *
 * ## How it checks
 *
 * The parser below is written from RFC 4180 rather than imported from `lib/csv.ts`, deliberately.
 * An encoder tested against its own inverse proves the two agree, not that either is correct — if
 * `csvField` forgot to double a quote and the parser forgot to undo it, a shared-implementation
 * test passes. This one is an independent reader, so agreement means the file is actually CSV.
 *
 * The specimen is not invented. It is a real `sync_failed.reason` from production, carrying double
 * quotes, a comma, an apostrophe and two newlines in a single field — every escaping rule at once.
 *
 * Run: `npm run check:csv`
 */
import { csvField, csvRow, toCsv, buildEventDetailCsv } from '../lib/csv.ts';

let failures = 0;
const ok = (name) => console.log(`  ok   ${name}`);
const fail = (name, detail) => {
  failures++;
  console.log(`  FAIL ${name}`);
  if (detail) console.log(`       ${detail}`);
};

function eq(name, actual, expected) {
  if (actual === expected) ok(name);
  else fail(name, `expected ${JSON.stringify(expected)}\n              got ${JSON.stringify(actual)}`);
}

/**
 * A standalone RFC 4180 reader: quoted fields, `""` for a literal quote, CR/LF/CRLF inside quotes
 * kept verbatim, CRLF between records. Comment lines are the caller's problem, not the format's.
 */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  let fieldStarted = false;

  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"' && field === '') { inQuotes = true; fieldStarted = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; fieldStarted = false; i++; continue; }
    if (c === '\r' && text[i + 1] === '\n') {
      row.push(field); rows.push(row); row = []; field = ''; fieldStarted = false; i += 2; continue;
    }
    if (c === '\n' || c === '\r') {
      row.push(field); rows.push(row); row = []; field = ''; fieldStarted = false; i++; continue;
    }
    field += c; i++;
  }
  if (field !== '' || fieldStarted || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

/** The specimen. Copied from the dialog, not paraphrased — the newlines are in the value. */
const REAL_VALUE =
  'InvoiceItem: line "5 Hey Begs Get Begs Higher Day DB DB ten DB Day Be By Doyen\n' +
  "Eggs When's HD HD Be DB DB Day Day Of Of Ft Of Off ft ft of Due Due Due Adds\n" +
  'SD DVD Due DVD Due As As" 1.00 x 55554.00 =';

console.log('\nRFC 4180 field encoding');
eq('plain value is quoted', csvField('no_fill'), '"no_fill"');
eq('embedded quote is doubled', csvField('a "b" c'), '"a ""b"" c"');
eq('comma stays inside the field', csvField('a,b'), '"a,b"');
eq('newline is kept, not stripped', csvField('a\nb'), '"a\nb"');
eq('CRLF inside a value is kept', csvField('a\r\nb'), '"a\r\nb"');
eq('a lone quote becomes two', csvField('"'), '""""');
eq('empty string is an empty quoted field', csvField(''), '""');
eq('null becomes an empty field, not the word null', csvField(null), '""');
eq('undefined becomes an empty field', csvField(undefined), '""');
eq('a number is quoted like everything else', csvField(1206), '"1206"');
eq('a leading-zero string keeps its zero', csvField('007'), '"007"');
eq('records are terminated with CRLF', toCsv([['a'], ['b']]), '"a"\r\n"b"\r\n');
eq('a row joins on a bare comma', csvRow(['a', 'b']), '"a","b"');

console.log('\nThe real value, round-tripped');
{
  const encoded = toCsv([['reason', REAL_VALUE, 165, '52.9', 37]]);
  const parsed = parseCsv(encoded);
  if (parsed.length !== 1) fail('one record, despite two newlines inside the field', `got ${parsed.length} records`);
  else ok('one record, despite two newlines inside the field');
  if (parsed[0]?.length !== 5) fail('five fields, despite the comma inside the value', `got ${parsed[0]?.length} fields`);
  else ok('five fields, despite the comma inside the value');
  eq('the value survives byte for byte', parsed[0]?.[1], REAL_VALUE);
  eq('the count did not shift into another column', parsed[0]?.[2], '165');
  eq('the share did not shift', parsed[0]?.[3], '52.9');
  eq('the users column did not shift', parsed[0]?.[4], '37');
  eq('the newlines are still there', String(parsed[0]?.[1]).split('\n').length, 3);
  eq('the apostrophe survives', String(parsed[0]?.[1]).includes("When's"), true);
  eq('the inner quotes survive as single quotes', (String(parsed[0]?.[1]).match(/"/g) || []).length, 2);
}

console.log('\nThe whole dialog, round-tripped');
{
  /** Shaped like a real `EventDetail`: one truncated parameter, one complete, one `(absent)` row. */
  const detail = {
    eventName: 'sync_failed',
    events: 312,
    users: 86,
    devices: 81,
    params: [
      {
        key: 'reason',
        distinctValues: -1,
        truncated: true,
        values: [
          { value: REAL_VALUE, events: 165, users: 37, share: 52.9 },
          { value: 'STALE_CONFLICT', events: 90, users: 20, share: 28.85 },
          { value: 'a,comma "and" a quote', events: 57, users: 12, share: 18.27 },
        ],
      },
      {
        key: 'build_type',
        distinctValues: 2,
        truncated: false,
        values: [
          { value: 'release', events: 300, users: 84, share: 96.15 },
          { value: '(absent)', events: 12, users: 4, share: 3.85 },
        ],
      },
    ],
  };

  const csv = buildEventDetailCsv(detail, {
    build: 'release',
    versions: ['1.4.4'],
    range: '01 Sep 2026 – 07 Sep 2026',
  });

  const lines = csv.split('\r\n');
  const comments = lines.filter((l) => l.startsWith('#'));
  const body = csv.slice(csv.indexOf('"parameter"'));
  const parsed = parseCsv(body);

  eq('the event is named in the header', comments.some((l) => l.includes('sync_failed')), true);
  eq(
    'the header carries the dialog subtitle verbatim',
    comments.some((l) => l.includes('312 events · 86 users · 81 devices · release · 1.4.4')),
    true,
  );
  eq('the date range is stated', comments.some((l) => l.includes('01 Sep 2026 – 07 Sep 2026')), true);

  // Question #1: the browser holds 25 rows, never the rest. The note must say so and must not
  // invent the total, because the server sets distinctValues to -1 rather than counting past 25.
  const note = comments.find((l) => l.includes('showing top'));
  eq('the truncated parameter is declared', Boolean(note), true);
  eq('the note names the parameter', note?.includes('reason'), true);
  eq('the note does not claim a total it was never given', /of \d+ (values|total)/.test(note ?? ''), false);
  eq('the complete parameter gets no note', comments.some((l) => l.includes('build_type:')), false);

  eq('header row plus every value row', parsed.length, 6);
  eq('the header row is intact', parsed[0]?.join('|'), 'parameter|value|events|share_pct|users');
  eq('the real value survives the full build', parsed[1]?.[1], REAL_VALUE);
  eq('its count stayed with it', parsed[1]?.[2], '165');
  eq('the comma-and-quote value survives', parsed[3]?.[1], 'a,comma "and" a quote');
  eq('its count stayed with it', parsed[3]?.[2], '57');
  eq('(absent) is spelled out, not left as a value the app sent', parsed[5]?.[1], '(absent — key not sent)');
  eq('every row has five columns', parsed.every((r) => r.length === 5), true);
  eq('no comment line leaked into the table', parsed.some((r) => r[0].startsWith('#')), false);
}

console.log('');
if (failures > 0) {
  console.error(`${failures} check(s) failed.`);
  process.exit(1);
}
console.log('All CSV checks passed.');

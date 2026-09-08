import type { EventDetail } from "@/lib/types";

/**
 * RFC 4180 CSV, because the values in this panel are not tame.
 *
 * ## Why this is not `parts.join(",")`
 *
 * `parseGa4Csv` on Live Events splits on commas and gets away with it, because GA4 writes event
 * names and integers. Our own parameter values are whatever the app put in them, and one of them —
 * a real `sync_failed.reason` from production — is this:
 *
 *     InvoiceItem: line "5 Hey Begs Get Begs Higher Day DB DB ten DB Day Be By Doyen
 *     Eggs When's HD HD Be DB DB Day Day Of Of Ft Of Off ft ft of Due Due Due Adds
 *     SD DVD Due DVD Due As As" 1.00 x 55554.00 =
 *
 * Double quotes, commas, an apostrophe, and two newlines in one field. Joined naively that is not a
 * broken file, which would at least announce itself — it is a file that opens cleanly with the
 * columns shifted, so the count in front of you belongs to a different value than the one beside
 * it. Nobody reading it can tell. That is the whole reason this module exists rather than a
 * `join(",")` at the call site.
 *
 * ## The rules, which are not negotiable
 *
 * 1. **Every field is quoted.** RFC 4180 only requires it for fields containing `"`, `,`, CR or LF,
 *    but quoting unconditionally removes the branch that decides — and that branch is where the
 *    mistake lives. It also stops a spreadsheet re-typing `01`, `1-2` or `=A1` on import.
 * 2. **A `"` inside a field becomes `""`.** This is the escape; there is no backslash in CSV.
 * 3. **Newlines inside a quoted field stay.** Stripping them would make the file parse and the data
 *    wrong, which is the failure this module is here to prevent. A reader that cannot handle a
 *    quoted newline is not RFC 4180.
 * 4. **Records end with CRLF.** What the RFC says, and what Excel needs to not run the file
 *    together into one row on some locales.
 */
export function csvField(value: string | number | null | undefined): string {
  if (value == null) return '""';
  return `"${String(value).replace(/"/g, '""')}"`;
}

/** One record. The CRLF that terminates it belongs to {@link toCsv}, not here. */
export function csvRow(fields: Array<string | number | null | undefined>): string {
  return fields.map(csvField).join(",");
}

/**
 * Records into a document.
 *
 * A trailing CRLF is deliberate: the RFC makes the last one optional, and appending to a file whose
 * final line has no terminator silently glues two records together.
 */
export function toCsv(rows: Array<Array<string | number | null | undefined>>): string {
  return rows.map(csvRow).join("\r\n") + "\r\n";
}

/**
 * A comment line above the table — the metadata, not a record.
 *
 * `#` is the convention this page already reads (`parseGa4Csv` skips these; GA4's own export writes
 * them) and the one `buildStreamReport` already writes. It is NOT part of RFC 4180, so the text is
 * kept free of commas, quotes and newlines rather than escaped — a quoted comment line reads as
 * garbage in a spreadsheet, whereas a plain one reads as a note.
 */
function comment(text: string): string {
  return `# ${text.replace(/[\r\n]+/g, " ")}`;
}

export interface EventCsvContext {
  /** `release` | `debug` | `all` — the build the numbers were produced under. */
  build: string;
  /** Version names the summary was narrowed to; empty means every version. */
  versions: string[];
  /** The date range, already formatted for a human. */
  range?: string;
}

/**
 * The open parameter-breakdown dialog, as a CSV the owner can paste into a chat.
 *
 * ## The header block, and why it is not optional
 *
 * Pasted on its own, `no_fill,1206,52.9%,37` is four numbers about nothing. The block above the
 * table carries what the dialog's own subtitle carries — the event, its totals, the build, the
 * versions and the date range — because the same lesson was already paid for once on this page:
 * `buildStreamReport` says a report that does not name its filter gets read as everything.
 *
 * ## `truncated`, and the line that must not be a guess
 *
 * The cut happens on the **server**. `GET /v1/webpanel/analytics/event-detail` takes `maxValues`
 * (default 25), fetches `cap + 1` rows, and when it finds more it returns the first `cap` with
 * `truncated: true` — so the browser never holds the rest, and a CSV cannot silently complete
 * itself. That much is knowable.
 *
 * What is NOT knowable is how many there were: the same response sets `distinctValues` to `-1`
 * exactly when it truncates, because the real count is never measured past the cap. So the note
 * cannot say "top 25 of 340" — that number does not exist anywhere in this process, and inventing
 * a plausible one is worse than the truncation it would be describing. It says what is true: the
 * list was cut at N, and the total was not counted.
 *
 * The note goes on its own line, immediately above that parameter's rows, and the count column of
 * every cut parameter is where an owner would otherwise sum a column and get a wrong total
 * confidently.
 */
export function buildEventDetailCsv(detail: EventDetail, ctx: EventCsvContext): string {
  const versions = ctx.versions.length > 0 ? ctx.versions.join(", ") : "all versions";
  const head = [
    comment(`Invotick Live Events — parameter breakdown`),
    comment(`event: ${detail.eventName}`),
    comment(
      `${detail.events.toLocaleString()} events · ${detail.users.toLocaleString()} users · ` +
        `${detail.devices.toLocaleString()} devices · ${ctx.build} · ${versions}`,
    ),
    comment(`range: ${ctx.range ?? "not specified"}`),
    comment(`copied: ${new Date().toISOString()}`),
  ];

  // A parameter with no values at all would otherwise contribute a header line and nothing under
  // it, which reads as a parameter that was never sent rather than one the filter excluded.
  const rows: Array<Array<string | number>> = [
    ["parameter", "value", "events", "share_pct", "users"],
  ];
  const notes: string[] = [];

  for (const p of detail.params) {
    if (p.truncated) {
      notes.push(
        comment(
          `${p.key}: showing top ${p.values.length} values only — the server cut the list at ` +
            `${p.values.length} and does not count past it, so the true number of distinct values ` +
            `is unknown. Do not sum this parameter's rows and read the result as a total.`,
        ),
      );
    }
    for (const v of p.values) {
      rows.push([
        p.key,
        // "(absent)" is the server's word for "the event was sent without this key at all". The
        // dialog renders it as "not sent"; the CSV says so in words too, because "(absent)" in a
        // spreadsheet cell reads like a value the app actually sent.
        v.value === "(absent)" ? "(absent — key not sent)" : v.value,
        v.events,
        v.share.toFixed(1),
        v.users,
      ]);
    }
  }

  // Truncation notes sit with the header rather than beside their rows: a `#` line in the middle of
  // a table is a row in every spreadsheet that opens it, and it would land in the parameter column
  // of whichever value happened to follow it.
  return [...head, ...notes].join("\r\n") + "\r\n" + toCsv(rows);
}

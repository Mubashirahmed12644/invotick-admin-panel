/**
 * Every sentence and number format of the A/B Tests page (decision 0222), in Roman Urdu, from the backend's codes.
 * The backend sends codes and numbers only, so wording changes never need a backend deploy, and the backend never
 * states an opinion about an ad.
 *
 * Pure: no imports at run time, so `tools/ab-tests-words-check.mjs` runs it under plain Node.
 */
import type { AbTest, AbTestsResponse, Arm, Leak, Metric, Percent, Prop, Unavailable } from "./types";

// ── the tests, in words ──

interface TestWords {
  name: string;
  what: string;
  /** Arm A then arm B: the long label (the arm box) and the short one (rates, the bar's ends). */
  a: { long: string; short: string };
  b: { long: string; short: string };
}

export const TEST_WORDS: Record<string, TestWords> = {
  tour: {
    name: "Pehli invoice ka tour",
    what: "Naye install par Create Invoice: tour ke saath, ya bina tour",
    a: { long: "A · tour ke saath", short: "Tour" },
    b: { long: "B · bina tour", short: "Bina tour" },
  },
  ui_fr: {
    name: "French interface",
    what: "French zubaan wale phones: French screens, ya English",
    a: { long: "A · French", short: "French" },
    b: { long: "B · English par rakhe", short: "English" },
  },
  ui_translated: {
    name: "Tarjuma shuda interface",
    what: "Arabic, Portuguese, Spanish aur baqi zubanein: apni zubaan, ya English",
    a: { long: "A · apni zubaan", short: "Tarjuma" },
    b: { long: "B · English par rakhe", short: "English" },
  },
  splash_wait: {
    name: "Wapas aane walon ka splash intezar",
    what: "Dobara khulne par app-open ad ka intezar: 4 second, ya aaj ke 6 second",
    a: { long: "A · 4 second", short: "4 sec" },
    b: { long: "B · 6 second (aaj)", short: "6 sec" },
  },
};

export function testWords(id: string): TestWords {
  return (
    TEST_WORDS[id] ?? { name: id, what: "", a: { long: "A", short: "A" }, b: { long: "B", short: "B" } }
  );
}

// ── numbers ──

export const fmt = (n: number | null | undefined): string => (n == null ? "—" : Number(n).toLocaleString("en-US"));

/** A share 0..1 as `11.9%`. */
export const pct = (r: number | null | undefined): string => (r == null || !Number.isFinite(r) ? "—" : `${(r * 100).toFixed(1)}%`);

/** Points with a real minus sign: `+4.0`, `−2.6`, `0.0`. */
export function pts(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const s = Math.abs(v).toFixed(1);
  return v > 0 ? `+${s}` : v < 0 ? `−${s}` : s;
}

export function pValue(p: number | null | undefined): string {
  if (p == null) return "—";
  return p < 0.001 ? "<0.001" : p.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** `30 Sep`, in UTC. */
export function day(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${String(d.getUTCDate()).padStart(2, "0")} ${MONTHS[d.getUTCMonth()]}`;
}

/** `16 Oct 09:20 UTC`. */
export function dayTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${day(iso)} ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")} UTC`;
}

/** How old an answer is, in words: `abhi`, `7 min purana`, `2 ghante purana`. */
export function age(iso: string, now: Date = new Date()): string {
  const m = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60000));
  if (m < 1) return "abhi";
  if (m < 90) return `${m} min purana`;
  return `${Math.round(m / 60)} ghante purana`;
}

// ── a metric row ──

export function metricLabel(m: Pick<Metric, "metric">): string {
  return m.metric === "g1" ? "G1" : m.metric === "saved" ? "Invoice save" : "Wapas aaye";
}

export function windowLabel(w: Metric["window"]): string {
  return w === "24h" ? "24 ghante" : w === "7d" ? "7 din" : "din 2–7";
}

/** Why a row is grey: the smaller arm under 200 phones, or under 10 who did (or did not) do it. */
export function weakReason(m: Metric): string | null {
  if (m.valid) return null;
  const n = Math.min(m.a.n, m.b.n);
  return n < 200 ? `kam data ${fmt(n)} < 200` : "kam data";
}

/** The bar's shared scale, the same on every card so tests can be compared by eye. */
export const SCALE = 15;

/** Where a value sits on the bar, 0..100 %. */
export const barPos = (v: number): number => Math.min(100, Math.max(0, ((v + SCALE) / (2 * SCALE)) * 100));

/** The bar's colour: green when the whole range is above 0, red when below, dashed when the row is not valid. */
export function barTone(m: Metric): "pos" | "neg" | "dash" | "" {
  if (!m.valid) return "dash";
  if (m.diffLo != null && m.diffLo > 0) return "pos";
  if (m.diffHi != null && m.diffHi < 0) return "neg";
  return "";
}

// ── the card's words ──

export function badgeText(t: AbTest): string {
  switch (t.verdict.state) {
    case "PROVEN":
      return "Sabit hua";
    case "LEANING":
      return "Aage, magar sabit nahi";
    default:
      return t.status === "NOT_STARTED" ? "Abhi data nahi" : "Kam data";
  }
}

export function statusText(t: AbTest): string {
  if (t.status === "NOT_STARTED") return "Shuru nahi hua";
  if (t.status === "ENDED") return "Ruka hua";
  const share = intendedShare(t);
  return share == null ? "Chal raha hai" : `Chal raha hai · ${share.a}/${share.b}`;
}

/**
 * The split the test is set to deal (not what it dealt: the arm boxes show that), when one value is in force:
 * Remote Config's own, or, when the key is absent, the one app default every phone reported. Null at 0 or 100
 * (a test meant to be off is said by its own pill), or when it cannot be told.
 */
export function intendedShare(t: AbTest): { a: number; b: number } | null {
  const p = t.percent;
  let v: number | null = null;
  if (p.remoteState === "set") v = Number(p.remoteValue);
  else if (p.remoteState === "absent") {
    const d = [...new Set(p.appDefaultSeen.map((x) => x.percent))];
    v = d.length === 1 && d[0] != null ? Number(d[0]) : null;
  }
  if (v == null || !Number.isFinite(v) || v <= 0 || v >= 100) return null;
  return p.means === "ARM_B" ? { a: 100 - v, b: v } : { a: v, b: 100 - v };
}

const find = (t: AbTest, metric: Metric["metric"], window: Metric["window"]) =>
  t.metrics.find((m) => m.metric === metric && m.window === window);

/** The one sentence under the badge. */
export function verdictLine(t: AbTest): string {
  const w = testWords(t.id);
  const v = t.verdict;
  const g1d1 = find(t, "g1", "24h");
  const g1d7 = find(t, "g1", "7d");
  if (v.state === "NOT_ENOUGH_DATA") {
    if (t.status === "NOT_STARTED") return "Ye test app mein maujood hai magar kabhi chala nahi: 0 phones.";
    if (!t.metricsBuilt) {
      const n = t.arms.reduce((s, a) => s + a.assigned, 0);
      return `${fmt(n)} phones baante gaye. Is test ke numbers abhi tay nahi, is liye yahan sirf baant dikhti hai.`;
    }
    return `Abhi data kam hai: har guroh mein kam az kam 200 phones chahiye (abhi ${fmt(g1d1?.a.n)} / ${fmt(g1d1?.b.n)}).`;
  }
  if (v.direction === "EVEN") return "Dono guroh barabar hain: G1 ka farq aadhe point se kam hai.";
  const winner = v.direction === "B" ? w.b.short : w.a.short;
  const sign = v.direction === "B" ? -1 : 1;
  if (v.state === "PROVEN") {
    const parts = [
      g1d1?.valid ? `${pts((g1d1.diffPts ?? 0) * sign)} points (24 ghante)` : null,
      g1d7?.valid ? `${pts((g1d7.diffPts ?? 0) * sign)} (7 din)` : null,
    ].filter(Boolean);
    return `${winner} wale zyada asli invoice bhejte hain: G1 ${parts.join(", ")}.`;
  }
  const lead = g1d7?.valid ? g1d7 : g1d1;
  const leadText = lead ? `G1 ${windowLabel(lead.window)} ${pts((lead.diffPts ?? 0) * sign)} points` : "G1";
  const base = `${winner} aage hai (${leadText}), magar ye farq abhi ittefaq bhi ho sakta hai`;
  return lead === g1d1 && g1d7 && !g1d7.valid ? `${base}; 7 din wala hisaab abhi kam data par hai.` : `${base}.`;
}

/** "About N more days", or why there is no such number. */
export function moreLine(t: AbTest, now: Date = new Date()): string {
  const v = t.verdict;
  switch (v.moreDaysReason) {
    case "already_proven":
      return "Faisla ho chuka. Aur intezar ki zaroorat nahi.";
    case "not_started":
      return t.touchesAds
        ? "Shuru hone ke baad har phone 7 din tak dekha jayega."
        : "Shuru hone ke baad har naya phone 7 din tak dekha jayega.";
    case "metrics_not_built":
      return "Is ke numbers ads ke hisaab ke saath tay honge, phir yahan dikhenge.";
    case "diff_too_small":
      return "Farq itna chhota hai ke is raftaar par saalon lagenge.";
    case "no_new_phones":
      return "Naye phones nahi aa rahe, is liye andaza nahi lagaya ja sakta.";
    case "enough_phones":
      return "Phones kaafi hain, magar farq ab bhi pakka nahi.";
  }
  if (v.moreDays == null) return "";
  const when = new Date(now.getTime() + v.moreDays * 24 * 3600 * 1000);
  const rate = `roz ~${Math.round(v.perDayA)} / ~${Math.round(v.perDayB)} naye phones`;
  return `Takreeban ${fmt(v.moreDays)} din aur (lagbhag ${day(when.toISOString())}), aaj ki raftaar par: ${rate}.`;
}

/** The big number in an arm box: phones counted in the 24-hour rate; under it, the share and the new installs. */
export function armLines(t: AbTest, arm: Arm): { n: string; small: string; sub: string } {
  const g1d1 = find(t, "g1", "24h");
  const counted = arm.role === "A" ? g1d1?.a.n : g1d1?.b.n;
  if (!t.metricsBuilt || counted == null) {
    return { n: fmt(arm.assigned), small: "phones", sub: `hissa ${pct(arm.observedShare)}` };
  }
  const values =
    t.id === "ui_translated" && arm.role === "A"
      ? arm.values
          .slice(0, 3)
          .map((v) => `${v.value} ${fmt(v.phones)}`)
          .join(" · ")
      : null;
  return {
    n: fmt(counted),
    small: "naye phones",
    sub: values ?? `naye installs ${fmt(arm.assignedNewInstalls)} · asal hissa ${pct(arm.observedShare)}`,
  };
}

const REASONS: Record<string, string> = {
  no_credentials: "server ke paas chaabi nahi",
  permission_denied: "ijazat nahi mili",
  timeout: "jawab waqt par nahi aaya",
  switched_off: "parhna band hai",
  error: "parhne mein galti",
};

/** Where the percent comes from: Remote Config's own value, then what the phones themselves reported. */
export function percentLine(t: AbTest): string {
  const p: Percent = t.percent;
  const w = testWords(t.id);
  const parts: string[] = [];
  switch (p.remoteState) {
    case "set":
      parts.push(`Remote Config ${p.remoteKey} = ${p.remoteValue}.`);
      break;
    case "absent":
      parts.push(`Remote Config mein ${p.remoteKey} nahi hai, is liye app ka apna hissa chalta hai.`);
      break;
    case "conditional":
      parts.push(`Remote Config mein ${p.remoteKey} kisi condition par mabni hai (aam value ${p.remoteValue ?? "—"}).`);
      break;
    default:
      parts.push(`Remote Config ki value maloom nahi.`);
  }
  const defaults = [...new Set(p.appDefaultSeen.map((d) => d.percent).filter((x): x is string => x != null))];
  if (defaults.length) {
    const builds = [...new Set(p.appDefaultSeen.map((d) => d.appVersionCode).filter((x): x is number => x != null))].sort((a, b) => a - b);
    const who = p.means === "ARM_B" ? w.b.short : w.a.short;
    parts.push(`App ka apna hissa (${who}): ${defaults.map((d) => `${d}%`).join(", ")}${builds.length ? `, builds ${builds.join(", ")}` : ""}.`);
  }
  const missing = (p.sources?.missing ?? 0) + (p.sources?.invalid ?? 0);
  if (p.sources && missing > 0) {
    parts.push(
      missing >= 0.995
        ? "Sab phones ne Remote Config aane se pehle faisla kiya."
        : `${pct(missing)} phones ne Remote Config aane se pehle faisla kiya, un par app ka apna hissa chala.`,
    );
  }
  return parts.join(" ");
}

export function remoteUnknownLine(r: AbTestsResponse["remoteConfig"]): string | null {
  if (r.state !== "unknown") return null;
  return `Remote Config ki value maloom nahi (${REASONS[r.reason ?? ""] ?? r.reason ?? "wajah maloom nahi"}). Neeche phones ki apni batai hui value dikhti hai.`;
}

export function leakLine(t: AbTest, leak: Leak): string {
  const w = testWords(t.id);
  const arm = t.percent.means === "ARM_B" ? w.b.short.toLowerCase() : w.a.short.toLowerCase();
  const since = leak.sinceSource === "range" ? "Is waqt mein" : `${day(leak.since)} se`;
  const share = leak.shareOfNewInstalls != null ? `, naye installs ka ${pct(leak.shareOfNewInstalls)}` : "";
  const defaults = t.percent.appDefaultSeen.some((d) => d.percent != null && d.percent !== "0");
  const why = defaults
    ? " Remote Config inhein waqt par nahi pohanchta, is liye sirf app release isay band kar sakti hai."
    : "";
  return `${since} ${fmt(leak.armPhones)} naye phones ${arm} rahe: roz ~${leak.perDay.toFixed(1)}${share}.${why}`;
}

/** The recommendation; null for a test that touches ads (that card asks the owner instead). */
export function recLine(t: AbTest): string | null {
  if (t.touchesAds || t.status === "NOT_STARTED") return null;
  const w = testWords(t.id);
  const v = t.verdict;
  if (v.state === "PROVEN" && v.direction !== "EVEN") {
    const winner = v.direction === "B" ? w.b.short : w.a.short;
    const appDefault = t.percent.appDefaultSeen.find((d) => d.percent != null && d.percent !== "0")?.percent;
    if (t.leak && appDefault)
      return `${winner} jeet gaya: agli app release mein app ka apna hissa ${appDefault}% → 0 karein taake leak band ho.`;
    return `${winner} jeet gaya. Isay sab par lagana hai ya nahi, faisla aap ka.`;
  }
  return "Chalne dein.";
}

export const AD_QUESTION =
  "Ye test ad ke intezar ko chhota karta hai. 4 second wala guroh shayad zyada logon ko aage le jaye, magar shayad kam ad dikhen. Chalaya to yahan dono taraf hamesha saath dikhengi: aage nikalne wale aur kamai. Chalana hai ya nahi, ye sawal aap ka hai; page iski sifarish nahi karega.";

/** What the splash-wait card will show once its numbers are agreed. */
export const SPLASH_WAITING = ["Splash se aage gaye (dobara khulne par)", "App-open ad dikha", "Kamai fi phone (USD)", "G1 7 din"];

export function pendingLine(t: AbTest): string | null {
  const p24 = t.arms.reduce((s, a) => s + a.pending24, 0);
  const p7 = t.arms.reduce((s, a) => s + a.pending7, 0);
  if (!t.metricsBuilt || (p24 === 0 && p7 === 0)) return null;
  return `${fmt(p24)} phones ke 24 ghante aur ${fmt(p7)} ke 7 din abhi poore nahi hue: wo abhi gine nahi gaye.`;
}

/** What was left out of this card, said once, so a smaller number is never mistaken for a lost one. */
export function setAsideLine(t: AbTest): string | null {
  const parts = [
    t.notNewInstall ? `${fmt(t.notNewInstall)} update wale phones (naye install nahi)` : null,
    t.ourOwnSetAside ? `${fmt(t.ourOwnSetAside)} hamare apne phones` : null,
    t.released ? `${fmt(t.released)} chhode gaye phones (test khatam hone par)` : null,
    t.unknownArm ? `${fmt(t.unknownArm)} phones jin ka guroh samajh nahi aaya` : null,
  ].filter(Boolean);
  return parts.length ? `Nahi gine gaye: ${parts.join(" · ")}.` : null;
}

/** The headline pills over all tests. */
export function summary(tests: AbTest[]): { text: string; warn?: boolean }[] {
  const n = (f: (t: AbTest) => boolean) => tests.filter(f).length;
  const out: { text: string; warn?: boolean }[] = [];
  const proven = n((t) => t.verdict.state === "PROVEN");
  const leaning = n((t) => t.verdict.state === "LEANING");
  const notStarted = n((t) => t.status === "NOT_STARTED");
  const off = n((t) => t.intendedOff);
  if (proven) out.push({ text: `${proven} sabit` });
  if (leaning) out.push({ text: `${leaning} aage, sabit nahi` });
  const thin = n((t) => t.verdict.state === "NOT_ENOUGH_DATA" && t.status !== "NOT_STARTED");
  if (thin) out.push({ text: `${thin} mein kam data` });
  if (notStarted) out.push({ text: `${notStarted} shuru nahi hua` });
  if (off) out.push({ text: `${off} band hona tha, chal raha hai`, warn: true });
  return out;
}

/** The "Hisaab" table row: phones A / B for the metric's window. */
export const phonesAB = (a: Prop, b: Prop): string => `${fmt(a.n)} / ${fmt(b.n)}`;

export function unavailableText(r: Unavailable): string {
  switch (r) {
    case "computing":
      return "Hisaab ho raha hai. Pehli dafa 15 second tak lag sakte hain; thori der mein dobara dekhein.";
    case "busy":
      return "Server abhi doosre waqt ka hisaab kar raha hai. Thori der mein dobara dekhein.";
    case "too_slow":
      return "Ye hisaab 15 second se lamba tha, is liye server ne rok diya (koi adhoora number nahi dikhaya). Chhota waqt chunein, maslan 7 din, ya 2 minute baad dobara dekhein.";
    default:
      return "Hisaab mein galti hui. Server ke log mein [ab-tests] dekhein.";
  }
}

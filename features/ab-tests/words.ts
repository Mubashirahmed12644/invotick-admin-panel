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
  /** One plain sentence: what is compared and the question it answers. Starts the card. */
  question: string;
  /** Arm A then arm B: the long label (the arm box), the short one (bar ends, row names) and "who" (inside a sentence). */
  a: { long: string; short: string; who: string };
  b: { long: string; short: string; who: string };
}

export const TEST_WORDS: Record<string, TestWords> = {
  tour: {
    name: "Pehli invoice ka tour",
    question:
      "Sawal: kya naye phone ko pehli baar ka tour dikhane se zyada log ASLI invoice banate hain (tour ke saath ya bina tour)?",
    a: { long: "A · tour ke saath", short: "Tour", who: "tour wale" },
    b: { long: "B · bina tour", short: "Bina tour", who: "bina tour wale" },
  },
  ui_fr: {
    name: "French interface",
    question:
      "Sawal: kya French zubaan wale phones ko French screens dikhane se zyada log ASLI invoice banate hain (French screens ya English)?",
    a: { long: "A · French", short: "French", who: "French wale" },
    b: { long: "B · English par rakhe", short: "English", who: "English wale" },
  },
  ui_translated: {
    name: "Tarjuma shuda interface",
    question:
      "Sawal: kya Arabic, Portuguese, Spanish aur baqi zubanon ke phones ko unki apni zubaan dikhane se zyada log ASLI invoice banate hain (apni zubaan ya English)?",
    a: { long: "A · apni zubaan", short: "Tarjuma", who: "apni zubaan wale" },
    b: { long: "B · English par rakhe", short: "English", who: "English wale" },
  },
  splash_wait: {
    name: "Wapas aane walon ka splash intezar",
    question:
      "Sawal: kya dobara khulne par app-open ad ka intezar 6 se ghata kar 4 second karne se zyada log aage jate hain, aur ad ki kamai par kya asar padta hai?",
    a: { long: "A · 4 second", short: "4 sec", who: "4 second wale" },
    b: { long: "B · 6 second (aaj)", short: "6 sec", who: "6 second wale" },
  },
};

export function testWords(id: string): TestWords {
  return (
    TEST_WORDS[id] ?? {
      name: id,
      question: "",
      a: { long: "A", short: "A", who: "A wale" },
      b: { long: "B", short: "B", who: "B wale" },
    }
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

/** A count and its percent, always together: `482 / 3,959 phone = 12.2%`. */
export const countPct = (p: Pick<Prop, "n" | "x" | "rate">): string => `${fmt(p.x)} / ${fmt(p.n)} phone = ${pct(p.rate)}`;

/** A difference in plain words, from arm A's side: `Tour 4.4 points zyada`, `Tour 2.6 points kam`. */
export function diffWords(diffPts: number | null | undefined, aName: string): string {
  if (diffPts == null || !Number.isFinite(diffPts)) return "—";
  const s = Math.abs(diffPts).toFixed(1);
  if (s === "0.0") return "bilkul barabar";
  return `${aName} ${s} points ${diffPts > 0 ? "zyada" : "kam"}`;
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

/** The three measures, one fixed vocabulary on every card. */
export function metricLabel(m: Pick<Metric, "metric">): string {
  return m.metric === "g1" ? "ASLI invoice" : m.metric === "saved" ? "Invoice save hua" : "Din 2-7 mein wapas aaya";
}

/** The one-line meaning under a measure's name. */
export function metricMeaning(m: Pick<Metric, "metric">): string {
  switch (m.metric) {
    case "g1":
      return "jis invoice ko share kiya gaya ya jis par payment darj hui";
    case "saved":
      return "invoice save hua; ye kamzor paimaana hai, kyunki bekaar (throwaway) data ka invoice bhi save ho jata hai";
    default:
      return "install ke baad din 2 se 7 ke beech phone dobara app mein aaya";
  }
}

/** Empty for the return measure: its name already says the days. */
export function windowLabel(w: Metric["window"]): string {
  return w === "24h" ? "24 ghante mein" : w === "7d" ? "7 din mein" : "";
}

/** Measure and window together: `ASLI invoice · 24 ghante mein`. */
export function metricFull(m: Pick<Metric, "metric" | "window">): string {
  const w = windowLabel(m.window);
  return w ? `${metricLabel(m)} · ${w}` : metricLabel(m);
}

/** Why a row is grey: the smaller arm under 200 phones, or under 10 who did (or did not) do it. */
export function weakReason(m: Metric): string | null {
  if (m.valid) return null;
  const n = Math.min(m.a.n, m.b.n);
  return n < 200 ? `data kam: ${fmt(n)} < 200` : "data kam";
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
      return "PAKKA";
    case "LEANING":
      return "RUJHAN (sabit nahi)";
    default:
      return "DATA KAM";
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

/** The card's first line: what is compared and the question it answers. */
export function questionLine(t: AbTest): string {
  return testWords(t.id).question;
}

/**
 * The card's headline answer, one sentence, built from the endpoint's numbers with the main measure (ASLI invoice) first.
 * Arm A is always the arm the question asks about, so "haan" means A won.
 */
export function answerLine(t: AbTest): string {
  const w = testWords(t.id);
  const v = t.verdict;
  const g24 = find(t, "g1", "24h");
  const g7 = find(t, "g1", "7d");
  const days = v.moreDays != null ? `, takreeban ${fmt(v.moreDays)} din aur` : "";
  if (v.state === "NOT_ENOUGH_DATA") {
    if (t.status === "NOT_STARTED") return "Jawab: abhi pata nahi: ye test app mein maujood hai magar kabhi chala nahi (0 phones).";
    if (!t.metricsBuilt) {
      const n = t.arms.reduce((s, a) => s + a.assigned, 0);
      return `Jawab: abhi pata nahi: ${fmt(n)} phones baante gaye, magar is test ke numbers abhi tay nahi hain, is liye yahan sirf baant dikhti hai.`;
    }
    return `Jawab: abhi pata nahi: data kam hai, har taraf kam az kam 200 phones chahiye (abhi ${fmt(g24?.a.n)} aur ${fmt(g24?.b.n)} hain)${days}.`;
  }
  if (v.direction === "EVEN") return "Jawab: nahi, dono taraf barabar hain: ASLI invoice mein farq aadhe point se kam hai.";
  const bWins = v.direction === "B";
  const win = bWins ? w.b : w.a;
  const lose = bWins ? w.a : w.b;
  const rateOf = (m: Metric, forB: boolean) => pct(forB ? m.b.rate : m.a.rate);
  if (v.state === "PROVEN") {
    const lead = g24?.valid ? g24 : g7;
    if (!lead) return "Jawab: farq pakka hai.";
    const other = lead === g24 && g7?.valid ? g7 : null;
    const also = other ? ` ${windowLabel(other.window)} bhi: ${rateOf(other, bWins)} aur ${rateOf(other, !bWins)}.` : "";
    const head = bWins ? "nahi, ulta nikla: " : "haan, ";
    return `Jawab: ${head}${win.who} ${rateOf(lead, bWins)} ne ASLI invoice banaya (${windowLabel(lead.window)}), ${lose.who} ${rateOf(lead, !bWins)}; farq pakka hai.${also}`;
  }
  const lead = g7?.valid ? g7 : g24;
  if (!lead) return "Jawab: abhi pata nahi.";
  const gap = Math.abs(lead.diffPts ?? 0).toFixed(1);
  const weak7 = lead === g24 && g7 && !g7.valid ? " 7 din wala hisaab abhi data kam hone se pakka nahi." : "";
  return `Jawab: abhi pata nahi: ASLI invoice (${windowLabel(lead.window)}) mein ${win.who} ${rateOf(lead, bWins)}, ${lose.who} ${rateOf(lead, !bWins)}; farq ${gap} points hai magar sample chhota hai${days}.${weak7}`;
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
export const SPLASH_WAITING = ["Splash se aage gaye (dobara khulne par)", "App-open ad dikha", "Kamai fi phone (USD)", "ASLI invoice · 7 din mein"];

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
  if (proven) out.push({ text: `${proven} PAKKA` });
  if (leaning) out.push({ text: `${leaning} RUJHAN (sabit nahi)` });
  const thin = n((t) => t.verdict.state === "NOT_ENOUGH_DATA" && t.status !== "NOT_STARTED");
  if (thin) out.push({ text: `${thin} mein DATA KAM` });
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

/** The collapsed box at the top: how every number on the page was counted. */
export const HOW_COUNTED: string[] = [
  "Sirf naye install hue phones gine jate hain; purane phones jo update hue, nahi (sirf splash intezar wala test is se alag hai: wo dobara khulne wale phones par hai).",
  "Sirf release builds; debug aur test builds nahi.",
  "Hamare apne test phones aur accounts nikaal diye gaye hain.",
  "Har phone tab gina jata hai jab us ka poora waqt (24 ghante ya 7 din) guzar chuka ho; adhoora waqt gina nahi jata.",
  "ASLI invoice = jis invoice ko share kiya gaya ya jis par payment darj hui. Ye mukhya paimaana hai: PAKKA ya RUJHAN ka faisla isi se hota hai.",
  "Invoice save hua kamzor paimaana hai: save ho jana ye nahi batata ke data asli tha, kuch bhi likh kar save ho sakta hai.",
  "PAKKA = farq ittefaq nahi ho sakta. RUJHAN (sabit nahi) = ek taraf aage hai magar ittefaq bhi ho sakta hai. DATA KAM = abhi faisle layak phones nahi (har taraf kam az kam 200 chahiye).",
];

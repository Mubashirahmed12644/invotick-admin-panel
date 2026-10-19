/**
 * Every sentence and number format of the Release Impact page (decisions 0228, 0229; the approved mockup
 * kaam/research/release-impact-panel-mockup.html), in Roman Urdu, from the backend's codes. The backend sends codes and
 * numbers only, so wording never needs a backend deploy, and no backend string states an opinion about an ad.
 *
 * Pure: type-only imports, so `tools/release-impact-words-check.mjs` runs it under plain Node.
 */
import type { Cell, Kpi, ReleaseImpactResponse, ReleaseStatus, RowStatus, Unavailable } from "./types";

// ── numbers ──

export const fmt = (n: number | null | undefined): string => (n == null ? "—" : Math.round(n).toLocaleString("en-US"));

/** A signed number with a real minus sign: "+2.0", "−4.0", "0.0". */
export function sg(v: number | null | undefined, d = 1): string {
  if (v == null) return "—";
  const s = Math.abs(v).toFixed(d);
  return v > 0.0005 ? `+${s}` : v < -0.0005 ? `−${s}` : s;
}

export const pct = (v: number | null | undefined, d = 1): string => (v == null ? "—" : `${v.toFixed(d)} %`);

/** The value of one arm in its row's unit. */
export function cellValue(unit: Kpi["unit"], c: Cell | null | undefined): string {
  if (!c || c.value == null) return "—";
  switch (unit) {
    case "percent":
      return pct(c.value);
    case "per1000":
      return `${c.value.toFixed(1)} / 1,000`;
    case "days":
      return `${c.value.toFixed(2)} din`;
    case "usd":
      return usd(c.value);
  }
}

export function usd(v: number | null | undefined): string {
  if (v == null) return "—";
  if (v === 0) return "$0";
  return v < 0.1 ? `$${v.toFixed(4)}` : `$${v.toFixed(2)}`;
}

/** The count under the value: "30 / 250" for a share, "6,820 phone-din" for money. */
export function cellCount(k: Pick<Kpi, "unit" | "kind" | "id">, c: Cell | null | undefined): string {
  if (!c) return "";
  if (k.kind === "money") {
    if (k.id === "paywall_net_viewer") return `${fmt(c.n)} viewers · ${fmt(c.extra?.buyers ?? 0)} kharidar`;
    const buyers = c.extra?.buyers;
    return `${fmt(c.n)} phone-din${buyers != null ? ` · ${fmt(buyers)} kharidar` : ""}`;
  }
  if (k.kind === "mean") return `${fmt(c.n)} phones`;
  return `${fmt(c.x)} / ${fmt(c.n)}`;
}

export function diffText(k: Kpi): string {
  if (k.diff == null) return "—";
  const u = k.diffUnit === "pp" ? " pt" : k.diffUnit === "pct" ? " %" : " din";
  return `${sg(k.diff, k.diffUnit === "days" ? 2 : 1)}${u}`;
}

export function intervalText(k: Kpi): string {
  if (k.lo == null || k.hi == null) return "";
  const u = k.diffUnit === "pp" ? " pt" : k.diffUnit === "pct" ? " %" : " din";
  const d = k.diffUnit === "days" ? 2 : 1;
  return `${sg(k.lo, d)} se ${sg(k.hi, d)}${u}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "19 Oct" in UTC. */
export function day(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** "26 Oct 09:20 UTC". */
export function dayTime(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${day(iso)} ${hh}:${mm} UTC`;
}

// ── statuses ──

export const ROW_STATUS: Record<RowStatus, { word: string; icon: "eq" | "warn" | "x" | "clock" | "plug" | "info" | "check" }> = {
  plain: { word: "koi saaf farq nahi", icon: "eq" },
  amber: { word: "dekhte rahein", icon: "warn" },
  red: { word: "hifazat toot gayi", icon: "x" },
  thin: { word: "data kam", icon: "clock" },
  pending: { word: "source baqi", icon: "plug" },
  none: { word: "muqabla nahi", icon: "info" },
  better: { word: "behtar", icon: "check" },
  worse: { word: "bura", icon: "x" },
};

/** The release badge: no Better/Worse on a release (it has no single goal), its guardrails' state instead. */
export const RELEASE_STATUS: Record<ReleaseStatus, { word: string; small: string; cls: string; icon: "check" | "warn" | "x" | "clock" }> = {
  clear: { word: "SAAF", small: "hifazat ki halat · koi toota nahi", cls: "status-clear", icon: "check" },
  watch: { word: "DEKHTE RAHEIN", small: "hifazat ki halat · koi toota nahi", cls: "status-watch", icon: "warn" },
  broken: { word: "HIFAZAT TOOT GAYI", small: "hifazat ki halat", cls: "worse", icon: "x" },
  thin: { word: "DATA KAM HAI", small: "hifazat ki halat · abhi rang nahi", cls: "thin", icon: "clock" },
};

// ── the rows, in words ──

export interface RowWords {
  name: string;
  mean: string;
}

export const ROW_WORDS: Record<string, RowWords> = {
  g1_24h: { name: "ASLI invoice, 24 ghante mein", mean: "naye installs: share ya payment (G1)" },
  g1_7d: { name: "ASLI invoice, 7 din mein", mean: "sirf wo phone jin ke 7 din poore hue" },
  pdf_24h: { name: "PDF bheja, 24 ghante mein", mean: "G1 ki alag line (0228): invoice ka PDF save hua" },
  active_days: { name: "Hafte mein kitne din app khola", mean: "naye installs ke pehle 7 din, fi phone (engagement)" },
  real_action_7d: { name: "Asli kaam kiya, 7 din mein", mean: "invoice, share ya payment wale phones (engagement)" },
  uninstall_play: { name: "Uninstall (Play)", mean: "Play ke version-wise uninstall" },
  gone_14d: { name: "Aaye aur 14 din mein phir nahi aaye", mean: "uninstall ka andaza (proxy), Play ka number nahi; kam behtar" },
  return_2_7: { name: "Din 2 se 7 mein wapas aaye", mean: "naye installs, sirf wo jin ke 7 din poore" },
  return_d7: { name: "Din 7 par wapas aaye", mean: "naye installs, saatwen din app khola" },
  return_d30: { name: "Din 30 par wapas aaye", mean: "naye installs, tees din poore hone wale" },
  ltv_phone_day: { name: "LTV: kamai fi phone-din", mean: "ad + premium (store fee ke baad), USD; kharidar saath" },
  ad_phone_day: { name: "Ad ki kamai fi phone-din", mean: "sab formats milakar, USD; ek phone-din 99.5 % par kati" },
  paywall_net_viewer: { name: "Paywall: net kamai fi dekhne wala", mean: "dekhne walon par, USD" },
  anr: { name: "ANR jo user ko dikhe (Play)", mean: "app atakne par 'wait' wala dabba" },
  crash: { name: "Crash (Play)", mean: "app achanak band" },
  errors_seen: { name: "Galti jo user ne dekhi", mean: "phones fi 1,000 active; hamare apne phones nikle" },
  sync_defects: { name: "Sync mein kharabi wale phones", mean: "phones fi 1,000 active; had tay nahi" },
  splash_pass: { name: "Splash se aage nikle", mean: "har cold start par" },
};

export function rowWords(id: string): RowWords {
  return ROW_WORDS[id] ?? { name: id, mean: "" };
}

/** The KPI table's groups, in the order the section shows them (0229: the four goals beside the G1 rows). */
export const GROUPS: { key: string; title: string; sub: string }[] = [
  { key: "g1", title: "Pehli invoice (G1)", sub: "naye installs" },
  { key: "engagement", title: "Maqsad 1 · Engagement", sub: "app kitna istemal hua" },
  { key: "uninstall", title: "Maqsad 2 · Uninstall", sub: "kam behtar" },
  { key: "retention", title: "Maqsad 3 · Retention", sub: "din 2-7 hifazati number bhi hai" },
  { key: "ltv", title: "Maqsad 4 · LTV", sub: "ad aur paywall: hifazati number bhi, dono taraf hamesha" },
  { key: "trust", title: "Hifazat · Bharosa (G3)", sub: "crash, ANR, galti, sync" },
  { key: "speed", title: "Hifazat · Raftaar", sub: "" },
];

export function minText(k: Kpi): string {
  if (k.status === "pending") return k.pending === "play_source" ? "Play version-wise" : "";
  if (k.min == null) return "—";
  const unit =
    k.kind === "rate"
      ? "phones har taraf"
      : k.id === "splash_pass"
        ? "cold starts har taraf"
        : k.id === "paywall_net_viewer"
          ? "kharidar har taraf"
          : k.kind === "money"
            ? "phone-din + 50 phones"
            : "phones har taraf";
  return `kam az kam ${fmt(k.min)} ${unit}`;
}

/** What a row says when it is pending: never a number. */
export function pendingNote(k: Kpi): string {
  return k.pending === "play_source" ? "Play ka source baqi" : "abhi nahi";
}

/** The switch named under a red row. Never "remove an ad or a paywall" (monetisation rule). */
export function breachWords(key: string | null): string {
  switch (key) {
    case null:
      return "";
    case "halt_staged_rollout":
      return "Aap ka kaam: Play Console mein staged rollout rok dein (koi Remote Config switch nahi).";
    case "question_owner":
      return "Kamai giri: ye faisla aap ka hai, sawal ki shakal mein. Kamai aur nuqsan dono number saath; koi 'ad hata dein' ka mashwara nahi.";
    default:
      return `Band karne ke liye: Remote Config ${key} = false.`;
  }
}

// ── the section's sentences ──

export function comparisonWords(c: "staged" | "before_after"): string {
  return c === "staged" ? "Staged rollout · naye installs · Play ne chuna" : 'Pehle / baad · "jura hua", "is ne kiya" nahi';
}

export function balanceWords(r: ReleaseImpactResponse): string | null {
  const b = r.section.balance;
  if (b.state === "failed") {
    return `Muqabla badla: "pehle / baad, jura hua". ${r.section.currentName} ka pehli baar khulne mein hissa ${pct(b.share)} hai jab rollout ${b.rolloutPercent} % likha hai. Play naye installs ko us hisaab se nahi baant raha, is liye "saath saath" muqabla jaiz nahi. Label badal gaya.`;
  }
  return null;
}

/** The "Nateeja" line: what happened, with the G1 row the chip picked. */
export function resultLine(r: ReleaseImpactResponse, g1Id: "g1_24h" | "g1_7d"): string {
  const s = r.section;
  const red = s.kpis.filter((k) => k.status === "red");
  const amber = s.kpis.filter((k) => k.status === "amber");
  const pending = s.kpis.filter((k) => k.status === "pending").length;
  const g = s.kpis.find((k) => k.id === g1Id);
  const parts: string[] = [];
  parts.push(red.length ? `${red.length} hifazati number toota` : "koi toota nahi");
  if (g) {
    if (g.status === "thin") parts.push(`${rowWords(g.id).name}: data kam (n ${fmt(g.a?.n)} · ${fmt(g.b?.n)})`);
    else if (g.diff != null) parts.push(`${rowWords(g.id).name} ${diffText(g)} (hadd ${intervalText(g)}): ${ROW_STATUS[g.status].word}`);
  }
  if (amber.length) parts.push(`${amber.length} par dekhte rahein`);
  if (pending) parts.push(`${pending} ka source baqi (Play)`);
  return parts.join(". ") + ".";
}

export function recommendationWords(r: ReleaseImpactResponse): { title: string; body: string; tone: "neu" | "bad" | "warn" } | null {
  const rec = r.section.recommendation;
  if (!rec) return null;
  const at = rec.at === "24h" ? "24 ghante" : rec.at === "7d" ? "din 7" : "din 30";
  const names = rec.rows.map((id) => rowWords(id).name).join(", ");
  switch (rec.code) {
    case "KEEP":
      return { title: `Sifarish (${at}): KEEP.`, body: "Hifazati number saaf; koi switch band karne ki zaroorat nahi.", tone: "neu" };
    case "WAIT":
      return {
        title: `Sifarish (${at}): WAIT.`,
        body: `${names}: ginti abhi kam${rec.days != null ? `, takreeban ${rec.days} din aur` : ""}. Koi hifazati number toota nahi, koi switch band karne ki zaroorat nahi.`,
        tone: "neu",
      };
    case "ITERATE":
      return {
        title: `Sifarish (${at}): ITERATE, aap se sawal.`,
        body: `${names} neeche gaya, koi hifazati had nahi tooti. Kya ye qeemat qubool hai, ya agli release mein is qadam ko theek karein? Koi ad ya paywall hataane ka mashwara nahi.`,
        tone: "warn",
      };
    case "ROLL_BACK":
      return {
        title: `Sifarish (${at}): ROLL BACK.`,
        body: `${names}: poori 95 % hadd hifazati had ke buri taraf. ${rec.switches.map(breachWords).join(" ")}`,
        tone: "bad",
      };
  }
}

export function unavailableText(r: Unavailable): string {
  switch (r) {
    case "computing":
      return "Hisaab ho raha hai… Ye bhaari hisaab hai: server 15 second tak le sakta hai. Adhura number kabhi nahi dikhaya jata.";
    case "busy":
      return "Server abhi doosra hisaab kar raha hai. Thodi der mein dobara dekhein.";
    case "too_slow":
      return "Hisaab 15 second mein poora nahi hua aur rok diya gaya. Koi adhura number nahi dikhaya. Chhota waqt chunein ya 2 minute baad dobara.";
    case "error":
      return "Hisaab nahi ho saka. Koi adhura ya purana number nahi dikhaya gaya. Dobara koshish karein; phir bhi na ho to Health Centre dekhein.";
  }
}

export const HOW_COUNTED: string[] = [
  "Naye installs: jin ka pehli baar khulna (first open) is waqt mein hua, release build, Android; ek phone ek baar, pehle build par (update karne wala apne pehle build mein rehta hai).",
  "24 ghante / 7 din / 14 / 30 din ke number sirf un phones par jin ki khidki poori ho gayi; baqi 'intezar' mein, kisi hisaab mein nahi.",
  "Active phone: jis ne us din app khola (cold start ya foreground). Phone-din: ek phone ka ek din.",
  "Hamare apne phones aur test devices (do list) har ginti se bahar; kitne nikale wo upar likha hai.",
  "Rang sirf tab jab har taraf kam az kam ginti poori: 200 phones aur 10 natije; phones fi 1,000 par 2,000; kamai par 500 phone-din aur 50 phones; paywall par 10 kharidar.",
  "Hifazati number tab toota jab poori 95 % hadd had ke buri taraf: galtiyan +50 %, din 2-7 wapsi −2 pt, ad ki kamai −3 %, ASLI invoice −1.5 pt, splash −2 pt.",
  "Ad ki kamai hamare apne ad_impression_value se (USD); AdMob ki apni kamai: source baqi. Play ke ANR, crash aur uninstall: source baqi.",
];

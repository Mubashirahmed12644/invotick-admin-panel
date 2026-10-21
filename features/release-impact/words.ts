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
    case "count":
      return c.value.toFixed(2);
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
    if (k.id === "invoices_per_phone") return `${fmt(c.n)} phones`;
    if (k.id === "premium_net_phone") return `${fmt(c.n)} phones · ${fmt(c.extra?.buyers ?? 0)} kharidar`;
    if (k.id === "paywall_net_viewer") return `${fmt(c.n)} viewers · ${fmt(c.extra?.buyers ?? 0)} kharidar`;
    if (k.id === "ltv_phone_7d") return `${fmt(c.n)} phones · ${fmt(c.extra?.buyers ?? 0)} kharidar`;
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
  second_7d: { name: "7 din mein doosri invoice", mean: "pehli invoice banane wale sab phone, poori 7 din ki khidki (primary, 0228)" },
  second_7d_sharers: { name: "7 din mein doosri invoice: sirf share karne wale", mean: "jinhon ne pehli invoice 24 ghante mein share ki (mockup ka number)" },
  second_24h: { name: "24 ghante mein doosri invoice", mean: "72 % doosri invoice pehle hi din banti hain" },
  first_share_24h: { name: "Pehla share, 24 ghante", mean: "card share ke baad aata hai: ye nudge wale guroh mein kam nahi hona chahiye" },
  duplicate_number: { name: "Do invoice ka ek hi number", mean: "ci_save_validation_failed field=invoice_number; target 0" },
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
  return ROW_WORDS[id] ?? SIGNUP_ROW_WORDS[id] ?? { name: id, mean: "" };
}

/** The KPI table's groups, in the order the section shows them (0229: the four goals beside the G1 rows). */
export const GROUPS: { key: string; title: string; sub: string }[] = [
  { key: "primary", title: "Primary", sub: "random: 'is ne kiya' likh sakte hain" },
  { key: "g1", title: "Pehli invoice (G1)", sub: "naye installs" },
  { key: "stay", title: "Hifazat · App mein rehna", sub: "exit ki tasdeeq gire to log tang hue" },
  { key: "engagement", title: "Maqsad 1 · Engagement", sub: "app kitna istemal hua" },
  { key: "uninstall", title: "Maqsad 2 · Uninstall", sub: "kam behtar" },
  { key: "retention", title: "Maqsad 3 · Retention", sub: "din 2-7 hifazati number bhi hai" },
  { key: "ltv", title: "Maqsad 4 · LTV", sub: "ad aur paywall: hifazati number bhi, dono taraf hamesha" },
  { key: "premium", title: "Hifazat · Premium", sub: "paywall aur kharidar" },
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
        : k.id === "paywall_net_viewer" || k.id === "premium_net_phone"
          ? "kharidar har taraf"
          : k.id === "invoices_per_phone" || k.id === "ltv_phone_7d"
            ? "phones har taraf"
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
    case "signup_exit_invite_enabled":
      return "Band karne ke liye: Remote Config signup_exit_invite_enabled = false (exit dialog purana ho jata hai).";
    case "nudges_holdout_percent":
      return "Band karne ke liye: Remote Config nudges_holdout_percent = 100 (sab phone control mein, teeno nudge band).";
    case "first_invoice_gate_move_percent":
      return "Wapas karne ke liye: Remote Config first_invoice_gate_move_percent = 0 (dialog phir save se pehle; ad wahi rehta hai, band nahi hota).";
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
        body: `${names}: ginti abhi kam${rec.days != null ? (rec.days > 365 ? ", aaj ki raftaar par ek saal se zyada" : `, takreeban ${rec.days} din aur`) : ""}. Koi hifazati number toota nahi, koi switch band karne ki zaroorat nahi.`,
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

// ── round 2: the "Doosri invoice" section (decision 0227) ──

/** The same goal rows, read from the first invoice instead of the first open. */
export const SECOND_INVOICE_ROW_WORDS: Record<string, RowWords> = {
  active_days: { name: "Hafte mein kitne din app khola", mean: "pehli invoice ke baad 7 din, fi phone (engagement)" },
  gone_14d: { name: "Pehli invoice ke baad 14 din mein phir nahi aaye", mean: "uninstall ka andaza (proxy), Play ka number nahi; kam behtar" },
  return_2_7: { name: "Din 2 se 7 mein wapas aaye", mean: "pehli invoice ke baad, sirf poori khidki wale" },
  return_d7: { name: "Din 7 par wapas aaye", mean: "pehli invoice ke saatwen din" },
  return_d30: { name: "Din 30 par wapas aaye", mean: "pehli invoice ke tees din baad" },
  ltv_phone_day: { name: "LTV: kamai fi phone-din", mean: "pehli invoice ke 7 din: ad + premium, USD; kharidar saath" },
  ad_phone_day: { name: "Ad ki kamai fi phone-din", mean: "pehli invoice ke 7 din, dono guroh (koi gate nahi badla)" },
};

export function secondInvoiceRowWords(id: string): RowWords {
  return SECOND_INVOICE_ROW_WORDS[id] ?? rowWords(id);
}

export const MECHANISM_WORDS: Record<string, { nudge: string; name: string }> = {
  card_shown: { nudge: "A", name: "card dikha (pehle share ke baad)" },
  card_pressed: { nudge: "A", name: "card dabaya" },
  card_copy_saved: { nudge: "A", name: "card se copy save hui (origin=repeat)" },
  repeat_opened: { nudge: "B", name: "list par Repeat dabaya (khula)" },
  repeat_failed: { nudge: "B", name: "Repeat nakaam (fi Repeat dabana)" },
  optin_shown: { nudge: "C", name: "reminder ka sawal dikha" },
  optin_on: { nudge: "C", name: "Remind me" },
  permission_denied: { nudge: "C", name: "notification ki ijazat nahi mili" },
  reminder_shared: { nudge: "C", name: "reminder bheja (purpose=reminder)" },
  reminder_stopped: { nudge: "C", name: "reminders band kiye" },
  second_repeat_origin: { nudge: "A+B", name: "doosri invoice copy se bani" },
};

export const SECOND_INVOICE_BADGE: Record<string, { word: string; small: string; cls: string; icon: "check" | "warn" | "x" | "clock" | "eq" }> = {
  not_started: { word: "ABHI SHURU NAHI", small: "is waqt mein koi guroh nahi", cls: "thin", icon: "clock" },
  thin: { word: "DATA KAM HAI", small: "Not enough data", cls: "thin", icon: "clock" },
  better: { word: "BEHTAR", small: "Better", cls: "better", icon: "check" },
  worse: { word: "BURA", small: "Worse", cls: "worse", icon: "x" },
  plain: { word: "KOI SAAF FARQ NAHI", small: "No clear difference", cls: "status-clear", icon: "eq" },
};

/** The "Nateeja" line of the section, from codes. */
export function secondInvoiceResult(r: import("./types").SecondInvoiceResponse): string {
  if (r.state === "not_started") return "Abhi koi phone nudge ke kisi guroh mein nahi aaya: koi number nahi.";
  const k = r.kpis.find((x) => x.id === "second_7d");
  if (!k || k.a?.n == null) return "Abhi koi number nahi.";
  if (!k.a.n && !k.b?.n) return "Abhi kisi phone ke 7 din poore nahi hue: koi number nahi.";
  const head = `${pct(k.a.value)} bamuqabla ${pct(k.b?.value)} (n ${fmt(k.a.n)} · ${fmt(k.b?.n)})`;
  if (k.status === "thin") return `${head}: ginti kam, dhundla. Faisla nahi.`;
  return `${head}: farq ${diffText(k)}, hadd ${intervalText(k)}: ${ROW_STATUS[k.status].word}.`;
}

// ── round 3: the "Signup at exit" section (decision 0232) ──

export const SIGNUP_ROW_WORDS: Record<string, RowWords> = {
  signup_14d: { name: "14 din mein account banaya ya sign in kiya", mean: "eligible guest phones, poori 14 din ki khidki (primary, 0232)" },
  signup_7d: { name: "7 din mein account", mean: "parhne ki tareekh, faisla nahi" },
  signup_1d: { name: "24 ghante mein account", mean: "parhne ki tareekh, faisla nahi" },
  exit_confirmed: { name: "Exit ki tasdeeq (exit dialog par)", mean: "app_exit_confirmed bamuqabla app_exit_cancelled; −3 pt se zyada girna = tang karna" },
  invoices_per_phone: { name: "Invoices fi phone, 14 din", mean: "eligible hone ke baad; −5 % had (G1)" },
  shared_14d: { name: "Share karne wale phones, 14 din", mean: "confirmed share (reminder ka nahi); −5 % had (G1)" },
  paywall_seen: { name: "Paywall dekhne wale phones, 14 din", mean: "premium_scr; −3 % had" },
  premium_net_phone: { name: "Premium net kamai fi phone, 14 din", mean: "USD, store fee ke baad; 10 kharidar se kam: kabhi laal nahi" },
  merge_failed: { name: "Guest ka kaam account mein na juda", mean: "sign-in galti ya merge nakaam; target 0, koi bhi izafa = bura" },
  errors_seen_phones: { name: "Galti dekhne wale phones, 14 din", mean: "error_shown; +50 % had" },
  gone_14d: { name: "Eligible hone ke baad 14 din mein phir nahi aaye", mean: "uninstall ka andaza (proxy); +2 pt had; kam behtar" },
  active_days: { name: "14 din mein kitne din app khola", mean: "eligible hone ke baad, fi phone (engagement)" },
  return_d7_signed: { name: "Din 7 par wapas: account wale bamuqabla bina account", mean: "sirf bayan, faisla nahi (dono guroh milakar)" },
  return_d30_signed: { name: "Din 30 par wapas: account wale bamuqabla bina account", mean: "sirf bayan, faisla nahi" },
  ltv_phone_day: { name: "LTV: kamai fi phone-din, 14 din", mean: "ad + premium, USD; kharidar saath" },
  ad_phone_day: { name: "Ad ki kamai fi phone-din, 14 din", mean: "sab formats, dono guroh; −3 % had" },
};

export function signupRowWords(id: string): RowWords {
  return SIGNUP_ROW_WORDS[id] ?? rowWords(id);
}

export const SIGNUP_MECHANISM_WORDS: Record<string, string> = {
  invite_shown: "Exit par dawat dikhi",
  signin_pressed: "Google ya email dabaya",
  signin_done: "Sign-in poora hua",
  work_joined: "Guest ka kaam account mein juda (guest_data_merged)",
  stay_pressed: "Stay dabaya",
  exit_pressed: "Exit dabaya",
  cancelled: "Sign-in beech mein chhoda",
  error: "Sign-in mein galti",
};

export const SIGNUP_LEVEL_WORDS: Record<string, string> = { at_risk: "At risk", better: "Better", safe: "Safe", unknown: "maloom nahi" };

export function signupResult(r: import("./types").SignupInviteResponse): string {
  if (r.state === "not_started") return "Is waqt mein kisi guest phone ko dawat ka guroh nahi mila: koi number nahi.";
  const k = r.kpis.find((x) => x.id === "signup_14d");
  if (!k || k.a?.n == null) return "Abhi koi number nahi.";
  if (!k.a.n && !k.b?.n) return "Abhi kisi phone ke 14 din poore nahi hue: koi number nahi.";
  const head = `${pct(k.a.value)} bamuqabla ${pct(k.b?.value)} (n ${fmt(k.a.n)} · ${fmt(k.b?.n)})`;
  if (k.status === "thin") return `${head}: ginti kam, dhundla. Faisla nahi.`;
  return `${head}: farq ${diffText(k)}, hadd ${intervalText(k)}: ${ROW_STATUS[k.status].word}.`;
}

/** "takreeban N hafte aur", or plainly more than a year at today's pace. */
export function weeksText(weeks: number, what: string): string {
  return weeks > 52 ? `${what}: aaj ki raftaar par ek saal se zyada` : `${what} mein takreeban ${weeks} hafte aur`;
}

// ── round 4: the "First invoice gate" section (decision 0233) ──

export const GATE_ROW_WORDS: Record<string, RowWords> = {
  g1_24h: { name: "ASLI invoice, 24 ghante mein", mean: "pehli baar khulne se: share (reminder nahi) ya payment (primary, 0233)" },
  created_24h: { name: "Invoice bani, 24 ghante mein", mean: "pehli baar khulne se; plan isi par (18 % se +4 pt)" },
  g1_7d: { name: "ASLI invoice, 7 din mein", mean: "parhne ki tareekh, faisla nahi" },
  created_7d: { name: "Invoice bani, 7 din mein", mean: "parhne ki tareekh, faisla nahi" },
  return_d2_7: { name: "Din 2 se 7 mein wapas aaye", mean: "−2 pt had" },
  return_d7: { name: "Din 7 par wapas aaye", mean: "−2 pt had" },
  errors_seen_phones: { name: "Galti dekhne wale phones, 7 din", mean: "error_shown; +50 % had" },
  paywall_seen_7d: { name: "Paywall dekhne wale phones, 7 din", mean: "har darwaze se; 0233 mein had tay nahi: zyada se zyada peela" },
  premium_door_7d: { name: "Dialog se \"Go premium\" dabane wale, 7 din", mean: "dono jagah (save se pehle ya dashboard par); had tay nahi" },
  buyers_7d: { name: "Kharidar, 7 din", mean: "10 kharidar se kam: kabhi laal nahi; had tay nahi" },
  active_days: { name: "Pehle 7 din mein kitne din app khola", mean: "naye phones, fi phone (engagement)" },
  gone_14d: { name: "Aaye aur 14 din mein phir nahi aaye", mean: "uninstall ka andaza (proxy); kam behtar" },
  return_d30: { name: "Din 30 par wapas aaye", mean: "naye phones, tees din poore hone wale" },
  ltv_phone_7d: { name: "LTV: kamai fi naya phone, 7 din", mean: "ad + premium, USD; qeemat ka number: rang nahi, faisla aap ka" },
};

export function gateRowWords(id: string): RowWords {
  return GATE_ROW_WORDS[id] ?? rowWords(id);
}

export const GATE_OUTCOME_WORDS: Record<string, string> = {
  shown: "Dikha, koi chunao nahi pahuncha",
  ad_watched: "\"Ad dekhein\" dabaya (ad ka flow khatam; ad dikhna zaroori nahi)",
  premium_tapped: "\"Go premium\" dabaya",
  dismissed: "Band kiya (cross, back ya bahar)",
  not_reached: "Kabhi nahi dikha",
  other: "Na-maloom outcome (data ki galti)",
};

export const GATE_REASON_WORDS: Record<string, string> = {
  left_app: "save ke baad app band (dashboard tak nahi aaye)",
  premium: "tab tak premium",
  gate_off: "saved_invoice_inter_enable band",
};

export const GATE_POSITION_WORDS: Record<string, string> = {
  before_save: "Save se pehle",
  after_save_dashboard: "Save ke baad, dashboard par",
  none: "Jagah nahi likhi (estimate / share gate)",
};

/** The "Nateeja" line of the section, from codes. */
export function gateResult(r: import("./types").FirstGateResponse): string {
  if (r.state === "not_started") return "Is waqt mein kisi naye phone ko gate ka guroh nahi mila: koi number nahi.";
  const k = r.kpis.find((x) => x.id === "g1_24h");
  if (!k || k.a?.n == null) return "Abhi koi number nahi.";
  if (!k.a.n && !k.b?.n) return "Abhi kisi phone ke 24 ghante poore nahi hue: koi number nahi.";
  const head = `${pct(k.a.value)} bamuqabla ${pct(k.b?.value)} (n ${fmt(k.a.n)} · ${fmt(k.b?.n)})`;
  if (k.status === "thin") return `${head}: ginti kam, dhundla. Faisla nahi.`;
  return `${head}: farq ${diffText(k)}, hadd ${intervalText(k)}: ${ROW_STATUS[k.status].word}.`;
}

/** Signed dollars: "+$1.20", "−$10.00". */
export function usdSigned(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${v > 0.0005 ? "+" : v < -0.0005 ? "−" : ""}$${Math.abs(v).toFixed(2)}`;
}

/**
 * The price as the owner reads it (0233): ad money and first shares per 1,000 new phones, side by side, and a question.
 * Never a verdict, never "remove the gate".
 */
export function gatePriceSentence(p: import("./types").FirstGatePrice): string {
  if (p.thin || p.usdDiffPer1000 == null || p.extraSharesPer1000 == null) {
    return `Qeemat abhi dhundli: ${fmt(p.phonesMove)} · ${fmt(p.phonesShow)} phones jin ke 7 din poore, ${fmt(p.adPhonesMove)} · ${fmt(p.adPhonesShow)} ad wale. Dono taraf 200 phone aur 50 ad wale phone hon to jumla banega.`;
  }
  const money = p.usdDiffPer1000 < 0 ? `$${Math.abs(p.usdDiffPer1000).toFixed(2)} kam` : `$${p.usdDiffPer1000.toFixed(2)} zyada`;
  const shares = p.extraSharesPer1000 < 0 ? `${Math.abs(p.extraSharesPer1000).toFixed(1)} pehle share kam` : `${p.extraSharesPer1000.toFixed(1)} pehle share zyada`;
  return (
    `Move wale guroh ne har 1,000 naye phones par pehle ${p.horizonDays} din mein ad se ${money} kamaya (hadd ${usdSigned(p.usdDiffLo)} se ${usdSigned(p.usdDiffHi)}) ` +
    `aur ${shares} paaye (hadd ${sg(p.extraSharesLo)} se ${sg(p.extraSharesHi)}). Kya ye sauda aap ko qubool hai? Faisla aap ka.`
  );
}

/** The section's recommendation: ITERATE here is the price question to the owner (0233 "Verdict handling"), never KEEP. */
export function gateRecommendationWords(r: import("./types").FirstGateResponse): { title: string; body: string; tone: "neu" | "bad" | "warn" } | null {
  const rec = r.recommendation;
  if (!rec) return null;
  const at = rec.at === "24h" ? "24 ghante" : rec.at === "7d" ? "din 7" : rec.at === "14d" ? "din 14" : "din 30";
  const names = rec.rows.map((id) => gateRowWords(id).name).join(", ");
  switch (rec.code) {
    case "WAIT":
      return {
        title: `Sifarish (${at}): WAIT.`,
        body: `${names}: ginti abhi kam${rec.days != null ? (rec.days > 365 ? ", aaj ki raftaar par ek saal se zyada" : `, takreeban ${rec.days} din aur`) : ""}. Koi hifazati number toota nahi.`,
        tone: "neu",
      };
    case "ROLL_BACK":
      return {
        title: `Sifarish (${at}): ROLL BACK.`,
        body: `${rec.rows.map((id) => gateRowWords(id).name).join(", ")}: poori 95 % hadd hifazati had ke buri taraf. ${rec.switches.map(breachWords).join(" ")}`,
        tone: "bad",
      };
    default:
      return {
        title: `Sifarish (${at}): ITERATE, aap se sawal.`,
        body: `${names} ka nateeja aur qeemat upar saath saath hain. Koi hifazati had nahi tooti. Gate ki jagah ka faisla aap ka: koi ad ya paywall hataane ka mashwara nahi.`,
        tone: "warn",
      };
  }
}

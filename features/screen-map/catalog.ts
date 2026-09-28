/**
 * What the page knows about the app's screens that the data cannot say: names in plain words, which drawn element on
 * Create Invoice is which event, and how the ways of leaving are grouped. Ported from the approved mockup
 * (kaam/screen-map/screen-map-mockup.html, 2026-09-28).
 */

export type Coverage = "ok" | "part" | "no";
export type DrawState = "empty" | "full";

export interface ElementDef {
  /** The key the drawn element carries (`data-el`). */
  k: string;
  n: number;
  label: string;
  /** Element ids as the backend keys them; the first one found in the data wins. */
  ids: string[];
  /** Plain description of where the number comes from. */
  ev: string;
  ch: "auto" | "coded" | "none";
  cov: Coverage;
  st: DrawState[];
  /** Measured only once the app sends a signal it does not send yet. */
  needs?: "dead_tap" | "ad_clicked";
  cv?: string;
  note?: string;
}

export const CREATE = "create_inv_scr";

export const CREATE_ELEMENTS: ElementDef[] = [
  { k: "close", n: 1, label: "✕ band karein", ids: ["invoice_screen_close#close_button"], ev: "invoice_screen_close (method=close_button)", ch: "auto", cov: "ok", st: ["empty", "full"], note: "Phone ka back bhi isi naam se aata hai (method=back_press) — wo \"nikalne\" wale hisse mein hai." },
  { k: "logo", n: 2, label: "Logo ka dabba (✎ Logo)", ids: [], ev: "dead_tap (jab app bheje)", ch: "none", cov: "no", st: ["empty"], needs: "dead_tap", note: "Is par ✎ aur \"Logo\" likha hai magar ye dabaya nahi ja sakta. Yahan tap zaya jata hai; dead_tap aane ke baad us khane ki garmi yahan dikhegi." },
  { k: "meta", n: 3, label: "Invoice no. aur tareekhen", ids: ["invoice_meta_card_tap"], ev: "invoice_meta_card_tap", ch: "auto", cov: "ok", st: ["empty"] },
  { k: "business", n: 4, label: "FROM — Add Business", ids: ["tap:create_inv_scr:InvoiceScreen.business_card_tap"], ev: "tap:create_inv_scr:InvoiceScreen.business_card_tap", ch: "auto", cov: "ok", st: ["empty"], cv: "96.2%" },
  { k: "client", n: 5, label: "TO — Add Client", ids: ["create_inv_client_click"], ev: "create_inv_client_click", ch: "auto", cov: "ok", st: ["empty"], cv: "97.2%" },
  { k: "currency", n: 6, label: "Currency (USD ▾)", ids: ["tap:create_inv_scr:InvoiceScreen.invoice_content_1"], ev: "tap:create_inv_scr:InvoiceScreen.invoice_content_1", ch: "auto", cov: "ok", st: ["empty", "full"], cv: "83.9% (currency doosri jagah se bhi khulti hai)" },
  { k: "additem", n: 7, label: "Add Item", ids: ["create_inv_add_item_click"], ev: "create_inv_add_item_click", ch: "auto", cov: "ok", st: ["empty", "full"], cv: "94.2%" },
  { k: "itemrow", n: 8, label: "Item ki line (edit)", ids: ["itemrow"], ev: "ItemPaymentCard.item_info_row_5 + items_list_4", ch: "auto", cov: "ok", st: ["full"] },
  { k: "discount", n: 9, label: "Discount", ids: ["create_inv_discount_click"], ev: "create_inv_discount_click", ch: "auto", cov: "ok", st: ["empty", "full"], cv: "92.1%" },
  { k: "tax", n: 10, label: "Tax", ids: ["create_inv_tax_click"], ev: "create_inv_tax_click", ch: "auto", cov: "ok", st: ["empty", "full"], cv: "91.7%" },
  { k: "shipping", n: 11, label: "Shipping", ids: ["create_inv_shipping_click"], ev: "create_inv_shipping_click", ch: "auto", cov: "ok", st: ["empty", "full"], cv: "88.2%" },
  { k: "addpay", n: 12, label: "Add Payment", ids: ["create_inv_add_payment_click"], ev: "create_inv_add_payment_click", ch: "auto", cov: "ok", st: ["empty", "full"], cv: "99.9%" },
  { k: "terms", n: 13, label: "Terms and Conditions", ids: ["create_inv_terms_click"], ev: "create_inv_terms_click", ch: "auto", cov: "ok", st: ["empty", "full"], cv: "92.4%" },
  { k: "paymethod", n: 14, label: "Payment Method", ids: ["tap:create_inv_scr:card"], ev: "tap:create_inv_scr:card (apna id aane tak)", ch: "auto", cov: "part", st: ["empty", "full"], cv: "80.9%", note: "Is card ka apna naam abhi release mein nahi — \"card\" har us card ka naam hai jise id nahi di gayi (AGENTS-EVENTS §1.4). Naya id aate hi yahan wahi gina jayega; purani history \"card\" ke naam se rahegi." },
  { k: "preview", n: 15, label: "Preview", ids: ["create_inv_preview_click"], ev: "create_inv_preview_click", ch: "auto", cov: "ok", st: ["empty", "full"] },
  { k: "save", n: 16, label: "Save", ids: ["create_inv_saved_click"], ev: "create_inv_saved_click (coded)", ch: "coded", cov: "part", st: ["full"], note: "Save ka apna auto tap panel mein band hai, is liye ye number coded event se hai. Save sirf tab dikhta hai jab business, client aur item teeno hon." },
  { k: "expand", n: 17, label: "Upar wala hissa kholna (⌄)", ids: ["tap:create_inv_scr:AdaptiveHeaderZone.expand_1"], ev: "tap:create_inv_scr:AdaptiveHeaderZone.expand_1", ch: "auto", cov: "ok", st: ["full"] },
  { k: "banner", n: 18, label: "Banner ad", ids: ["ad_clicked#banner"], ev: "ad_clicked type=banner (jab app bheje)", ch: "coded", cov: "no", st: ["full"], needs: "ad_clicked", note: "Banner ki kamai 1.4.9 se ginti mein hai. Ad par click ka event (ad_clicked) aane tak \"ad khola\" aur \"chala gaya\" alag nahi ho sakte." },
];

export const OVERLAY_ID = "invoice_overlay_clicked";

export const SCREEN_NAMES: Record<string, string> = {
  dashboard: "Dashboard (invoice list)",
  create_inv_scr: "Create Invoice",
  business_add_form_landed: "Add Business (sheet)",
  client_add_form_landed: "Add Client (sheet)",
  item_form_scr: "Add Item (sheet)",
  ad_dialog_shown: "Save ka darwaza (ad / premium)",
  saved_inv_scr: "Invoice ban gayi (Saved)",
  preview_invoice_scr: "Preview (WebView)",
  premium_scr: "Premium",
  splash_scr: "Splash",
  analytics_dashboard_scr: "Reports",
  tools_scr: "Tools",
  estimate_scr: "Estimates",
  client_ledger_scr: "Client ledger",
  edit_inv_scr: "Edit Invoice",
  invoice_currency: "Currency (sheet)",
  terms_and_condintion_scr: "Terms (sheet)",
  payment_method_scr: "Payment Method (sheet)",
  add_payment_scr: "Add Payment (sheet)",
  signature_create_scr: "Signature",
  received_invoice: "Received invoice",
  login_scr: "Login",
};

const SHEETS = new Set([
  "invoice_currency", "discount_scr", "tax_scr", "shipping_scr", "terms_and_condintion_scr", "payment_method_scr",
  "add_payment_scr", "invoice_item_form", "invoice_payment_edit",
]);

/** Screens where an ad or the paywall sits: they get the both-sides panel even before money shows. */
export const MONEY_SCREENS = new Set(["create_inv_scr", "ad_dialog_shown", "premium_scr", "splash_scr", "saved_inv_scr"]);

export function sname(k: string): string {
  return SCREEN_NAMES[k] || k.replace(/_(scr|screen)$/, "").replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

export function kind(k: string): "screen" | "sheet" | "dialog" {
  if (k === "ad_dialog_shown" || /dialog/.test(k)) return "dialog";
  if (SHEETS.has(k) || /sheet|_form|_landed/.test(k)) return "sheet";
  return "screen";
}

/** A tap id in plain words: `tap:dashboard:InvoiceListScreen.go_premium_4` → `go premium`. */
export function tapLabel(id: string): string {
  const [base, part] = id.split("#");
  const label = base.replace(/^tap:[^:]+:/, "").replace(/^[A-Za-z]+\./, "").replace(/_\d+$/, "").replace(/_/g, " ");
  return part ? `${label} (${part.replace(/_/g, " ")})` : label;
}

export interface ExitGroup {
  id: string;
  label: string;
  color: string;
  match: (k: string) => boolean;
}

export const EXIT_GROUPS: ExitGroup[] = [
  { id: "saved", label: "Invoice ban gayi → Saved screen", color: "var(--md-sys-color-success)", match: (k) => k === "saved_inv_scr" },
  { id: "back", label: "Wapas — phone ka back", color: "#8ab4f8", match: (k) => k === "close:back_press" },
  { id: "x", label: "✕ dabaya", color: "#6c9ef8", match: (k) => k === "close:close_button" },
  { id: "disc", label: "\"Discard\" dabaya aur gaye", color: "#c58af9", match: (k) => k === "close:discard_confirmed" },
  { id: "bg", label: "App chhor di (background), wapas nahi aaye", color: "#f28b82", match: (k) => k === "background_never_back" || k === "background_long" },
  { id: "kill", label: "Background mein app band hui", color: "#fbbc04", match: (k) => k === "killed_in_background" },
  { id: "none", label: "Koi nishaan nahi (app band ya data nahi pahuncha)", color: "#9aa0a6", match: (k) => k === "no_signal" || k === "process_restart_no_bg" || k === "close:unknown" },
  { id: "crash", label: "Crash (app_cold_start.prev_exit)", color: "#ff5449", match: (k) => k === "crash" },
  { id: "other", label: "Doosri screen", color: "#78d9ec", match: () => true },
];

export function exitLabel(k: string): string {
  const g = EXIT_GROUPS.find((x) => x.id !== "other" && x.match(k));
  return g ? g.label : `→ ${sname(k)}`;
}

/** The dead-tap grid is 6 columns × 12 rows of the window (decision in the app's `dead_tap`). */
export const GRID_COLS = 6;
export const GRID_ROWS = 12;

/**
 * A `cell` value as a (row, column), whichever way the app writes it: `r3c2`, `3,2`, `3x2`, or one index 0..71
 * counted row by row. Null when it cannot be placed; such cells are still listed.
 */
export function parseCell(cell: string): { r: number; c: number } | null {
  const rc = /^r(\d+)c(\d+)$/i.exec(cell) || /^(\d+)[,x:_-](\d+)$/i.exec(cell);
  if (rc) {
    const r = Number(rc[1]);
    const c = Number(rc[2]);
    if (r < GRID_ROWS && c < GRID_COLS) return { r, c };
    if (r >= 1 && r <= GRID_ROWS && c >= 1 && c <= GRID_COLS) return { r: r - 1, c: c - 1 };
    return null;
  }
  if (/^\d+$/.test(cell)) {
    const i = Number(cell);
    if (i >= 0 && i < GRID_COLS * GRID_ROWS) return { r: Math.floor(i / GRID_COLS), c: i % GRID_COLS };
  }
  return null;
}

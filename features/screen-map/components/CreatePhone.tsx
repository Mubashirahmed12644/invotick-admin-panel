"use client";

import type { CSSProperties, ReactNode } from "react";
import { cx } from "../cx";
import { CREATE_ELEMENTS, type DrawState, type ElementDef } from "../catalog";
import { fixed2, pc } from "../format";
import type { ElementStat, Mode } from "../types";

export type Metric = "reach" | "per" | "rep";



export function heatFor(st: ElementStat | null, metric: Metric): number {
  if (!st) return 0;
  const r = metric === "reach" ? st.reachPct ?? 0 : metric === "per" ? Math.min(100, (st.perViewer ?? 0) * 50) : (st.repeatPct ?? 0) * 2;
  return Math.min(0.55, (r / 100) * 0.6);
}

export function badgeText(st: ElementStat | null, metric: Metric): string {
  if (!st) return "0";
  if (metric === "reach") return pc(st.reachPct);
  if (metric === "per") return fixed2(st.perViewer);
  return pc(st.repeatPct);
}

interface Props {
  state: DrawState;
  mode: Mode;
  dark: boolean;
  metric: Metric;
  sel: string;
  stats: Record<string, ElementStat | null>;
  overlay: ElementStat | null;
  /** True once the app sends the signal an element needs. */
  measured: (def: ElementDef) => boolean;
  onPick: (k: string) => void;
  onHover: (k: string | null, x: number, y: number) => void;
  /** Drawn over the screen: a sheet or dialog opened on top of Create Invoice. */
  children?: ReactNode;
  /** Only the drawing, no numbers: Create Invoice behind a sheet or dialog whose numbers are its own. */
  bare?: boolean;
}

/**
 * Create Invoice drawn from the app's own code (VC_113_VN_149, InvoiceScreen.kt), with our own demo content —
 * never a user's. Each measured element carries its number; a tap on it picks it, or opens where it leads.
 */
export default function CreatePhone({ state, mode, dark, metric, sel, stats, overlay, measured, onPick, onHover, children, bare }: Props) {
  const el = (k: string, className: string, body: ReactNode, extra?: { badge?: string; tour?: boolean }) => {
    const base = k.replace(/2$/, "");
    const def = CREATE_ELEMENTS.find((e) => e.k === base);
    if (!def || bare) return <div className={cx(className, extra?.tour && "tourTarget")}>{body}</div>;
    const live = measured(def);
    const st = stats[base] ?? null;
    const style = { "--heat": live ? heatFor(st, metric) : 0 } as CSSProperties;
    return (
      <div
        data-el={k}
        className={cx(className, sel === base && "picked", extra?.tour && "tourTarget")}
        style={style}
        onClick={(e) => {
          e.stopPropagation();
          onPick(base);
        }}
        onMouseEnter={(e) => onHover(base, e.clientX, e.clientY)}
        onMouseLeave={() => onHover(null, 0, 0)}
      >
        {body}
        <span className={cx("bdg", !live && "dead", extra?.badge)}>
          <span className={cx("bn")}>{def.n}</span>
          {live ? badgeText(st, metric) : "napa nahi"}
        </span>
      </div>
    );
  };

  const tourOn = mode === "tour" && state === "empty";
  const normal = mode === "normal";

  return (
    <div className={cx("screen", dark && "dark", tourOn && "tourOn")}>
      <div className={cx("sbar")}>
        <span>9:41</span>
        <span>▲ ◉ ▮</span>
      </div>
      <div className={cx("topbar")}>
        <div className={cx("tr")}>
          {el("close", "xbtn", "✕", { badge: "xb" })}
          <div>
            <div className={cx("ttl")}>Create Invoice</div>
            <div className={cx("stp")}>
              {state === "empty" ? (mode === "tour" ? "STEP 1 OF 3 - ADD BUSINESS" : "STEP 3 OF 3 - ADD ITEMS") : "COMPLETE - READY TO PREVIEW"}
            </div>
          </div>
        </div>
        <div className={cx("prog")}>
          <i style={{ width: state === "empty" ? "6%" : "100%" }} />
        </div>
      </div>
      <div className={cx("content")}>
        {state === "empty" ? (
          <div className={cx("stackc")}>
            <div className={cx("hdr")}>
              {el("logo", "logo", <><span>✎</span>Logo</>, { badge: "inside" })}
              <div className={cx("inv")}>INVOICE</div>
            </div>
            {el("meta", "meta", <>
              <div><small>INVOICE NO.</small><b>INV2609001</b></div>
              <div><small>ISSUE DATE</small><b>28 Sep 26</b></div>
              <div><small>DUE DATE</small><b>05 Oct 26</b></div>
            </>)}
            {el("business", normal ? "party filled" : "party", <>
              <div className={cx("pic")}>▦</div>
              <div><small>FROM</small><b>{normal ? "GIFTAT ENGINEERING (PVT) LTD" : "Add Business"}</b></div>
              <div className={cx("add")}>+</div>
            </>, { tour: true })}
            {el("client", normal ? "party filled" : "party", <>
              <div className={cx("pic")}>👤</div>
              <div><small>TO</small><b>Add Client</b></div>
              <div className={cx("add")}>+</div>
            </>)}
            <div className={cx("items")}>
              <div className={cx("ih")}>ITEMS</div>
              {el("currency", "cur", <><span>$</span>USD ▾</>)}
              {el("additem", "addbtn", "＋ Add Item")}
              <div className={cx("trow")}><span className={cx("k")}>Subtotal</span><span>$0.00</span></div>
              {el("discount", "trow link", <><span className={cx("k")}>Discount</span><span>$0.00</span></>, { badge: "left" })}
              {el("tax", "trow link", <><span className={cx("k")}>Tax</span><span>$0.00</span></>, { badge: "left" })}
              {el("shipping", "trow link", <><span className={cx("k")}>Shipping</span><span>$0.00</span></>, { badge: "left" })}
              <div className={cx("trow", "tot")}><span>Total</span><span>$0.00</span></div>
              {el("addpay", "addbtn", "＋ Add Payment")}
            </div>
            {el("terms", "icard", <><div className={cx("iic")}>≡</div><div><b>Terms and Conditions</b><span>Add Terms and Conditions</span></div></>)}
            {el("paymethod", "icard", <><div className={cx("iic")}>▭</div><div><b>Payment Method</b><span>Add Payment Method</span></div></>)}
          </div>
        ) : (
          <div className={cx("stackc")}>
            {el("expand", "compact", <>
              <div className={cx("l1")}><div className={cx("lg")}>GE</div><div><b>INV2609001</b><br />Issue 28 Sep 26 · Due 05 Oct 26</div></div>
              <div className={cx("l2")}>
                <div className={cx("cf")}><small>FROM</small><b>GIFTAT ENGINEERING (PVT) LTD</b></div>
                <span>→</span>
                <div className={cx("cf")}><small>TO</small><b>Al-Noor Traders &amp; Suppliers</b></div>
                <div className={cx("exp")}>⌄</div>
              </div>
            </>)}
            <div className={cx("items")}>
              <div className={cx("ih")}>ITEMS</div>
              {el("currency2", "cur", <><span>₨</span>PKR ▾</>)}
              {el("itemrow", "irow", <>
                <div><div className={cx("nm")}>Galvanised steel pipe, 2 inch × 6 m</div><div className={cx("dd")}>(12 x Rs 1,450.00)</div></div>
                <div className={cx("am")}>Rs 17,400.00</div>
              </>, { badge: "left" })}
              <div className={cx("irow")}>
                <div><div className={cx("nm")}>Labour &amp; installation</div><div className={cx("dd")}>(1 x Rs 3,500.00)</div></div>
                <div className={cx("am")}>Rs 3,500.00</div>
              </div>
              {el("additem2", "addbtn", "＋ Add Item")}
              <div className={cx("trow")}><span className={cx("k")}>Subtotal</span><span>Rs 20,900.00</span></div>
              {el("discount2", "trow link", <><span className={cx("k")}>Discount</span><span>Rs 0.00</span></>, { badge: "left" })}
              {el("tax2", "trow link", <><span className={cx("k")}>Tax</span><span>Rs 0.00</span></>, { badge: "left" })}
              {el("shipping2", "trow link", <><span className={cx("k")}>Shipping</span><span>Rs 0.00</span></>, { badge: "left" })}
              <div className={cx("trow", "tot")}><span>Total</span><span>Rs 20,900.00</span></div>
              {el("addpay2", "addbtn", "＋ Add Payment")}
              <div className={cx("trow", "bal")}><span>Balance Due</span><span>Rs 20,900.00</span></div>
            </div>
            {el("terms2", "icard", <><div className={cx("iic")}>≡</div><div><b>Terms and Conditions</b><span>Payment within 7 days of issue.</span></div></>)}
            {el("paymethod2", "icard", <><div className={cx("iic")}>▭</div><div><b>Payment Method</b><span>Bank Transfer — Meezan Bank</span></div></>)}
          </div>
        )}
        <div className={cx("foldnote")}>— screen ka aakhir —</div>
      </div>
      <div className={cx("tourTip")}>Let&apos;s start! Add your business to create your first invoice</div>
      {!bare && <div
        className={cx("deadOverlay")}
        onClick={(e) => {
          e.stopPropagation();
          onPick("overlay");
        }}
      >
        <span className={cx("bdg")}>
          <span className={cx("bn")}>T</span>
          {badgeText(overlay, metric)}
        </span>
        <span style={{ color: "#fff", fontSize: 11, fontWeight: 700, textShadow: "0 1px 2px #000" }}>dhundle hisse par tap</span>
      </div>}
      {children}
      <div className={cx("actionbar")}>
        <div className={cx("ab")}>
          {el("preview", "btn prev", "Preview")}
          {state === "full" && el("save", "btn save", "Save")}
        </div>
        {state === "full" && el("banner", "adBanner", <><span className={cx("adb")}>Ad</span> banner · invoice_screen</>)}
        <div className={cx("navpill")}><i /></div>
      </div>
    </div>
  );
}

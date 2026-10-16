"use client";

import { useEffect, useRef, type RefObject } from "react";
import { cx } from "./shared";

/**
 * One tooltip for the whole page. Any element inside `scope` with a `data-tip` shows it: on mouse hover, on a tap,
 * and on keyboard focus (those elements are focusable). It is the home of the long explanations the cards no longer print.
 */
export default function TipLayer({ scope }: { scope: RefObject<HTMLElement | null> }) {
  const tipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = scope.current;
    const tip = tipRef.current;
    if (!root || !tip) return;
    const tipOf = (target: EventTarget | null): HTMLElement | null =>
      target instanceof Element ? (target.closest("[data-tip]") as HTMLElement | null) : null;
    const hide = () => {
      tip.hidden = true;
    };
    const show = (el: HTMLElement) => {
      tip.textContent = el.dataset.tip ?? "";
      tip.hidden = false;
      const r = el.getBoundingClientRect();
      const tw = tip.offsetWidth;
      const th = tip.offsetHeight;
      const x = Math.max(8, Math.min(window.innerWidth - tw - 8, r.left + r.width / 2 - tw / 2));
      let y = r.top - th - 8;
      if (y < 8) y = r.bottom + 8;
      tip.style.left = `${x}px`;
      tip.style.top = `${y}px`;
    };
    const over = (e: PointerEvent) => {
      const el = tipOf(e.target);
      if (el && e.pointerType === "mouse") show(el);
    };
    const out = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && tipOf(e.target)) hide();
    };
    const up = (e: PointerEvent) => {
      if (e.pointerType === "mouse") return;
      const el = tipOf(e.target);
      if (el) show(el);
      else hide();
    };
    const focus = (e: FocusEvent) => {
      const el = tipOf(e.target);
      if (el) show(el);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") hide();
    };
    root.addEventListener("pointerover", over);
    root.addEventListener("pointerout", out);
    root.addEventListener("pointerup", up);
    root.addEventListener("focusin", focus);
    root.addEventListener("focusout", hide);
    root.addEventListener("keydown", key);
    window.addEventListener("scroll", hide, { passive: true });
    return () => {
      root.removeEventListener("pointerover", over);
      root.removeEventListener("pointerout", out);
      root.removeEventListener("pointerup", up);
      root.removeEventListener("focusin", focus);
      root.removeEventListener("focusout", hide);
      root.removeEventListener("keydown", key);
      window.removeEventListener("scroll", hide);
    };
  }, [scope]);

  return <div ref={tipRef} className={cx("tip")} role="tooltip" hidden />;
}

/**
 * Copy text, including where the modern API is not allowed to.
 *
 * `navigator.clipboard` needs a secure context, and admin.invotick.com over plain HTTP or an
 * IP-address preview does not have one. On those, the promise rejects and a copy button that only
 * used it would fail silently — on the pages whose whole job is handing this text to someone else.
 * The textarea route is deprecated and works there.
 *
 * Shared rather than repeated: this fallback was written for Sync Health, and the second and third
 * copy button would each have been a chance to forget it.
 */
export async function copyText(text: string): Promise<"copied" | "failed"> {
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    try {
      const scratch = document.createElement("textarea");
      scratch.value = text;
      scratch.setAttribute("readonly", "");
      scratch.style.position = "fixed";
      scratch.style.opacity = "0";
      document.body.appendChild(scratch);
      scratch.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(scratch);
      return ok ? "copied" : "failed";
    } catch {
      return "failed";
    }
  }
}

/**
 * Save the same text as a file.
 *
 * The clipboard is fine for a dozen rows and awkward for a few hundred: a long report pasted into a
 * chat is one wall of text, while a file keeps its line breaks and can be read with the tools that
 * read files. Same report either way — this only changes how it leaves the page.
 */
export function downloadText(filename: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoked on the next tick, not immediately: Safari has not necessarily started reading the blob
  // when click() returns, and a revoked URL there saves an empty file.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** `2026-08-17_1250` — sortable, filename-safe, and enough to tell two runs apart. */
export function fileStamp(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}

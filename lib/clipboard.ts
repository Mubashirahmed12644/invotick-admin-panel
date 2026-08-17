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

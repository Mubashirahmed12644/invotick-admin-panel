"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import Sidebar from "@/components/Sidebar";
import {
  UTM_SOURCES,
  UTM_MEDIUMS,
  UTM_CAMPAIGNS,
  isValidTaxonomyValue,
} from "@/lib/utm/taxonomy";
import { buildLinks, type UtmInput } from "@/lib/utm/linkBuilder";
import {
  createShortLink,
  listShortLinks,
  type ShortLinkResponse,
} from "@/lib/utm/shortLinks";
import { getErrorMessage } from "@/lib/api";

type Tab = "builder" | "links" | "reporting";

const TABS: { id: Tab; label: string }[] = [
  { id: "builder", label: "Link Builder" },
  { id: "links", label: "Links" },
  { id: "reporting", label: "Reporting" },
];

export default function UtmPageClient() {
  const [tab, setTab] = useState<Tab>("builder");

  // Shared registry state (Links + Reporting read it; Link Builder refreshes it).
  const [links, setLinks] = useState<ShortLinkResponse[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLinks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setLinks(await listShortLinks());
    } catch (e) {
      setError(getErrorMessage(e, "Couldn't load links."));
    } finally {
      setLoading(false);
    }
  }, []);

  // Lazy-load the registry the first time Links/Reporting is opened.
  useEffect(() => {
    if ((tab === "links" || tab === "reporting") && links === null && !loading) {
      loadLinks();
    }
  }, [tab, links, loading, loadLinks]);

  return (
    <main className="app-shell">
      <Sidebar />
      <div className="app-main">
        <div className="page-pad" style={{ maxWidth: 1180, margin: "0 auto" }}>
          <header style={{ marginBottom: 20 }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--color-text)", margin: 0 }}>
              UTM &amp; Attribution
            </h1>
            <p style={{ color: "var(--color-text-muted)", marginTop: 6, fontSize: 14 }}>
              Build consistently-tagged campaign links, shorten them via go.invotick.com, and
              track where installs come from — all in your own panel.
            </p>
          </header>

          {/* M3 segmented tabs */}
          <div
            style={{
              display: "inline-flex",
              gap: 4,
              padding: 4,
              background: "#eef2f8",
              borderRadius: 999,
              marginBottom: 22,
            }}
          >
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  style={{
                    border: "none",
                    cursor: "pointer",
                    padding: "9px 20px",
                    borderRadius: 999,
                    fontSize: 14,
                    fontWeight: 600,
                    transition: "all .18s ease",
                    background: active ? "var(--color-primary)" : "transparent",
                    color: active ? "#fff" : "var(--color-text-muted)",
                    boxShadow: active ? "var(--shadow-soft)" : "none",
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {tab === "builder" && <LinkBuilder onSaved={loadLinks} />}
          {tab === "links" && (
            <LinksRegistry links={links} loading={loading} error={error} onRefresh={loadLinks} />
          )}
          {tab === "reporting" && (
            <Reporting links={links} loading={loading} error={error} onRefresh={loadLinks} />
          )}
        </div>
      </div>
    </main>
  );
}

/* ─────────────────────────────── Link Builder ─────────────────────────────── */

function LinkBuilder({ onSaved }: { onSaved: () => void }) {
  const [form, setForm] = useState<UtmInput>({
    source: "google_ads",
    medium: "cpc",
    campaign: "android_installs_2026q3",
    content: "",
    term: "",
    refUser: "",
    doc: "",
    business: "",
  });
  const [label, setLabel] = useState("");
  const [customCampaign, setCustomCampaign] = useState(false);
  const [customSource, setCustomSource] = useState(false);
  const [customMedium, setCustomMedium] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<ShortLinkResponse | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const links = useMemo(() => buildLinks(form), [form]);
  const campaignValid = !form.campaign || isValidTaxonomyValue(form.campaign);
  const sourceValid = !form.source || isValidTaxonomyValue(form.source);
  const mediumValid = !form.medium || isValidTaxonomyValue(form.medium);

  // Changing any parameter invalidates a previously-minted short link.
  const set = (k: keyof UtmInput, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setSaved(null);
    setSaveError(null);
  };

  const autoLabel = `${form.source} · ${form.medium} · ${form.campaign}`;

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const result = await createShortLink({
        webUrl: links.webUrl,
        androidUrl: links.playUrl,
        label: label.trim() || autoLabel,
        campaign: form.campaign || undefined,
      });
      setSaved(result);
      onSaved();
    } catch (e) {
      setSaveError(getErrorMessage(e, "Couldn't create the short link."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.05fr 1fr", gap: 22, alignItems: "start" }}>
      {/* ── Form ── */}
      <section style={cardStyle}>
        <SectionTitle>Campaign parameters</SectionTitle>

        <Field label="Source" hint="Where the traffic comes from">
          {customSource ? (
            <input
              style={inputStyle(!sourceValid)}
              value={form.source}
              placeholder="e.g. newsletter"
              onChange={(e) => set("source", e.target.value)}
            />
          ) : (
            <Select value={form.source} onChange={(v) => set("source", v)} options={UTM_SOURCES} />
          )}
          <button onClick={() => setCustomSource((c) => !c)} style={linkBtnStyle}>
            {customSource ? "↩ pick from list" : "＋ custom source"}
          </button>
          {!sourceValid && (
            <p style={{ color: "var(--color-danger)", fontSize: 12, margin: "6px 0 0" }}>
              Use lowercase snake_case (letters, numbers, _).
            </p>
          )}
        </Field>

        <Field label="Medium" hint="How it arrives">
          {customMedium ? (
            <input
              style={inputStyle(!mediumValid)}
              value={form.medium}
              placeholder="e.g. qr_code"
              onChange={(e) => set("medium", e.target.value)}
            />
          ) : (
            <Select value={form.medium} onChange={(v) => set("medium", v)} options={UTM_MEDIUMS} />
          )}
          <button onClick={() => setCustomMedium((c) => !c)} style={linkBtnStyle}>
            {customMedium ? "↩ pick from list" : "＋ custom medium"}
          </button>
          {!mediumValid && (
            <p style={{ color: "var(--color-danger)", fontSize: 12, margin: "6px 0 0" }}>
              Use lowercase snake_case (letters, numbers, _).
            </p>
          )}
        </Field>

        <Field label="Campaign">
          {customCampaign ? (
            <input
              style={inputStyle(!campaignValid)}
              value={form.campaign}
              placeholder="e.g. summer_promo_2026"
              onChange={(e) => set("campaign", e.target.value)}
            />
          ) : (
            <Select
              value={form.campaign}
              onChange={(v) => set("campaign", v)}
              options={UTM_CAMPAIGNS}
            />
          )}
          <button onClick={() => setCustomCampaign((c) => !c)} style={linkBtnStyle}>
            {customCampaign ? "↩ pick from list" : "＋ custom campaign"}
          </button>
          {!campaignValid && (
            <p style={{ color: "var(--color-danger)", fontSize: 12, margin: "6px 0 0" }}>
              Use lowercase snake_case (letters, numbers, _).
            </p>
          )}
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Content" hint="ad / button variant (optional)">
            <input style={inputStyle()} value={form.content} onChange={(e) => set("content", e.target.value)} />
          </Field>
          <Field label="Term" hint="keyword (optional)">
            <input style={inputStyle()} value={form.term} onChange={(e) => set("term", e.target.value)} />
          </Field>
        </div>

        <Field label="Label" hint="how it shows in the registry (optional)">
          <input
            style={inputStyle()}
            value={label}
            placeholder={autoLabel}
            onChange={(e) => setLabel(e.target.value)}
          />
        </Field>

        <div style={{ height: 1, background: "var(--color-border)", margin: "6px 0 16px" }} />
        <SectionTitle>Viral / deep-link (optional)</SectionTitle>
        <p style={{ color: "var(--color-text-muted)", fontSize: 12.5, marginTop: -6, marginBottom: 12 }}>
          For invoice-share &amp; PDF-QR links — credits the referrer and deep-links to the doc on install.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Referrer user id (iv_ref_uid)">
            <input style={inputStyle()} value={form.refUser} onChange={(e) => set("refUser", e.target.value)} />
          </Field>
          <Field label="Business id (iv_biz)">
            <input style={inputStyle()} value={form.business} onChange={(e) => set("business", e.target.value)} />
          </Field>
        </div>
        <Field label="Invoice / doc id (iv_doc)">
          <input style={inputStyle()} value={form.doc} onChange={(e) => set("doc", e.target.value)} />
        </Field>
      </section>

      {/* ── Live preview ── */}
      <section style={{ ...cardStyle, position: "sticky", top: 16 }}>
        <SectionTitle>Generated links</SectionTitle>

        {/* param chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
          {Object.entries(links.params).map(([k, v]) => (
            <span key={k} style={chipStyle}>
              <b style={{ color: "var(--color-primary)" }}>{k}</b>=<span>{v}</span>
            </span>
          ))}
        </div>

        <LinkRow label="🌐 Web (invotick.com)" value={links.webUrl} />
        <LinkRow label="🤖 Play Store (install referrer)" value={links.playUrl} />

        {/* ── Short link: mint via backend ── */}
        {saved ? (
          <>
            <LinkRow label="🔗 Short link (go.invotick.com)" value={saved.shortUrl} />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                marginTop: 12,
                padding: 16,
                background: "#f7f9fc",
                borderRadius: 16,
                border: "1px solid var(--color-border)",
              }}
            >
              <div style={{ background: "#fff", padding: 10, borderRadius: 12, boxShadow: "var(--shadow-soft)" }}>
                <QRCodeSVG value={saved.shortUrl} size={104} fgColor="#0f3d8c" level="M" />
              </div>
              <div>
                <p style={{ fontWeight: 700, color: "#1a7f4b", margin: 0, fontSize: 14 }}>
                  ✓ Saved — code <code style={{ fontFamily: "var(--font-space-mono), monospace" }}>{saved.code}</code>
                </p>
                <p style={{ color: "var(--color-text-muted)", fontSize: 12.5, margin: "4px 0 0", maxWidth: 220 }}>
                  QR for PDF / print — scans route to Play / App&nbsp;Store / web by device, and each
                  scan is logged.
                </p>
              </div>
            </div>
          </>
        ) : (
          <div style={{ marginTop: 8 }}>
            <button
              onClick={save}
              disabled={saving || !campaignValid}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: 12,
                border: "none",
                cursor: saving || !campaignValid ? "not-allowed" : "pointer",
                background: saving || !campaignValid ? "#9db3d6" : "var(--color-primary)",
                color: "#fff",
                fontSize: 14,
                fontWeight: 700,
                boxShadow: "var(--shadow-soft)",
              }}
            >
              {saving ? "Shortening…" : "🔗 Save & shorten"}
            </button>
            <p style={{ color: "var(--color-text-muted)", fontSize: 12, margin: "8px 2px 0" }}>
              Creates a go.invotick.com short link + QR, and adds it to the Links registry.
            </p>
            {saveError && (
              <p style={{ color: "var(--color-danger)", fontSize: 12.5, margin: "8px 2px 0" }}>
                {saveError}
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

/* ─────────────────────────────── Links registry ─────────────────────────────── */

function LinksRegistry({
  links,
  loading,
  error,
  onRefresh,
}: {
  links: ShortLinkResponse[] | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}) {
  return (
    <section style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <SectionTitle>Saved links{links ? ` (${links.length})` : ""}</SectionTitle>
        <button onClick={onRefresh} style={copyBtnStyle(false)}>↻ Refresh</button>
      </div>

      {loading && <Muted>Loading…</Muted>}
      {error && !loading && <ErrorNote message={error} />}
      {!loading && !error && links && links.length === 0 && (
        <Muted>No links yet — create one in the Link Builder tab.</Muted>
      )}

      {!loading && !error && links && links.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--color-text-muted)" }}>
                <Th>Short link</Th>
                <Th>Campaign</Th>
                <Th>Label</Th>
                <Th style={{ textAlign: "right" }}>Clicks</Th>
                <Th>Created</Th>
              </tr>
            </thead>
            <tbody>
              {links.map((l) => (
                <tr key={l.code} style={{ borderTop: "1px solid var(--color-border)" }}>
                  <Td><CopyInline value={l.shortUrl} /></Td>
                  <Td>{l.campaign ?? "—"}</Td>
                  <Td style={{ color: "var(--color-text-muted)" }}>{l.label ?? "—"}</Td>
                  <Td style={{ textAlign: "right", fontWeight: 700 }}>{l.clickCount}</Td>
                  <Td style={{ color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
                    {new Date(l.createdAt).toLocaleDateString()}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* ─────────────────────────────── Reporting ─────────────────────────────── */

function Reporting({
  links,
  loading,
  error,
  onRefresh,
}: {
  links: ShortLinkResponse[] | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}) {
  const stats = useMemo(() => {
    if (!links) return null;
    const totalClicks = links.reduce((s, l) => s + l.clickCount, 0);
    // Group clicks by any key. Source/medium are read from each link's tagged
    // webUrl (utm_source/utm_medium live in the URL, not a stored column).
    const group = (keyOf: (l: ShortLinkResponse) => string): [string, number][] => {
      const m = new Map<string, number>();
      for (const l of links) {
        const k = keyOf(l);
        m.set(k, (m.get(k) ?? 0) + l.clickCount);
      }
      return [...m.entries()].sort((a, b) => b[1] - a[1]);
    };
    const bySource = group((l) => utmParam(l.webUrl, "utm_source"));
    const byMedium = group((l) => utmParam(l.webUrl, "utm_medium"));
    const byCampaign = group((l) => l.campaign ?? utmParam(l.webUrl, "utm_campaign"));
    const top = [...links].sort((a, b) => b.clickCount - a.clickCount).slice(0, 5);
    return { totalLinks: links.length, totalClicks, bySource, byMedium, byCampaign, top };
  }, [links]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button onClick={onRefresh} style={copyBtnStyle(false)}>↻ Refresh</button>
      </div>

      {loading && <section style={cardStyle}><Muted>Loading…</Muted></section>}
      {error && !loading && <section style={cardStyle}><ErrorNote message={error} /></section>}

      {!loading && !error && stats && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <StatCard label="Total links" value={stats.totalLinks} />
            <StatCard label="Total clicks" value={stats.totalClicks} accent />
          </div>

          <Breakdown title="Clicks by source" data={stats.bySource} />
          <Breakdown title="Clicks by medium" data={stats.byMedium} />
          <Breakdown title="Clicks by campaign" data={stats.byCampaign} />

          <section style={cardStyle}>
            <SectionTitle>Top links</SectionTitle>
            {stats.top.length === 0 ? (
              <Muted>No links yet.</Muted>
            ) : (
              stats.top.map((l) => (
                <div
                  key={l.code}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 0",
                    borderTop: "1px solid var(--color-border)",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: "var(--color-text)", fontSize: 13 }}>
                      {l.label ?? l.campaign ?? l.code}
                    </div>
                    <div
                      style={{
                        fontSize: 11.5,
                        fontFamily: "var(--font-space-mono), monospace",
                        color: "var(--color-text-muted)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {l.shortUrl}
                    </div>
                  </div>
                  <span style={{ fontWeight: 700, color: "var(--color-primary)", marginLeft: 12 }}>
                    {l.clickCount}
                  </span>
                </div>
              ))
            )}
          </section>

          <p style={{ color: "var(--color-text-muted)", fontSize: 12, marginTop: 14 }}>
            Click data comes from your own go.invotick.com redirects — richer install/signup
            attribution (source × medium funnels, viral loop) lands as the next backend phase.
          </p>
        </>
      )}
    </div>
  );
}

/* ───────────────────────────── small UI pieces ───────────────────────────── */

function LinkRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)" }}>{label}</span>
        <button onClick={copy} style={copyBtnStyle(copied)}>
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>
      <code
        style={{
          display: "block",
          fontSize: 12,
          fontFamily: "var(--font-space-mono), monospace",
          color: "var(--color-text-muted)",
          background: "#f4f6fa",
          border: "1px solid var(--color-border)",
          borderRadius: 10,
          padding: "10px 12px",
          wordBreak: "break-all",
          lineHeight: 1.5,
        }}
      >
        {value}
      </code>
    </div>
  );
}

function CopyInline({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return (
    <button
      onClick={copy}
      title="Copy"
      style={{
        border: "none",
        background: "none",
        cursor: "pointer",
        color: copied ? "#1a7f4b" : "var(--color-primary)",
        fontFamily: "var(--font-space-mono), monospace",
        fontSize: 12.5,
        padding: 0,
        textAlign: "left",
      }}
    >
      {copied ? "✓ copied" : value}
    </button>
  );
}

/** Read a UTM query param from a tagged URL; "(none)" if absent/unparseable. */
function utmParam(url: string, key: string): string {
  try {
    return new URL(url).searchParams.get(key) || "(none)";
  } catch {
    return "(none)";
  }
}

/** A titled horizontal-bar breakdown (clicks by source / medium / campaign). */
function Breakdown({ title, data }: { title: string; data: [string, number][] }) {
  const max = Math.max(1, ...data.map(([, c]) => c));
  return (
    <section style={{ ...cardStyle, marginBottom: 16 }}>
      <SectionTitle>{title}</SectionTitle>
      {data.length === 0 ? (
        <Muted>No data yet.</Muted>
      ) : (
        data.map(([name, clicks]) => (
          <div key={name} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
              <span style={{ color: "var(--color-text)", fontWeight: 600 }}>{name}</span>
              <span style={{ color: "var(--color-text-muted)" }}>{clicks}</span>
            </div>
            <div style={{ height: 8, background: "#eef2f8", borderRadius: 999 }}>
              <div
                style={{
                  height: "100%",
                  width: `${(clicks / max) * 100}%`,
                  background: "var(--color-primary)",
                  borderRadius: 999,
                  transition: "width .3s ease",
                }}
              />
            </div>
          </div>
        ))
      )}
    </section>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div style={{ ...cardStyle, padding: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: "var(--color-text-muted)" }}>
        {label}
      </div>
      <div style={{ fontSize: 34, fontWeight: 800, marginTop: 6, color: accent ? "var(--color-primary)" : "var(--color-text)" }}>
        {value.toLocaleString()}
      </div>
    </div>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <p style={{ color: "var(--color-text-muted)", fontSize: 14, margin: 0 }}>{children}</p>;
}

function ErrorNote({ message }: { message: string }) {
  return (
    <div>
      <p style={{ color: "var(--color-danger)", fontSize: 14, margin: 0, fontWeight: 600 }}>{message}</p>
      <p style={{ color: "var(--color-text-muted)", fontSize: 12.5, margin: "6px 0 0" }}>
        If the short-link backend isn&apos;t deployed yet, this is expected — deploy the
        <code style={{ fontFamily: "var(--font-space-mono), monospace" }}> feature/short-links </code>
        branch to activate it.
      </p>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--color-text)", marginBottom: 6 }}>
        {label}
        {hint && <span style={{ fontWeight: 400, color: "var(--color-text-muted)" }}> — {hint}</span>}
      </label>
      {children}
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle()}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: "var(--color-text-muted)", margin: "0 0 14px" }}>
      {children}
    </h3>
  );
}

function Th({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <th style={{ padding: "0 10px 8px", fontWeight: 600, fontSize: 12, ...style }}>{children}</th>;
}

function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <td style={{ padding: "10px", verticalAlign: "top", ...style }}>{children}</td>;
}

/* ───────────────────────────── inline styles ───────────────────────────── */

const cardStyle: React.CSSProperties = {
  background: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: 18,
  padding: 22,
  boxShadow: "var(--shadow-soft)",
};

const chipStyle: React.CSSProperties = {
  fontSize: 11.5,
  fontFamily: "var(--font-space-mono), monospace",
  background: "#eef2f8",
  borderRadius: 8,
  padding: "4px 8px",
  color: "var(--color-text)",
};

function inputStyle(invalid = false): React.CSSProperties {
  return {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: `1px solid ${invalid ? "var(--color-danger)" : "var(--color-border)"}`,
    background: "#fbfcfe",
    color: "var(--color-text)",
    fontSize: 14,
    outline: "none",
  };
}

const linkBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "var(--color-primary)",
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
  padding: "6px 0 0",
};

function copyBtnStyle(copied: boolean): React.CSSProperties {
  return {
    border: "1px solid var(--color-border)",
    background: copied ? "#e6f6ee" : "#fff",
    color: copied ? "#1a7f4b" : "var(--color-primary)",
    borderRadius: 8,
    padding: "4px 12px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all .15s ease",
  };
}

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
import {
  getUtmAttribution,
  type UtmAttributionReport,
  type UtmBreakdownRow,
  type UtmLinkRow,
  type UtmTagRow,
} from "@/lib/utm/attribution";
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

  // Lazy-load the registry the first time the Links tab is opened. Reporting no longer needs it:
  // it reads one endpoint that returns the same links WITH their installs, so the two tables can
  // never disagree about a click count.
  useEffect(() => {
    if (tab === "links" && links === null && !loading) {
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
              Build consistently-tagged campaign links, shorten them via go.invotick.com, and see
              the clicks, installs and first invoices each tag produced — all in your own panel.
            </p>
          </header>

          {/* M3 segmented tabs */}
          <div
            style={{
              display: "inline-flex",
              gap: 4,
              padding: 4,
              background: "var(--md-sys-color-surface-container-low)",
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
                    color: active ? "var(--md-sys-color-on-primary)" : "var(--color-text-muted)",
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
          {tab === "reporting" && <Reporting />}
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
                background: "var(--md-sys-color-surface-container-lowest)",
                borderRadius: 16,
                border: "1px solid var(--color-border)",
              }}
            >
              {/*
                Deliberately NOT themed — the only place in the panel that is exempt.

                A QR code is read by a camera, not by a person, and scanners expect dark modules on
                a light quiet zone. Themed along with everything else this became a dark navy code
                on a near-black surface in dark mode: still a picture of a QR code, and unscannable.
                So the tile stays white and the modules stay dark whatever the theme is.
              */}
              <div style={{ background: "#ffffff", padding: 10, borderRadius: 12, boxShadow: "var(--shadow-soft)" }}>
                <QRCodeSVG value={saved.shortUrl} size={104} fgColor="#0f3d8c" level="M" />
              </div>
              <div>
                <p style={{ fontWeight: 700, color: "var(--md-sys-color-success)", margin: 0, fontSize: 14 }}>
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
                background: saving || !campaignValid ? "var(--md-sys-color-primary)" : "var(--color-primary)",
                color: "var(--md-sys-color-on-primary)",
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

/**
 * Clicks, installs and first invoices for every campaign tag.
 *
 * This tab read `short_link.clickCount` and nothing else, while the page header promised to track
 * "where installs come from". It now reads `/v1/webpanel/analytics/utm-attribution`, which joins the
 * registry to `install_referrer` — the one event that carries a UTM tag — and follows those devices
 * to `invoice_created_success` and `invoice_shared_success`.
 *
 * Three things about the numbers, all of which shaped the layout:
 *
 * 1. **A zero is rendered as `0`.** Most links produced no installs, and that is the answer. Blanks
 *    and em dashes are what let the old subtitle stand for two months.
 * 2. **Installs belong to a tag, not to a link.** The short code never reaches the Play referrer, so
 *    seven links carrying `google_ads · cpc · android_installs_2026q3` share one install count. The
 *    row says so rather than repeating the number as if it were seven separate results.
 * 3. **Most installs are not ours.** Facebook-for-Android sets its own install referrer, so the bulk
 *    of arrivals carry `apps.facebook.com`. Those are listed separately and never credited to a
 *    campaign — the last time they were folded in by a substring match, the panel labelled 932
 *    installs "Facebook campaign".
 */
function Reporting() {
  const [report, setReport] = useState<UtmAttributionReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReport(await getUtmAttribution({ withinMinutes: days * 24 * 60 }));
    } catch (e) {
      setError(getErrorMessage(e, "Couldn't load attribution."));
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const untaggedInstalls = report ? report.totals.installsAllSources - report.totals.installs : 0;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12.5, color: "var(--color-text-muted)", fontWeight: 600 }}>Installs in</span>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            style={{ ...inputStyle(), width: "auto", padding: "6px 10px", fontSize: 12.5 }}
          >
            <option value={7}>last 7 days</option>
            <option value={30}>last 30 days</option>
            <option value={90}>last 90 days</option>
            <option value={365}>last 365 days</option>
          </select>
        </div>
        <button onClick={load} style={copyBtnStyle(false)}>↻ Refresh</button>
      </div>

      {loading && <section style={cardStyle}><Muted>Loading…</Muted></section>}
      {error && !loading && <section style={cardStyle}><ErrorNote message={error} /></section>}

      {!loading && !error && report && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 8 }}>
            <StatCard label="Total links" value={report.totals.links} />
            <StatCard label="Clicks (all time)" value={report.totals.clicks} />
            <StatCard label={`Installs (${days}d)`} value={report.totals.installs} accent />
            <StatCard label={`First invoice (${days}d)`} value={report.totals.madeInvoice} accent />
          </div>

          {/*
            The two numbers above are counted over two different spans on purpose, and saying so is
            cheaper than making them agree. `clickCount` is a running total the redirect keeps and
            has never been windowed; installs are read from events, which are.
          */}
          <p style={{ color: "var(--color-text-muted)", fontSize: 12, margin: "0 2px 16px", lineHeight: 1.6 }}>
            Clicks are a running total kept by the go.invotick.com redirect since each link was
            created. Installs and invoices are devices whose Play install referrer carried one of
            these exact tags in the last {days} days, followed to their first saved invoice.{" "}
            <b>{report.totals.sharedInvoice.toLocaleString()}</b> of those went on to share one (G1).
            {untaggedInstalls > 0 && (
              <>
                {" "}
                <b>{untaggedInstalls.toLocaleString()}</b> more installs arrived in the same window
                carrying a referrer none of these links set — listed at the bottom, and not credited
                to any campaign.
              </>
            )}
          </p>

          {report.truncated && (
            <p style={{ color: "var(--color-danger)", fontSize: 12.5, margin: "0 2px 16px" }}>
              More distinct tags than this report returns — the tail is not shown.
            </p>
          )}

          <Breakdown title="By source" rows={report.bySource} />
          <Breakdown title="By medium" rows={report.byMedium} />
          <Breakdown title="By campaign" rows={report.byCampaign} />

          <LinkResults links={report.links} />
          <UntaggedInstalls rows={report.untagged} days={days} />
        </>
      )}
    </div>
  );
}

/** Per-link results, with the ambiguity that the data genuinely has stated on the row. */
function LinkResults({ links }: { links: UtmLinkRow[] }) {
  const ordered = useMemo(
    () => [...links].sort((a, b) => (b.installs ?? -1) - (a.installs ?? -1) || b.clicks - a.clicks),
    [links],
  );
  return (
    <section style={{ ...cardStyle, marginBottom: 16 }}>
      <SectionTitle>Links</SectionTitle>
      {ordered.length === 0 ? (
        <Muted>No links yet — create one in the Link Builder tab.</Muted>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--color-text-muted)" }}>
                <Th>Link</Th>
                <Th>Tag</Th>
                <Th style={{ textAlign: "right" }}>Clicks</Th>
                <Th style={{ textAlign: "right" }}>Installs</Th>
                <Th style={{ textAlign: "right" }}>First invoice</Th>
                <Th style={{ textAlign: "right" }}>Shared</Th>
              </tr>
            </thead>
            <tbody>
              {ordered.map((l) => (
                <tr key={l.code} style={{ borderTop: "1px solid var(--color-border)" }}>
                  <Td>
                    <div style={{ fontWeight: 600, color: "var(--color-text)" }}>{l.label ?? l.campaign ?? l.code}</div>
                    <div style={{ fontSize: 11.5, fontFamily: "var(--font-space-mono), monospace", color: "var(--color-text-muted)" }}>
                      {l.shortUrl}
                    </div>
                  </Td>
                  <Td style={{ color: "var(--color-text-muted)", fontSize: 12 }}>
                    {l.utmSource === null && l.utmMedium === null && l.utmCampaign === null ? (
                      <span title="This link has no Play Store URL, so it can never produce an install referrer.">
                        no Play URL
                      </span>
                    ) : (
                      <>
                        {[l.utmSource, l.utmMedium, l.utmCampaign].map((v) => v ?? "(none)").join(" · ")}
                        {l.ambiguousWith.length > 0 && (
                          <div
                            style={{ color: "var(--color-danger)", fontSize: 11, marginTop: 3 }}
                            title={`The short code never reaches the install referrer, so these installs cannot be split between this link and: ${l.ambiguousWith.join(", ")}`}
                          >
                            shared tag with {l.ambiguousWith.length} other link
                            {l.ambiguousWith.length > 1 ? "s" : ""} — the install count is the tag&apos;s
                          </div>
                        )}
                      </>
                    )}
                  </Td>
                  <Td style={{ textAlign: "right", fontWeight: 700 }}>{l.clicks.toLocaleString()}</Td>
                  <Count value={l.installs} accent />
                  <Count value={l.madeInvoice} />
                  <Count value={l.sharedInvoice} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/**
 * Installs whose referrer matches no link of ours.
 *
 * On production this is the overwhelming majority — Facebook-for-Android sets `apps.facebook.com` /
 * `fb4a` on installs that came through the FB app whether or not we ever built a link, and Play sets
 * `google-play` / `organic` on a plain store visit. Showing them keeps two facts apart that a
 * campaign report must never merge: a tagged link that produced nothing, and traffic that was never
 * tagged at all.
 */
function UntaggedInstalls({ rows, days }: { rows: UtmTagRow[]; days: number }) {
  return (
    <section style={cardStyle}>
      <SectionTitle>Installs carrying no tag of ours</SectionTitle>
      <p style={{ color: "var(--color-text-muted)", fontSize: 12.5, margin: "-6px 0 14px", lineHeight: 1.6 }}>
        Referrers Play delivered in the last {days} days that match none of the links above, exactly.
        These are <b>not</b> attributed to any campaign: <code style={{ fontFamily: "var(--font-space-mono), monospace" }}>apps.facebook.com</code>{" "}
        is Facebook-for-Android naming itself, not our <code style={{ fontFamily: "var(--font-space-mono), monospace" }}>facebook</code> tag.
      </p>
      {rows.length === 0 ? (
        <Muted>None — every install in this window matched a link.</Muted>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--color-text-muted)" }}>
                <Th>Source</Th>
                <Th>Medium</Th>
                <Th>Campaign</Th>
                <Th style={{ textAlign: "right" }}>Installs</Th>
                <Th style={{ textAlign: "right" }}>First invoice</Th>
                <Th style={{ textAlign: "right" }}>Shared</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.utmSource}|${r.utmMedium}|${r.utmCampaign}`} style={{ borderTop: "1px solid var(--color-border)" }}>
                  <Td style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 12 }}>{r.utmSource ?? "(none)"}</Td>
                  <Td style={{ color: "var(--color-text-muted)", fontSize: 12 }}>{r.utmMedium ?? "(none)"}</Td>
                  <Td style={{ color: "var(--color-text-muted)", fontSize: 12 }}>{r.utmCampaign ?? "(none)"}</Td>
                  <Count value={r.installs} accent />
                  <Count value={r.madeInvoice} />
                  <Count value={r.sharedInvoice} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
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
          background: "var(--md-sys-color-surface-container-lowest)",
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
        color: copied ? "var(--md-sys-color-success)" : "var(--color-primary)",
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

/**
 * One dimension of the report — clicks, installs, first invoices and shares per value.
 *
 * The bar is scaled by **installs**, not by clicks, because installs are what the tab is now for. A
 * row of empty bars is the correct picture of a set of links nobody installed from, and it says that
 * faster than the digits do.
 *
 * The two counts do not share a denominator and the `links` column is here to explain why: clicks
 * are summed over links, installs over distinct tags. Seven links carry one tag, so seven click
 * totals collapse onto one install total, and without the link count that reads as arithmetic going
 * wrong. The server does both sums — do not re-derive either one here.
 */
function Breakdown({ title, rows }: { title: string; rows: UtmBreakdownRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.installs));
  return (
    <section style={{ ...cardStyle, marginBottom: 16 }}>
      <SectionTitle>{title}</SectionTitle>
      {rows.length === 0 ? (
        <Muted>No links tagged with this yet.</Muted>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--color-text-muted)" }}>
                <Th style={{ width: "42%" }}>Value</Th>
                <Th style={{ textAlign: "right" }}>Links</Th>
                <Th style={{ textAlign: "right" }}>Clicks</Th>
                <Th style={{ textAlign: "right" }}>Installs</Th>
                <Th style={{ textAlign: "right" }}>First invoice</Th>
                <Th style={{ textAlign: "right" }}>Shared</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.value} style={{ borderTop: "1px solid var(--color-border)" }}>
                  <Td>
                    <div style={{ color: "var(--color-text)", fontWeight: 600, marginBottom: 5 }}>{r.value}</div>
                    <div style={{ height: 8, background: "var(--md-sys-color-surface-container-low)", borderRadius: 999 }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${(r.installs / max) * 100}%`,
                          background: "var(--color-primary)",
                          borderRadius: 999,
                          transition: "width .3s ease",
                        }}
                      />
                    </div>
                  </Td>
                  <Td style={{ textAlign: "right", color: "var(--color-text-muted)" }}>{r.links.toLocaleString()}</Td>
                  <Td style={{ textAlign: "right", fontWeight: 700 }}>{r.clicks.toLocaleString()}</Td>
                  <Count value={r.installs} accent />
                  <Count value={r.madeInvoice} />
                  <Count value={r.sharedInvoice} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/**
 * A count cell. **`0` is printed as `0`.**
 *
 * The whole reason this tab was rebuilt is that it had nothing to say about installs and said it in
 * prose instead. Rendering a zero as a dash would put that back: a reader cannot tell "no installs
 * came from this link" from "we never looked". Only `null` prints as not-applicable, and it means
 * one specific thing — the link has no Play URL, so no install could ever have carried its tag
 * (AGENTS-EVENTS 1.7: an absent value is unknown, never a value).
 */
function Count({ value, accent }: { value: number | null; accent?: boolean }) {
  if (value === null) {
    return (
      <Td style={{ textAlign: "right", color: "var(--color-text-muted)", fontSize: 12 }}>
        <span title="This link has no Play Store URL, so an install could never carry its tag.">n/a</span>
      </Td>
    );
  }
  return (
    <Td
      style={{
        textAlign: "right",
        fontWeight: value > 0 ? 700 : 500,
        color: value > 0 ? (accent ? "var(--color-primary)" : "var(--color-text)") : "var(--color-text-muted)",
      }}
    >
      {value.toLocaleString()}
    </Td>
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
        Both tabs read the backend: the registry from
        <code style={{ fontFamily: "var(--font-space-mono), monospace" }}> /v1/webpanel/links </code>
        and the install figures from
        <code style={{ fontFamily: "var(--font-space-mono), monospace" }}> /v1/webpanel/analytics/utm-attribution </code>
        (admin only). A 404 here means the running build predates that endpoint.
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
  background: "var(--md-sys-color-surface-container-low)",
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
    background: "var(--md-sys-color-surface-container-lowest)",
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
    background: copied ? "var(--md-sys-color-surface-container-low)" : "var(--md-sys-color-surface-container-lowest)",
    color: copied ? "var(--md-sys-color-success)" : "var(--color-primary)",
    borderRadius: 8,
    padding: "4px 12px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all .15s ease",
  };
}

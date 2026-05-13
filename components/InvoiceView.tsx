import type { ReactNode } from "react";
import Image from "next/image";
import type {
  BusinessResponse,
  BackgroundResponse,
  HeaderResponse,
  SignatureResponse,
  StampResponse,
  WebpanelInvoiceFullResponse,
} from "@/lib/types";
import {
  fallbackNumber,
  fallbackText,
  formatCurrency,
  formatDate,
  formatDateTime,
} from "@/lib/format";
import { resolveInvoiceAsset } from "@/lib/invoice-preview-assets";

interface InvoiceViewProps {
  data: WebpanelInvoiceFullResponse;
  assetAuthKey?: string | null;
}

interface KeyValueField {
  label: string;
  value: ReactNode;
}

interface ResolvedAssetUrls {
  normalizedUrl: string | null;
  requestUrl: string | null;
}

interface AssetCardData {
  label: string;
  alt: string;
  sourceValue: string | null | undefined;
  asset: ResolvedAssetUrls;
  imageStyle?: React.CSSProperties;
}

function readBusinessLogoUrls(
  business: BusinessResponse,
  assetAuthKey?: string | null,
): ResolvedAssetUrls {
  const resolved = resolveInvoiceAsset(business.logo, assetAuthKey);
  return {
    normalizedUrl: resolved.normalizedUrl,
    requestUrl: resolved.requestUrl,
  };
}

function readAssetUrls(
  asset: HeaderResponse | BackgroundResponse | SignatureResponse | StampResponse | null,
  assetAuthKey?: string | null,
): ResolvedAssetUrls {
  const raw = asset?.image ? String(asset.image) : null;
  const resolved = resolveInvoiceAsset(raw, assetAuthKey);
  return {
    normalizedUrl: resolved.normalizedUrl,
    requestUrl: resolved.requestUrl,
  };
}

function formatBoolean(value: boolean | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return value ? "Yes" : "No";
}

function formatDecimal(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

function parseFieldsJson(input: string | null | undefined): string | null {
  if (!input?.trim()) return null;
  try {
    const parsed = JSON.parse(input) as unknown;
    return JSON.stringify(parsed, null, 2);
  } catch {
    return input;
  }
}

function renderAddress(data: WebpanelInvoiceFullResponse): string {
  const client = data.client;
  const parts = [
    client.addressLine1,
    client.addressLine2,
    client.city,
    client.state,
    client.zipcode,
    client.country,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "baseline",
      gap: "12px",
      padding: "9px 0",
      borderBottom: "1px solid #f1f5f9",
    }}>
      <span style={{
        fontSize: "11px",
        fontWeight: 600,
        letterSpacing: "0.07em",
        textTransform: "uppercase",
        color: "#94a3b8",
        minWidth: "160px",
        flexShrink: 0,
        fontFamily: "'DM Mono', 'Fira Mono', monospace",
      }}>{label}</span>
      <span style={{
        fontSize: "13.5px",
        color: "#1e293b",
        fontFamily: "'DM Sans', sans-serif",
        fontWeight: 400,
        wordBreak: "break-all",
      }}>{value}</span>
    </div>
  );
}

function AssetCard({ label, alt, sourceValue, asset, imageStyle }: AssetCardData) {
  return (
    <div className="asset-card">
      <p className="asset-label">{label}</p>
      {asset.requestUrl ? (
        <Image
          src={asset.requestUrl}
          alt={alt}
          width={260}
          height={160}
          unoptimized
          style={{
            width: "100%",
            height: "auto",
            borderRadius: "6px",
            objectFit: "contain",
            background: "#f8fafc",
            padding: "8px",
            ...imageStyle,
          }}
        />
      ) : (
        <div className="asset-empty">No image available</div>
      )}
      <div className="asset-meta">
        <p className="asset-meta-label">Source Value</p>
        <p className="asset-url">{fallbackText(sourceValue)}</p>
      </div>
      <div className="asset-meta">
        <p className="asset-meta-label">Resolved URL</p>
        <p className="asset-url">{fallbackText(asset.normalizedUrl)}</p>
      </div>
    </div>
  );
}

function FieldGrid({ fields }: { fields: KeyValueField[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {fields.map((f) => <Row key={f.label} label={f.label} value={f.value} />)}
    </div>
  );
}

function Panel({ title, accent, children }: { title: string; accent?: string; children: ReactNode }) {
  return (
    <div style={{
      background: "#ffffff",
      border: "1px solid #e2e8f0",
      borderRadius: "12px",
      padding: "24px 28px",
      position: "relative",
      overflow: "hidden",
      boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
    }}>
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: "3px",
        background: accent || "linear-gradient(90deg, #6366f1, #8b5cf6)",
      }} />
      <h3 style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: "10.5px",
        fontWeight: 600,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "#6366f1",
        margin: "0 0 20px 0",
      }}>{title}</h3>
      {children}
    </div>
  );
}

function Section({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
  return (
    <section id={id} style={{ marginBottom: "36px" }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "14px",
        marginBottom: "18px",
      }}>
        <h2 style={{
          fontFamily: "'Instrument Serif', Georgia, serif",
          fontSize: "22px",
          fontWeight: 400,
          color: "#0f172a",
          margin: 0,
          letterSpacing: "-0.01em",
          whiteSpace: "nowrap",
        }}>{title}</h2>
        <div style={{
          flex: 1,
          height: "1px",
          background: "linear-gradient(90deg, #c7d2fe, transparent)",
        }} />
      </div>
      {children}
    </section>
  );
}

function StatusBadge({ status }: { status: string | null | undefined }) {
  const s = (status || "").toLowerCase();
  const map: Record<string, { bg: string; color: string; dot: string; border: string }> = {
    paid: { bg: "#f0fdf4", color: "#16a34a", dot: "#22c55e", border: "#bbf7d0" },
    unpaid: { bg: "#fef2f2", color: "#dc2626", dot: "#ef4444", border: "#fecaca" },
    draft: { bg: "#f8fafc", color: "#64748b", dot: "#94a3b8", border: "#e2e8f0" },
    sent: { bg: "#eff6ff", color: "#2563eb", dot: "#3b82f6", border: "#bfdbfe" },
    overdue: { bg: "#fffbeb", color: "#d97706", dot: "#f59e0b", border: "#fde68a" },
  };
  const st = map[s] || { bg: "#eef2ff", color: "#4f46e5", dot: "#6366f1", border: "#c7d2fe" };
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      background: st.bg,
      color: st.color,
      border: `1px solid ${st.border}`,
      borderRadius: "999px",
      padding: "4px 12px 4px 10px",
      fontSize: "11.5px",
      fontWeight: 600,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      fontFamily: "'DM Mono', monospace",
    }}>
      <span style={{
        width: "6px",
        height: "6px",
        borderRadius: "50%",
        background: st.dot,
        display: "inline-block",
        flexShrink: 0,
      }} />
      {status || "—"}
    </span>
  );
}

export default function InvoiceView({ data, assetAuthKey = null }: InvoiceViewProps) {
  const { invoice, business, client } = data;
  const currency = invoice.currency || "USD";

  const businessLogoAsset = readBusinessLogoUrls(business, assetAuthKey);
  const signatureAsset = readAssetUrls(data.signature, assetAuthKey);
  const stampAsset = readAssetUrls(data.stamp, assetAuthKey);
  const headerAsset = readAssetUrls(data.header, assetAuthKey);
  const backgroundAsset = readAssetUrls(data.background, assetAuthKey);
  const templateImageAsset = resolveInvoiceAsset(data.template?.templateImage || null, assetAuthKey);
  const paymentInstructionJson = parseFieldsJson(data.paymentInstruction?.fieldsJson);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500;600&display=swap');

        .inv-table { width: 100%; border-collapse: collapse; }
        .inv-table th {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #94a3b8;
          padding: 10px 14px;
          text-align: left;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }
        .inv-table td {
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          color: #334155;
          padding: 11px 14px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: top;
        }
        .inv-table tbody tr:hover td { background: #f8faff; }
        .inv-table td:nth-child(3),
        .inv-table td:nth-child(4),
        .inv-table td:nth-child(5),
        .inv-table td:nth-child(7) {
          font-family: 'DM Mono', monospace;
          font-size: 12.5px;
          color: #4f46e5;
        }
        .json-pre {
          font-family: 'DM Mono', monospace;
          font-size: 11.5px;
          color: #0369a1;
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          border-radius: 8px;
          padding: 16px;
          overflow-x: auto;
          margin-top: 16px;
          line-height: 1.7;
        }
        .asset-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 16px;
          margin-top: 20px;
        }
        .asset-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }
        .asset-label {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #94a3b8;
          margin: 0;
        }
        .asset-url {
          font-family: 'DM Mono', monospace;
          font-size: 10.5px;
          color: #475569;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 10px 12px;
          word-break: break-all;
          line-height: 1.6;
          margin: 0;
          user-select: text;
        }
        .asset-empty {
          min-height: 160px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          background: #f8fafc;
          border: 1px dashed #cbd5e1;
          color: #94a3b8;
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          text-align: center;
          padding: 16px;
        }
        .asset-meta {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .asset-meta-label {
          font-family: 'DM Mono', monospace;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #94a3b8;
          margin: 0;
        }
        .entity-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 16px;
        }
        .muted {
          color: #cbd5e1;
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          padding: 10px 0;
          font-style: italic;
          margin: 0;
        }
      `}</style>

      <div style={{
        fontFamily: "'DM Sans', sans-serif",
        background: "#f8fafc",
        minHeight: "100vh",
        color: "#1e293b",
      }}>

        {/* ── Hero Header ── */}
        <div style={{
          background: "linear-gradient(135deg, #ffffff 0%, #fafbff 60%, #f5f3ff 100%)",
          borderBottom: "1px solid #e2e8f0",
          padding: "40px 48px 36px",
          position: "relative",
          overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: "-80px", right: "60px",
            width: "320px", height: "320px", borderRadius: "50%",
            background: "radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />
          <div style={{
            position: "absolute", bottom: "-60px", left: "180px",
            width: "240px", height: "240px", borderRadius: "50%",
            background: "radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />

          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "flex-start", flexWrap: "wrap", gap: "24px", position: "relative",
          }}>
            <div>
              <p style={{
                fontFamily: "'DM Mono', monospace", fontSize: "10.5px",
                letterSpacing: "0.16em", textTransform: "uppercase",
                color: "#6366f1", margin: "0 0 8px 0", fontWeight: 600,
              }}>Invoice Record</p>
              <h1 style={{
                fontFamily: "'Instrument Serif', Georgia, serif",
                fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 400,
                color: "#0f172a", margin: "0 0 14px 0",
                letterSpacing: "-0.02em", lineHeight: 1.1,
              }}>
                {fallbackText(invoice.invoiceNumber, "Draft Invoice")}
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                <StatusBadge status={invoice.status} />
                {invoice.poNumber && (
                  <span style={{
                    fontFamily: "'DM Mono', monospace", fontSize: "11.5px",
                    color: "#94a3b8", letterSpacing: "0.04em",
                  }}>PO: {invoice.poNumber}</span>
                )}
              </div>
            </div>

            <div style={{
              background: "#ffffff", border: "1px solid #e0e7ff",
              borderRadius: "14px", padding: "22px 32px", textAlign: "right",
              boxShadow: "0 4px 16px rgba(99,102,241,0.08)",
            }}>
              <p style={{
                fontFamily: "'DM Mono', monospace", fontSize: "10px",
                letterSpacing: "0.12em", textTransform: "uppercase",
                color: "#94a3b8", margin: "0 0 6px 0",
              }}>Total Amount</p>
              <p style={{
                fontFamily: "'Instrument Serif', Georgia, serif",
                fontSize: "clamp(26px, 3vw, 38px)", color: "#4f46e5",
                margin: "0 0 4px 0", letterSpacing: "-0.01em",
              }}>
                {formatCurrency(invoice.totalAmount, currency)}
              </p>
              <p style={{
                fontFamily: "'DM Mono', monospace", fontSize: "11px",
                color: "#c7d2fe", margin: 0,
              }}>{currency}</p>
            </div>
          </div>

          <div style={{
            display: "flex", gap: "36px", marginTop: "28px",
            paddingTop: "24px", borderTop: "1px solid #f1f5f9", flexWrap: "wrap",
          }}>
            {[
              { label: "Invoice Date", value: formatDate(invoice.invoiceDate) },
              { label: "Due Date", value: formatDate(invoice.dueDate) },
              { label: "Date Sent", value: formatDateTime(invoice.dateSent) },
              { label: "Language", value: fallbackText(invoice.language) },
            ].map((item) => (
              <div key={item.label}>
                <p style={{
                  fontFamily: "'DM Mono', monospace", fontSize: "9.5px",
                  letterSpacing: "0.1em", textTransform: "uppercase",
                  color: "#94a3b8", margin: "0 0 4px 0",
                }}>{item.label}</p>
                <p style={{
                  fontFamily: "'DM Sans', sans-serif", fontSize: "13.5px",
                  color: "#334155", margin: 0, fontWeight: 500,
                }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Main Content ── */}
        <div style={{ padding: "40px 48px", maxWidth: "1200px", margin: "0 auto" }}>

          <Section title="Financial Summary">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(175px, 1fr))", gap: "12px" }}>
              {[
                { label: "Subtotal", value: formatCurrency(invoice.subtotal, currency), accent: "#6366f1", bg: "#eef2ff", valColor: "#4338ca" },
                { label: "Discount", value: formatCurrency(invoice.discountAmount, currency), accent: "#8b5cf6", bg: "#f5f3ff", valColor: "#6d28d9" },
                { label: "Discount Type", value: fallbackText(invoice.discountType), accent: "#8b5cf6", bg: "#f5f3ff", valColor: "#1e293b" },
                { label: "Discount Value", value: formatCurrency(invoice.discountValue, currency), accent: "#a78bfa", bg: "#faf5ff", valColor: "#6d28d9" },
                { label: "Tax Amount", value: formatCurrency(invoice.taxAmount, currency), accent: "#f59e0b", bg: "#fffbeb", valColor: "#b45309" },
                { label: "Shipping", value: formatCurrency(invoice.shippingCost, currency), accent: "#14b8a6", bg: "#f0fdfa", valColor: "#0f766e" },
                { label: "Total", value: formatCurrency(invoice.totalAmount, currency), accent: "#4f46e5", bg: "#eef2ff", valColor: "#4338ca", highlight: true },
              ].map((item) => (
                <div key={item.label} style={{
                  background: item.bg,
                  border: `1px solid ${item.accent}22`,
                  borderTop: `3px solid ${item.accent}`,
                  borderRadius: "10px",
                  padding: "16px",
                  boxShadow: item.highlight ? "0 2px 12px rgba(99,102,241,0.1)" : "0 1px 3px rgba(0,0,0,0.04)",
                }}>
                  <p style={{
                    fontFamily: "'DM Mono', monospace", fontSize: "9.5px",
                    letterSpacing: "0.1em", textTransform: "uppercase",
                    color: item.accent, margin: "0 0 7px 0", fontWeight: 600,
                  }}>{item.label}</p>
                  <p style={{
                    fontFamily: item.highlight ? "'Instrument Serif', Georgia, serif" : "'DM Mono', monospace",
                    fontSize: item.highlight ? "22px" : "15px",
                    color: item.valColor, margin: 0,
                    letterSpacing: item.highlight ? "-0.01em" : 0,
                    fontWeight: item.highlight ? 400 : 500,
                  }}>{item.value}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Client Information">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <Panel title="Identity" accent="linear-gradient(90deg, #6366f1, #8b5cf6)">
                <FieldGrid fields={[
                  { label: "Client Name", value: fallbackText(client.name) },
                  { label: "Company", value: fallbackText(client.companyName) },
                  { label: "Client Code", value: fallbackText(client.clientId) },
                  { label: "Client UUID", value: fallbackText(client.id) },
                  { label: "Business UUID", value: fallbackText(client.businessId) },
                ]} />
              </Panel>
              <Panel title="Contact & Address" accent="linear-gradient(90deg, #8b5cf6, #a78bfa)">
                <FieldGrid fields={[
                  { label: "Email", value: fallbackText(client.emailAddress) },
                  { label: "Phone", value: fallbackText(client.phone) },
                  { label: "Fax", value: fallbackText(client.faxNumber) },
                  { label: "Address", value: renderAddress(data) },
                ]} />
              </Panel>
            </div>
            <div style={{ marginTop: "16px" }}>
              <Panel title="Financial & Metadata" accent="linear-gradient(90deg, #a78bfa, #c4b5fd)">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 32px" }}>
                  <FieldGrid fields={[
                    { label: "Credit", value: formatCurrency(client.credit, client.currencyCode || currency) },
                    { label: "Opening Balance", value: formatCurrency(client.openingBalance, client.currencyCode || currency) },
                    { label: "Currency Code", value: fallbackText(client.currencyCode) },
                    { label: "Rating", value: formatDecimal(client.rating) },
                    { label: "Deleted", value: formatBoolean(client.isDeleted) },
                  ]} />
                  <FieldGrid fields={[
                    { label: "Additional Notes", value: fallbackText(client.additionalNotes) },
                    { label: "Created At", value: formatDateTime(client.createdAt) },
                    { label: "Updated At", value: formatDateTime(client.updatedAt) },
                    { label: "Deleted At", value: formatDateTime(client.deletedAt) },
                  ]} />
                </div>
              </Panel>
            </div>
          </Section>

          <Section title="Business Information">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <Panel title="Identity" accent="linear-gradient(90deg, #0f766e, #14b8a6)">
                <FieldGrid fields={[
                  { label: "Business Name", value: fallbackText(business.name) },
                  { label: "Short Name", value: fallbackText(business.shortName) },
                  { label: "Business UUID", value: fallbackText(business.id) },
                  { label: "User UUID", value: fallbackText(business.userId) },
                  { label: "License Number", value: fallbackText(business.licenseNumber) },
                  { label: "Business Number", value: fallbackText(business.businessNumber) },
                ]} />
              </Panel>
              <Panel title="Contact & Address" accent="linear-gradient(90deg, #14b8a6, #2dd4bf)">
                <FieldGrid fields={[
                  { label: "Email", value: fallbackText(business.emailAddress) },
                  { label: "Phone", value: fallbackText(business.phone) },
                  { label: "Website", value: fallbackText(business.website) },
                  {
                    label: "Address",
                    value: [
                      business.addressLine1,
                      business.addressLine2,
                      business.city,
                      business.state,
                      business.zipcode,
                      business.country,
                    ].filter(Boolean).join(", ") || "â€”",
                  },
                ]} />
              </Panel>
            </div>
            <div style={{ marginTop: "16px" }}>
              <Panel title="Financial & Metadata" accent="linear-gradient(90deg, #2dd4bf, #99f6e4)">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 32px" }}>
                  <FieldGrid fields={[
                    { label: "Currency Code", value: fallbackText(business.currencyCode) },
                    { label: "Deleted", value: formatBoolean(business.isDeleted) },
                  ]} />
                  <FieldGrid fields={[
                    { label: "Created At", value: formatDateTime(business.createdAt) },
                    { label: "Updated At", value: formatDateTime(business.updatedAt) },
                    { label: "Deleted At", value: formatDateTime(business.deletedAt) },
                  ]} />
                </div>
              </Panel>
            </div>
          </Section>

          <Section title="Line Items">
            <div style={{
              background: "#ffffff", border: "1px solid #e2e8f0",
              borderRadius: "12px", overflow: "hidden",
              boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            }}>
              {invoice.items.length === 0 ? (
                <p className="muted" style={{ padding: "24px 20px" }}>No items found.</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className="inv-table">
                    <thead>
                      <tr>
                        <th>Item Name</th><th>Description</th><th>Qty</th>
                        <th>Unit Price</th><th>Discount</th><th>Disc. Type</th>
                        <th>Net Price</th><th>Inventory ID</th><th>Item ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.items.map((item) => (
                        <tr key={item.id}>
                          <td style={{ color: "#0f172a", fontWeight: 500 }}>{fallbackText(item.name)}</td>
                          <td>{fallbackText(item.description)}</td>
                          <td>{fallbackNumber(item.quantity, 0)}</td>
                          <td>{formatCurrency(item.unitPrice, currency)}</td>
                          <td>{formatCurrency(item.discountValue, currency)}</td>
                          <td>{fallbackText(item.discountType)}</td>
                          <td style={{ color: "#4338ca", fontWeight: 600 }}>{formatCurrency(item.netPrice, currency)}</td>
                          <td style={{ fontSize: "11px", color: "#94a3b8" }}>{fallbackText(item.inventoryItemId)}</td>
                          <td style={{ fontSize: "11px", color: "#94a3b8" }}>{fallbackText(item.id)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Section>

          <Section title="Tax, Terms & Payment Instruction">
            <div className="entity-grid">
              <Panel title="Tax" accent="linear-gradient(90deg, #f59e0b, #fbbf24)">
                {data.tax ? (
                  <FieldGrid fields={[
                    { label: "Name", value: fallbackText(data.tax.name) },
                    { label: "Rate", value: `${formatDecimal(data.tax.rate)}%` },
                    { label: "Tax UUID", value: fallbackText(data.tax.id) },
                    { label: "Business UUID", value: fallbackText(data.tax.businessId) },
                    { label: "Deleted", value: formatBoolean(data.tax.isDeleted) },
                    { label: "Created At", value: formatDateTime(data.tax.createdAt) },
                    { label: "Updated At", value: formatDateTime(data.tax.updatedAt) },
                    { label: "Deleted At", value: formatDateTime(data.tax.deletedAt) },
                  ]} />
                ) : <p className="muted">No tax record attached.</p>}
              </Panel>
              <Panel title="Terms" accent="linear-gradient(90deg, #10b981, #34d399)">
                {data.terms ? (
                  <FieldGrid fields={[
                    { label: "Title", value: fallbackText(data.terms.title) },
                    { label: "Description", value: fallbackText(data.terms.description) },
                    { label: "Terms UUID", value: fallbackText(data.terms.id) },
                    { label: "Business UUID", value: fallbackText(data.terms.businessId) },
                    { label: "Deleted", value: formatBoolean(data.terms.isDeleted) },
                    { label: "Created At", value: formatDateTime(data.terms.createdAt) },
                    { label: "Updated At", value: formatDateTime(data.terms.updatedAt) },
                    { label: "Deleted At", value: formatDateTime(data.terms.deletedAt) },
                  ]} />
                ) : <p className="muted">No terms record attached.</p>}
              </Panel>
              <Panel title="Payment Instruction" accent="linear-gradient(90deg, #0ea5e9, #38bdf8)">
                {data.paymentInstruction ? (
                  <>
                    <FieldGrid fields={[
                      { label: "Instruction UUID", value: fallbackText(data.paymentInstruction.id) },
                      { label: "Business UUID", value: fallbackText(data.paymentInstruction.businessId) },
                      { label: "Deleted", value: formatBoolean(data.paymentInstruction.isDeleted) },
                      { label: "Created At", value: formatDateTime(data.paymentInstruction.createdAt) },
                      { label: "Updated At", value: formatDateTime(data.paymentInstruction.updatedAt) },
                      { label: "Deleted At", value: formatDateTime(data.paymentInstruction.deletedAt) },
                    ]} />
                    {paymentInstructionJson
                      ? <pre className="json-pre">{paymentInstructionJson}</pre>
                      : <p className="muted">No fields JSON payload available.</p>}
                  </>
                ) : <p className="muted">No payment instruction record attached.</p>}
              </Panel>
            </div>
          </Section>

          <Section title="Template, Header & Background">
            <div className="entity-grid">
              <Panel title="Template" accent="linear-gradient(90deg, #ec4899, #f472b6)">
                {data.template ? (
                  <FieldGrid fields={[
                    { label: "Template Name", value: fallbackText(data.template.templateName) },
                    { label: "Template Style", value: formatDecimal(data.template.templateStyle) },
                    { label: "Color", value: fallbackText(data.template.color) },
                    { label: "Custom", value: formatBoolean(data.template.isCustom) },
                    { label: "Saved", value: formatBoolean(data.template.isSaved) },
                    { label: "Header Alpha", value: formatDecimal(data.template.headerAlpha) },
                    { label: "Background Opacity", value: formatDecimal(data.template.backgroundOpacity) },
                    { label: "Description", value: fallbackText(data.template.description) },
                    { label: "Template UUID", value: fallbackText(data.template.id) },
                    { label: "Business UUID", value: fallbackText(data.template.businessId) },
                    { label: "Header UUID", value: fallbackText(data.template.headerId) },
                    { label: "Background UUID", value: fallbackText(data.template.backgroundId) },
                    { label: "Signature UUID", value: fallbackText(data.template.signatureId) },
                    { label: "Stamp UUID", value: fallbackText(data.template.stampId) },
                    { label: "Deleted", value: formatBoolean(data.template.isDeleted) },
                    { label: "Created At", value: formatDateTime(data.template.createdAt) },
                    { label: "Updated At", value: formatDateTime(data.template.updatedAt) },
                    { label: "Deleted At", value: formatDateTime(data.template.deletedAt) },
                  ]} />
                ) : <p className="muted">No template record attached.</p>}
              </Panel>
              <Panel title="Header" accent="linear-gradient(90deg, #f97316, #fb923c)">
                {data.header ? (
                  <FieldGrid fields={[
                    { label: "Name", value: fallbackText(data.header.name) },
                    { label: "Description", value: fallbackText(data.header.description) },
                    { label: "Custom", value: formatBoolean(data.header.isCustom) },
                    { label: "Background Type", value: fallbackText(data.header.backgroundType) },
                    { label: "Color Hex", value: fallbackText(data.header.colorHex) },
                    { label: "Theme Type", value: fallbackText(data.header.themeType) },
                    { label: "Theme Alpha", value: formatDecimal(data.header.themeAlpha) },
                    { label: "Theme Overlay Hex", value: fallbackText(data.header.themeOverlayHex) },
                    { label: "Theme Overlay Alpha", value: formatDecimal(data.header.themeOverlayAlpha) },
                    { label: "Image Alpha", value: formatDecimal(data.header.imageAlpha) },
                    { label: "Image Scale Type", value: fallbackText(data.header.imageScaleType) },
                    { label: "Image Overlay Hex", value: fallbackText(data.header.imageOverlayHex) },
                    { label: "Image Overlay Alpha", value: formatDecimal(data.header.imageOverlayAlpha) },
                    { label: "Header UUID", value: fallbackText(data.header.id) },
                    { label: "Business UUID", value: fallbackText(data.header.businessId) },
                    { label: "Deleted", value: formatBoolean(data.header.isDeleted) },
                    { label: "Created At", value: formatDateTime(data.header.createdAt) },
                    { label: "Updated At", value: formatDateTime(data.header.updatedAt) },
                    { label: "Deleted At", value: formatDateTime(data.header.deletedAt) },
                  ]} />
                ) : <p className="muted">No header record attached.</p>}
              </Panel>
              <Panel title="Background" accent="linear-gradient(90deg, #14b8a6, #2dd4bf)">
                {data.background ? (
                  <FieldGrid fields={[
                    { label: "Name", value: fallbackText(data.background.name) },
                    { label: "Description", value: fallbackText(data.background.description) },
                    { label: "Custom", value: formatBoolean(data.background.isCustom) },
                    { label: "Background UUID", value: fallbackText(data.background.id) },
                    { label: "Business UUID", value: fallbackText(data.background.businessId) },
                    { label: "Deleted", value: formatBoolean(data.background.isDeleted) },
                    { label: "Created At", value: formatDateTime(data.background.createdAt) },
                    { label: "Updated At", value: formatDateTime(data.background.updatedAt) },
                    { label: "Deleted At", value: formatDateTime(data.background.deletedAt) },
                  ]} />
                ) : <p className="muted">No background record attached.</p>}
              </Panel>
            </div>
          </Section>

          <Section title="Signature & Stamp">
            <div className="entity-grid" style={{ marginBottom: "20px" }}>
              <Panel title="Signature" accent="linear-gradient(90deg, #8b5cf6, #a78bfa)">
                {data.signature ? (
                  <FieldGrid fields={[
                    { label: "Name", value: fallbackText(data.signature.name) },
                    { label: "Signature UUID", value: fallbackText(data.signature.id) },
                    { label: "Business UUID", value: fallbackText(data.signature.businessId) },
                    { label: "Deleted", value: formatBoolean(data.signature.isDeleted) },
                    { label: "Created At", value: formatDateTime(data.signature.createdAt) },
                    { label: "Updated At", value: formatDateTime(data.signature.updatedAt) },
                    { label: "Deleted At", value: formatDateTime(data.signature.deletedAt) },
                  ]} />
                ) : <p className="muted">No signature record attached.</p>}
              </Panel>
              <Panel title="Stamp" accent="linear-gradient(90deg, #f43f5e, #fb7185)">
                {data.stamp ? (
                  <FieldGrid fields={[
                    { label: "Name", value: fallbackText(data.stamp.name) },
                    { label: "Description", value: fallbackText(data.stamp.description) },
                    { label: "Custom", value: formatBoolean(data.stamp.isCustom) },
                    { label: "Stamp UUID", value: fallbackText(data.stamp.id) },
                    { label: "Business UUID", value: fallbackText(data.stamp.businessId) },
                    { label: "Deleted", value: formatBoolean(data.stamp.isDeleted) },
                    { label: "Created At", value: formatDateTime(data.stamp.createdAt) },
                    { label: "Updated At", value: formatDateTime(data.stamp.updatedAt) },
                    { label: "Deleted At", value: formatDateTime(data.stamp.deletedAt) },
                  ]} />
                ) : <p className="muted">No stamp record attached.</p>}
              </Panel>
            </div>
            <div className="asset-grid">
              <AssetCard
                label="Business Logo"
                alt="Business logo"
                sourceValue={business.logo}
                asset={businessLogoAsset}
              />
              <AssetCard
                label="Template Image"
                alt="Template"
                sourceValue={data.template?.templateImage}
                asset={{
                  normalizedUrl: templateImageAsset.normalizedUrl,
                  requestUrl: templateImageAsset.requestUrl,
                }}
                imageStyle={{ objectFit: "cover", padding: "0" }}
              />
              <AssetCard
                label="Header Image"
                alt="Header"
                sourceValue={data.header?.image}
                asset={headerAsset}
                imageStyle={{ objectFit: "cover", padding: "0" }}
              />
              <AssetCard
                label="Background Image"
                alt="Background"
                sourceValue={data.background?.image}
                asset={backgroundAsset}
                imageStyle={{ objectFit: "cover", padding: "0" }}
              />
              <AssetCard
                label="Signature"
                alt="Signature"
                sourceValue={data.signature?.image}
                asset={signatureAsset}
              />
              <AssetCard
                label="Stamp"
                alt="Stamp"
                sourceValue={data.stamp?.image}
                asset={stampAsset}
              />
            </div>
          </Section>

          <Section title="System References & Audit">
            <Panel title="UUID References & Offsets" accent="linear-gradient(90deg, #94a3b8, #cbd5e1)">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 32px" }}>
                <FieldGrid fields={[
                  { label: "Invoice UUID", value: fallbackText(invoice.id) },
                  { label: "Client UUID", value: fallbackText(invoice.clientId) },
                  { label: "Tax UUID", value: fallbackText(invoice.taxId) },
                  { label: "Terms UUID", value: fallbackText(invoice.termsId) },
                  { label: "Payment Instruction UUID", value: fallbackText(invoice.paymentInstructionId) },
                  { label: "Template UUID", value: fallbackText(invoice.templateId) },
                ]} />
                <FieldGrid fields={[
                  { label: "Signature UUID", value: fallbackText(invoice.signatureId) },
                  { label: "Stamp UUID", value: fallbackText(invoice.stampId) },
                  { label: "Signature Offset", value: fallbackText(invoice.signatureOffset) },
                  { label: "Stamp Offset", value: fallbackText(invoice.stampOffset) },
                  { label: "Signature Scale", value: fallbackText(invoice.signatureScale) },
                  { label: "Stamp Scale", value: fallbackText(invoice.stampScale) },
                ]} />
              </div>
              <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #f1f5f9" }}>
                <FieldGrid fields={[
                  { label: "Created At", value: formatDateTime(invoice.createdAt) },
                  { label: "Updated At", value: formatDateTime(invoice.updatedAt) },
                ]} />
              </div>
            </Panel>
          </Section>

          <Section title="Notes">
            <div style={{
              background: "#ffffff", border: "1px solid #e2e8f0",
              borderLeft: "3px solid #6366f1", borderRadius: "0 10px 10px 0",
              padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            }}>
              <p style={{
                fontFamily: "'DM Sans', sans-serif", fontSize: "14px",
                color: invoice.notes ? "#334155" : "#cbd5e1",
                margin: 0, lineHeight: 1.7,
                fontStyle: invoice.notes ? "normal" : "italic",
              }}>
                {fallbackText(invoice.notes, "No notes for this invoice.")}
              </p>
            </div>
          </Section>

        </div>
      </div>
    </>
  );
}

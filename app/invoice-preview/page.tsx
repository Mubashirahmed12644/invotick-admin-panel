import InvoicePreviewClientPage from "@/app/invoice-preview/InvoicePreviewClientPage";
import InvoicePreviewPdfClient from "@/app/invoice-preview/InvoicePreviewPdfClient";
import { consumeInvoicePreviewPayload } from "@/lib/invoice-preview-payload-store";

interface InvoicePreviewPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function InvoicePreviewPage({ searchParams }: InvoicePreviewPageProps) {
  const resolvedSearchParams = await searchParams;
  const pdfParam = resolvedSearchParams.pdf;
  const payloadKeyParam = resolvedSearchParams.payloadKey;
  const assetAuthKeyParam = resolvedSearchParams.assetAuthKey;

  const pdfMode =
    typeof pdfParam === "string"
      ? pdfParam === "1"
      : Array.isArray(pdfParam)
        ? pdfParam.includes("1")
        : false;

  const payloadKey =
    typeof payloadKeyParam === "string"
      ? payloadKeyParam
      : Array.isArray(payloadKeyParam)
        ? payloadKeyParam[0] || null
        : null;

  const assetAuthKey =
    typeof assetAuthKeyParam === "string"
      ? assetAuthKeyParam
      : Array.isArray(assetAuthKeyParam)
        ? assetAuthKeyParam[0] || null
        : null;

  if (pdfMode) {
    // Try server-side payload store (works on local dev and same-Lambda requests).
    // The client component also checks window.__INVOICE_PDF_DATA__ injected by
    // Puppeteer via evaluateOnNewDocument, which is the reliable path on Vercel.
    const serverData = consumeInvoicePreviewPayload(payloadKey);
    return (
      <main className="invoice-pdf-page">
        <InvoicePreviewPdfClient serverData={serverData} assetAuthKey={assetAuthKey} />
      </main>
    );
  }

  return <InvoicePreviewClientPage />;
}

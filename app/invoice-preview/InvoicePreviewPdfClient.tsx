"use client";

import { useEffect, useRef, useState } from "react";
import { InvoicePreviewScreen, dummyInvoice } from "@/features/invoice-preview";
import type { InvoicePreviewDocument } from "@/features/invoice-preview/types/invoice-preview.types";

interface Props {
  serverData: InvoicePreviewDocument | null;
  assetAuthKey: string | null;
}

export default function InvoicePreviewPdfClient({ serverData, assetAuthKey }: Props) {
  const [data, setData] = useState<InvoicePreviewDocument>(serverData ?? dummyInvoice);
  const resolved = useRef(false);

  useEffect(() => {
    if (resolved.current) return;
    resolved.current = true;

    const injected = (window as unknown as Record<string, unknown>)["__INVOICE_PDF_DATA__"];
    if (!injected) return;

    try {
      const parsed: InvoicePreviewDocument =
        typeof injected === "string" ? JSON.parse(injected) : (injected as InvoicePreviewDocument);
      setData(parsed);
    } catch {
      // Malformed injection — fall back to serverData or dummy
    }
  }, []);

  return <InvoicePreviewScreen data={data} pdfMode assetAuthKey={assetAuthKey} />;
}

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ErrorState from "@/components/ErrorState";
import LoadingState from "@/components/LoadingState";
import { api, ApiError } from "@/lib/api";

export default function ShortInvoiceLinkPage() {
  const router = useRouter();
  const params = useParams<{ invoiceId: string }>();
  const invoiceId = Array.isArray(params.invoiceId) ? params.invoiceId[0] : params.invoiceId;

  const [error, setError] = useState("");

  useEffect(() => {
    if (!invoiceId) return;

    api.getInvoiceById(invoiceId)
      .then((response) => {
        const userId = response.invoice.userId;
        router.replace(`/users/${userId}/invoices/${invoiceId}/v2`);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 404) {
          setError("Invoice not found.");
        } else {
          setError("Failed to load invoice. Please try again.");
        }
      });
  }, [invoiceId, router]);

  if (error) {
    return (
      <main style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <ErrorState message={error} />
      </main>
    );
  }

  return (
    <main style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <LoadingState message="Loading invoice..." />
    </main>
  );
}

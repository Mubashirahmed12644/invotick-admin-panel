/* eslint-disable @next/next/no-img-element */
"use client";

import React from "react";
import { useImageFailureState, usePreloadedImageFailure } from "@/features/invoice-preview/components/useInvoiceAssetLoadState";
import InvoiceHeader from "@/features/invoice-preview/components/InvoiceHeader";
import InvoiceItemsTable from "@/features/invoice-preview/components/InvoiceItemsTable";
import InvoiceSenderReceiver from "@/features/invoice-preview/components/InvoiceSenderReceiver";
import InvoiceFooter from "@/features/invoice-preview/components/InvoiceFooter";
import InvoicePaymentInstructions from "@/features/invoice-preview/components/InvoicePaymentInstructions";
import InvoiceTerms from "@/features/invoice-preview/components/InvoiceTerms";
import InvoiceTotals from "@/features/invoice-preview/components/InvoiceTotals";
import styles from "@/features/invoice-preview/styles/invoice-preview.module.css";
import type { InvoicePreviewDocument, InvoicePreviewLineItem } from "@/features/invoice-preview/types/invoice-preview.types";
import { resolveInvoiceAsset } from "@/lib/invoice-preview-assets";

interface InvoicePageProps {
  data: InvoicePreviewDocument;
  items: InvoicePreviewLineItem[];
  serialStart: number;
  showHeader: boolean;
  showSenderReceiver: boolean;
  showTotals: boolean;
  showTermsBottom: boolean;
  showOverlays: boolean;
  showItemTable?: boolean;
  showTitle?: boolean;
  showBusinessLogo?: boolean;
  showInvoiceMeta?: boolean;
  showSender?: boolean;
  showReceiver?: boolean;
  showPayment?: boolean;
  showNotes?: boolean;
  showTerms?: boolean;
  showSignature?: boolean;
  showStamp?: boolean;
  assetAuthKey?: string | null;
  minRows?: number;
}

const MIN_ITEM_ROWS = 9;

function getWatermark(invoiceStatus: string): { text: string; color: string } | null {
  if (invoiceStatus === "DRAFT") return { text: "DRAFT", color: "#6b7280" };
  if (invoiceStatus === "PAID") return { text: "PAID", color: "#16a34a" };
  if (invoiceStatus === "OVERDUE") return { text: "OVERDUE", color: "#dc2626" };
  return null;
}

export default function InvoicePage({
  data,
  items,
  serialStart,
  showHeader,
  showSenderReceiver,
  showTotals,
  showTermsBottom,
  showOverlays,
  showItemTable = true,
  showTitle = true,
  showBusinessLogo = true,
  showInvoiceMeta = true,
  showSender = true,
  showReceiver = true,
  showPayment = true,
  showNotes = true,
  showTerms = true,
  showSignature = true,
  showStamp = true,
  assetAuthKey = null,
  minRows = MIN_ITEM_ROWS,
}: InvoicePageProps) {
  const watermark = getWatermark(data.invoice.invoiceStatus);
  const hasTerms = Boolean(showTermsBottom && data.terms?.description?.trim());
  const showBottomRow = hasTerms || showOverlays;
  const showInlineSummary = showTotals;
  const backgroundImage = resolveInvoiceAsset(data.template.backgroundImageUrl, assetAuthKey);
  const signatureImage = resolveInvoiceAsset(data.signature?.imageUrl, assetAuthKey);
  const stampImage = resolveInvoiceAsset(data.stamp?.imageUrl, assetAuthKey);
  const backgroundImageFailed = usePreloadedImageFailure(backgroundImage.requestUrl, backgroundImage.kind === "resolved");
  const [signatureImageFailed, markSignatureImageFailed] = useImageFailureState(signatureImage.requestUrl);
  const [stampImageFailed, markStampImageFailed] = useImageFailureState(stampImage.requestUrl);

  return (
    <article
      className={styles.page}
      data-invoice-page="true"
      style={{ "--invoice-primary": data.template.color || "#111827" } as React.CSSProperties}
    >
      <div className={styles.pageInner}>
        {backgroundImage.kind === "resolved" && backgroundImage.requestUrl && !backgroundImageFailed ? (
          <div
            className={styles.pageBg}
            style={{
              backgroundImage: `url('${backgroundImage.requestUrl}')`,
              opacity: data.template.backgroundOpacity ?? 1,
            }}
          />
        ) : null}
        {backgroundImageFailed || backgroundImage.kind === "unsynced" ? (
          <span className={styles.unsyncedAssetBackgroundNotice}>Background image not synced</span>
        ) : null}

        {watermark ? (
          <span className={styles.watermark} style={{ color: watermark.color }}>
            {watermark.text}
          </span>
        ) : null}

        <div
          className={`${styles.content} ${showBottomRow ? styles.contentWithBottomTerms : styles.contentWithFooter}`}
          data-invoice-content="true"
        >
          {showHeader ? (
            <InvoiceHeader
              invoice={data.invoice}
              business={data.business}
              template={data.template}
              translations={data.translations}
              assetAuthKey={assetAuthKey}
              showBusinessLogo={showBusinessLogo}
              showTitle={showTitle}
            />
          ) : null}

          {showSenderReceiver ? (
            <InvoiceSenderReceiver
              business={data.business}
              client={data.client}
              invoice={data.invoice}
              template={data.template}
              translations={data.translations}
              showSender={showSender}
              showReceiver={showReceiver}
              showInvoiceMeta={showInvoiceMeta}
            />
          ) : null}

          <InvoiceItemsTable
            items={items}
            currency={data.currency}
            template={data.template}
            translations={data.translations}
            minRows={minRows}
            serialStart={serialStart}
            shouldRender={showItemTable}
          />

          {showInlineSummary ? (
            <div className={styles.inlineSummaryRow}>
              <div className={styles.inlineSummaryPayment}>
                <InvoicePaymentInstructions
                  paymentInstruction={data.paymentInstruction}
                  template={data.template}
                  translations={data.translations}
                  shouldRender={showPayment}
                />
              </div>
              <div className={styles.inlineSummaryTotals} data-invoice-totals-wrap="true">
                <InvoiceTotals
                  totals={data.totals}
                  currency={data.currency}
                  template={data.template}
                  translations={data.translations}
                  shouldRender={showTotals}
                />
              </div>
            </div>
          ) : null}

          {!showBottomRow && !showInlineSummary ? <div className={styles.itemsBottomSpacer} data-invoice-items-spacer="true" /> : null}
        </div>

        {showBottomRow ? <div className={styles.bottomSectionDivider} /> : null}

        {showBottomRow ? (
          <section className={styles.termsBottom}>
            {/* Col 1: Terms & Conditions */}
            <div className={styles.termsBottomLeft}>
              {hasTerms ? (
                <InvoiceTerms
                  terms={data.terms}
                  template={data.template}
                  translations={data.translations}
                  shouldRender={showTerms}
                />
              ) : null}
            </div>

            {/* Col 2: Signature | Stamp */}
            <div className={styles.termsBottomRight}>
              {/* Signature */}
              <div className={styles.termsBottomSigCol}>
                {showSignature && showOverlays ? (
                  signatureImage.kind === "resolved" && signatureImage.requestUrl && !signatureImageFailed ? (
                    <img
                      src={signatureImage.requestUrl}
                      alt={data.signature?.name || "Signature"}
                      className={styles.termsBottomAssetImg}
                      onError={markSignatureImageFailed}
                    />
                  ) : (signatureImageFailed || signatureImage.kind === "unsynced") ? (
                    <span className={styles.termsBottomUnsyncedAsset}>Signature not synced</span>
                  ) : null
                ) : null}
              </div>

              {/* Stamp */}
              <div className={styles.termsBottomStampCol}>
                {showStamp && showOverlays ? (
                  stampImage.kind === "resolved" && stampImage.requestUrl && !stampImageFailed ? (
                    <img
                      src={stampImage.requestUrl}
                      alt={data.stamp?.name || "Stamp"}
                      className={styles.termsBottomAssetImg}
                      onError={markStampImageFailed}
                    />
                  ) : (stampImageFailed || stampImage.kind === "unsynced") ? (
                    <span className={styles.termsBottomUnsyncedAsset}>Stamp not synced</span>
                  ) : null
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        <InvoiceFooter invoiceId={data.invoice.id} />
      </div>
    </article>
  );
}

/* eslint-disable @next/next/no-img-element */
import { QRCodeSVG } from "qrcode.react";
import styles from "@/features/invoice-preview/styles/invoice-preview.module.css";

const BASE_URL = process.env.NEXT_PUBLIC_FOOTER_APP_URL ?? "https://gw.invotick.com";

interface InvoiceFooterProps {
  invoiceId: string;
}

export default function InvoiceFooter({ invoiceId }: InvoiceFooterProps) {
  const appUrl = `${BASE_URL}/${invoiceId}`;

  return (
    <div className={styles.invoiceFooterWrap}>
      <div className={styles.invoiceFooter}>
        <div className={styles.invoiceFooterLeft}>
          <img
            src="/logo.png"
            alt="Invotics"
            width={40}
            height={40}
            className={styles.invoiceFooterLogo}
          />
          <div className={styles.invoiceFooterBrand}>
            <span className={styles.invoiceFooterTitle}>Invoice generated using Invotics</span>
            <span className={styles.invoiceFooterSub}>Create professional invoices in seconds</span>
          </div>
        </div>
        <div className={styles.invoiceFooterRight}>
          <div className={styles.invoiceFooterQrMeta}>
            <span className={styles.invoiceFooterScanLabel}>Scan to download Invotics</span>
            <span className={styles.invoiceFooterUrl}>{appUrl}</span>
          </div>
          <QRCodeSVG value={appUrl} size={52} />
        </div>
      </div>
    </div>
  );
}

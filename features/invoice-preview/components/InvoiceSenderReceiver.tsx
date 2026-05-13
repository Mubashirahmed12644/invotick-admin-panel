import styles from "@/features/invoice-preview/styles/invoice-preview.module.css";
import type {
  InvoicePreviewBusiness,
  InvoicePreviewClient,
  InvoicePreviewInvoice,
  InvoicePreviewTemplate,
  InvoicePreviewTranslations,
} from "@/features/invoice-preview/types/invoice-preview.types";
import { formatDate } from "@/lib/format";

interface InvoiceSenderReceiverProps {
  business: InvoicePreviewBusiness;
  client: InvoicePreviewClient | null;
  invoice: InvoicePreviewInvoice;
  template: InvoicePreviewTemplate;
  translations: InvoicePreviewTranslations;
  showSender?: boolean;
  showReceiver?: boolean;
  showInvoiceMeta?: boolean;
}

function renderContactLines(fields: Array<string | null | undefined>): string[] {
  return fields
    .map((field) => (field ?? "").trim())
    .filter((field): field is string => Boolean(field));
}

export default function InvoiceSenderReceiver({
  business,
  client,
  invoice,
  template,
  translations,
  showSender = true,
  showReceiver = true,
  showInvoiceMeta = true,
}: InvoiceSenderReceiverProps) {
  const senderLocationLine = renderContactLines([
    business.city,
    business.state,
    business.zipCode,
    business.country,
  ]).join(", ");

  const senderLines = renderContactLines([
    business.name,
    business.shortName,
    business.addressLineOne,
    business.addressLineTwo,
    senderLocationLine || null,
    business.phone ? `Phone: ${business.phone}` : null,
    business.email ? `Email: ${business.email}` : null,
  ]);

  const receiverLocationLine = renderContactLines([
    client?.city,
    client?.state,
    client?.zipCode,
    client?.country,
  ]).join(", ");

  const receiverLines = renderContactLines([
    client?.fullName,
    client?.companyName,
    client?.addressLineOne,
    client?.addressLineTwo,
    receiverLocationLine || null,
    client?.phone ? `Phone: ${client.phone}` : null,
    client?.email ? `Email: ${client.email}` : null,
  ]);

  return (
    <section className={styles.rowThree}>
      {showSender ? (
        <article className={styles.block}>
          <h3 className={styles.blockHeader}>{translations.senderHeader}</h3>
          {senderLines.map((line) => (
            <p key={line} className={styles.blockText}>{line}</p>
          ))}
        </article>
      ) : (
        <div />
      )}

      {showReceiver ? (
        <article className={styles.block}>
          <h3 className={styles.blockHeader}>{translations.receiverHeader}</h3>
          {receiverLines.length > 0 ? (
            receiverLines.map((line) => (
              <p key={line} className={styles.blockText}>{line}</p>
            ))
          ) : (
            <p className={styles.blockText}>-</p>
          )}
        </article>
      ) : (
        <div />
      )}

      {showInvoiceMeta ? (
        <article className={`${styles.block} ${styles.metaBlock}`}>
          <h3 className={styles.blockHeader}>{translations.metaHeader}</h3>
          <p className={styles.blockText}>
            {translations.invoiceNumberLabel}: {invoice.invoiceNumber}
          </p>
          <p className={styles.blockText}>
            {translations.issueDateLabel}: {formatDate(invoice.invoiceDate)}
          </p>
          <p className={styles.blockText}>
            {translations.dueDateLabel}: {formatDate(invoice.dueDate)}
          </p>
          {invoice.poNumber ? (
            <p className={styles.blockText}>
              {translations.poNumberLabel}: {invoice.poNumber}
            </p>
          ) : null}
        </article>
      ) : (
        <div />
      )}
    </section>
  );
}

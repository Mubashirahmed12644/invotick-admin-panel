import styles from "@/features/invoice-preview/styles/invoice-preview.module.css";
import type {
  InvoicePreviewPaymentInstruction,
  InvoicePreviewTemplate,
  InvoicePreviewTranslations,
} from "@/features/invoice-preview/types/invoice-preview.types";

interface InvoicePaymentInstructionsProps {
  paymentInstruction: InvoicePreviewPaymentInstruction | null;
  template: InvoicePreviewTemplate;
  translations: InvoicePreviewTranslations;
  shouldRender?: boolean;
}

export default function InvoicePaymentInstructions({
  paymentInstruction,
  template,
  translations,
  shouldRender = true,
}: InvoicePaymentInstructionsProps) {
  if (!shouldRender || !paymentInstruction) return null;

  const fields = Object.entries(paymentInstruction.fields);
  if (fields.length === 0) return null;

  return (
    <article className={styles.paymentBlock}>
      <h3 className={styles.blockHeader}>{translations.paymentHeader}</h3>
      <p className={styles.paymentMethod}>{paymentInstruction.method}</p>
      <div className={styles.paymentFields}>
        {fields.map(([key, value]) => (
          <p key={key}>
            <strong>{key}:</strong> {value}
          </p>
        ))}
      </div>
    </article>
  );
}

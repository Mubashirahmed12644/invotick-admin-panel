import styles from "@/features/invoice-preview/styles/invoice-preview.module.css";
import type {
  InvoicePreviewTemplate,
  InvoicePreviewTerms,
  InvoicePreviewTranslations,
} from "@/features/invoice-preview/types/invoice-preview.types";

interface InvoiceTermsProps {
  terms: InvoicePreviewTerms | null;
  template: InvoicePreviewTemplate;
  translations: InvoicePreviewTranslations;
  shouldRender?: boolean;
}

export default function InvoiceTerms({ terms, template, translations, shouldRender = true }: InvoiceTermsProps) {
  if (!shouldRender || !terms?.description?.trim()) return null;

  return (
    <section className={styles.terms}>
      <h3 className={styles.blockHeader}>{translations.termsHeader}</h3>
      <p>{terms.description}</p>
    </section>
  );
}

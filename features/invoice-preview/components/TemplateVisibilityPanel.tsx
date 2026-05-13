"use client";

import React from "react";
import styles from "@/features/invoice-preview/styles/template-visibility-panel.module.css";

interface VisibilityState {
  showBusinessLogo: boolean;
  showInvoiceMeta: boolean;
  showTitle: boolean;
  showSender: boolean;
  showReceiver: boolean;
  showPayment: boolean;
  showNotes: boolean;
  showSignature: boolean;
  showStamp: boolean;
  showTerms: boolean;
  showTotal: boolean;
  showItemTable: boolean;
}

interface TemplateVisibilityPanelProps {
  visibility: VisibilityState;
  onToggle: (key: keyof VisibilityState, value: boolean) => void;
}

const VISIBILITY_LABELS: Record<keyof VisibilityState, string> = {
  showBusinessLogo: "Business Logo",
  showInvoiceMeta: "Invoice Meta",
  showTitle: "Invoice Title",
  showSender: "Sender Info",
  showReceiver: "Receiver Info",
  showPayment: "Payment Instructions",
  showNotes: "Notes",
  showSignature: "Signature",
  showStamp: "Stamp",
  showTerms: "Terms & Conditions",
  showTotal: "Totals",
  showItemTable: "Items Table",
};

export default function TemplateVisibilityPanel({
  visibility,
  onToggle,
}: TemplateVisibilityPanelProps) {
  return (
    <div className={styles.panel}>
      <h3 className={styles.panelTitle}>Template Elements</h3>
      <div className={styles.togglesList}>
        {(Object.keys(VISIBILITY_LABELS) as Array<keyof VisibilityState>).map(
          (key) => (
            <div key={key} className={styles.toggleItem}>
              <label className={styles.toggleLabel}>
                <input
                  type="checkbox"
                  checked={visibility[key]}
                  onChange={(e) => onToggle(key, e.target.checked)}
                  className={styles.toggleCheckbox}
                />
                <span className={styles.toggleText}>{VISIBILITY_LABELS[key]}</span>
              </label>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

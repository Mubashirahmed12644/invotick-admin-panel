export type InvoiceStatus =
  | "DRAFT"
  | "SENT"
  | "VIEWED"
  | "PARTIAL"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED"
  | "UNCOLLECTIBLE"
  | "REFUNDED";

export type DiscountType = "PERCENTAGE" | "FLAT";
export type TableAlignment = "Left" | "Center" | "Right";
export type HeaderBackgroundType = "NONE" | "COLOR" | "THEME" | "IMAGE";
export type ImageScaleType = "CROP" | "FIT" | "STRETCH" | "TILE";

export interface InvoicePreviewOffset {
  x: number;
  y: number;
}

export interface InvoicePreviewInvoice {
  id: string;
  customerId: string | null;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  poNumber: string | null;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  shippingCost: number;
  totalAmount: number;
  invoiceStatus: InvoiceStatus;
  discountType: DiscountType;
  discountValue: number;
  description: string | null;
  taxId: string | null;
  termsId: string | null;
  paymentMethodId: string | null;
  notes: string | null;
  templateId: string | null;
  signatureId: string | null;
  stampId: string | null;
  language: string | null;
  signatureOffset: InvoicePreviewOffset | null;
  stampOffset: InvoicePreviewOffset | null;
  signatureScale: number | null;
  stampScale: number | null;
  dateCreated: string;
  dateUpdated: string;
  dateSent: string | null;
  dateDeleted: string | null;
  isDeleted: boolean;
  isSynced: boolean;
}

export interface InvoicePreviewLineItemTaxRef {
  id: string;
  name: string;
  rate: number;
}

export interface InvoicePreviewLineItemNamedRef {
  id: string;
  name: string;
}

export interface InvoicePreviewLineItem {
  id: string;
  invoiceId: string;
  productId: string;
  position: number;
  quantity: number;
  name: string;
  unitPrice: number;
  netPrice: number;
  discountValue: number | null;
  discountAmount: number;
  discountType: DiscountType | null;
  taxAmount: number | null;
  subtotal: number | null;
  total: number | null;
  description: string | null;
  categoryId: string | null;
  unitTypeId: string | null;
  taxId: string | null;
  dateCreated: string | null;
  dateUpdated: string | null;
  dateDeleted: string | null;
  isDeleted: boolean;
  isSynced: boolean;
  tax: InvoicePreviewLineItemTaxRef | null;
  unitType: InvoicePreviewLineItemNamedRef | null;
  category: InvoicePreviewLineItemNamedRef | null;
}

export interface InvoicePreviewBusiness {
  id: string;
  name: string;
  shortName: string | null;
  logoUrl: string | null;
  licenseNumber: string | null;
  businessNumber: string | null;
  category: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  addressLineOne: string | null;
  addressLineTwo: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string | null;
}

export interface InvoicePreviewClient {
  id: string;
  businessId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  addressLineOne: string | null;
  addressLineTwo: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string | null;
  companyName: string | null;
  clientIdNumber: string | null;
  fax: string | null;
  currencyCode: string | null;
}

export interface InvoicePreviewTax {
  id: string;
  businessId: string | null;
  name: string;
  rate: number;
  description: string | null;
  isSystemDefault: boolean;
  amount: number;
}

export interface InvoicePreviewCurrency {
  code: string;
  symbol: string;
  name: string;
  countries: string[];
  decimals: number;
  isActive: boolean;
}

export interface InvoicePreviewTerms {
  id: string;
  title: string;
  description: string | null;
}

export interface InvoicePreviewPaymentInstruction {
  id: string;
  method: string;
  fields: Record<string, string>;
}

export interface InvoicePreviewAsset {
  id: string;
  businessId: string;
  name: string;
  imageUrl: string | null;
  description: string | null;
}

export interface InvoicePreviewHeaderBackground {
  type: HeaderBackgroundType;
  colorHex: string | null;
  themeType: string | null;
  alpha: number | null;
  overlayAlpha: number | null;
  themeOverlayHex: string | null;
  imageOverlayHex: string | null;
  imageAlpha: number | null;
  imageUrl: string | null;
  imageScaleType: ImageScaleType | null;
}

export interface InvoicePreviewTemplate {
  id: string;
  templateStyle: number;
  templateName: string;
  isSystemDefault: boolean;
  isCustom: boolean;
  color: string | null;
  showBusinessLogo: boolean;
  showInvoiceMeta: boolean;
  showTitle: boolean;
  showSender: boolean;
  senderSoftWrapText: boolean;
  showReceiver: boolean;
  receiverSoftWrapText: boolean;
  showPayment: boolean;
  showNotes: boolean;
  showSignature: boolean;
  showStamp: boolean;
  showTerms: boolean;
  showTotal: boolean;
  showItemTable: boolean;
  itemTableHeaderAlignment: TableAlignment;
  itemTableBodyAlignment: TableAlignment;
  headerBackground: InvoicePreviewHeaderBackground;
  backgroundImageUrl: string | null;
  backgroundOpacity: number | null;
}

export interface InvoicePreviewDiscount {
  type: DiscountType;
  value: number;
  amount: number;
}

export interface InvoicePreviewTotals {
  subtotal: number;
  discountAmount: number;
  discountedSubtotal: number;
  taxAmount: number;
  shippingCost: number;
  total: number;
  totalPaid: number;
  balanceDue: number;
}

export interface InvoicePreviewPayment {
  id: string;
  paymentId: string;
  amountApplied: number;
  appliedDate: string;
  paymentNumber: string | null;
  referenceNumber: string | null;
}

export interface InvoicePreviewTranslations {
  senderHeader: string;
  receiverHeader: string;
  title: string;
  metaHeader: string;
  invoiceNumberLabel: string;
  issueDateLabel: string;
  dueDateLabel: string;
  poNumberLabel: string;
  subtotalLabel: string;
  discountLabel: string;
  taxLabel: string;
  shippingLabel: string;
  totalLabel: string;
  termsHeader: string;
  paymentHeader: string;
  itemDescriptionHeader: string;
  itemQtyHeader: string;
  itemPriceHeader: string;
  itemDiscountHeader: string;
  itemTaxHeader: string;
  itemAmountHeader: string;
}

export interface InvoicePreviewDocument {
  invoice: InvoicePreviewInvoice;
  business: InvoicePreviewBusiness;
  client: InvoicePreviewClient | null;
  lineItems: InvoicePreviewLineItem[];
  discount: InvoicePreviewDiscount | null;
  tax: InvoicePreviewTax | null;
  totals: InvoicePreviewTotals;
  currency: InvoicePreviewCurrency;
  payments: InvoicePreviewPayment[];
  paymentInstruction: InvoicePreviewPaymentInstruction | null;
  terms: InvoicePreviewTerms | null;
  template: InvoicePreviewTemplate;
  signature: InvoicePreviewAsset | null;
  stamp: InvoicePreviewAsset | null;
  translations: InvoicePreviewTranslations;
}

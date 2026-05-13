import type {
  InvoicePreviewDocument,
  InvoicePreviewLineItem,
} from "@/features/invoice-preview/types/invoice-preview.types";

const INVOICE_ID = "550e8400-e29b-41d4-a716-446655440000";
const BUSINESS_ID = "660e8400-e29b-41d4-a716-446655440000";
const CLIENT_ID = "770e8400-e29b-41d4-a716-446655440000";
const TAX_ID = "dd0e8400-e29b-41d4-a716-446655440000";
const ITEM_TAX_ID = "aa0e8400-e29b-41d4-a716-446655440000";
const ITEM_UNIT_ID = "bb0e8400-e29b-41d4-a716-446655440000";
const ITEM_CAT_SERVICE_ID = "cc0e8400-e29b-41d4-a716-446655440000";
const ITEM_CAT_QA_ID = "cc0e8400-e29b-41d4-a716-446655440001";
const ITEM_COUNT = 62;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

interface ItemTemplate {
  name: string;
  description: string;
  unitPrice: number;
  quantity: number;
  discountPercent: number;
  categoryId: string;
  categoryName: string;
}

const itemTemplates: ItemTemplate[] = [
  {
    name: "Web Development",
    description: "Full-stack web application development",
    unitPrice: 150,
    quantity: 10,
    discountPercent: 5,
    categoryId: ITEM_CAT_SERVICE_ID,
    categoryName: "Services",
  },
  {
    name: "UI/UX Design",
    description: "Wireframes, visual design and interaction patterns",
    unitPrice: 85,
    quantity: 18,
    discountPercent: 0,
    categoryId: ITEM_CAT_SERVICE_ID,
    categoryName: "Services",
  },
  {
    name: "QA Testing",
    description: "Manual and automated test cycles",
    unitPrice: 60,
    quantity: 12,
    discountPercent: 0,
    categoryId: ITEM_CAT_QA_ID,
    categoryName: "Quality Assurance",
  },
  {
    name: "API Integration",
    description: "Third-party API integration and webhook setup",
    unitPrice: 110,
    quantity: 15,
    discountPercent: 10,
    categoryId: ITEM_CAT_SERVICE_ID,
    categoryName: "Services",
  },
  {
    name: "Cloud Deployment",
    description: "Production rollout and infrastructure setup",
    unitPrice: 95,
    quantity: 8,
    discountPercent: 0,
    categoryId: ITEM_CAT_SERVICE_ID,
    categoryName: "Services",
  },
  {
    name: "Performance Tuning",
    description: "Optimization of API/database response times",
    unitPrice: 120,
    quantity: 7,
    discountPercent: 5,
    categoryId: ITEM_CAT_SERVICE_ID,
    categoryName: "Services",
  },
  {
    name: "Technical Documentation",
    description: "Architecture and handover documentation",
    unitPrice: 70,
    quantity: 9,
    discountPercent: 0,
    categoryId: ITEM_CAT_SERVICE_ID,
    categoryName: "Services",
  },
];

const generatedLineItems: InvoicePreviewLineItem[] = Array.from({ length: ITEM_COUNT }, (_, index) => {
  const template = itemTemplates[index % itemTemplates.length];
  const quantity = template.quantity + (index % 3);
  const unitPrice = template.unitPrice + (index % 4) * 2;
  const discountPercent = template.discountPercent;
  const netPrice = round2(unitPrice * (1 - discountPercent / 100));
  const discountAmount = round2(unitPrice * quantity * discountPercent / 100);
  const subtotal = round2(unitPrice * quantity - discountAmount);
  const taxAmount = round2(subtotal * 8.5 / 100);
  const total = round2(subtotal + taxAmount);
  const idSuffix = String(index).padStart(3, "0");

  return {
    id: `880e8400-e29b-41d4-a716-44665544${idSuffix}`,
    invoiceId: INVOICE_ID,
    productId: `990e8400-e29b-41d4-a716-44665544${idSuffix}`,
    position: index + 1,
    quantity,
    name: template.name,
    unitPrice: round2(unitPrice),
    netPrice,
    discountValue: discountPercent > 0 ? discountPercent : null,
    discountAmount,
    discountType: discountPercent > 0 ? ("PERCENTAGE" as const) : null,
    taxAmount,
    subtotal,
    total,
    description: template.description,
    categoryId: template.categoryId,
    unitTypeId: ITEM_UNIT_ID,
    taxId: ITEM_TAX_ID,
    dateCreated: "2026-03-12T10:30:00Z",
    dateUpdated: "2026-03-12T10:30:00Z",
    dateDeleted: null,
    isDeleted: false,
    isSynced: true,
    tax: {
      id: ITEM_TAX_ID,
      name: "State Tax",
      rate: 8.5,
    },
    unitType: {
      id: ITEM_UNIT_ID,
      name: "Hours",
    },
    category: {
      id: template.categoryId,
      name: template.categoryName,
    },
  };
});

const subtotal = round2(
  generatedLineItems.reduce((sum, item) => sum + item.netPrice * item.quantity, 0),
);
const discountPercent = 10;
const discountAmount = round2(subtotal * (discountPercent / 100));
const discountedSubtotal = round2(subtotal - discountAmount);
const taxRate = 8;
const taxAmount = round2(discountedSubtotal * (taxRate / 100));
const shippingCost = 45;
const totalAmount = round2(discountedSubtotal + taxAmount + shippingCost);
const totalPaid = 1500;
const balanceDue = round2(totalAmount - totalPaid);

export const dummyInvoice: InvoicePreviewDocument = {
  invoice: {
    id: INVOICE_ID,
    customerId: CLIENT_ID,
    invoiceNumber: "INV-2026-03-001",
    invoiceDate: "2026-03-12T00:00:00Z",
    dueDate: "2026-03-19T00:00:00Z",
    poNumber: "PO-12345",
    subtotal,
    discountAmount,
    taxAmount,
    shippingCost,
    totalAmount,
    invoiceStatus: "SENT",
    discountType: "PERCENTAGE",
    discountValue: discountPercent,
    description: null,
    taxId: TAX_ID,
    termsId: "220e8400-e29b-41d4-a716-446655440000",
    paymentMethodId: "110e8400-e29b-41d4-a716-446655440000",
    notes: "Thank you for your business. We appreciate your continued trust in our team.",
    templateId: "00000000-0000-0000-0001-000000000001",
    signatureId: "330e8400-e29b-41d4-a716-446655440000",
    stampId: "440e8400-e29b-41d4-a716-446655440000",
    language: "en",
    signatureOffset: { x: 0.6, y: 0.65 },
    stampOffset: { x: 0.81, y: 0.65 },
    signatureScale: 0.168,
    stampScale: 0.168,
    dateCreated: "2026-03-12T10:30:00Z",
    dateUpdated: "2026-03-12T10:30:00Z",
    dateSent: "2026-03-12T10:31:00Z",
    dateDeleted: null,
    isDeleted: false,
    isSynced: true,
  },
  business: {
    id: BUSINESS_ID,
    name: "Acme Digital Solutions LLC",
    shortName: "Acme",
    logoUrl: "/logo.png",
    licenseNumber: "LLC-12345",
    businessNumber: "BN-67890",
    category: "Technology Services",
    phone: "+1-555-0100",
    email: "billing@acmedigital.com",
    website: "https://acmedigital.com",
    addressLineOne: "123 Business St",
    addressLineTwo: "Suite 100",
    city: "San Francisco",
    state: "CA",
    zipCode: "94105",
    country: "United States",
  },
  client: {
    id: CLIENT_ID,
    businessId: BUSINESS_ID,
    fullName: "John Smith",
    email: "john@smithindustries.com",
    phone: "+1-555-0200",
    addressLineOne: "456 Client Ave",
    addressLineTwo: "Floor 5",
    city: "Los Angeles",
    state: "CA",
    zipCode: "90001",
    country: "United States",
    companyName: "Smith Industries",
    clientIdNumber: "CL-001",
    fax: "+1-555-0201",
    currencyCode: "USD",
  },
  lineItems: generatedLineItems,
  discount: {
    type: "PERCENTAGE",
    value: discountPercent,
    amount: discountAmount,
  },
  tax: {
    id: TAX_ID,
    businessId: BUSINESS_ID,
    name: "Sales Tax",
    rate: taxRate,
    description: "State level service tax",
    isSystemDefault: true,
    amount: taxAmount,
  },
  totals: {
    subtotal,
    discountAmount,
    discountedSubtotal,
    taxAmount,
    shippingCost,
    total: totalAmount,
    totalPaid,
    balanceDue,
  },
  currency: {
    code: "USD",
    symbol: "$",
    name: "US Dollar",
    countries: ["United States"],
    decimals: 2,
    isActive: true,
  },
  payments: [
    {
      id: "ee0e8400-e29b-41d4-a716-446655440000",
      paymentId: "ff0e8400-e29b-41d4-a716-446655440000",
      amountApplied: totalPaid,
      appliedDate: "2026-03-10T00:00:00Z",
      paymentNumber: "PAY-001",
      referenceNumber: "REF-123",
    },
  ],
  paymentInstruction: {
    id: "110e8400-e29b-41d4-a716-446655440000",
    method: "Bank Transfer",
    fields: {
      "Bank Name": "Chase Bank",
      "Account Name": "Acme Digital Solutions LLC",
      "Account Number": "****1234",
      "Routing Number": "021000021",
      SWIFT: "CHASUS33",
    },
  },
  terms: {
    id: "220e8400-e29b-41d4-a716-446655440000",
    title: "Payment Terms",
    description:
      "Payment is due within 7 days of invoice date. Late payments incur a 1.5% monthly service charge.",
  },
  template: {
    id: "00000000-0000-0000-0001-000000000001",
    templateStyle: 1,
    templateName: "Classic Professional",
    isSystemDefault: true,
    isCustom: false,
    color: "#2563EB",
    showBusinessLogo: true,
    showInvoiceMeta: true,
    showTitle: true,
    showSender: true,
    senderSoftWrapText: false,
    showReceiver: true,
    receiverSoftWrapText: false,
    showPayment: true,
    showNotes: true,
    showSignature: true,
    showStamp: true,
    showTerms: true,
    showTotal: true,
    showItemTable: true,
    itemTableHeaderAlignment: "Left",
    itemTableBodyAlignment: "Left",
    headerBackground: {
      type: "THEME",
      colorHex: null,
      themeType: "PRIMARY_VARIANT",
      alpha: 1,
      overlayAlpha: 0.25,
      themeOverlayHex: null,
      imageOverlayHex: null,
      imageAlpha: null,
      imageUrl: null,
      imageScaleType: null,
    },
    backgroundImageUrl: null,
    backgroundOpacity: null,
  },
  signature: {
    id: "330e8400-e29b-41d4-a716-446655440000",
    businessId: BUSINESS_ID,
    name: "CEO Signature",
    imageUrl: "https://dummyimage.com/260x90/ffffff/111827.png&text=Signature",
    description: "Authorized signature",
  },
  stamp: {
    id: "440e8400-e29b-41d4-a716-446655440000",
    businessId: BUSINESS_ID,
    name: "Company Stamp",
    imageUrl: "https://dummyimage.com/200x120/ffffff/d11d48.png&text=Stamp",
    description: "Official stamp",
  },
  translations: {
    senderHeader: "From",
    receiverHeader: "To",
    title: "Invoice",
    metaHeader: "Invoice Details",
    invoiceNumberLabel: "Invoice #",
    issueDateLabel: "Issue Date",
    dueDateLabel: "Due Date",
    poNumberLabel: "P.O #",
    subtotalLabel: "Subtotal",
    discountLabel: "Discount",
    taxLabel: "Tax",
    shippingLabel: "Shipping",
    totalLabel: "Total",
    termsHeader: "Terms & Conditions",
    paymentHeader: "Payment Instructions",
    itemDescriptionHeader: "Description",
    itemQtyHeader: "Qty",
    itemPriceHeader: "Price",
    itemDiscountHeader: "Disc",
    itemTaxHeader: "Tax",
    itemAmountHeader: "Amount",
  },
};

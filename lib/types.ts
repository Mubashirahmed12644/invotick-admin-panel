export type UUID = string;

export type UserMapLocation = {
  id: string;
  username: string;
  email: string;
  latitude: number;
  longitude: number;
  country?: string | null;
  city?: string | null;
};
export type LocalDate = string;
export type LocalDateTime = string;
export type Decimal = number;

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
}

export interface AuthUser {
  id: UUID;
  email: string;
  username: string | null;
  phoneNumber: string | null;
  profilePictureUrl: string | null;
  role: string;
  isEmailVerified: boolean;
  isActive?: boolean;
  lastLoginAt?: LocalDateTime | null;
  createdAt?: LocalDateTime | null;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
  message?: string;
  preferences?: Record<string, unknown>;
  state?: Record<string, unknown>;
}

export interface LoginRequest {
  email: string;
  password: string;
}

/** Step 1 of admin login. When otpRequired, a code was emailed; call verifyAdminOtp next. */
export interface AdminLoginResponse {
  otpRequired: boolean;
  email: string;
  message: string;
  auth?: AuthResponse;
}

export interface AdminVerifyOtpRequest {
  email: string;
  otp: string;
}

export interface WebpanelUserActivityStats {
  overallLastActivityAt: LocalDateTime | null;
}

export interface WebpanelUserCountsStats {
  businesses: number;
  clients: number;
  invoices: number;
  invoicesByStatus: Record<string, number>;
  invoiceSynced: number;
  payments: number;
  expenses: number;
  expenseSynced: number;
  inventoryItems: number;
  merchants: number;
  templates: number;
  templatesSaved: number;
  templatesCustom: number;
  paymentInstructions: number;
  taxes: number;
  terms: number;
  headers: number;
  backgrounds: number;
  signatures: number;
  stamps: number;
  itemCategories: number;
  unitTypes: number;
}

export interface WebpanelUserTotalsStats {
  invoiceTotalAmount: Decimal;
  paymentTotalAmount: Decimal;
  expenseTotalAmount: Decimal;
}

export interface WebpanelUserLastUpdatedAtStats {
  businesses: LocalDateTime | null;
  clients: LocalDateTime | null;
  invoices: LocalDateTime | null;
  payments: LocalDateTime | null;
  expenses: LocalDateTime | null;
  inventoryItems: LocalDateTime | null;
  merchants: LocalDateTime | null;
  templates: LocalDateTime | null;
  paymentInstructions: LocalDateTime | null;
  taxes: LocalDateTime | null;
  terms: LocalDateTime | null;
  headers: LocalDateTime | null;
  backgrounds: LocalDateTime | null;
  signatures: LocalDateTime | null;
  stamps: LocalDateTime | null;
  itemCategories: LocalDateTime | null;
  unitTypes: LocalDateTime | null;
}

export interface WebpanelUserStatsSection {
  activity: WebpanelUserActivityStats;
  counts: WebpanelUserCountsStats;
  totals: WebpanelUserTotalsStats;
  lastUpdatedAt: WebpanelUserLastUpdatedAtStats;
}

export interface WebpanelUserStatsSummary {
  lastLoginAt: LocalDateTime | null;
  allTime: WebpanelUserStatsSection;
  last30Days: WebpanelUserStatsSection;
}

export interface WebpanelUserWithStatsResponse {
  id: UUID;
  email: string;
  username: string | null;
  phoneNumber: string | null;
  profilePictureUrl: string | null;
  role: string;
  isEmailVerified: boolean;
  isActive: boolean;
  createdAt: LocalDateTime | null;
  stats: WebpanelUserStatsSummary;
}

export interface WebpanelUserAnalyticsLocation {
  country: string | null;
  city: string | null;
  sessionCount: number;
  firstSeenAt: LocalDateTime | null;
  lastSeenAt: LocalDateTime | null;
  deviceIds: string[];
  appVersions: string[];
  platforms: string[];
}

export interface WebpanelUserAnalyticsDevice {
  deviceId: string | null;
  appInstanceIds: string[];
  deviceModels: string[];
  manufacturers: string[];
  deviceClasses: string[];
  platforms: string[];
  osVersions: string[];
  appVersions: string[];
  languages: string[];
  countries: string[];
  cities: string[];
  networkTypes: string[];
  screenSizes: string[];
  sessionCount: number;
  firstSeenAt: LocalDateTime | null;
  lastSeenAt: LocalDateTime | null;
}

export interface WebpanelUserAnalyticsAppVersion {
  appVersion: string | null;
  sessionCount: number;
  firstSeenAt: LocalDateTime | null;
  lastSeenAt: LocalDateTime | null;
  deviceIds: string[];
  deviceModels: string[];
  manufacturers: string[];
  deviceClasses: string[];
  platforms: string[];
  osVersions: string[];
  countries: string[];
  cities: string[];
  appInstanceIds: string[];
}

export interface WebpanelUserAnalyticsEvent {
  eventName: string | null;
  count: number;
  firstSeenAt: LocalDateTime | null;
  lastSeenAt: LocalDateTime | null;
  screenNames: string[];
  screenClasses: string[];
  previousScreens: string[];
  itemIds: string[];
  itemNames: string[];
  sessionIds: string[];
  appInstanceIds: string[];
}

export interface WebpanelUserAnalyticsProperty {
  propertyName: string | null;
  values: string[];
  appInstanceIds: string[];
  count: number;
  firstSetAt: LocalDateTime | null;
  lastSetAt: LocalDateTime | null;
}

export interface WebpanelUserAnalyticsSummary {
  totalSessions: number;
  totalEvents: number;
  totalUserProperties: number;
  totalDistinctDevices: number;
  totalDistinctLocations: number;
  totalDistinctAppVersions: number;
  firstSeenAt: LocalDateTime | null;
  lastSeenAt: LocalDateTime | null;
  locations: WebpanelUserAnalyticsLocation[];
  devices: WebpanelUserAnalyticsDevice[];
  appVersions: WebpanelUserAnalyticsAppVersion[];
  events: WebpanelUserAnalyticsEvent[];
  userProperties: WebpanelUserAnalyticsProperty[];
}

export interface WebpanelUserIpSummary {
  address: string | null;
  country: string | null;
  countryCode: string | null;
  region: string | null;
  city: string | null;
  zip: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  isp: string | null;
  org: string | null;
  asn: string | null;
  isProxy: boolean | null;
  isVpn: boolean | null;
  isMobile: boolean | null;
  isHosting: boolean | null;
  currency: string | null;
  callingCode: string | null;
  language: string | null;
  lastFetchedAt: LocalDateTime | null;
}

export interface WebpanelUserWithStatsAndAnalyticsResponse extends WebpanelUserWithStatsResponse {
  analytics: WebpanelUserAnalyticsSummary | null;
  ip: WebpanelUserIpSummary | null;
}

export type WebpanelUserStatsAndAnalyticsByUserIdResponse =
  WebpanelUserWithStatsAndAnalyticsResponse;

export interface WebpanelTestingDeviceResponse {
  deviceId: string;
}

export interface WebpanelTestingDeviceLookupResponse {
  deviceId: string;
  isTestingDevice: boolean;
}

export interface AppFlowTimelineEvent {
  eventName: string;
  screenName: string | null;
  timestamp: string;
  gapSec: number;
}

export interface AppFlowTimelineSession {
  sessionId: string;
  startTime: string;
  endTime: string | null;
  totalEvents: number;
  events: AppFlowTimelineEvent[];
}

export interface AppFlowTimelineResponse {
  deviceId: string | null;
  userId: string | null;
  appVersion: string | null;
  from: string | null;
  to: string | null;
  totalSessions: number;
  totalEvents: number;
  sessions: AppFlowTimelineSession[];
}

export interface WebpanelUserResponse {
  id: UUID;
  email: string;
  username: string | null;
  phoneNumber: string | null;
  profilePictureUrl: string | null;
  role: string;
  isEmailVerified: boolean;
  isActive: boolean;
  createdAt: LocalDateTime | null;
}

export type InvoiceStatus =
  | "DRAFT"
  | "SENT"
  | "PAID"
  | "PENDING"
  | "PARTIALLY_PAID"
  | "PARTIAL"
  | "OVERDUE"
  | "CANCELLED"
  | string;

export interface WebpanelUserStatsResponse {
  userId: UUID;
  email?: string | null;
  username?: string | null;
  role?: string;
  isEmailVerified?: boolean;
  isActive?: boolean;
  createdAt?: LocalDateTime | null;
  lastLoginAt?: LocalDateTime | null;
  allTime?: WebpanelUserStatsSection;
  last30Days?: WebpanelUserStatsSection;
}

export interface WebpanelInvoiceSummaryResponse {
  id: UUID;
  userId: UUID;
  clientId: UUID | null;
  clientName: string | null;
  invoiceNumber: string | null;
  invoiceDate: LocalDate | null;
  dueDate: LocalDate | null;
  totalAmount: Decimal | null;
  currency: string | null;
  status: InvoiceStatus;
  isSynced: boolean;
  isDeleted: boolean;
  publicCode: string | null;
  createdAt: LocalDateTime | null;
  updatedAt: LocalDateTime | null;
}

export interface PublicInvoiceRedirectResponse {
  userId: UUID;
  invoiceId: UUID;
}

export interface WebpanelInventoryItemResponse {
  id: UUID;
  userId: UUID;
  name: string;
  description: string | null;
  unitPrice: Decimal;
  netPrice: Decimal;
  discount: Decimal | null;
  discountType: string | null;
  taxId: UUID | null;
  unitTypeId: UUID | null;
  itemCategoryId: UUID | null;
  isDeleted: boolean;
  createdAt: LocalDateTime | null;
  updatedAt: LocalDateTime | null;
  deletedAt: LocalDateTime | null;
}

export interface InvoiceItemResponse {
  id: UUID;
  userId: UUID;
  invoiceId: UUID | null;
  inventoryItemId: UUID;
  taxId: UUID | null;
  unitTypeId: UUID | null;
  itemCategoryId: UUID | null;
  name: string;
  description: string | null;
  quantity: Decimal;
  unitPrice: Decimal;
  netPrice: Decimal;
  discountValue: Decimal | null;
  discountAmount: Decimal;
  discountType: string | null;
  taxRate: Decimal | null;
  taxAmount: Decimal | null;
  taxType: string | null;
  subtotal: Decimal | null;
  total: Decimal | null;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  lastModifyBy: UUID | null;
}

export interface InvoiceDetailResponse {
  id: UUID;
  userId: UUID;
  businessId: UUID | null;
  invoiceNumber: string;
  poNumber: string | null;
  invoiceDate: LocalDate;
  dueDate: LocalDate;
  subtotal: Decimal;
  discountAmount: Decimal;
  taxAmount: Decimal;
  shippingCost: Decimal;
  totalAmount: Decimal;
  status: InvoiceStatus;
  discountType: string | null;
  discountValue: Decimal;
  description: string | null;
  taxRate: Decimal | null;
  taxType: string | null;
  notes: string | null;
  currency: string;
  language: string | null;
  signatureOffset: string | null;
  stampOffset: string | null;
  signatureScale: string | null;
  stampScale: string | null;
  dateSent: LocalDateTime | null;
  createdAt: LocalDateTime;
  updatedAt: LocalDateTime;
  isSynced: boolean;
  isDeleted: boolean;
  dateDeleted: string | null;
  version: number;
  lastModifyBy: UUID | null;
  clientId: UUID;
  taxId: UUID | null;
  termsId: UUID | null;
  paymentInstructionId: UUID | null;
  templateId: UUID | null;
  signatureId: UUID | null;
  stampId: UUID | null;
  items: InvoiceItemResponse[];
}

export interface ClientResponse {
  id: UUID;
  businessId: UUID;
  name: string;
  credit: Decimal;
  currencyCode: string | null;
  emailAddress: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  zipcode: string | null;
  country: string | null;
  companyName: string | null;
  clientId: string | null;
  faxNumber: string | null;
  additionalNotes: string | null;
  rating: number | null;
  openingBalance: Decimal;
  isDeleted: boolean;
  createdAt: LocalDateTime;
  updatedAt: LocalDateTime;
  deletedAt: LocalDateTime | null;
}

export interface BusinessResponse {
  id: UUID;
  userId: UUID | null;
  name: string;
  logo: string | null;
  shortName: string | null;
  licenseNumber: string | null;
  businessNumber: string | null;
  phone: string | null;
  emailAddress: string | null;
  website: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  zipcode: string | null;
  country: string | null;
  currencyCode: string | null;
  isDeleted: boolean;
  createdAt: LocalDateTime;
  updatedAt: LocalDateTime;
  deletedAt: LocalDateTime | null;
}

export interface TaxResponse {
  id: UUID;
  userId: UUID;
  businessId: UUID;
  name: string;
  rate: Decimal;
  type: string | null;
  description: string | null;
  isDeleted: boolean;
  isSystemDefault: boolean;
  createdAt: LocalDateTime;
  updatedAt: LocalDateTime;
  deletedAt: LocalDateTime | null;
  version: number;
  lastModifyBy: UUID | null;
}

export interface TermsResponse {
  id: UUID;
  businessId: UUID;
  title: string;
  description: string | null;
  isDeleted: boolean;
  createdAt: LocalDateTime;
  updatedAt: LocalDateTime;
  deletedAt: LocalDateTime | null;
}

export interface PaymentInstructionResponse {
  id: UUID;
  userId: UUID;
  businessId: UUID;
  fieldsJson: string;
  description: string | null;
  method: string | null;
  isDeleted: boolean;
  isSystemDefault: boolean;
  createdAt: LocalDateTime;
  updatedAt: LocalDateTime;
  deletedAt: LocalDateTime | null;
  version: number;
  lastModifyBy: UUID | null;
}

export interface TemplateResponse {
  id: UUID;
  userId: UUID;
  businessId: UUID;
  parentTemplate: UUID | null;
  templateName: string;
  templateImage: string | null;
  templateStyle: number;
  isCustom: boolean;
  isSaved: boolean;
  color: string | null;
  headerAlpha: number;
  backgroundOpacity: number;
  description: string | null;
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
  showItemsTable: boolean;
  itemTableHeaderAlignment: string | null;
  itemTableBodyAlignment: string | null;
  signatureOffset: string | null;
  stampOffset: string | null;
  signatureScale: string | null;
  stampScale: string | null;
  isDeleted: boolean;
  isSystemDefault: boolean;
  createdAt: LocalDateTime;
  updatedAt: LocalDateTime;
  deletedAt: LocalDateTime | null;
  version: number;
  lastModifyBy: UUID | null;
  headerId: UUID | null;
  backgroundId: UUID | null;
  signatureId: UUID | null;
  stampId: UUID | null;
}

export interface HeaderResponse {
  id: UUID;
  businessId: UUID;
  name: string;
  image: string | null;
  description: string | null;
  isCustom: boolean;
  backgroundType: string;
  colorHex: string | null;
  themeType: string | null;
  themeAlpha: number | null;
  themeOverlayHex: string | null;
  themeOverlayAlpha: number | null;
  imageAlpha: number | null;
  imageScaleType: string | null;
  imageOverlayHex: string | null;
  imageOverlayAlpha: number | null;
  isDeleted: boolean;
  createdAt: LocalDateTime;
  updatedAt: LocalDateTime;
  deletedAt: LocalDateTime | null;
}

export interface BackgroundResponse {
  id: UUID;
  businessId: UUID;
  name: string;
  image: string | null;
  description: string | null;
  isCustom: boolean;
  isDeleted: boolean;
  createdAt: LocalDateTime;
  updatedAt: LocalDateTime;
  deletedAt: LocalDateTime | null;
}

export interface SignatureResponse {
  id: UUID;
  businessId: UUID;
  name: string;
  image: string | null;
  isDeleted: boolean;
  createdAt: LocalDateTime;
  updatedAt: LocalDateTime;
  deletedAt: LocalDateTime | null;
}

export interface StampResponse {
  id: UUID;
  businessId: UUID;
  name: string;
  image: string | null;
  description: string | null;
  isCustom: boolean;
  isDeleted: boolean;
  createdAt: LocalDateTime;
  updatedAt: LocalDateTime;
  deletedAt: LocalDateTime | null;
}

export interface WebpanelInvoiceFullResponse {
  invoice: InvoiceDetailResponse;
  business: BusinessResponse;
  client: ClientResponse;
  tax: TaxResponse | null;
  terms: TermsResponse | null;
  paymentInstruction: PaymentInstructionResponse | null;
  template: TemplateResponse | null;
  header: HeaderResponse | null;
  background: BackgroundResponse | null;
  signature: SignatureResponse | null;
  stamp: StampResponse | null;
}

// ── Funnel Analysis ────────────────────────────────────────────────────────

export type FunnelMode = "STRICT" | "ORDERED" | "ANY_ORDER";
export type FunnelBy = "SCREEN" | "EVENT";

export interface FunnelQueryRequest {
  steps: string[];
  funnelBy?: FunnelBy;
  mode?: FunnelMode;
  from?: string;
  to?: string;
  maxStepDurationMinutes?: number;
  platform?: string;
  appVersion?: string;
  osVersion?: string;
  country?: string;
  city?: string;
}

export interface FunnelFilters {
  from: string;
  to: string;
  mode: FunnelMode;
  funnelBy: FunnelBy;
  maxStepDurationMinutes: number | null;
  platform: string | null;
  appVersion: string | null;
  osVersion: string | null;
  country: string | null;
  city: string | null;
}

export interface FunnelStepResult {
  step: number;
  name: string;
  sessions: number;
  users: number;
  dropOffSessions: number;
  dropOffUsers: number;
  conversionFromFirst: number;
  conversionFromPrevious: number;
  avgSecondsFromPreviousStep: number | null;
}

export interface FunnelQueryResponse {
  totalSessions: number;
  totalUsers: number;
  filters: FunnelFilters;
  steps: FunnelStepResult[];
}

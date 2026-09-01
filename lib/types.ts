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

export interface ApiTokenResponse {
  token: string;
  jti: string;
  expiresAt: string;
  expiryDays: number;
}

export interface ActiveUser {
  userId: string;
  email: string | null;
  invotickId: string | null;
  role: string | null;
  country: string | null;
  countryCode: string | null;
  lastEventAt: string;
  /** What the device last reported. Null for a build old enough to have sent neither. */
  appVersion: string | null;
  appVersionCode: number | null;
  /** "release" or "debug". */
  buildType: string | null;
  recentEventCount: number;
}

/**
 * The user list plus what it is a part of.
 *
 * The array alone could not say it had been cut: asking for 200 out of 999 returned 199, and the
 * header read "199 active" as though that were the population rather than the page size.
 */
export interface ActiveUsersPage {
  users: ActiveUser[];
  total: number;
  truncated: boolean;
  /** Users with no build type reported, hidden by the build filter. Null when no filter is on. */
  hiddenWithoutBuildType: number | null;
}

/**
 * One event name and how much of it arrived — a row of the reporting table under the live feed.
 *
 * `eventName` is the RAW name the app sends, not the display name shown in the feed. The two
 * differ (`sync_failed` is displayed as "sync failure"), and grepping the app for the displayed
 * one finds nothing — so this table shows the raw name and says so in the header.
 */
export interface EventSummaryRow {
  eventName: string;
  events: number;
  users: number;
  devices: number;
  perDevice: number;
  lastAt: string;
}

/** One value a parameter carried, and how much of the event it accounts for. */
export interface ParamValue {
  /** "(absent)" when the event was sent without this key at all — usually the finding. */
  value: string;
  events: number;
  users: number;
  share: number;
}

/** One parameter of an event, broken down by the values it carried. */
export interface EventParam {
  key: string;
  /** -1 when the value list was cut, because the real count was not measured past the cap. */
  distinctValues: number;
  values: ParamValue[];
  truncated: boolean;
}

/** The drill-down behind one row of the events table. */
export interface EventDetail {
  eventName: string;
  events: number;
  users: number;
  devices: number;
  params: EventParam[];
}

/** One rung of the ladder from opening the app to saving a first invoice. */
export interface JourneyStep {
  step: number;
  label: string;
  /** People who got at least this far. */
  reached: number;
  /** People whose furthest point was exactly this. */
  stoppedHere: number;
  share: number;
}

export interface JourneyUser {
  userId: string;
  invotickId: string | null;
  country: string | null;
  step: number;
  stoppedAt: string;
  events: number;
  firstAt: string;
  lastAt: string;
}

/** Where first-time users stop on the way to their first invoice. */
export interface JourneyReport {
  firstTimeUsers: number;
  createdInvoice: number;
  steps: JourneyStep[];
  users: JourneyUser[];
}

export interface EventSummaryPage {
  rows: EventSummaryRow[];
  /** Across every name, not just the rows drawn — a share against a partial total is a lie. */
  totalEvents: number;
  distinctNames: number;
}

/** One app version seen reporting in the window — the options for the version picker. */
export interface AppVersion {
  appVersion: string | null;
  appVersionCode: number;
  buildType: string | null;
  users: number;
  /** Distinct installs behind `users`. Lower whenever guest identities churn on one device. */
  devices: number;
  events: number;
  lastEventAt: string;
}

export interface LiveEvent {
  id: string | null;
  eventName: string;
  screenName: string | null;
  previousScreen: string | null;
  sessionId: string | null;
  itemName: string | null;
  eventTimestamp: string;
  createdAt: string;
  params: Record<string, unknown> | null;
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

export interface WebpanelCurrencyTotal {
  currency: string;
  amount: Decimal;
  invoices: number;
}

export interface WebpanelUserTotalsStats {
  invoiceTotalAmount: Decimal;
  paymentTotalAmount: Decimal;
  expenseTotalAmount: Decimal;
  /**
   * The invoice total split by the currency each invoice is actually in.
   *
   * invoiceTotalAmount adds them all together whatever currency they are in — for the 120 users who
   * bill in more than one, that is not a wrong figure so much as a meaningless one. This is the same
   * data without the assumption, and it needs no exchange rate.
   */
  invoiceTotalsByCurrency?: WebpanelCurrencyTotal[];
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
  /**
   * The build number. Prefer this over `appVersion` whenever releases are compared or ordered:
   * "1.4.10" sorts below "1.4.9" as a string, so a name-based comparison is right for nine
   * releases and then silently wrong.
   */
  appVersionCode?: number;
  osVersion?: string;
  country?: string;
  city?: string;
}

/** Values the funnel can be split by, read from the events themselves. */
export interface FunnelVersionOption {
  /** What the query filters on and what sorts. */
  code: number;
  /** Only ever shown. */
  name?: string | null;
}

export interface FunnelCountryOption {
  country: string;
  /** How many events carry it, so the list can lead with where the users are. */
  events: number;
}

export interface FunnelDimensions {
  versions: FunnelVersionOption[];
  countries: FunnelCountryOption[];
}

export interface FunnelFilters {
  from: string;
  to: string;
  mode: FunnelMode;
  funnelBy: FunnelBy;
  maxStepDurationMinutes: number | null;
  platform: string | null;
  appVersion: string | null;
  appVersionCode: number | null;
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

/**
 * One distinct sync defect, aggregated across everyone hitting it.
 *
 * `signature` groups by what is broken (entity + field + error), not by who hit it, so a single
 * bug affecting hundreds of devices reads as one ranked line instead of hundreds of errors.
 */
export interface SyncHealthSignature {
  signature: string;
  entityType: string;
  field: string | null;
  errorType: string;
  source: string;
  occurrences: number;
  deviceCount: number;
  userCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  // Optional because the page ships independently of the backend that supplies them: a panel
  // deploy that lands first must degrade to the older columns, not crash on a missing field.
  /** The server's own words for the most recent occurrence — usually the whole diagnosis. */
  latestReason?: string | null;
  /** CREATE that keeps being refused = a record that never lands; UPDATE = a lost edit. */
  operations?: string[];
  /** Distinct records affected. Read against `occurrences`: few records, many occurrences = a loop. */
  recordCount?: number;
  worstRecordId?: string | null;
  worstRecordOccurrences?: number;
}

/** Who is actually stuck on one defect. */
export interface SyncHealthOccurrence {
  userId: string | null;
  userEmail?: string | null;
  userRole?: string | null;
  deviceId: string | null;
  appVersion: string | null;
  platform: string | null;
  operation: string | null;
  recordId: string | null;
  reason: string | null;
  occurrenceCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  resolved: boolean;
}

/**
 * How much contact data is held.
 *
 * Contacts come from users' address books, so most of these numbers describe people who never
 * installed the app — which is what makes the size of this store worth watching.
 */
export interface ContactDataStats {
  uniquePhoneNumbers: number;
  userContactLinks: number;
  rawContactRows: number;
  ingestBatches: number;
  registeredPhones: number;
  unmatchedPhoneNumbers: number;
}

/** One held person, as the Contact Data table shows them. */
export interface ContactRow {
  phone: string;
  names: string[];
  emails: string[];
  knownByUsers: number;
  onInvotick: boolean;
  firstSeenAt: string;
}

export interface ContactPage {
  rows: ContactRow[];
  total: number;
  returned: number;
}

/**
 * The paid side of the product, and the two ways it goes wrong.
 *
 * Revenue is not the interesting number here. `heldByGuests` counts people who paid on an account
 * with no email and no password — one wiped device and their purchase is gone, and nothing in the
 * product warns them. The two mismatch counts are the app and the server disagreeing about who has
 * premium, which neither side can see alone.
 */
export interface BillingHealthSummary {
  activeEntitlements: number;
  premiumEnabledInApp: number;
  /** Showing premium with nothing paid for it: a bug, a stale cache, or a modified build. */
  enabledWithoutPayment: number;
  /** Paid and not being honoured — the failure that costs a customer rather than money. */
  paidButNotEnabled: number;
  heldByGuests: number;
  widelyShared: SharedPurchase[];
}

export interface SharedPurchase {
  providerPurchaseId: string;
  productId: string;
  accountBindingCount: number;
  firstSeenAt: string;
}

/**
 * The rates service's status, already judged into `issues` by the backend.
 *
 * Mirrors ExchangeRatesAdminService.Health. `issues` is the point of it: the raw healthcheck stated
 * these facts for sixteen days and nobody read them, so the judging happens server-side and the
 * panel only has to count.
 */
export interface ExchangeRateKey {
  id: number | null;
  provider: string | null;
  status: string | null;
  monthlyQuota: number | null;
  requestCount: number | null;
  usagePercent: number | null;
  lastUsedAt: string | null;
}

export interface ExchangeRateIssue {
  severity: string;
  title: string;
  detail: string;
}

export interface ExchangeRatesHealth {
  reachable: boolean;
  status: string | null;
  frequency: string | null;
  provider: string | null;
  lastFetchAt: string | null;
  rateAgeDays: number | null;
  stale: boolean;
  lastError: string | null;
  lastErrorAt: string | null;
  currencies: number | null;
  keys: ExchangeRateKey[];
  issues: ExchangeRateIssue[];
  monthlyCapacity: number;
  monthlyDemand: number | null;
  monthlyUsed: number | null;
  quotaResetsAt: string | null;
  projectedExhaustionAt: string | null;
  sampleRates: Record<string, number>;
}

/**
 * One health check's answer. Mirrors HealthCentreService.Entry.
 *
 * UNKNOWN is not OK: a check that could not run is a gap in the thing meant to close gaps, and it
 * counts toward `needsAttention` for that reason.
 */
export type HealthStatus = "OK" | "WARNING" | "CRITICAL" | "UNKNOWN";

export interface HealthCheckEntry {
  id: string;
  name: string;
  /** What this check watches, in one line, for a reader who does not already know. */
  purpose: string;
  /** Admin-panel path with the underlying rows, or null when the card is the whole story. */
  detailPath: string | null;
  status: HealthStatus;
  summary: string;
  detail: string | null;
  facts: Record<string, string>;
  /** The command that fixes it. Copied for a human to run — never executed from here. */
  action: HealthAction | null;
  checkedAt: string;
}

export interface HealthAction {
  label: string;
  command: string;
  runOn: string;
}

export interface HealthCentreOverview {
  checks: HealthCheckEntry[];
  critical: number;
  warning: number;
  unknown: number;
  needsAttention: number;
  generatedAt: string;
}

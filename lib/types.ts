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

/** A passkey step's options from the server (decision 0117): the challenge's id, and what to give the browser. */
export interface PasskeyOptions {
  challengeId: string;
  options: { publicKey: Record<string, unknown> };
}

/** One of the admin's own passkeys, as the panel lists them. */
export interface AdminPasskey {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
  /** Synced to the owner's other devices (iCloud Keychain). */
  backedUp: boolean | null;
}

/** One machine this admin signs in to the panel from (decision 0120). */
export interface AdminDevice {
  deviceKey: string;
  label: string;
  isMobile: boolean;
  /** The machine asking. It cannot be signed out from here. */
  current: boolean;
  /** What the request reported. Spoofable today, so it is shown and never used to decide. */
  reportedIp: string | null;
  approximatePlace: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  signedOutAt: string | null;
  successes: number;
  refusals: number;
  activeSessions: number;
}

/** One line of the admin sign-in history (decision 0120). */
export interface AdminSignInEvent {
  at: string;
  kind: string;
  method: string | null;
  deviceKey: string | null;
  deviceLabel: string | null;
  reportedIp: string | null;
  approximatePlace: string | null;
  isNewDevice: boolean;
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
/**
 * Who is on the app right now (decision 0122).
 *
 * Built by the server from the batches as they arrive, never read back out of `analytics_events`.
 * It is a different question from the thirty-day list beside it on the same page, and it is asked a
 * different way: the list is a bounded query on a slow beat, this is pushed as it changes.
 */
export interface LiveNow {
  /** When the server took this picture. The page prints its age rather than implying "now". */
  at: string;
  version: number;
  /** Devices whose last batch arrived inside `liveSeconds`. */
  live: number;
  /** Devices inside `windowSeconds` but not inside `liveSeconds`. */
  recent: number;
  events: number;
  /**
   * Devices the server's memory cap let go since it started. Above zero every count here is a
   * floor, and the page must say so.
   */
  dropped: number;
  /**
   * False until the server's one boot query has run. Until then an empty list means "not counted
   * yet", which is not the same answer as "nobody is here".
   */
  seeded: boolean;
  liveSeconds: number;
  windowSeconds: number;
  devices: LiveNowDevice[];
}

export interface LiveNowDevice {
  deviceId: string;
  userId: string | null;
  appVersion: string | null;
  appVersionCode: number | null;
  buildType: string | null;
  platform: string | null;
  country: string | null;
  /** Arrival time of its last batch. */
  lastAt: string;
  events: number;
}

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
  /** Why the people who stopped here stopped — every one of them is in exactly one bucket. */
  reasons: JourneyReason[];
  /** The people who went past this rung, grouped by the same dimensions — the control group. */
  passed: { count: number; facets: JourneyFacet[] };
}

/** One bucket of stop reasons on a rung; `key` is stable, the label lives in the page. */
export interface JourneyReason {
  key: string;
  count: number;
  /** The same devices grouped again by each dimension — the breakup inside the bucket. */
  facets: JourneyFacet[];
}

export interface JourneyFacet {
  dimension: string;
  values: { value: string; count: number }[];
}

export interface JourneyUser {
  /** The device the first open was counted on — the row's identity. */
  deviceId: string;
  /** A user seen on that device, when any event carried one; null for a guest whose session had not restored. */
  userId: string | null;
  invotickId: string | null;
  country: string | null;
  step: number;
  stoppedAt: string;
  /** The reason key this device stopped for; "completed" past the last rung. */
  stopReason: string;
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
  /**
   * The platforms this build was seen on, read by the backend from its sessions. Empty means none
   * carried it in the window; absent means a backend from before the field existed.
   */
  platforms?: string[];
}

export interface LiveEvent {
  id: string | null;
  eventName: string;
  /**
   * Which surface sent it: "Android" | "iOS" | "Web", or null when the event's session row is
   * missing. Null means **unknown**, not app.
   *
   * Every row in this feed came from the Android app until 2026-09-09, when the share-link page
   * started reporting its own journey. Before that a feed with no platform column hid nothing;
   * now `shared_invoice_approved` can arrive from a browser or from the app and the two are
   * otherwise identical on screen.
   */
  platform: string | null;
  /**
   * Which build sent it — the name the app reports, e.g. "1.4.2", and the build number beside it.
   *
   * Absent until 2026-09-20, and it cost a day. A device's feed was exported and sent for
   * diagnosis; every line said release or debug and nothing about the build, so a whole measuring
   * pass ran before the behaviour turned out to belong to 1.4.2 (94) and to have been fixed two
   * releases earlier.
   *
   * Both, because only `appVersionCode` can be compared: "1.4.10" sorts below "1.4.9" as text.
   * Null is unknown — web rows carry no version, and neither do the oldest app rows.
   */
  appVersion: string | null;
  appVersionCode: number | null;
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
  /** The platforms this build was seen on, from its sessions. Empty: none in the window. Absent: an older backend. */
  platforms?: string[];
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
  /** Every build reporting this defect, by name; `"unknown"` for rows that sent no version. */
  appVersions?: string[];
  /** The build numbers behind `appVersions`. Empty for builds too old to send one (before 1.4.2). */
  appVersionCodes?: number[];
}

/**
 * Who is actually stuck on one defect: one row per defect, user and device.
 *
 * A row is stored once and every repeat overwrites it, so the evidence fields describe the row's
 * LATEST attempt — not all `occurrenceCount` of them.
 */
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
  // Decision 0050. Optional because the backend adds them in a deploy of its own, and rows from
  // builds up to 1.4.4 never carry them. Absent means unknown: shown as "—", never as 0.
  appVersionCode?: number | null;
  /** The `X-Request-Id` of the latest attempt — the id the server's log lines carry. */
  requestId?: string | null;
  httpStatus?: number | null;
  /** Simple class name only. */
  exception?: string | null;
  localVersion?: number | null;
  serverVersion?: number | null;
  /** The signature fixes both of these, so the page falls back to the defect's own values. */
  errorType?: string | null;
  entityType?: string | null;
  /** BACKEND, APP or RECONCILE — which side recorded this row. */
  source?: string | null;
}

/** One build that has reported a sync defect — an option of the version filter. */
export interface SyncHealthVersion {
  /** `"unknown"` for rows that reported no version. */
  appVersion: string;
  /** Null for builds older than 1.4.2, which do not send the code. */
  appVersionCode: number | null;
  defects: number;
  occurrences: number;
  devices: number;
  lastSeenAt: string;
}

/** One line of the server's own log, as `/sync-health/trace/{requestId}` returns it. */
export interface SyncHealthTraceLine {
  /** The contract names the field without fixing its form, so ISO text and epoch numbers are both read. */
  ts: string | number;
  level?: string | null;
  message: string;
}

/** What the server logged under one request id (decision 0050). */
export interface SyncHealthTrace {
  requestId: string;
  lines: SyncHealthTraceLine[];
  /** True when the server cut the answer at its cap. */
  truncated: boolean;
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
  /**
   * The row's key. Optional until the backend that sends it is live: the number was the key until it
   * was masked, and two masked numbers can match.
   */
  identityId?: string;
  /** Masked by the server: the last three digits only (the owner, 2026-09-14). */
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

// ── Support view (decision 0075) ──────────────────────────────────────────────
// A read-only view of one account, for support. Emails and phone numbers arrive masked; the whole value
// comes only from a reveal, and every read and every reveal is recorded (who looked, and when).

/** What the lookup read the text as. */
export type SupportQueryKind = "invotick_id" | "uuid" | "guest_address" | "email" | "phone" | "device_id";

export interface SupportCandidate {
  userId: string;
  invotickId: string | null;
  username: string | null;
  role: string;
  emailMasked: string | null;
  emailIsGuestAddress: boolean;
  phoneMasked: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  isDeleted: boolean;
  /** INVOTICK_ID, USER_ID, DEVICE_ID, GUEST_ADDRESS, EMAIL, PHONE or BUSINESS_PHONE. */
  matchedOn: string;
  /** The retired guest that matched, when this is the account its data moved to. */
  viaRetiredGuestId: string | null;
}

export interface SupportLookupResult {
  kind: SupportQueryKind;
  candidates: SupportCandidate[];
  truncated: boolean;
  matched: number | null;
}

export interface SupportAccountRef {
  userId: string;
  invotickId: string | null;
  createdAt: string | null;
}

export interface SupportSummary {
  userId: string;
  invotickId: string | null;
  username: string | null;
  role: string;
  accountKind: "GUEST" | "REGISTERED" | "ADMIN";
  emailMasked: string | null;
  emailIsGuestAddress: boolean;
  phoneMasked: string | null;
  hasPhone: boolean;
  hasPendingEmailChange: boolean;
  isEmailVerified: boolean;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  retiredTo: SupportAccountRef | null;
  previousGuests: SupportAccountRef[];
  previousGuestCount: number;
  premiumNow: boolean;
}

export interface SupportDevice {
  deviceId: string;
  /** The all-zero id every iPhone sends: it names no one phone. */
  isSharedIosId: boolean;
  accountUserIds: string[];
  linked: boolean;
  deviceName: string | null;
  linkedPlatform: string | null;
  linkedAppVersion: string | null;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  revokedAt: string | null;
  /** Other accounts this device id has signed into; null for the shared iPhone id. */
  otherAccounts: number | null;
  sessions: number;
  lastSessionAt: string | null;
  appVersion: string | null;
  appVersionCode: number | null;
  platform: string | null;
  deviceModel: string | null;
  manufacturer: string | null;
  osVersion: string | null;
}

export interface SupportDevices {
  devices: SupportDevice[];
  sessionWindowDays: number;
  sessionsWithoutDevice: number;
  truncated: boolean;
}

export interface SupportSyncFailure {
  userId: string | null;
  fromPreviousGuest: boolean;
  signature: string;
  source: string;
  deviceId: string | null;
  appVersion: string | null;
  appVersionCode: number | null;
  platform: string | null;
  entityType: string;
  operation: string | null;
  recordId: string | null;
  field: string | null;
  errorType: string;
  reason: string | null;
  occurrenceCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  resolved: boolean;
  requestId: string | null;
  httpStatus: number | null;
  exception: string | null;
  localVersion: number | null;
  serverVersion: number | null;
  appStage: string | null;
}

export interface SupportSyncFailures {
  items: SupportSyncFailure[];
  page: number;
  size: number;
  total: number;
  days: number;
}

export interface SupportEntitlement {
  heldByUserId: string;
  status: string;
  plan: string;
  currentlyActive: boolean;
  expiresAt: string | null;
  grantedAt: string;
  updatedAt: string;
  revokedAt: string | null;
  revokedReason: string | null;
  provider: string | null;
  productId: string | null;
  /** The store's order id, as Play Console shows it. */
  orderId: string | null;
  purchaseFirstSeenAt: string | null;
  purchaseLastVerifiedAt: string | null;
  accountBindingCount: number | null;
}

export interface SupportBinding {
  orderId: string | null;
  fromUserId: string | null;
  toUserId: string;
  reason: string;
  deviceId: string | null;
  createdAt: string;
}

export interface SupportRestoreAnswer {
  orderId: string | null;
  askedByUserId: string;
  ownerUserId: string | null;
  outcome: string;
  deviceId: string;
  firstSeenAt: string;
  lastSeenAt: string;
  times: number;
}

export interface SupportAppPremiumReport {
  premiumEnabled: boolean;
  reportedAt: string;
  appVersion: string | null;
  platform: string | null;
}

export interface SupportPremium {
  premiumNow: boolean;
  entitlements: SupportEntitlement[];
  bindings: SupportBinding[];
  restoreAnswers: SupportRestoreAnswer[];
  appReport: SupportAppPremiumReport | null;
}

/** `login_ip` is the account's last-login IP, masked everywhere else (the owner, 2026-09-14). */
export type SupportRevealField = "email" | "phone" | "login_ip";

export interface SupportReveal {
  field: SupportRevealField;
  /** Null when the account holds no such value. */
  value: string | null;
}

/** One read of the account in the support view, or one reveal: who, what, how it ended, when. */
export interface SupportViewLogEntry {
  viewedAt: string;
  viewedUserId: string;
  adminUserId: string | null;
  adminName: string | null;
  section: string;
  action: "view" | "reveal";
  outcome: string;
  /** For a reveal, the field it named. Never its value. */
  field: string | null;
  reason: string | null;
  requestId: string | null;
}

export interface SupportViewLogPage {
  items: SupportViewLogEntry[];
  page: number;
  size: number;
  total: number;
}

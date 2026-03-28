// server/src/db/schema.ts
import {
  pgTable, serial, integer, varchar, text, boolean, timestamp, date, numeric,
  uniqueIndex, index, foreignKey, jsonb, uuid, primaryKey, unique, doublePrecision, real,
  bigserial, bigint
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
// Assuming you have crypto available, as in your original file
import crypto from "crypto";
/* ========================= companies ========================= */
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  officeAddress: text("office_address").notNull(),
  isHeadOffice: boolean("is_head_office").notNull().default(true),
  phoneNumber: varchar("phone_number", { length: 50 }).notNull(),
  region: text("region"),
  area: text("area"),
  adminUserId: varchar("admin_user_id", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true, precision: 6 }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, precision: 6 }).defaultNow(),
  workosOrganizationId: varchar("workos_organization_id", { length: 255 }).unique(),
}, (t) => [
  index("idx_admin_user_id").on(t.adminUserId),
]);

export const authSessions = pgTable("auth_sessions", {
  sessionId: uuid("session_id").primaryKey().defaultRandom(),
  masonId: uuid("mason_id").notNull().references(() => masonPcSide.id, { onDelete: "cascade" }),
  sessionToken: text("session_token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});

/* ========================= users ========================= */
export const users = pgTable("users", {
  id: serial().primaryKey().notNull(),
  workosUserId: text("workos_user_id"),
  companyId: integer("company_id").notNull(),
  email: text().notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  role: text().notNull(),
  createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
  phoneNumber: varchar("phone_number", { length: 50 }),
  inviteToken: text(),
  status: text().default('active').notNull(),

  isDashboardUser: boolean("is_dashboard_user").default(false).notNull(),
  dashboardLoginId: text("dashboard_login_id"),
  dashboardHashedPassword: text("dashboard_hashed_password"),

  isSalesAppUser: boolean("is_sales_app_user").default(false).notNull(),
  salesmanLoginId: text("salesman_login_id"),
  hashedPassword: text("hashed_password"),

  isTechnicalRole: boolean("is_technical_role").default(false).notNull(),
  techLoginId: text("tech_login_id"),
  techHashPassword: text("tech_hash_password"),

  isAdminAppUser: boolean("is_admin_app_user").default(false).notNull(),
  adminAppLoginId: text("admin_app_login_id"),
  adminAppHashedPassword: text("admin_app_hashed_password"),

  reportsToId: integer("reports_to_id"),
  area: text(),
  region: text(),
  noOfPjp: integer("no_of_pjp"),
  deviceId: varchar("device_id", { length: 255 }),
  fcmToken: varchar("fcm_token", { length: 500 }),

}, (table) => [
  index("idx_user_company_id").using("btree", table.companyId.asc().nullsLast().op("int4_ops")),
  index("idx_user_device_id").using("btree", table.deviceId.asc().nullsLast().op("text_ops")),
  index("idx_workos_user_id").using("btree", table.workosUserId.asc().nullsLast().op("text_ops")),
  uniqueIndex("users_company_id_email_key").using("btree", table.companyId.asc().nullsLast().op("int4_ops"), table.email.asc().nullsLast().op("text_ops")),
  uniqueIndex("users_inviteToken_key").using("btree", table.inviteToken.asc().nullsLast().op("text_ops")),
  uniqueIndex("users_salesman_login_id_key").using("btree", table.salesmanLoginId.asc().nullsLast().op("text_ops")),
  uniqueIndex("users_workos_user_id_key").using("btree", table.workosUserId.asc().nullsLast().op("text_ops")),
  foreignKey({
    columns: [table.companyId],
    foreignColumns: [companies.id],
    name: "users_company_id_fkey"
  }),
  foreignKey({
    columns: [table.reportsToId],
    foreignColumns: [table.id],
    name: "users_reports_to_id_fkey"
  }).onUpdate("cascade").onDelete("set null"),
  unique("uniq_user_device_id").on(table.deviceId),
  index("idx_users_reports_to_id").on(table.reportsToId),
]);

export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  orgRole: varchar("org_role", { length: 100 }), // e.g., 'President', 'General Manager', 'Executive'
  jobRole: varchar("job_role", { length: 100 }), // e.g., 'Sales', 'Technical Sales', 'IT', 'MIS'
  grantedPerms: text("granted_perms").array().notNull().default(sql`ARRAY[]::text[]`),
  permDescription: varchar("perm_description", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userRoles = pgTable("user_roles", {
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  roleId: integer("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
}, (t) => [
  primaryKey({ columns: [t.userId, t.roleId] }),
]);

/* ========================= notifications ========================= */
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  recipientUserId: integer("recipient_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),

  // These two fields allow you to find and DELETE the specific notification later
  type: varchar("type", { length: 50 }).notNull(),
  referenceId: varchar("reference_id", { length: 255 }),

  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, precision: 6 }).defaultNow().notNull(),
}, (t) => [
  index("idx_notifications_recipient").on(t.recipientUserId),
]);

/* ========================= tso_meetings (Moved up) ========================= */
export const tsoMeetings = pgTable("tso_meetings", {
  id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  type: varchar("type", { length: 100 }),
  date: date("date"),
  participantsCount: integer("participants_count"),
  zone: varchar("zone", { length: 100 }),
  market: varchar("market", { length: 100 }),
  dealerName: varchar("dealer_name", { length: 255 }),
  dealerAddress: varchar("dealer_address", { length: 500 }),
  conductedBy: varchar("conducted_by", { length: 255 }),
  giftType: varchar("gift_type", { length: 255 }),
  accountJsbJud: varchar("account_jsb_jud", { length: 100 }),
  totalExpenses: numeric("total_expenses", { precision: 12, scale: 2 }),
  billSubmitted: boolean("bill_submitted").default(false),
  meetImageUrl: varchar("meet_image_url", { length: 300 }),
  createdByUserId: integer("created_by_user_id").notNull().references(() => users.id),
  siteId: uuid("site_id").references(() => technicalSites.id, { onDelete: "set null" }),

  createdAt: timestamp("created_at", { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, precision: 6 }).defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("idx_tso_meetings_created_by_user_id").on(t.createdByUserId),
  index("idx_tso_meetings_site_id").on(t.siteId),
]);

/* ========================= permanent_journey_plan ========================= */
export const permanentJourneyPlans = pgTable("permanent_journey_plans", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: integer("user_id").notNull().references(() => users.id),
  createdById: integer("created_by_id").notNull().references(() => users.id),

  // Core Details
  planDate: date("plan_date").notNull(),
  areaToBeVisited: varchar("area_to_be_visited", { length: 500 }).notNull(),
  route: varchar("route", { length: 500 }), // Added for destination
  description: varchar("description", { length: 500 }),
  status: varchar("status", { length: 50 }).notNull().default("PENDING"),

  // Numerical Plans (Excel Columns)
  plannedNewSiteVisits: integer("planned_new_site_visits").default(0),
  plannedFollowUpSiteVisits: integer("planned_follow_up_site_visits").default(0),
  plannedNewDealerVisits: integer("planned_new_dealer_visits").default(0),
  plannedInfluencerVisits: integer("planned_influencer_visits").default(0),

  // Influencer / PC-Mason Details
  influencerName: varchar("influencer_name", { length: 255 }),
  influencerPhone: varchar("influencer_phone", { length: 20 }),
  activityType: varchar("activity_type", { length: 255 }),

  // Conversion & Schemes
  noOfConvertedBags: integer("noof_converted_bags").default(0),
  noOfMasonPcSchemes: integer("noof_masonpc_in_schemes").default(0),

  // Diversion
  diversionReason: varchar("diversion_reason", { length: 500 }),

  dealerId: varchar("dealer_id", { length: 255 }).references(() => dealers.id, { onDelete: "set null" }),
  siteId: uuid("site_id").references(() => technicalSites.id, { onDelete: "set null" }),

  verificationStatus: varchar("verification_status", { length: 50 }),
  additionalVisitRemarks: varchar("additional_visit_remarks", { length: 500 }),
  bulkOpId: varchar("bulk_op_id", { length: 50 }),
  idempotencyKey: varchar("idempotency_key", { length: 120 }),
  createdAt: timestamp("created_at", { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, precision: 6 }).defaultNow().notNull(),
}, (t) => [
  index("idx_permanent_journey_plans_user_id").on(t.userId),
  index("idx_permanent_journey_plans_created_by_id").on(t.createdById),
  index("idx_pjp_dealer_id").on(t.dealerId),
  index("idx_pjp_bulk_op_id").on(t.bulkOpId),
  uniqueIndex("uniq_pjp_user_dealer_plan_date").on(t.userId, t.dealerId, t.planDate),
  uniqueIndex("uniq_pjp_idempotency_key_not_null").on(t.idempotencyKey).where(sql`${t.idempotencyKey} IS NOT NULL`),
  index("idx_pjp_site_id").on(t.siteId),
]);

/* ========================= daily_visit_reports ========================= */
export const dailyVisitReports = pgTable("daily_visit_reports", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  dealerId: varchar("dealer_id", { length: 255 }).references(() => dealers.id, { onDelete: "set null" }),
  subDealerId: varchar("sub_dealer_id", { length: 255 }).references(() => dealers.id, { onDelete: "set null" }),
  reportDate: date("report_date"),
  dealerType: varchar("dealer_type", { length: 50 }),
  location: varchar("location", { length: 500 }),
  latitude: numeric("latitude", { precision: 10, scale: 7 }),
  longitude: numeric("longitude", { precision: 10, scale: 7 }),
  visitType: varchar("visit_type", { length: 50 }),
  dealerTotalPotential: numeric("dealer_total_potential", { precision: 10, scale: 2 }),
  dealerBestPotential: numeric("dealer_best_potential", { precision: 10, scale: 2 }),
  brandSelling: text("brand_selling").array(),
  contactPerson: varchar("contact_person", { length: 255 }),
  contactPersonPhoneNo: varchar("contact_person_phone_no", { length: 20 }),
  todayOrderMt: numeric("today_order_mt", { precision: 10, scale: 2 }),
  todayCollectionRupees: numeric("today_collection_rupees", { precision: 10, scale: 2 }),
  overdueAmount: numeric("overdue_amount", { precision: 12, scale: 2 }),
  feedbacks: varchar("feedbacks", { length: 500 }),
  solutionBySalesperson: varchar("solution_by_salesperson", { length: 500 }),
  anyRemarks: varchar("any_remarks", { length: 500 }),

  checkInTime: timestamp("check_in_time", { withTimezone: true, precision: 6 }),
  checkOutTime: timestamp("check_out_time", { withTimezone: true, precision: 6 }),
  timeSpentinLoc: varchar("time_spent_in_loc", { length: 255 }),
  inTimeImageUrl: varchar("in_time_image_url", { length: 500 }),
  outTimeImageUrl: varchar("out_time_image_url", { length: 500 }),
  pjpId: varchar("pjp_id", { length: 255 }).references(() => permanentJourneyPlans.id, { onDelete: "set null" }),
  dailyTaskId: varchar("daily_task_id", { length: 255 }).references(() => dailyTasks.id, { onDelete: "set null" }),

  customerType: varchar("customer_type", { length: 100 }),
  partyType: varchar("party_type", { length: 100 }),
  nameOfParty: varchar("name_of_party", { length: 255 }),
  contactNoOfParty: varchar("contact_no_of_party", { length: 20 }),
  expectedActivationDate: date("expected_activation_date"),
  currentDealerOutstandingAmt: numeric("current_dealer_outstanding_amt", { precision: 14, scale: 2 }),
  idempotencyKey: varchar("idempotency_key", { length: 255 }),

  createdAt: timestamp("created_at", { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, precision: 6 }).defaultNow().notNull(),
}, (t) => [
  index("idx_daily_visit_reports_user_id").on(t.userId),
  index("idx_daily_visit_reports_pjp_id").on(t.pjpId),
  index("idx_dvr_dealer_id").on(t.dealerId),
  index("idx_dvr_sub_dealer_id").on(t.subDealerId),
]);

/* ========================= technical_visit_reports ========================= */
export const technicalVisitReports = pgTable("technical_visit_reports", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reportDate: date("report_date").notNull(),
  region: varchar("region", { length: 100 }),
  area: varchar("area", { length: 100 }),
  marketName: varchar("market_name", { length: 100 }),
  siteAddress: varchar("site_address", { length: 500 }),
  siteNameConcernedPerson: varchar("site_name_concerned_person", { length: 255 }).notNull(),
  phoneNo: varchar("phone_no", { length: 20 }).notNull(),
  whatsappNo: varchar("whatsapp_no", { length: 20 }),
  emailId: varchar("email_id", { length: 255 }),
  latitude: numeric("latitude", { precision: 9, scale: 6 }),
  longitude: numeric("longitude", { precision: 9, scale: 6 }),
  visitType: varchar("visit_type", { length: 50 }).notNull(),
  visitCategory: varchar("visit_category", { length: 50 }),
  customerType: varchar("customer_type", { length: 50 }),
  purposeOfVisit: varchar("purpose_of_visit", { length: 500 }),
  siteVisitStage: text("site_visit_stage"),
  constAreaSqFt: integer("const_area_sq_ft"),
  siteVisitBrandInUse: text("site_visit_brand_in_use").array().notNull(),
  currentBrandPrice: numeric("current_brand_price", { precision: 10, scale: 2 }),
  siteStock: numeric("site_stock", { precision: 10, scale: 2 }),
  estRequirement: numeric("est_requirement", { precision: 10, scale: 2 }),
  supplyingDealerName: varchar("supplying_dealer_name", { length: 255 }),
  nearbyDealerName: varchar("nearby_dealer_name", { length: 255 }),
  associatedPartyName: text("associated_party_name"),
  channelPartnerVisit: text("channel_partner_visit"),
  isConverted: boolean("is_converted"),
  conversionType: varchar("conversion_type", { length: 50 }),
  conversionFromBrand: text("conversion_from_brand"),
  conversionQuantityValue: numeric("conversion_quantity_value", { precision: 10, scale: 2 }),
  conversionQuantityUnit: varchar("conversion_quantity_unit", { length: 20 }),
  isTechService: boolean("is_tech_service"),
  serviceDesc: varchar("service_desc", { length: 500 }),
  serviceType: text("service_type"),
  dhalaiVerificationCode: varchar("dhalai_verification_code", { length: 50 }),
  isVerificationStatus: varchar("is_verification_status", { length: 50 }),
  qualityComplaint: text("quality_complaint"),
  influencerName: varchar("influencer_name", { length: 255 }),
  influencerPhone: varchar("influencer_phone", { length: 20 }),
  isSchemeEnrolled: boolean("is_scheme_enrolled"),
  influencerProductivity: varchar("influencer_productivity", { length: 100 }),
  influencerType: text("influencer_type").array().notNull(),
  clientsRemarks: varchar("clients_remarks", { length: 500 }).notNull(),
  salespersonRemarks: varchar("salesperson_remarks", { length: 500 }).notNull(),
  promotionalActivity: text("promotional_activity"),
  siteVisitType: varchar("site_visit_type", { length: 50 }),

  checkInTime: timestamp("check_in_time", { withTimezone: true, precision: 6 }).notNull(),
  checkOutTime: timestamp("check_out_time", { withTimezone: true, precision: 6 }),
  timeSpentinLoc: varchar("time_spent_in_loc", { length: 255 }),
  inTimeImageUrl: varchar("in_time_image_url", { length: 500 }),
  outTimeImageUrl: varchar("out_time_image_url", { length: 500 }),
  sitePhotoUrl: varchar("site_photo_url", { length: 500 }),
  firstVisitTime: timestamp("first_visit_time", { withTimezone: true, precision: 6 }),
  lastVisitTime: timestamp("last_visit_time", { withTimezone: true, precision: 6 }),
  firstVisitDay: varchar("first_visit_day", { length: 255 }),
  lastVisitDay: varchar("last_visit_day", { length: 255 }),
  siteVisitsCount: integer("site_visits_count"),
  otherVisitsCount: integer("other_visits_count"),
  totalVisitsCount: integer("total_visits_count"),

  meetingId: varchar("meeting_id", { length: 255 }).references(() => tsoMeetings.id),
  pjpId: varchar("pjp_id", { length: 255 }).references(() => permanentJourneyPlans.id, { onDelete: "set null" }),
  masonId: uuid("mason_id").references((): any => masonPcSide.id, { onDelete: "set null" }),
  siteId: uuid("site_id").references(() => technicalSites.id, { onDelete: "set null" }),
  journeyId: varchar("journey_id", { length: 255 }),

  createdAt: timestamp("created_at", { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, precision: 6 }).defaultNow().notNull(),
}, (t) => [
  index("idx_technical_visit_reports_user_id").on(t.userId),
  index("idx_technical_visit_reports_meeting_id").on(t.meetingId),
  index("idx_technical_visit_reports_pjp_id").on(t.pjpId),
  index("idx_tvr_mason_id").on(t.masonId),
  index("idx_tvr_site_id").on(t.siteId),
  index("idx_tvr_journey_id").on(t.journeyId),
]);

/* ========================= dealers (extended to match Prisma) ========================= */
export const dealers = pgTable("dealers", {
  id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(),
  parentDealerId: varchar("parent_dealer_id", { length: 255 }).references((): any => dealers.id, { onDelete: "set null" }),
  name: varchar("name", { length: 255 }).notNull(),
  region: varchar("region", { length: 100 }).notNull(),
  area: varchar("area", { length: 255 }).notNull(),
  phoneNo: varchar("phone_no", { length: 20 }).notNull(),
  address: varchar("address", { length: 500 }).notNull(),
  pinCode: varchar("pinCode", { length: 20 }),
  latitude: numeric("latitude", { precision: 10, scale: 7 }),
  longitude: numeric("longitude", { precision: 10, scale: 7 }),
  dateOfBirth: date("dateOfBirth"),
  anniversaryDate: date("anniversaryDate"),
  totalPotential: numeric("total_potential", { precision: 10, scale: 2 }).notNull(),
  bestPotential: numeric("best_potential", { precision: 10, scale: 2 }).notNull(),
  brandSelling: text("brand_selling").array().notNull(),
  feedbacks: varchar("feedbacks", { length: 500 }).notNull(),
  remarks: varchar("remarks", { length: 500 }),

  // --- ADDED FOR PRISMA PARITY ---
  dealerDevelopmentStatus: varchar("dealerdevelopmentstatus", { length: 255 }),
  dealerDevelopmentObstacle: varchar("dealerdevelopmentobstacle", { length: 255 }),
  salesGrowthPercentage: numeric("sales_growth_percentage", { precision: 5, scale: 2 }),
  noOfPJP: integer("no_of_pjp"),
  // -----------------------------

  // Verification & IDs
  verificationStatus: varchar("verification_status", { length: 50 }).notNull().default("PENDING"),
  whatsappNo: varchar("whatsapp_no", { length: 20 }),
  emailId: varchar("email_id", { length: 255 }),
  businessType: varchar("business_type", { length: 100 }),

  // --- NEW FIELDS ADDED ---
  nameOfFirm: varchar("nameOfFirm", { length: 500 }),
  underSalesPromoterName: varchar("underSalesPromoterName", { length: 200 }),
  // --- END NEW FIELDS ---

  gstinNo: varchar("gstin_no", { length: 20 }).unique(),
  panNo: varchar("pan_no", { length: 20 }),
  tradeLicNo: varchar("trade_lic_no", { length: 150 }),
  aadharNo: varchar("aadhar_no", { length: 20 }),

  // Godown
  godownSizeSqFt: integer("godown_size_sqft"),
  godownCapacityMTBags: varchar("godown_capacity_mt_bags", { length: 255 }),
  godownAddressLine: varchar("godown_address_line", { length: 500 }),
  godownLandMark: varchar("godown_landmark", { length: 255 }),
  godownDistrict: varchar("godown_district", { length: 100 }),
  godownArea: varchar("godown_area", { length: 255 }),
  godownRegion: varchar("godown_region", { length: 100 }),
  godownPinCode: varchar("godown_pincode", { length: 20 }),

  // Residential
  residentialAddressLine: varchar("residential_address_line", { length: 500 }),
  residentialLandMark: varchar("residential_landmark", { length: 255 }),
  residentialDistrict: varchar("residential_district", { length: 100 }),
  residentialArea: varchar("residential_area", { length: 255 }),
  residentialRegion: varchar("residential_region", { length: 100 }),
  residentialPinCode: varchar("residential_pincode", { length: 20 }),

  // Bank
  bankAccountName: varchar("bank_account_name", { length: 255 }),
  bankName: varchar("bank_name", { length: 255 }),
  bankBranchAddress: varchar("bank_branch_address", { length: 500 }),
  bankAccountNumber: varchar("bank_account_number", { length: 50 }),
  bankIfscCode: varchar("bank_ifsc_code", { length: 50 }),

  // Sales & promoter
  brandName: varchar("brand_name", { length: 255 }),
  monthlySaleMT: numeric("monthly_sale_mt", { precision: 10, scale: 2 }),
  noOfDealers: integer("no_of_dealers"),
  areaCovered: varchar("area_covered", { length: 255 }),
  projectedMonthlySalesBestCementMT: numeric("projected_monthly_sales_best_cement_mt", { precision: 10, scale: 2 }),
  noOfEmployeesInSales: integer("no_of_employees_in_sales"),

  // Declaration
  declarationName: varchar("declaration_name", { length: 255 }),
  declarationPlace: varchar("declaration_place", { length: 100 }),
  declarationDate: date("declaration_date"),

  // Document URLs
  tradeLicencePicUrl: varchar("trade_licence_pic_url", { length: 500 }),
  shopPicUrl: varchar("shop_pic_url", { length: 500 }),
  dealerPicUrl: varchar("dealer_pic_url", { length: 500 }),
  blankChequePicUrl: varchar("blank_cheque_pic_url", { length: 500 }),
  partnershipDeedPicUrl: varchar("partnership_deed_pic_url", { length: 500 }),

  createdAt: timestamp("created_at", { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, precision: 6 }).defaultNow().notNull(),
}, (t) => [
  index("idx_dealers_user_id").on(t.userId),
  index("idx_dealers_parent_dealer_id").on(t.parentDealerId),
]);

export const verifiedDealers = pgTable("verified_dealers", {
  id: serial("id").primaryKey(),
  dealerPartyName: varchar("dealer_party_name", { length: 255 }).notNull(),
  alias: varchar("alias", { length: 255 }),
  gstNo: varchar("gst_no", { length: 50 }),
  panNo: varchar("pan_no", { length: 50 }),
  zone: varchar("zone", { length: 120 }),
  district: varchar("district", { length: 120 }),
  area: varchar("area", { length: 120 }),
  state: varchar("state", { length: 100 }),
  pinCode: varchar("pin_code", { length: 20 }),
  contactNo1: varchar("contact_no1", { length: 20 }),
  contactNo2: varchar("contact_no2", { length: 20 }),
  email: varchar("email", { length: 255 }),
  contactPerson: varchar("contact_person", { length: 255 }),
  dealerSegment: varchar("dealer_segment", { length: 255 }),
  salesPromoterId: integer("sales_promoter_id").references(() => salesPromoters.id, { onDelete: "set null" }),
  salesManNameRaw: varchar("sales_man_name_raw", { length: 255 }),
  creditLimit: numeric("credit_limit", { precision: 14, scale: 2 }),
  securityBlankChequeNo: varchar("security_blank_cheque_no", { length: 255 }),
  dealerUuid: varchar("dealer_uuid", { length: 255 }).references(() => dealers.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("idx_verified_zone").on(t.zone),
  index("idx_verified_district").on(t.district),
  index("idx_verified_pincode").on(t.pinCode),
  index("idx_verified_sales_promoter").on(t.salesPromoterId),
  index("idx_verified_segment").on(t.dealerSegment),
  index("idx_verified_gst").on(t.gstNo),
  index("idx_verified_mobile").on(t.contactNo1),
  index("idx_dealer_uuid").on(t.dealerUuid),
]);

export const salesPromoters = pgTable("sales_promoters", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  mobile: varchar("mobile", { length: 20 }),
  email: varchar("email", { length: 255 }),
  zone: varchar("zone", { length: 120 }),
  district: varchar("district", { length: 120 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/* ========================= email_reports (NEW) ========================= */
export const emailReports = pgTable("email_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  messageId: text("message_id").notNull(), // Graph mail id
  subject: text("subject"),
  sender: text("sender"),
  fileName: text("file_name"),
  payload: jsonb("payload").notNull(), // ← your Excel → JSON here
  processed: boolean("processed").default(false),
  institution: text("institution"),
  reportName: text("report_name"),
  dealerNames: jsonb("dealer_names"), // array of unique dealer names
  reportDate: date("report_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("idx_email_reports_message").on(t.messageId),
]);


/* ========================= salesman_attendance ========================= */
export const salesmanAttendance = pgTable("salesman_attendance", {
  id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 50 }).notNull(),
  attendanceDate: date("attendance_date").notNull(),
  locationName: varchar("location_name", { length: 500 }).notNull(),
  inTimeTimestamp: timestamp("in_time_timestamp", { withTimezone: true, precision: 6 }).notNull(),
  outTimeTimestamp: timestamp("out_time_timestamp", { withTimezone: true, precision: 6 }),
  inTimeImageCaptured: boolean("in_time_image_captured").notNull(),
  outTimeImageCaptured: boolean("out_time_image_captured").notNull(),
  inTimeImageUrl: varchar("in_time_image_url", { length: 500 }),
  outTimeImageUrl: varchar("out_time_image_url", { length: 500 }),
  inTimeLatitude: numeric("in_time_latitude", { precision: 10, scale: 7 }).notNull(),
  inTimeLongitude: numeric("in_time_longitude", { precision: 10, scale: 7 }).notNull(),
  inTimeAccuracy: numeric("in_time_accuracy", { precision: 10, scale: 2 }),
  inTimeSpeed: numeric("in_time_speed", { precision: 10, scale: 2 }),
  inTimeHeading: numeric("in_time_heading", { precision: 10, scale: 2 }),
  inTimeAltitude: numeric("in_time_altitude", { precision: 10, scale: 2 }),
  outTimeLatitude: numeric("out_time_latitude", { precision: 10, scale: 7 }),
  outTimeLongitude: numeric("out_time_longitude", { precision: 10, scale: 7 }),
  outTimeAccuracy: numeric("out_time_accuracy", { precision: 10, scale: 2 }),
  outTimeSpeed: numeric("out_time_speed", { precision: 10, scale: 2 }),
  outTimeHeading: numeric("out_time_heading", { precision: 10, scale: 2 }),
  outTimeAltitude: numeric("out_time_altitude", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, precision: 6 }).defaultNow().notNull(),
}, (t) => [
  index("idx_salesman_attendance_user_id").on(t.userId),
  unique("unique_attendance_per_role_per_day").on(t.userId, t.attendanceDate, t.role),
]);

/* ========================= salesman_leave_applications ========================= */
export const salesmanLeaveApplications = pgTable("salesman_leave_applications", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  leaveType: varchar("leave_type", { length: 100 }).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  reason: varchar("reason", { length: 500 }).notNull(),
  status: varchar("status", { length: 50 }).notNull(), // "Pending" | "Approved" | "Rejected"
  adminRemarks: varchar("admin_remarks", { length: 500 }),
  appRole: varchar("app_role", { length: 50 }),
  createdAt: timestamp("created_at", { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, precision: 6 }).defaultNow().notNull(),
}, (t) => [
  index("idx_salesman_leave_applications_user_id").on(t.userId),
]);

/* ========================= competition_reports ========================= */
export const competitionReports = pgTable("competition_reports", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`substr(replace(cast(gen_random_uuid() as text),'-',''),1,25)`),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reportDate: date("report_date").notNull(),
  brandName: varchar("brand_name", { length: 255 }).notNull(),
  billing: varchar("billing", { length: 100 }).notNull(),
  nod: varchar("nod", { length: 100 }).notNull(),
  retail: varchar("retail", { length: 100 }).notNull(),
  schemesYesNo: varchar("schemes_yes_no", { length: 10 }).notNull(),
  avgSchemeCost: numeric("avg_scheme_cost", { precision: 10, scale: 2 }).notNull(),
  remarks: varchar("remarks", { length: 500 }),
  createdAt: timestamp("created_at", { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, precision: 6 }).defaultNow().notNull(),
}, (t) => [
  index("competition_reports_user_idx").on(t.userId),
]);

/* ========================= geo_tracking ========================= */
export const geoTracking = pgTable("geo_tracking", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  latitude: numeric("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: numeric("longitude", { precision: 10, scale: 7 }).notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  accuracy: numeric("accuracy", { precision: 10, scale: 2 }),
  speed: numeric("speed", { precision: 10, scale: 2 }),
  heading: numeric("heading", { precision: 10, scale: 2 }),
  altitude: numeric("altitude", { precision: 10, scale: 2 }),
  locationType: varchar("location_type", { length: 50 }),
  activityType: varchar("activity_type", { length: 50 }),
  appState: varchar("app_state", { length: 50 }),
  batteryLevel: numeric("battery_level", { precision: 5, scale: 2 }),
  isCharging: boolean("is_charging"),
  networkStatus: varchar("network_status", { length: 50 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  siteName: varchar("site_name", { length: 255 }),
  checkInTime: timestamp("check_in_time", { withTimezone: true, precision: 6 }),
  checkOutTime: timestamp("check_out_time", { withTimezone: true, precision: 6 }),
  totalDistanceTravelled: numeric("total_distance_travelled", { precision: 10, scale: 3 }),
  journeyId: varchar("journey_id", { length: 255 }),
  linkedJourneyId: varchar("linked_journey_id", { length: 255 })
    .references(() => journeys.id, { onDelete: "set null" }),
  isActive: boolean("is_active").notNull().default(true),
  destLat: numeric("dest_lat", { precision: 10, scale: 7 }),
  destLng: numeric("dest_lng", { precision: 10, scale: 7 }),
  siteId: uuid("site_id").references(() => technicalSites.id, { onDelete: "set null" }),
  dealerId: varchar("dealer_id", { length: 255 }).references(() => dealers.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, precision: 6 }).defaultNow().notNull(),
}, (t) => [
  index("idx_geo_user_time").on(t.userId, t.recordedAt),
  index("idx_geo_journey_time").on(t.journeyId, t.recordedAt),
  index("idx_geo_active").on(t.isActive),
  index("idx_geo_tracking_user_id").on(t.userId),
  index("idx_geo_tracking_recorded_at").on(t.recordedAt),
  index("idx_geo_tracking_site_id").on(t.siteId),
  index("idx_geo_tracking_dealer_id").on(t.dealerId),
  index("idx_geo_linked_journey_time").on(t.linkedJourneyId, t.recordedAt),
]);

export const journeyOps = pgTable("journey_ops", {
  serverSeq: bigserial("server_seq", { mode: "number" }).primaryKey(),
  opId: uuid("op_id").notNull().unique(),
  journeyId: varchar("journey_id", { length: 255 }).notNull(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
  type: text("type").notNull(),
  payload: jsonb("payload").notNull(),
  appRole: varchar("app_role", { length: 50 }),

  createdAt: timestamp("created_at", { withTimezone: true, precision: 6 }).defaultNow().notNull(),
}, (t) => [
  index("idx_journey_ops_journey").on(t.journeyId),
  index("idx_journey_ops_user").on(t.userId),
  index("idx_journey_ops_created").on(t.createdAt),
  index("idx_journey_ops_server_seq").on(t.serverSeq),
]);

export const journeys = pgTable("journeys", {
  id: varchar("id", { length: 255 }).primaryKey(), // Client-side UUID
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  pjpId: varchar("pjp_id", { length: 255 }),
  siteId: varchar("site_id", { length: 255 }),
  dealerId: varchar("dealer_id", { length: 255 }),
  taskId: varchar("task_id", { length: 255 }),
  verifiedDealerId: integer("verified_dealer_id"),
  siteName: varchar("site_name", { length: 255 }),
  destLat: numeric("dest_lat", { precision: 10, scale: 7 }),
  destLng: numeric("dest_lng", { precision: 10, scale: 7 }),

  // 🚀 NEW: The backend backpack for the Red Line
  plannedRouteJson: jsonb("planned_route_json"),

  status: varchar("status", { length: 50 }).default('ACTIVE').notNull(),
  isActive: boolean("is_active").default(true),
  startTime: timestamp("start_time", { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  endTime: timestamp("end_time", { withTimezone: true, precision: 6 }),
  totalDistance: numeric("total_distance", { precision: 10, scale: 3 }).default('0'),
  appRole: varchar("app_role", { length: 50 }),

  // unused field - but keep it
  isSynced: boolean("is_synced").default(false),

  createdAt: timestamp("created_at", { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, precision: 6 }).defaultNow().notNull(),
}, (t) => [
  index("idx_journeys_user_status").on(t.userId, t.status),
]);

export const journeyBreadcrumbs = pgTable("journey_breadcrumbs", {
  id: varchar("id", { length: 255 }).primaryKey(), // Client-side UUID
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  h3Index: varchar("h3_index", { length: 15 }),
  totalDistance: doublePrecision("total_distance").default(0.0).notNull(),
  speed: real("speed"),
  accuracy: real("accuracy"),
  heading: real("heading"),
  altitude: real("altitude"),
  batteryLevel: real("battery_level"),
  isCharging: boolean("is_charging"),
  networkStatus: varchar("network_status", { length: 50 }),
  isMocked: boolean("is_mocked").default(false),
  journeyId: varchar("journey_id", { length: 255 }).notNull().references(() => journeys.id, { onDelete: "cascade" }),

  // unused field - but keep it
  isSynced: boolean("is_synced").default(false),

  recordedAt: timestamp("recorded_at", { withTimezone: true, precision: 6 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, precision: 6 }).defaultNow(),
}, (t) => [
  index("idx_breadcrumbs_journey_time").on(t.journeyId, t.recordedAt),
  index("idx_breadcrumbs_h3").on(t.h3Index),
]);

export const syncState = pgTable("sync_state", {
  id: integer("id").primaryKey().default(1),
  // using mode: 'number' is safer for JS if seq won't exceed 2^53
  lastServerSeq: bigint("last_server_seq", { mode: "number" }).notNull().default(0),
});

export const dailyTasks = pgTable("daily_tasks", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  pjpBatchId: uuid("pjp_batch_id"),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  dealerId: varchar("dealer_id", { length: 255 }).references(() => dealers.id, { onDelete: "set null" }),
  dealerNameSnapshot: varchar("dealer_name_snapshot", { length: 255 }),
  dealerMobile: varchar("dealer_mobile", { length: 20 }),
  zone: varchar("zone", { length: 120 }),
  area: varchar("area", { length: 120 }),
  route: text("route"),
  objective: varchar("objective", { length: 255 }),
  visitType: varchar("visit_type", { length: 100 }),
  requiredVisitCount: integer("required_visit_count"),
  week: varchar("week", { length: 50 }),
  taskDate: date("task_date").notNull(),
  status: varchar("status", { length: 50 }).default("Assigned").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(() => new Date()).defaultNow().notNull(),
}, (t) => [
  index("idx_daily_tasks_user").on(t.userId),
  index("idx_daily_tasks_dealer").on(t.dealerId),
  index("idx_daily_tasks_date").on(t.taskDate),
  index("idx_daily_tasks_zone").on(t.zone),
  index("idx_daily_tasks_week").on(t.week),
  index("idx_daily_tasks_pjp_batch").on(t.pjpBatchId),
]);

/* ========================= dealer_reports_and_scores ========================= */
export const dealerReportsAndScores = pgTable("dealer_reports_and_scores", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`substr(replace(cast(gen_random_uuid() as text),'-',''),1,25)`),
  dealerId: varchar("dealer_id", { length: 255 }).notNull().unique().references(() => dealers.id),
  dealerScore: numeric("dealer_score", { precision: 10, scale: 2 }).notNull(),
  trustWorthinessScore: numeric("trust_worthiness_score", { precision: 10, scale: 2 }).notNull(),
  creditWorthinessScore: numeric("credit_worthiness_score", { precision: 10, scale: 2 }).notNull(),
  orderHistoryScore: numeric("order_history_score", { precision: 10, scale: 2 }).notNull(),
  visitFrequencyScore: numeric("visit_frequency_score", { precision: 10, scale: 2 }).notNull(),
  lastUpdatedDate: timestamp("last_updated_date", { withTimezone: true, precision: 6 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, precision: 6 }).defaultNow().notNull(),
});

/* ========================= ratings ========================= */
export const ratings = pgTable("ratings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  area: text("area").notNull(),
  region: text("region").notNull(),
  rating: integer("rating").notNull(),
});

/* ========================= brands ========================= */
export const brands = pgTable("brands", {
  id: serial("id").primaryKey(),
  name: varchar("brand_name", { length: 255 }).notNull().unique(),
});

/* ========================= dealer_brand_mapping ========================= */
export const dealerBrandMapping = pgTable("dealer_brand_mapping", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`substr(replace(cast(gen_random_uuid() as text),'-',''),1,25)`),
  dealerId: varchar("dealer_id", { length: 255 }).notNull().references(() => dealers.id),
  brandId: integer("brand_id").notNull().references(() => brands.id),
  capacityMT: numeric("capacity_mt", { precision: 12, scale: 2 }).notNull(),
  bestCapacityMT: numeric("best_capacity_mt", { precision: 12, scale: 2 }),
  brandGrowthCapacityPercent: numeric("brand_growth_capacity_percent", { precision: 5, scale: 2 }),
  userId: integer("user_id").references(() => users.id),
  verifiedDealerId: integer("verified_dealer_id").references(() => verifiedDealers.id, { onDelete: "set null" }),

}, (t) => [
  uniqueIndex("dealer_brand_mapping_dealer_id_brand_id_unique").on(t.dealerId, t.brandId),
]);

//EMAIL COLLECTION REPORT WITH FOREIGN KEY
export const collectionReports = pgTable("collection_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  institution: varchar("institution", { length: 10 }).notNull(),
  voucherNo: varchar("voucher_no", { length: 100 }).notNull(),
  voucherDate: date("voucher_date").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  bankAccount: varchar("bank_account", { length: 255 }),
  remarks: varchar("remarks", { length: 500 }),
  partyName: varchar("party_name", { length: 255 }).notNull(),
  salesPromoterName: varchar("sales_promoter_name", { length: 255 }),
  zone: varchar("zone", { length: 100 }),
  district: varchar("district", { length: 100 }),
  salesPromoterUserId: integer("sales_promoter_user_id"),
  sourceMessageId: text("source_message_id"),
  sourceFileName: text("source_file_name"),
  verifiedDealerId: integer("verified_dealer_id").references(() => verifiedDealers.id, { onDelete: "set null" }),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("idx_collection_institution").on(t.institution),
  index("idx_collection_date").on(t.voucherDate),
  index("idx_collection_verified_dealer").on(t.verifiedDealerId),
  index("idx_collection_user").on(t.userId),
  index("idx_collection_voucher").on(t.voucherNo),
  uniqueIndex("uniq_collection_voucher_inst")
    .on(t.voucherNo, t.institution),
]);

export const outstandingReports = pgTable("outstanding_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  reportDate: date("report_date"),
  tempDealerName: text("temp_dealer_name"),
  securityDepositAmt: numeric("security_deposit_amt", { precision: 14, scale: 2 }),
  pendingAmt: numeric("pending_amt", { precision: 14, scale: 2 }),
  lessThan10Days: numeric("less_than_10_days", { precision: 14, scale: 2 }),
  days10To15: numeric("10_to_15_days", { precision: 14, scale: 2 }),
  days15To21: numeric("15_to_21_days", { precision: 14, scale: 2 }),
  days21To30: numeric("21_to_30_days", { precision: 14, scale: 2 }),
  days30To45: numeric("30_to_45_days", { precision: 14, scale: 2 }),
  days45To60: numeric("45_to_60_days", { precision: 14, scale: 2 }),
  days60To75: numeric("60_to_75_days", { precision: 14, scale: 2 }),
  days75To90: numeric("75_to_90_days", { precision: 14, scale: 2 }),
  greaterThan90Days: numeric("greater_than_90_days", { precision: 14, scale: 2 }),
  isOverdue: boolean("is_overdue").default(false),
  isAccountJsbJud: boolean("is_account_jsb_jud").default(false),
  verifiedDealerId: integer("verified_dealer_id").references(() => verifiedDealers.id, { onDelete: "set null" }),
  collectionReportId: uuid("collection_report_id").references(() => collectionReports.id, { onDelete: "set null" }),
  dvrId: varchar("dvr_id", { length: 255 }).references(() => dailyVisitReports.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
}, (t) => [
  index("idx_outstanding_verified_dealer").on(t.verifiedDealerId),
  index("idx_outstanding_collection_report").on(t.collectionReportId),
  index("idx_outstanding_dvr").on(t.dvrId),
  unique("unique_outstanding_entry").on(t.reportDate, t.verifiedDealerId, t.isAccountJsbJud),
]);

// SALES & COLLECTION PROJECTION VS ACTUAL SNAPSHOT
export const projectionVsActualReports = pgTable("projection_vs_actual_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  reportDate: date("report_date").notNull(),
  institution: varchar("institution", { length: 10 }).notNull(),
  zone: varchar("zone", { length: 120 }).notNull(),
  dealerName: varchar("dealer_name", { length: 255 }).notNull(),
  orderProjectionMt: numeric("order_projection_mt", { precision: 12, scale: 2, }),
  actualOrderReceivedMt: numeric("actual_order_received_mt", { precision: 12, scale: 2, }),
  doDoneMt: numeric("do_done_mt", { precision: 12, scale: 2, }),
  projectionVsActualOrderMt: numeric("projection_vs_actual_order_mt", { precision: 12, scale: 2, }),
  actualOrderVsDoMt: numeric("actual_order_vs_do_mt", { precision: 12, scale: 2, }),
  collectionProjection: numeric("collection_projection", { precision: 14, scale: 2, }),
  actualCollection: numeric("actual_collection", { precision: 14, scale: 2, }),
  shortFall: numeric("short_fall", { precision: 14, scale: 2, }),
  percent: numeric("percent", { precision: 6, scale: 2, }),
  sourceMessageId: text("source_message_id"),
  sourceFileName: text("source_file_name"),
  verifiedDealerId: integer("verified_dealer_id").references(() => verifiedDealers.id, { onDelete: "set null" }),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
},
  (t) => [
    index("idx_proj_actual_date").on(t.reportDate),
    index("idx_proj_actual_zone").on(t.zone),
    index("idx_proj_actual_verified_dealer").on(t.verifiedDealerId),
    index("idx_proj_actual_user").on(t.userId),
    index("idx_proj_actual_institution").on(t.institution),
    uniqueIndex("uniq_proj_actual_snapshot").on(t.reportDate, t.dealerName, t.institution),
  ]);

// SALES & COLLECTION PROJECTION (Planning Data)
export const projectionReports = pgTable("projection_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  institution: varchar("institution", { length: 10 }).notNull(),
  reportDate: date("report_date").notNull(),
  zone: varchar("zone", { length: 100 }).notNull(),
  orderDealerName: varchar("order_dealer_name", { length: 255 }),
  orderQtyMt: numeric("order_qty_mt", { precision: 10, scale: 2 }),
  collectionDealerName: varchar("collection_dealer_name", { length: 255 }),
  collectionAmount: numeric("collection_amount", { precision: 14, scale: 2 }),
  salesPromoterUserId: integer("sales_promoter_user_id"),
  sourceMessageId: text("source_message_id"),
  sourceFileName: text("source_file_name"),
  verifiedDealerId: integer("verified_dealer_id").references(() => verifiedDealers.id, { onDelete: "set null" }),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("idx_projection_date").on(t.reportDate),
  index("idx_projection_zone").on(t.zone),
  index("idx_projection_institution").on(t.institution),
  index("idx_projection_verified_dealer").on(t.verifiedDealerId),
  index("idx_projection_user").on(t.userId),
  uniqueIndex("uniq_projection_snapshot")
    .on(
      t.reportDate,
      t.orderDealerName,
      t.collectionDealerName,
      t.institution,
      t.zone
    ),
]);

/* ========================= rewards (Renamed from gift_inventory to align with sample) ========================= */
export const rewards = pgTable("rewards", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").references((): any => rewardCategories.id, { onDelete: "no action" }),
  itemName: varchar("item_name", { length: 255 }).notNull().unique(),
  pointCost: integer("point_cost").notNull(),
  totalAvailableQuantity: integer("total_available_quantity").notNull(),
  stock: integer("stock").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  meta: jsonb("meta"), // {imageUrl, brand, variant}
  createdAt: timestamp("created_at", { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, precision: 6 }).defaultNow(),
}, (t) => [
  index("idx_rewards_category_id").on(t.categoryId),
]);

/* ========================= gift_allocation_logs ========================= */
export const giftAllocationLogs = pgTable("gift_allocation_logs", {
  id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  giftId: integer("gift_id").notNull().references(() => rewards.id), // References renamed table
  userId: integer("user_id").notNull().references(() => users.id), // TSO/Salesman who managed the gift
  transactionType: varchar("transaction_type", { length: 50 }).notNull(), // Allocation | Transfer | Distribution | Deduction
  quantity: integer("quantity").notNull(),
  sourceUserId: integer("source_user_id").references(() => users.id, { onDelete: "set null" }),
  destinationUserId: integer("destination_user_id").references(() => users.id, { onDelete: "set null" }),

  // --- MODIFIED FOR PRISMA SYNC ---
  technicalVisitReportId: varchar("technical_visit_report_id", { length: 255 }).references(() => technicalVisitReports.id, { onDelete: "set null" }),
  dealerVisitReportId: varchar("dealer_visit_report_id", { length: 255 }).references(() => dailyVisitReports.id, { onDelete: "set null" }),
  // --- END MODIFICATION ---

  createdAt: timestamp("created_at", { withTimezone: true, precision: 6 }).defaultNow().notNull(),
}, (t) => [
  index("idx_gift_logs_gift_id").on(t.giftId),
  index("idx_gift_logs_user_id").on(t.userId),
  index("idx_gift_logs_source_user_id").on(t.sourceUserId),
  index("idx_gift_logs_destination_user_id").on(t.destinationUserId),
  // --- ADDED INDEXES ---
  index("idx_gift_logs_tvr_id").on(t.technicalVisitReportId),
  index("idx_gift_logs_dvr_id").on(t.dealerVisitReportId),
]);

/* ========================= sales_orders (FIXED) ========================= */
export const salesOrders = pgTable("sales_orders", {
  id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),

  // Relations
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  dealerId: varchar("dealer_id", { length: 255 }).references(() => dealers.id, { onDelete: "set null" }),
  dvrId: varchar("dvr_id", { length: 255 }).references(() => dailyVisitReports.id, { onDelete: "set null" }),
  pjpId: varchar("pjp_id", { length: 255 }).references(() => permanentJourneyPlans.id, { onDelete: "set null" }),

  // Business fields
  orderDate: date("order_date").notNull(),
  orderPartyName: varchar("order_party_name", { length: 255 }).notNull(),

  // Party details
  partyPhoneNo: varchar("party_phone_no", { length: 20 }),
  partyArea: varchar("party_area", { length: 255 }),
  partyRegion: varchar("party_region", { length: 255 }),
  partyAddress: varchar("party_address", { length: 500 }),

  // Delivery details
  deliveryDate: date("delivery_date"),
  deliveryArea: varchar("delivery_area", { length: 255 }),
  deliveryRegion: varchar("delivery_region", { length: 255 }),
  deliveryAddress: varchar("delivery_address", { length: 500 }),
  deliveryLocPincode: varchar("delivery_loc_pincode", { length: 10 }),

  // Payment
  paymentMode: varchar("payment_mode", { length: 50 }),
  paymentTerms: varchar("payment_terms", { length: 500 }),
  paymentAmount: numeric("payment_amount", { precision: 12, scale: 2 }),
  receivedPayment: numeric("received_payment", { precision: 12, scale: 2 }),
  receivedPaymentDate: date("received_payment_date"),
  pendingPayment: numeric("pending_payment", { precision: 12, scale: 2 }),

  // Qty & unit
  orderQty: numeric("order_qty", { precision: 12, scale: 3 }),
  orderUnit: varchar("order_unit", { length: 20 }), // "MT" | "BAGS"

  // Pricing & discounts
  itemPrice: numeric("item_price", { precision: 12, scale: 2 }),
  discountPercentage: numeric("discount_percentage", { precision: 5, scale: 2 }),
  itemPriceAfterDiscount: numeric("item_price_after_discount", { precision: 12, scale: 2 }),

  // Product classification
  itemType: varchar("item_type", { length: 20 }), // "PPC" | "OPC"
  itemGrade: varchar("item_grade", { length: 10 }), // "33" | "43" | "53"

  // Added status field for the Admin approval workflow
  status: varchar("status", { length: 50 }).notNull().default("Pending"), // e.g., "Pending", "Approved", "Rejected"

  createdAt: timestamp("created_at", { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, precision: 6 }).defaultNow().notNull(),
}, (t) => [
  index("idx_sales_orders_dvr_id").on(t.dvrId),
  index("idx_sales_orders_pjp_id").on(t.pjpId),
  index("idx_sales_orders_order_date").on(t.orderDate),
  index("idx_sales_orders_dealer_id").on(t.dealerId),
  index("idx_sales_orders_status").on(t.status),
]);

/* ========================= mason_pc_side (Modified for KYC and Points Balance) ========================= */
export const masonPcSide = pgTable("mason_pc_side", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  phoneNumber: text("phone_number").notNull(),
  kycDocumentName: varchar("kyc_doc_name", { length: 100 }),
  kycDocumentIdNum: varchar("kyc_doc_id_num", { length: 150 }),
  kycStatus: varchar("kyc_status", { length: 50 }).default("none"), // "none" | "pending" | "approved" | "rejected"
  pointsBalance: integer("points_balance").notNull().default(0),
  firebaseUid: varchar("firebase_uid", { length: 128 }).unique(),
  deviceId: varchar("device_id", { length: 255 }).unique(),
  fcmToken: varchar("fcm_token", { length: 500 }),
  bagsLifted: integer("bags_lifted"), // Keep for historical tracking of volume
  isReferred: boolean("is_referred"),
  referredByUser: text("referred_by_user"),
  referredToUser: text("referred_to_user"),
  dealerId: varchar("dealer_id", { length: 255 }).references(() => dealers.id, { onDelete: "set null", onUpdate: "cascade" }),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null", onUpdate: "cascade" }), // TSO/Salesperson ID
}, (t) => [
  index("idx_mason_pc_side_dealer_id").on(t.dealerId),
  index("idx_mason_pc_side_user_id").on(t.userId),
]);

/* ========================= otp_verifications ========================= */
export const otpVerifications = pgTable("otp_verifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  otpCode: varchar("otp_code", { length: 10 }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true, precision: 6 }).notNull(),
  masonId: uuid("mason_id").notNull().references(() => masonPcSide.id, { onDelete: "cascade" }),
}, (t) => [
  index("idx_otp_verifications_mason_id").on(t.masonId),
]);

/* ========================= schemes_offers ========================= */
export const schemesOffers = pgTable("schemes_offers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  startDate: timestamp("start_date", { withTimezone: true, precision: 6 }),
  endDate: timestamp("end_date", { withTimezone: true, precision: 6 }),
});

/* ========================= mason_on_scheme (join table) ========================= */
export const masonOnScheme = pgTable("mason_on_scheme", {
  masonId: uuid("mason_id").notNull().references(() => masonPcSide.id, { onDelete: "cascade", onUpdate: "cascade" }),
  schemeId: uuid("scheme_id").notNull().references(() => schemesOffers.id, { onDelete: "cascade", onUpdate: "cascade" }),
  enrolledAt: timestamp("enrolled_at", { withTimezone: true, precision: 6 }).defaultNow(),
  siteId: uuid("site_id").references(() => technicalSites.id, { onDelete: "set null" }),
  status: varchar("status", { length: 255 }),
}, (t) => ({
  pk: primaryKey({ columns: [t.masonId, t.schemeId] }),
  siteIndex: index("idx_mason_on_scheme_site_id").on(t.siteId),
}));

/* ========================= masons_on_meetings (join table) ========================= */
export const masonsOnMeetings = pgTable("masons_on_meetings", {
  masonId: uuid("mason_id").notNull().references(() => masonPcSide.id, { onDelete: "cascade" }),
  meetingId: varchar("meeting_id", { length: 255 }).notNull().references(() => tsoMeetings.id, { onDelete: "cascade" }),
  attendedAt: timestamp("attended_at", { withTimezone: true, precision: 6 }).defaultNow().notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.masonId, t.meetingId] }),
  meetingIdIndex: index("idx_masons_on_meetings_meeting_id").on(t.meetingId),
}));


// --- NEW LOYALTY TABLES FROM SAMPLE SCHEMA (Referencing masonPcSide) ---

/* ========================= reward_categories (new) ========================= */
export const rewardCategories = pgTable("reward_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull().unique(),
});

/* ========================= kyc_submissions (new) ========================= */
export const kycSubmissions = pgTable("kyc_submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  // References masonPcSide ID (UUID)
  masonId: uuid("mason_id").notNull().references(() => masonPcSide.id, { onDelete: "cascade" }),
  aadhaarNumber: varchar("aadhaar_number", { length: 20 }),
  panNumber: varchar("pan_number", { length: 20 }),
  voterIdNumber: varchar("voter_id_number", { length: 20 }),
  documents: jsonb("documents"), // {aadhaarFrontUrl, aadhaarBackUrl, panUrl, voterUrl}
  status: varchar("status", { length: 20 }).notNull().default("pending"), // "none", "pending", "approved", "rejected"
  remark: text("remark"),
  createdAt: timestamp("created_at", { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, precision: 6 }).defaultNow(),
}, (t) => [
  index("idx_kyc_submissions_mason_id").on(t.masonId),
]);

/* ========================= tso_assignments (MODIFIED to match Prisma) ========================= */
export const tsoAssignments = pgTable("tso_assignments", {
  tsoId: integer("tso_id").notNull().references(() => users.id), // TSO is a regular user
  masonId: uuid("mason_id").notNull().references(() => masonPcSide.id, { onDelete: "cascade" }), // The mason being managed
  createdAt: timestamp("created_at", { withTimezone: true, precision: 6 }).defaultNow().notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.tsoId, t.masonId] }),
  // Only index on tsoId to match Prisma's @@index([tsoId])
  tsoIdIndex: index("idx_tso_assignments_tso_id").on(t.tsoId),
}));

/* ========================= bag_lifts (MODIFIED to match Prisma) ========================= */
export const bagLifts = pgTable("bag_lifts", {
  id: uuid("id").primaryKey().defaultRandom(),
  masonId: uuid("mason_id").notNull().references(() => masonPcSide.id, { onDelete: "cascade" }),
  dealerId: varchar("dealer_id", { length: 255 }).references(() => dealers.id, { onDelete: "set null" }),
  purchaseDate: timestamp("purchase_date", { withTimezone: true, precision: 6 }).notNull(),
  bagCount: integer("bag_count").notNull(),
  pointsCredited: integer("points_credited").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  imageUrl: text("image_url"),
  siteId: uuid("site_id").references(() => technicalSites.id, { onDelete: "set null" }),
  siteKeyPersonName: varchar("site_key_person_name", { length: 255 }),
  siteKeyPersonPhone: varchar("site_key_person_phone", { length: 20 }),
  verificationSiteImageUrl: text("verification_site_image_url"),
  verificationProofImageUrl: text("verification_proof_image_url"),

  approvedBy: integer("approved_by").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at", { withTimezone: true, precision: 6 }),
  createdAt: timestamp("created_at", { withTimezone: true, precision: 6 }).defaultNow().notNull(),
}, (t) => [
  index("idx_bag_lifts_mason_id").on(t.masonId),
  index("idx_bag_lifts_dealer_id").on(t.dealerId),
  index("idx_bag_lifts_status").on(t.status),
  // New index for faster queries on site_id
  index("idx_bag_lifts_site_id").on(t.siteId),
]);

/* ========================= points_ledger (MODIFIED to match Prisma) ========================= */
export const pointsLedger = pgTable("points_ledger", {
  id: uuid("id").primaryKey().defaultRandom(),
  masonId: uuid("mason_id").notNull().references(() => masonPcSide.id, { onDelete: "cascade" }),
  sourceType: varchar("source_type", { length: 32 }).notNull(), // "bag_lift" | "redemption" | "adjustment"
  sourceId: uuid("source_id"), // References bag_lifts.id or rewardRedemptions.id
  points: integer("points").notNull(), // +ve for credit, -ve for debit
  memo: text("memo"),
  createdAt: timestamp("created_at", { withTimezone: true, precision: 6 }).defaultNow().notNull(),
}, (t) => [
  // Added unique index on sourceId to match Prisma's @@unique constraint
  uniqueIndex("points_ledger_source_id_unique").on(t.sourceId),
  index("idx_points_ledger_mason_id").on(t.masonId),
  index("idx_points_ledger_source_id").on(t.sourceId),
]);

/* ========================= reward_redemptions (to cover missing orders table) ========================= */
export const rewardRedemptions = pgTable("reward_redemptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  masonId: uuid("mason_id").notNull().references(() => masonPcSide.id, { onDelete: "cascade" }),
  rewardId: integer("reward_id").notNull().references(() => rewards.id, { onDelete: "no action" }),
  quantity: integer("quantity").notNull().default(1),
  status: varchar("status", { length: 20 }).notNull().default("placed"), // "placed", "approved", "shipped", "delivered", "rejected"
  fulfillmentNotes: text("fulfillment_notes"),
  pointsDebited: integer("points_debited").notNull(),
  // Delivery details
  deliveryName: varchar("delivery_name", { length: 160 }),
  deliveryPhone: varchar("delivery_phone", { length: 20 }),
  deliveryAddress: text("delivery_address"),
  createdAt: timestamp("created_at", { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, precision: 6 }).defaultNow(),
}, (t) => [
  index("idx_reward_redemptions_mason_id").on(t.masonId),
  index("idx_reward_redemptions_status").on(t.status),
]);

// --- END LOYALTY TABLES FROM SAMPLE SCHEMA ---

export const technicalSites = pgTable("technical_sites", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  siteName: varchar("site_name", { length: 255 }).notNull(),

  // PRIMARY CONTACT INFO
  concernedPerson: varchar("concerned_person", { length: 255 }).notNull(),
  phoneNo: varchar("phone_no", { length: 20 }).notNull(),
  address: text("address"),

  // LOCATION AND GEOGRAPHY
  latitude: numeric("latitude", { precision: 10, scale: 7 }),
  longitude: numeric("longitude", { precision: 10, scale: 7 }),
  siteType: varchar("site_type", { length: 50 }),
  area: varchar("area", { length: 100 }),
  region: varchar("region", { length: 100 }),

  // SECONDARY/KEYPERSON DETAILS
  keyPersonName: varchar("key_person_name", { length: 255 }),
  keyPersonPhoneNum: varchar("key_person_phone_num", { length: 20 }),

  // PROJECT/CONSTRUCTION STATUS
  stageOfConstruction: varchar("stage_of_construction", { length: 100 }),
  constructionStartDate: date("construction_start_date"),
  constructionEndDate: date("construction_end_date"),

  // SALES/TSO TRACKING FIELDS
  convertedSite: boolean("converted_site").default(false),
  firstVisitDate: date("first_visit_date"),
  lastVisitDate: date("last_visit_date"),
  needFollowUp: boolean("need_follow_up").default(false),
  imageUrl: text("image_url"),

  createdAt: timestamp("created_at", { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, precision: 6 }).defaultNow().notNull(),
});

export const schemeSlabs = pgTable("scheme_slabs", {
  id: uuid("id").primaryKey().defaultRandom(),

  minBagsBest: integer("min_bags_best"),
  minBagsOthers: integer("min_bags_others"),
  pointsEarned: integer("points_earned").notNull(),
  slabDescription: varchar("slab_description", { length: 255 }),

  rewardId: integer("reward_id").references(() => rewards.id, { onDelete: "set null" }),
  schemeId: uuid("scheme_id").notNull().references(() => schemesOffers.id, { onDelete: "cascade" }),

  createdAt: timestamp("created_at", { withTimezone: true, precision: 6 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, precision: 6 }).defaultNow(),
}, (t) => [
  index("idx_scheme_slabs_scheme_id").on(t.schemeId),
]);

export const masonSlabAchievements = pgTable("mason_slab_achievements", {
  id: uuid("id").primaryKey().defaultRandom(),
  masonId: uuid("mason_id").notNull().references(() => masonPcSide.id, { onDelete: "cascade" }),
  schemeSlabId: uuid("scheme_slab_id").notNull().references(() => schemeSlabs.id, { onDelete: "cascade" }),
  achievedAt: timestamp("achieved_at", { withTimezone: true }).defaultNow().notNull(),
  pointsAwarded: integer("points_awarded").notNull(),
}, (t) => [
  index("idx_msa_mason_id").on(t.masonId),
  uniqueIndex("unique_mason_slab_claim").on(t.masonId, t.schemeSlabId),
]);

// ---------- MANY to MANY relations for User/Dealer/Masons/technicalSites -------- 
// ONE USER can have -> MANY Dealers/Masons/technicalSites
// REST of the three can have MANY to MANY with each other

// 1. Dealer <-> TechnicalSite
export const siteAssociatedDealers = pgTable("_SiteAssociatedDealers", {
  A: varchar("A", { length: 255 }).notNull().references(() => dealers.id, { onDelete: "cascade", onUpdate: "cascade" }),
  B: uuid("B").notNull().references(() => technicalSites.id, { onDelete: "cascade", onUpdate: "cascade" }),
}, (t) => [
  uniqueIndex("_SiteAssociatedDealers_AB_unique").on(t.A, t.B),
  index("_SiteAssociatedDealers_B_index").on(t.B),
]);

// 2. Dealer <-> Mason
export const dealerAssociatedMasons = pgTable("_DealerAssociatedMasons", {
  A: varchar("A", { length: 255 }).notNull().references(() => dealers.id, { onDelete: "cascade", onUpdate: "cascade" }),
  B: uuid("B").notNull().references(() => masonPcSide.id, { onDelete: "cascade", onUpdate: "cascade" }),
}, (t) => [
  uniqueIndex("_DealerAssociatedMasons_AB_unique").on(t.A, t.B),
  index("_DealerAssociatedMasons_B_index").on(t.B),
]);

// 3. Mason <-> TechnicalSite
export const siteAssociatedMasons = pgTable("_SiteAssociatedMasons", {
  A: uuid("A").notNull().references(() => masonPcSide.id, { onDelete: "cascade", onUpdate: "cascade" }),
  B: uuid("B").notNull().references(() => technicalSites.id, { onDelete: "cascade", onUpdate: "cascade" }),
}, (t) => [
  uniqueIndex("_SiteAssociatedMasons_AB_unique").on(t.A, t.B),
  index("_SiteAssociatedMasons_B_index").on(t.B),
]);

// 4. TechnicalSite <-> User
export const siteAssociatedUsers = pgTable("_SiteAssociatedUsers", {
  A: uuid("A").notNull().references(() => technicalSites.id, { onDelete: "cascade", onUpdate: "cascade" }),
  B: integer("B").notNull().references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
}, (t) => [
  uniqueIndex("_SiteAssociatedUsers_AB_unique").on(t.A, t.B),
  index("_SiteAssociatedUsers_B_index").on(t.B),
]);

export const schemeToRewards = pgTable("_SchemeToRewards", {
  A: integer("A").notNull().references(() => rewards.id, { onDelete: "cascade", onUpdate: "cascade" }),
  B: uuid("B").notNull().references(() => schemesOffers.id, { onDelete: "cascade", onUpdate: "cascade" }),
}, (t) => [
  uniqueIndex("_SchemeToRewards_AB_unique").on(t.A, t.B),
  index("_SchemeToRewards_B_index").on(t.B),
]);

export const logisticsUsers = pgTable("logistics_users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceName: varchar("source_name", { length: 255 }),
  userName: varchar("user_name", { length: 255 }).unique().notNull(),
  userPassword: varchar("user_password", { length: 255 }).notNull(),
  userRole: varchar("user_role", { length: 255 }).notNull(), // 'GATE', 'WB', 'STORE', 'ADMIN' etc.

  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const logisticsIO = pgTable("logistics_io", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  zone: varchar("zone", { length: 255 }),
  district: varchar("district", { length: 255 }),
  destination: varchar("destination", { length: 255 }),
  doOrderDate: date("doOrderDate"),
  doOrderTime: varchar("doOrderTime", { length: 50 }),
  gateInDate: date("gateInDate"),
  gateInTime: varchar("gateInTime", { length: 50 }),
  processingTime: varchar("processingTime", { length: 100 }),
  wbInDate: date("wbInDate"),
  wbInTime: varchar("wbInTime", { length: 50 }),
  diffGateInTareWt: varchar("diffGateInTareWt", { length: 100 }),
  wbOutDate: date("wbOutDate"),
  wbOutTime: varchar("wbOutTime", { length: 50 }),
  diffTareWtGrossWt: varchar("diffTareWtGrossWt", { length: 100 }),
  gateOutDate: date("gateOutDate"),
  gateOutTime: varchar("gateOutTime", { length: 50 }),
  gateOutNoOfInvoice: integer("gate_out_no_of_invoice"),
  gateOutInvoiceNos: text("gate_out_invoice_nos").array(),
  gateOutBillNos: text("gate_out_bill_nos").array(),
  diffGrossWtGateOut: varchar("diffGrossWtGateOut", { length: 100 }),
  diffGrossWtInvoiceDT: varchar("diffGrossWtInvoiceDT", { length: 100 }),
  diffInvoiceDTGateOut: varchar("diffInvoiceDTGateOut", { length: 100 }),
  diffGateInGateOut: varchar("diffGateInGateOut", { length: 100 }),
  purpose: varchar("purpose", { length: 255 }),
  typeOfMaterials: varchar("type_of_materials", { length: 255 }),
  vehicleNumber: varchar("vehicle_number", { length: 100 }),
  storeDate: date("store_date"),
  storeTime: varchar("store_time", { length: 50 }),
  noOfInvoice: integer("no_of_invoice"),
  partyName: varchar("party_name", { length: 255 }),
  invoiceNos: text("invoice_nos").array(),
  billNos: text("bill_nos").array(),
  sourceName: varchar("source_name", { length: 255 }),

  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

/* ========================= drizzle-zod insert schemas ========================= */
export const insertCompanySchema = createInsertSchema(companies);
export const insertUserSchema = createInsertSchema(users);
export const insertUserRoles = createInsertSchema(userRoles);
export const insertRoles = createInsertSchema(roles);
export const insertDailyVisitReportSchema = createInsertSchema(dailyVisitReports);
export const insertTechnicalVisitReportSchema = createInsertSchema(technicalVisitReports);
export const insertPermanentJourneyPlanSchema = createInsertSchema(permanentJourneyPlans);
export const insertDealerSchema = createInsertSchema(dealers);
export const insertSalesPromoterSchema = createInsertSchema(salesPromoters);
export const insertSalesmanAttendanceSchema = createInsertSchema(salesmanAttendance);
export const insertSalesmanLeaveApplicationSchema = createInsertSchema(salesmanLeaveApplications);
export const insertCompetitionReportSchema = createInsertSchema(competitionReports);
export const insertDailyTaskSchema = createInsertSchema(dailyTasks);
export const insertDealerReportsAndScoresSchema = createInsertSchema(dealerReportsAndScores);
export const insertRatingSchema = createInsertSchema(ratings);
export const insertSalesOrderSchema = createInsertSchema(salesOrders);
export const insertBrandSchema = createInsertSchema(brands);
export const insertDealerBrandMappingSchema = createInsertSchema(dealerBrandMapping);
export const insertTsoMeetingSchema = createInsertSchema(tsoMeetings);
export const insertauthSessionsSchema = createInsertSchema(authSessions);

// journey + geotracking
export const insertGeoTrackingSchema = createInsertSchema(geoTracking);
export const insertJourneyOpsSchema = createInsertSchema(journeyOps);
export const insertJourneysSchema = createInsertSchema(journeys);
export const insertJourneyBreadcrumbsSchema = createInsertSchema(journeyBreadcrumbs);
export const insertSyncStateSchema = createInsertSchema(syncState);

// Changed giftInventory to rewards
export const insertRewardsSchema = createInsertSchema(rewards);
export const insertGiftAllocationLogSchema = createInsertSchema(giftAllocationLogs);

// Modified masonPcSide schema
export const insertMasonPcSideSchema = createInsertSchema(masonPcSide);
export const insertOtpVerificationSchema = createInsertSchema(otpVerifications);
export const insertSchemesOffersSchema = createInsertSchema(schemesOffers);
export const insertMasonOnSchemeSchema = createInsertSchema(masonOnScheme);
export const insertMasonsOnMeetingsSchema = createInsertSchema(masonsOnMeetings);

export const insertRewardCategorySchema = createInsertSchema(rewardCategories);
export const insertKycSubmissionSchema = createInsertSchema(kycSubmissions);
export const insertTsoAssignmentSchema = createInsertSchema(tsoAssignments);
export const insertBagLiftSchema = createInsertSchema(bagLifts);
export const insertPointsLedgerSchema = createInsertSchema(pointsLedger);
export const insertRewardRedemptionSchema = createInsertSchema(rewardRedemptions);
export const insertTechnicalSiteSchema = createInsertSchema(technicalSites);
export const insertSchemeSlabsSchema = createInsertSchema(schemeSlabs);
export const insertMasonSlabAchievementSchema = createInsertSchema(masonSlabAchievements);
export const insertNotificationSchema = createInsertSchema(notifications);

// logistics
export const insertLogisticsUsersSchema = createInsertSchema(logisticsUsers);
export const insertLogisticsIOSchema = createInsertSchema(logisticsIO);

//emailStuff
export const insertEmailReportSchema = createInsertSchema(emailReports);
export const insertCollectionReportsSchema = createInsertSchema(collectionReports);
export const insertOutstandingReportsSchema = createInsertSchema(outstandingReports);
export const insertVerifiedDealersSchema = createInsertSchema(verifiedDealers);
export const insertProjectionVsActualReportsSchema = createInsertSchema(projectionVsActualReports);
export const insertProjectionReportsSchema = createInsertSchema(projectionReports);
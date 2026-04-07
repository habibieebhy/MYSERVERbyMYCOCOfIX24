// drizzle/schema.ts
import {
  pgSchema, uniqueIndex, foreignKey, varchar, text, numeric, timestamp,
  index, integer, date, uuid, boolean, unique, serial, jsonb, doublePrecision,
  bigserial, check, bigint, real, primaryKey,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { createInsertSchema } from "drizzle-zod";

export const myCustomSchema = pgSchema("bestcement");

export const companies = myCustomSchema.table("companies", {
  id: serial().primaryKey().notNull(),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  officeAddress: text("office_address").notNull(),
  isHeadOffice: boolean("is_head_office").default(true).notNull(),
  phoneNumber: varchar("phone_number", { length: 50 }).notNull(),
  adminUserId: text("admin_user_id").notNull(),
  createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
  workosOrganizationId: text("workos_organization_id"),
  area: text(),
  region: text(),
}, (table) => [
  uniqueIndex("companies_admin_user_id_key").using("btree", table.adminUserId.asc().nullsLast()),
  uniqueIndex("companies_workos_organization_id_key").using("btree", table.workosOrganizationId.asc().nullsLast()),
  index("idx_admin_user_id").using("btree", table.adminUserId.asc().nullsLast()),
]);

export const users = myCustomSchema.table("users", {
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
  index("idx_user_company_id").using("btree", table.companyId.asc().nullsLast()),
  index("idx_user_device_id").using("btree", table.deviceId.asc().nullsLast()),
  index("idx_workos_user_id").using("btree", table.workosUserId.asc().nullsLast()),
  uniqueIndex("users_company_id_email_key").using("btree", table.companyId.asc().nullsLast(), table.email.asc().nullsLast()),
  uniqueIndex("users_inviteToken_key").using("btree", table.inviteToken.asc().nullsLast()),
  uniqueIndex("users_salesman_login_id_key").using("btree", table.salesmanLoginId.asc().nullsLast()),
  uniqueIndex("users_workos_user_id_key").using("btree", table.workosUserId.asc().nullsLast()),
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

export const roles = myCustomSchema.table("roles", {
  id: serial("id").primaryKey(),
  orgRole: varchar("org_role", { length: 100 }), // e.g., 'President', 'General Manager', 'Executive'
  jobRole: varchar("job_role", { length: 100 }), // e.g., 'Sales', 'Technical Sales', 'IT', 'MIS'
  grantedPerms: text("granted_perms").array().notNull().default(sql`ARRAY[]::text[]`),
  permDescription: varchar("perm_description", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userRoles = myCustomSchema.table("user_roles", {
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  roleId: integer("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
}, (t) => [
  primaryKey({ columns: [t.userId, t.roleId] }),
]);

export const authSessions = myCustomSchema.table("auth_sessions", {
  sessionId: uuid("session_id").defaultRandom().primaryKey().notNull(),
  masonId: uuid("mason_id").notNull(),
  sessionToken: text("session_token").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
  foreignKey({
    columns: [table.masonId],
    foreignColumns: [masonPcSide.id],
    name: "auth_sessions_mason_id_fkey"
  }).onDelete("cascade"),
  unique("auth_sessions_session_token_key").on(table.sessionToken),
]);

export const dealers = myCustomSchema.table("dealers", {
  id: varchar({ length: 255 }).primaryKey().notNull(),
  userId: integer("user_id"),
  type: varchar({ length: 50 }).notNull(),
  parentDealerId: varchar("parent_dealer_id", { length: 255 }),
  name: varchar({ length: 255 }).notNull(),
  region: varchar({ length: 100 }).notNull(),
  area: varchar({ length: 255 }).notNull(),
  phoneNo: varchar("phone_no", { length: 20 }).notNull(),
  address: varchar({ length: 500 }).notNull(),
  totalPotential: numeric("total_potential", { precision: 10, scale: 2 }).notNull(),
  bestPotential: numeric("best_potential", { precision: 10, scale: 2 }).notNull(),
  brandSelling: text("brand_selling").array(),
  feedbacks: varchar({ length: 500 }).notNull(),
  remarks: varchar({ length: 500 }),
  createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  pinCode: varchar({ length: 20 }),
  dateOfBirth: date(),
  anniversaryDate: date(),
  latitude: numeric({ precision: 10, scale: 7 }),
  longitude: numeric({ precision: 10, scale: 7 }),
  verificationStatus: varchar("verification_status", { length: 50 }).default('PENDING').notNull(),
  whatsappNo: varchar("whatsapp_no", { length: 20 }),
  emailId: varchar("email_id", { length: 255 }),
  businessType: varchar("business_type", { length: 100 }),
  gstinNo: varchar("gstin_no", { length: 20 }),
  panNo: varchar("pan_no", { length: 20 }),
  tradeLicNo: varchar("trade_lic_no", { length: 150 }),
  aadharNo: varchar("aadhar_no", { length: 20 }),
  godownSizeSqft: integer("godown_size_sqft"),
  godownCapacityMtBags: varchar("godown_capacity_mt_bags", { length: 500 }),
  godownAddressLine: varchar("godown_address_line", { length: 500 }),
  godownLandmark: varchar("godown_landmark", { length: 255 }),
  godownDistrict: varchar("godown_district", { length: 100 }),
  godownArea: varchar("godown_area", { length: 255 }),
  godownRegion: varchar("godown_region", { length: 100 }),
  godownPincode: varchar("godown_pincode", { length: 20 }),
  residentialAddressLine: varchar("residential_address_line", { length: 500 }),
  residentialLandmark: varchar("residential_landmark", { length: 255 }),
  residentialDistrict: varchar("residential_district", { length: 100 }),
  residentialArea: varchar("residential_area", { length: 255 }),
  residentialRegion: varchar("residential_region", { length: 100 }),
  residentialPincode: varchar("residential_pincode", { length: 20 }),
  bankAccountName: varchar("bank_account_name", { length: 255 }),
  bankName: varchar("bank_name", { length: 255 }),
  bankBranchAddress: varchar("bank_branch_address", { length: 500 }),
  bankAccountNumber: varchar("bank_account_number", { length: 50 }),
  bankIfscCode: varchar("bank_ifsc_code", { length: 50 }),
  brandName: varchar("brand_name", { length: 255 }),
  monthlySaleMt: numeric("monthly_sale_mt", { precision: 10, scale: 2 }),
  noOfDealers: integer("no_of_dealers"),
  areaCovered: varchar("area_covered", { length: 255 }),
  projectedMonthlySalesBestCementMt: numeric("projected_monthly_sales_best_cement_mt", { precision: 10, scale: 2 }),
  noOfEmployeesInSales: integer("no_of_employees_in_sales"),
  declarationName: varchar("declaration_name", { length: 255 }),
  declarationPlace: varchar("declaration_place", { length: 100 }),
  declarationDate: date("declaration_date"),
  tradeLicencePicUrl: varchar("trade_licence_pic_url", { length: 500 }),
  shopPicUrl: varchar("shop_pic_url", { length: 500 }),
  dealerPicUrl: varchar("dealer_pic_url", { length: 500 }),
  blankChequePicUrl: varchar("blank_cheque_pic_url", { length: 500 }),
  partnershipDeedPicUrl: varchar("partnership_deed_pic_url", { length: 500 }),
  dealerdevelopmentstatus: varchar({ length: 50 }),
  dealerdevelopmentobstacle: varchar({ length: 500 }),
  salesGrowthPercentage: numeric("sales_growth_percentage", { precision: 5, scale: 2 }),
  noOfPjp: integer("no_of_pjp"),
  nameOfFirm: varchar({ length: 500 }),
  underSalesPromoterName: varchar({ length: 200 }),
}, (table) => [
  index("idx_dealers_parent_dealer_id").using("btree", table.parentDealerId.asc().nullsLast()),
  index("idx_dealers_user_id").using("btree", table.userId.asc().nullsLast()),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "dealers_user_id_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.parentDealerId],
    foreignColumns: [table.id],
    name: "dealers_parent_dealer_id_fkey"
  }).onUpdate("cascade").onDelete("set null"),
  unique("dealers_gstin_no_unique").on(table.gstinNo),
]);

export const verifiedDealers = myCustomSchema.table("verified_dealers", {
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
  creditDaysAllowed: integer("credit_days_allowed"),
  isActive: boolean("is_active").default(true),
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
]);

export const salesPromoters = myCustomSchema.table("sales_promoters", {
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

export const permanentJourneyPlans = myCustomSchema.table("permanent_journey_plans", {
  id: varchar({ length: 255 }).primaryKey().notNull(),
  userId: integer("user_id").notNull(),
  planDate: date("plan_date").notNull(),
  areaToBeVisited: varchar("area_to_be_visited", { length: 500 }).notNull(),
  description: varchar({ length: 500 }),
  status: varchar({ length: 50 }).notNull(),
  createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  createdById: integer("created_by_id").notNull(),
  verificationStatus: varchar("verification_status", { length: 50 }),
  additionalVisitRemarks: varchar("additional_visit_remarks", { length: 500 }),
  dealerId: varchar("dealer_id", { length: 255 }),
  bulkOpId: varchar("bulk_op_id", { length: 50 }),
  idempotencyKey: varchar("idempotency_key", { length: 120 }),
  siteId: uuid("site_id"),
  route: varchar({ length: 500 }),
  plannedNewSiteVisits: integer("planned_new_site_visits").default(0),
  plannedFollowUpSiteVisits: integer("planned_follow_up_site_visits").default(0),
  plannedNewDealerVisits: integer("planned_new_dealer_visits").default(0),
  plannedInfluencerVisits: integer("planned_influencer_visits").default(0),
  influencerName: varchar("influencer_name", { length: 255 }),
  influencerPhone: varchar("influencer_phone", { length: 20 }),
  activityType: varchar("activity_type", { length: 255 }),
  noofConvertedBags: integer("noof_converted_bags").default(0),
  noofMasonpcInSchemes: integer("noof_masonpc_in_schemes").default(0),
  diversionReason: varchar("diversion_reason", { length: 500 }),
}, (table) => [
  index("idx_permanent_journey_plans_created_by_id").using("btree", table.createdById.asc().nullsLast()),
  index("idx_permanent_journey_plans_user_id").using("btree", table.userId.asc().nullsLast()),
  index("idx_pjp_bulk_op_id").using("btree", table.bulkOpId.asc().nullsLast()),
  index("idx_pjp_dealer_id").using("btree", table.dealerId.asc().nullsLast()),
  index("idx_pjp_site_id").using("btree", table.siteId.asc().nullsLast()),
  uniqueIndex("uniq_pjp_idempotency_key_not_null").using("btree", table.idempotencyKey.asc().nullsLast()).where(sql`(idempotency_key IS NOT NULL)`),
  uniqueIndex("uniq_pjp_user_dealer_plan_date").using("btree", table.userId.asc().nullsLast(), table.dealerId.asc().nullsLast(), table.planDate.asc().nullsLast()),
  foreignKey({
    columns: [table.dealerId],
    foreignColumns: [dealers.id],
    name: "fk_pjp_dealer_id"
  }).onDelete("set null"),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "permanent_journey_plans_user_id_fkey"
  }).onUpdate("cascade").onDelete("restrict"),
  foreignKey({
    columns: [table.createdById],
    foreignColumns: [users.id],
    name: "permanent_journey_plans_created_by_id_fkey"
  }).onUpdate("cascade").onDelete("restrict"),
  foreignKey({
    columns: [table.siteId],
    foreignColumns: [technicalSites.id],
    name: "permanent_journey_plans_site_id_fkey"
  }).onDelete("set null"),
]);

export const dailyTasks = myCustomSchema.table("daily_tasks", {
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

export const dailyVisitReports = myCustomSchema.table("daily_visit_reports", {
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

export const technicalVisitReports = myCustomSchema.table("technical_visit_reports", {
  id: varchar({ length: 255 }).primaryKey().notNull(),
  userId: integer("user_id").notNull(),
  reportDate: date("report_date").notNull(),
  visitType: varchar("visit_type", { length: 50 }).notNull(),
  siteNameConcernedPerson: varchar("site_name_concerned_person", { length: 255 }).notNull(),
  phoneNo: varchar("phone_no", { length: 20 }).notNull(),
  emailId: varchar("email_id", { length: 255 }),
  clientsRemarks: varchar("clients_remarks", { length: 500 }).notNull(),
  salespersonRemarks: varchar("salesperson_remarks", { length: 500 }).notNull(),
  checkInTime: timestamp("check_in_time", { precision: 6, withTimezone: true, mode: 'string' }).notNull(),
  checkOutTime: timestamp("check_out_time", { precision: 6, withTimezone: true, mode: 'string' }),
  inTimeImageUrl: varchar("in_time_image_url", { length: 500 }),
  outTimeImageUrl: varchar("out_time_image_url", { length: 500 }),
  createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  associatedPartyName: text("associated_party_name"),
  channelPartnerVisit: text("channel_partner_visit"),
  conversionFromBrand: text("conversion_from_brand"),
  conversionQuantityUnit: varchar("conversion_quantity_unit", { length: 20 }),
  conversionQuantityValue: numeric("conversion_quantity_value", { precision: 10, scale: 2 }),
  promotionalActivity: text("promotional_activity"),
  qualityComplaint: text("quality_complaint"),
  serviceType: text("service_type"),
  siteVisitStage: text("site_visit_stage"),
  siteVisitBrandInUse: text("site_visit_brand_in_use").array().default([""]).notNull(),
  influencerType: text("influencer_type").array().default([""]).notNull(),
  siteVisitType: varchar("site_visit_type", { length: 50 }),
  dhalaiVerificationCode: varchar("dhalai_verification_code", { length: 50 }),
  isVerificationStatus: varchar("is_verification_status", { length: 50 }),
  meetingId: varchar("meeting_id", { length: 255 }),
  pjpId: varchar("pjp_id", { length: 255 }),
  purposeOfVisit: varchar("purpose_of_visit", { length: 500 }),
  sitePhotoUrl: varchar("site_photo_url", { length: 500 }),
  firstVisitTime: timestamp("first_visit_time", { withTimezone: true, mode: 'string' }),
  lastVisitTime: timestamp("last_visit_time", { withTimezone: true, mode: 'string' }),
  firstVisitDay: varchar("first_visit_day", { length: 100 }),
  lastVisitDay: varchar("last_visit_day", { length: 100 }),
  siteVisitsCount: integer("site_visits_count"),
  otherVisitsCount: integer("other_visits_count"),
  totalVisitsCount: integer("total_visits_count"),
  region: varchar({ length: 100 }),
  area: varchar({ length: 100 }),
  latitude: numeric({ precision: 9, scale: 6 }),
  longitude: numeric({ precision: 9, scale: 6 }),
  masonId: uuid("mason_id"),
  timeSpentInLoc: text("time_spent_in_loc"),
  siteId: uuid("site_id"),
  marketName: varchar("market_name", { length: 100 }),
  siteAddress: varchar("site_address", { length: 500 }),
  whatsappNo: varchar("whatsapp_no", { length: 20 }),
  visitCategory: varchar("visit_category", { length: 50 }),
  customerType: varchar("customer_type", { length: 50 }),
  constAreaSqFt: integer("const_area_sq_ft"),
  currentBrandPrice: numeric("current_brand_price", { precision: 10, scale: 2 }),
  siteStock: numeric("site_stock", { precision: 10, scale: 2 }),
  estRequirement: numeric("est_requirement", { precision: 10, scale: 2 }),
  supplyingDealerName: varchar("supplying_dealer_name", { length: 255 }),
  nearbyDealerName: varchar("nearby_dealer_name", { length: 255 }),
  isConverted: boolean("is_converted"),
  conversionType: varchar("conversion_type", { length: 50 }),
  isTechService: boolean("is_tech_service"),
  serviceDesc: varchar("service_desc", { length: 500 }),
  influencerName: varchar("influencer_name", { length: 255 }),
  influencerPhone: varchar("influencer_phone", { length: 20 }),
  isSchemeEnrolled: boolean("is_scheme_enrolled"),
  influencerProductivity: varchar("influencer_productivity", { length: 100 }),
  journeyId: varchar("journey_id", { length: 255 }),
}, (table) => [
  index("idx_technical_visit_reports_meeting_id").using("btree", table.meetingId.asc().nullsLast()),
  index("idx_technical_visit_reports_pjp_id").using("btree", table.pjpId.asc().nullsLast()),
  index("idx_technical_visit_reports_user_id").using("btree", table.userId.asc().nullsLast()),
  index("idx_tvr_journey_id").using("btree", table.journeyId.asc().nullsLast()),
  index("idx_tvr_site_id").using("btree", table.siteId.asc().nullsLast()),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "technical_visit_reports_user_id_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.pjpId],
    foreignColumns: [permanentJourneyPlans.id],
    name: "fk_technical_visit_reports_pjp_id"
  }).onDelete("set null"),
  foreignKey({
    columns: [table.siteId],
    foreignColumns: [technicalSites.id],
    name: "technical_visit_reports_site_id_fkey"
  }).onDelete("set null"),
]);

export const salesmanLeaveApplications = myCustomSchema.table("salesman_leave_applications", {
  id: varchar({ length: 255 }).primaryKey().notNull(),
  userId: integer("user_id").notNull(),
  leaveType: varchar("leave_type", { length: 100 }).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  reason: varchar({ length: 500 }).notNull(),
  status: varchar({ length: 50 }).notNull(),
  adminRemarks: varchar("admin_remarks", { length: 500 }),
  appRole: varchar("app_role", { length: 50 }),
  createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("idx_salesman_leave_applications_user_id").using("btree", table.userId.asc().nullsLast()),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "salesman_leave_applications_user_id_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
]);

export const salesmanAttendance = myCustomSchema.table("salesman_attendance", {
  id: varchar({ length: 255 }).primaryKey().notNull(),
  userId: integer("user_id").notNull(),
  attendanceDate: date("attendance_date").notNull(),
  locationName: varchar("location_name", { length: 500 }).notNull(),
  inTimeTimestamp: timestamp("in_time_timestamp", { precision: 6, withTimezone: true, mode: 'string' }).notNull(),
  outTimeTimestamp: timestamp("out_time_timestamp", { precision: 6, withTimezone: true, mode: 'string' }),
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
  createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  role: varchar({ length: 50 }),
}, (table) => [
  index("idx_salesman_attendance_user_id").using("btree", table.userId.asc().nullsLast()),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "salesman_attendance_user_id_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
]);

export const competitionReports = myCustomSchema.table("competition_reports", {
  id: text().primaryKey().notNull(),
  userId: integer("user_id").notNull(),
  reportDate: date("report_date").notNull(),
  brandName: varchar("brand_name", { length: 255 }).notNull(),
  billing: varchar({ length: 100 }).notNull(),
  nod: varchar({ length: 100 }).notNull(),
  retail: varchar({ length: 100 }).notNull(),
  schemesYesNo: varchar("schemes_yes_no", { length: 10 }).notNull(),
  avgSchemeCost: numeric("avg_scheme_cost", { precision: 10, scale: 2 }).notNull(),
  remarks: varchar({ length: 500 }),
  createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: 'string' }).notNull(),
}, (table) => [
  index("competition_reports_user_id_idx").using("btree", table.userId.asc().nullsLast()),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "competition_reports_user_id_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
]);

export const technicalSites = myCustomSchema.table("technical_sites", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  siteName: varchar("site_name", { length: 255 }).notNull(),
  concernedPerson: varchar("concerned_person", { length: 255 }).notNull(),
  phoneNo: varchar("phone_no", { length: 20 }).notNull(),
  address: text(),
  latitude: numeric({ precision: 10, scale: 7 }),
  longitude: numeric({ precision: 10, scale: 7 }),
  siteType: varchar("site_type", { length: 50 }),
  area: varchar({ length: 100 }),
  region: varchar({ length: 100 }),
  keyPersonName: varchar("key_person_name", { length: 255 }),
  keyPersonPhoneNum: varchar("key_person_phone_num", { length: 20 }),
  stageOfConstruction: varchar("stage_of_construction", { length: 100 }),
  constructionStartDate: date("construction_start_date"),
  constructionEndDate: date("construction_end_date"),
  convertedSite: boolean("converted_site").default(false),
  firstVisitDate: date("first_visit_date"),
  lastVisitDate: date("last_visit_date"),
  needFollowUp: boolean("need_follow_up").default(false),
  createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  imageUrl: text("image_url"),
});

export const salesOrders = myCustomSchema.table("sales_orders", {
  id: varchar({ length: 255 }).primaryKey().notNull(),
  userId: integer("user_id"),
  dealerId: varchar("dealer_id", { length: 255 }),
  dvrId: varchar("dvr_id", { length: 255 }),
  pjpId: varchar("pjp_id", { length: 255 }),
  orderDate: date("order_date").notNull(),
  orderPartyName: varchar("order_party_name", { length: 255 }).notNull(),
  partyPhoneNo: varchar("party_phone_no", { length: 20 }),
  partyArea: varchar("party_area", { length: 255 }),
  partyRegion: varchar("party_region", { length: 255 }),
  partyAddress: varchar("party_address", { length: 500 }),
  deliveryDate: date("delivery_date"),
  deliveryArea: varchar("delivery_area", { length: 255 }),
  deliveryRegion: varchar("delivery_region", { length: 255 }),
  deliveryAddress: varchar("delivery_address", { length: 500 }),
  deliveryLocPincode: varchar("delivery_loc_pincode", { length: 10 }),
  paymentMode: varchar("payment_mode", { length: 50 }),
  paymentTerms: varchar("payment_terms", { length: 500 }),
  paymentAmount: numeric("payment_amount", { precision: 12, scale: 2 }),
  receivedPayment: numeric("received_payment", { precision: 12, scale: 2 }),
  receivedPaymentDate: date("received_payment_date"),
  pendingPayment: numeric("pending_payment", { precision: 12, scale: 2 }),
  orderQty: numeric("order_qty", { precision: 12, scale: 3 }),
  orderUnit: varchar("order_unit", { length: 20 }),
  itemPrice: numeric("item_price", { precision: 12, scale: 2 }),
  discountPercentage: numeric("discount_percentage", { precision: 5, scale: 2 }),
  itemPriceAfterDiscount: numeric("item_price_after_discount", { precision: 12, scale: 2 }),
  itemType: varchar("item_type", { length: 20 }),
  itemGrade: varchar("item_grade", { length: 10 }),
  createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: 'string' }).defaultNow(),
  status: varchar({ length: 50 }).default('Pending'),
}, (table) => [
  index("idx_sales_orders_dealer_id").using("btree", table.dealerId.asc().nullsLast()),
  index("idx_sales_orders_dvr_id").using("btree", table.dvrId.asc().nullsLast()),
  index("idx_sales_orders_order_date").using("btree", table.orderDate.asc().nullsLast()),
  index("idx_sales_orders_pjp_id").using("btree", table.pjpId.asc().nullsLast()),
  index("idx_sales_orders_user_id").using("btree", table.userId.asc().nullsLast()),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "fk_sales_orders_user"
  }).onDelete("set null"),
  foreignKey({
    columns: [table.dealerId],
    foreignColumns: [dealers.id],
    name: "fk_sales_orders_dealer"
  }).onDelete("set null"),
  foreignKey({
    columns: [table.dvrId],
    foreignColumns: [dailyVisitReports.id],
    name: "fk_sales_orders_dvr"
  }).onDelete("set null"),
  foreignKey({
    columns: [table.pjpId],
    foreignColumns: [permanentJourneyPlans.id],
    name: "fk_sales_orders_pjp"
  }).onDelete("set null"),
]);

export const tsoMeetings = myCustomSchema.table("tso_meetings", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  type: varchar({ length: 100 }),
  date: date(),
  participantsCount: integer("participants_count"),
  createdByUserId: integer("created_by_user_id").notNull(),
  createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: 'string' }).defaultNow(),
  siteId: uuid("site_id"),
  zone: varchar({ length: 100 }),
  market: varchar({ length: 100 }),
  dealerName: varchar("dealer_name", { length: 255 }),
  dealerAddress: varchar("dealer_address", { length: 500 }),
  conductedBy: varchar("conducted_by", { length: 255 }),
  giftType: varchar("gift_type", { length: 255 }),
  accountJsbJud: varchar("account_jsb_jud", { length: 100 }),
  totalExpenses: numeric("total_expenses", { precision: 12, scale: 2 }),
  billSubmitted: boolean("bill_submitted").default(false),
  meetImageUrl: varchar("meet_image_url", { length: 300 }),
}, (table) => [
  index("idx_meeting_site_id").using("btree", table.siteId.asc().nullsLast()),
  index("idx_tso_meetings_created_by_user_id").using("btree", table.createdByUserId.asc().nullsLast()),
  foreignKey({
    columns: [table.createdByUserId],
    foreignColumns: [users.id],
    name: "fk_tso_meetings_created_by"
  }),
  foreignKey({
    columns: [table.siteId],
    foreignColumns: [technicalSites.id],
    name: "tso_meetings_site_id_fkey"
  }).onDelete("set null"),
]);

export const notifications = myCustomSchema.table("notifications", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  recipientUserId: integer("recipient_user_id").notNull(),
  title: varchar({ length: 255 }).notNull(),
  body: text().notNull(),
  type: varchar({ length: 50 }).notNull(),
  referenceId: varchar("reference_id", { length: 255 }),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("idx_notifications_recipient").using("btree", table.recipientUserId.asc().nullsLast()),
  foreignKey({
    columns: [table.recipientUserId],
    foreignColumns: [users.id],
    name: "notifications_recipient_user_id_fkey"
  }).onDelete("cascade"),
]);

// ----- scores -------
export const dealerReportsAndScores = myCustomSchema.table("dealer_reports_and_scores", {
  id: varchar({ length: 255 }).primaryKey().notNull(),
  dealerId: text("dealer_id").notNull(),
  dealerScore: numeric("dealer_score", { precision: 10, scale: 2 }).notNull(),
  trustWorthinessScore: numeric("trust_worthiness_score", { precision: 10, scale: 2 }).notNull(),
  creditWorthinessScore: numeric("credit_worthiness_score", { precision: 10, scale: 2 }).notNull(),
  orderHistoryScore: numeric("order_history_score", { precision: 10, scale: 2 }).notNull(),
  visitFrequencyScore: numeric("visit_frequency_score", { precision: 10, scale: 2 }).notNull(),
  lastUpdatedDate: timestamp("last_updated_date", { precision: 6, withTimezone: true, mode: 'string' }).notNull(),
  createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  uniqueIndex("dealer_reports_and_scores_dealer_id_key").using("btree", table.dealerId.asc().nullsLast()),
  foreignKey({
    columns: [table.dealerId],
    foreignColumns: [dealers.id],
    name: "dealer_reports_and_scores_dealer_id_fkey"
  }).onUpdate("cascade").onDelete("restrict"),
]);

export const ratings = myCustomSchema.table("ratings", {
  id: serial().primaryKey().notNull(),
  userId: integer("user_id").notNull(),
  area: text().notNull(),
  region: text().notNull(),
  rating: integer().notNull(),
}, (table) => [
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "ratings_user_id_fkey"
  }).onUpdate("cascade").onDelete("restrict"),
]);

// ----- Brand Mapping -------
export const brands = myCustomSchema.table("brands", {
  id: serial().primaryKey().notNull(),
  brandName: varchar("brand_name", { length: 255 }).notNull(),
}, (table) => [
  uniqueIndex("brands_brand_name_key").using("btree", table.brandName.asc().nullsLast()),
]);

export const dealerBrandMapping = myCustomSchema.table("dealer_brand_mapping", {
  id: varchar({ length: 255 }).primaryKey().notNull(),
  dealerId: text("dealer_id").notNull(),
  brandId: integer("brand_id").notNull(),
  capacityMt: numeric("capacity_mt", { precision: 12, scale: 2 }).notNull(),
  userId: integer("user_id"),
  bestCapacityMt: numeric("best_capacity_mt", { precision: 12, scale: 2 }),
  brandGrowthCapacityPercent: numeric("brand_growth_capacity_percent", { precision: 5, scale: 2 }),
  verifiedDealerId: integer("verified_dealer_id"),
}, (table) => [
  uniqueIndex("dealer_brand_mapping_dealer_id_brand_id_key").using("btree", table.dealerId.asc().nullsLast(), table.brandId.asc().nullsLast()),
  index("dealer_brand_mapping_user_id_idx").using("btree", table.userId.asc().nullsLast()),
  index("idx_dbm_verified_dealer_id").using("btree", table.verifiedDealerId.asc().nullsLast()),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "dealer_brand_mapping_user_id_fkey"
  }).onDelete("set null"),
  foreignKey({
    columns: [table.dealerId],
    foreignColumns: [dealers.id],
    name: "dealer_brand_mapping_dealer_id_fkey"
  }).onUpdate("cascade").onDelete("restrict"),
  foreignKey({
    columns: [table.brandId],
    foreignColumns: [brands.id],
    name: "dealer_brand_mapping_brand_id_fkey"
  }).onUpdate("cascade").onDelete("restrict"),
  foreignKey({
    columns: [table.verifiedDealerId],
    foreignColumns: [verifiedDealers.id],
    name: "fk_dbm_verified_dealer"
  }).onDelete("set null"),
]);

// ----- JOINS --------
export const dealerAssociatedMasons = myCustomSchema.table("_DealerAssociatedMasons", {
  a: varchar("A", { length: 255 }).notNull(),
  b: uuid("B").notNull(),
}, (table) => [
  uniqueIndex("_DealerAssociatedMasons_AB_unique").using("btree", table.a.asc().nullsLast(), table.b.asc().nullsLast()),
  index().using("btree", table.b.asc().nullsLast()),
  foreignKey({
    columns: [table.a],
    foreignColumns: [dealers.id],
    name: "_DealerAssociatedMasons_A_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.b],
    foreignColumns: [masonPcSide.id],
    name: "_DealerAssociatedMasons_B_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
]);

export const siteAssociatedDealers = myCustomSchema.table("_SiteAssociatedDealers", {
  a: varchar("A", { length: 255 }).notNull(),
  b: uuid("B").notNull(),
}, (table) => [
  uniqueIndex("_SiteAssociatedDealers_AB_unique").using("btree", table.a.asc().nullsLast(), table.b.asc().nullsLast()),
  index().using("btree", table.b.asc().nullsLast()),
  foreignKey({
    columns: [table.a],
    foreignColumns: [dealers.id],
    name: "_SiteAssociatedDealers_A_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.b],
    foreignColumns: [technicalSites.id],
    name: "_SiteAssociatedDealers_B_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
]);

export const siteAssociatedMasons = myCustomSchema.table("_SiteAssociatedMasons", {
  a: uuid("A").notNull(),
  b: uuid("B").notNull(),
}, (table) => [
  uniqueIndex("_SiteAssociatedMasons_AB_unique").using("btree", table.a.asc().nullsLast(), table.b.asc().nullsLast()),
  index().using("btree", table.b.asc().nullsLast()),
  foreignKey({
    columns: [table.a],
    foreignColumns: [masonPcSide.id],
    name: "_SiteAssociatedMasons_A_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.b],
    foreignColumns: [technicalSites.id],
    name: "_SiteAssociatedMasons_B_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
]);

export const siteAssociatedUsers = myCustomSchema.table("_SiteAssociatedUsers", {
  a: uuid("A").notNull(),
  b: integer("B").notNull(),
}, (table) => [
  uniqueIndex("_SiteAssociatedUsers_AB_unique").using("btree", table.a.asc().nullsLast(), table.b.asc().nullsLast()),
  index().using("btree", table.b.asc().nullsLast()),
  foreignKey({
    columns: [table.a],
    foreignColumns: [technicalSites.id],
    name: "_SiteAssociatedUsers_A_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.b],
    foreignColumns: [users.id],
    name: "_SiteAssociatedUsers_B_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
]);

// ------ Geotracking ------
export const geoTracking = myCustomSchema.table("geo_tracking", {
  id: text().primaryKey().notNull(),
  userId: integer("user_id").notNull(),
  latitude: numeric({ precision: 10, scale: 7 }).notNull(),
  longitude: numeric({ precision: 10, scale: 7 }).notNull(),
  recordedAt: timestamp("recorded_at", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  accuracy: numeric({ precision: 10, scale: 2 }),
  speed: numeric({ precision: 10, scale: 2 }),
  heading: numeric({ precision: 10, scale: 2 }),
  altitude: numeric({ precision: 10, scale: 2 }),
  locationType: varchar("location_type", { length: 50 }),
  activityType: varchar("activity_type", { length: 50 }),
  appState: varchar("app_state", { length: 50 }),
  batteryLevel: numeric("battery_level", { precision: 5, scale: 2 }),
  isCharging: boolean("is_charging"),
  networkStatus: varchar("network_status", { length: 50 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  siteName: varchar("site_name", { length: 255 }),
  checkInTime: timestamp("check_in_time", { precision: 6, withTimezone: true, mode: 'string' }),
  checkOutTime: timestamp("check_out_time", { precision: 6, withTimezone: true, mode: 'string' }),
  totalDistanceTravelled: numeric("total_distance_travelled", { precision: 10, scale: 3 }),
  createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: 'string' }).notNull(),
  destLat: numeric("dest_lat", { precision: 10, scale: 7 }),
  destLng: numeric("dest_lng", { precision: 10, scale: 7 }),
  isActive: boolean("is_active").default(true).notNull(),
  journeyId: text("journey_id"),
  siteId: uuid("site_id"),
  dealerId: varchar("dealer_id", { length: 255 }),
  linkedJourneyId: varchar("linked_journey_id", { length: 255 }),
}, (table) => [
  index("idx_geo_active").using("btree", table.isActive.asc().nullsLast()),
  index("idx_geo_dealer_id").using("btree", table.dealerId.asc().nullsLast()),
  index("idx_geo_journey_time").using("btree", table.journeyId.asc().nullsLast(), table.recordedAt.asc().nullsLast()),
  index("idx_geo_linked_journey_time").using("btree", table.linkedJourneyId.asc().nullsLast(), table.recordedAt.asc().nullsLast()),
  index("idx_geo_site_id").using("btree", table.siteId.asc().nullsLast()),
  index("idx_geo_tracking_recorded_at").using("btree", table.recordedAt.asc().nullsLast()),
  index("idx_geo_tracking_user_id").using("btree", table.userId.asc().nullsLast()),
  index("idx_geo_user_time").using("btree", table.userId.asc().nullsLast(), table.recordedAt.asc().nullsLast()),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "geo_tracking_user_id_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.siteId],
    foreignColumns: [technicalSites.id],
    name: "geo_tracking_site_id_fkey"
  }).onDelete("set null"),
  foreignKey({
    columns: [table.dealerId],
    foreignColumns: [dealers.id],
    name: "geo_tracking_dealer_id_fkey"
  }).onUpdate("cascade").onDelete("set null"),
  foreignKey({
    columns: [table.linkedJourneyId],
    foreignColumns: [journeys.id],
    name: "geo_tracking_linked_journey_id_fkey"
  }).onDelete("set null"),
]);

export const journeys = myCustomSchema.table("journeys", {
  id: varchar({ length: 255 }).primaryKey().notNull(),
  userId: integer("user_id").notNull(),
  pjpId: varchar("pjp_id", { length: 255 }),
  siteId: varchar("site_id", { length: 255 }),
  dealerId: varchar("dealer_id", { length: 255 }),
  siteName: varchar("site_name", { length: 255 }),
  destLat: numeric("dest_lat", { precision: 10, scale: 7 }),
  destLng: numeric("dest_lng", { precision: 10, scale: 7 }),
  status: varchar({ length: 50 }).default('ACTIVE').notNull(),
  isActive: boolean("is_active").default(true),
  startTime: timestamp("start_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  endTime: timestamp("end_time", { withTimezone: true, mode: 'string' }),
  totalDistance: numeric("total_distance", { precision: 10, scale: 3 }).default('0'),
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  isSynced: boolean("is_synced").default(false),
  taskId: varchar("task_id", { length: 255 }),
  verifiedDealerId: integer("verified_dealer_id"),
  appRole: varchar("app_role", { length: 50 }),
}, (table) => [
  index("idx_journeys_user_status").using("btree", table.userId.asc().nullsLast(), table.status.asc().nullsLast()),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "journeys_user_id_fkey"
  }).onDelete("cascade"),
]);

export const journeyOps = myCustomSchema.table("journey_ops", {
  serverSeq: bigserial("server_seq", { mode: "bigint" }).primaryKey().notNull(),
  opId: uuid("op_id").notNull(),
  journeyId: varchar("journey_id", { length: 255 }).notNull(),
  userId: integer("user_id").notNull(),
  type: text().notNull(),
  payload: jsonb().notNull(),
  appRole: varchar("app_role", { length: 50 }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("idx_journey_ops_created").using("btree", table.createdAt.asc().nullsLast()),
  index("idx_journey_ops_journey").using("btree", table.journeyId.asc().nullsLast()),
  index("idx_journey_ops_server_seq").using("btree", table.serverSeq.asc().nullsLast()),
  index("idx_journey_ops_user").using("btree", table.userId.asc().nullsLast()),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "fk_journey_ops_user"
  }).onUpdate("cascade").onDelete("cascade"),
  unique("journey_ops_op_id_key").on(table.opId),
]);

export const journeyBreadcrumbs = myCustomSchema.table("journey_breadcrumbs", {
  id: varchar({ length: 255 }).primaryKey().notNull(),
  journeyId: varchar("journey_id", { length: 255 }).notNull(),
  latitude: doublePrecision().notNull(),
  longitude: doublePrecision().notNull(),
  h3Index: varchar("h3_index", { length: 15 }),
  speed: real(),
  accuracy: real(),
  heading: real(),
  altitude: real(),
  batteryLevel: real("battery_level"),
  isCharging: boolean("is_charging"),
  networkStatus: varchar("network_status", { length: 50 }),
  isMocked: boolean("is_mocked").default(false),
  recordedAt: timestamp("recorded_at", { withTimezone: true, mode: 'string' }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
  isSynced: boolean("is_synced").default(false),
  totalDistance: doublePrecision("total_distance").default(0).notNull(),
}, (table) => [
  index("idx_breadcrumbs_h3").using("btree", table.h3Index.asc().nullsLast()),
  index("idx_breadcrumbs_journey_time").using("btree", table.journeyId.asc().nullsLast(), table.recordedAt.asc().nullsLast()),
  foreignKey({
    columns: [table.journeyId],
    foreignColumns: [journeys.id],
    name: "journey_breadcrumbs_journey_id_fkey"
  }).onDelete("cascade"),
]);

export const syncState = myCustomSchema.table("sync_state", {
  id: integer().default(1).primaryKey().notNull(),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  lastServerSeq: bigint("last_server_seq", { mode: "number" }).default(0).notNull(),
}, (table) => [
  check("one_row_only", sql`id = 1`),
]);

// ------ Logistics -------
export const logisticsUsers = myCustomSchema.table("logistics_users", {
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

export const logisticsIO = myCustomSchema.table("logistics_io", {
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

// ----- Email Reports ------
export const projectionVsActualReports = myCustomSchema.table("projection_vs_actual_reports", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  reportDate: date("report_date").notNull(),
  institution: varchar({ length: 10 }).notNull(),
  zone: varchar({ length: 120 }).notNull(),
  dealerName: varchar("dealer_name", { length: 255 }).notNull(),
  orderProjectionMt: numeric("order_projection_mt", { precision: 12, scale: 2 }),
  actualOrderReceivedMt: numeric("actual_order_received_mt", { precision: 12, scale: 2 }),
  doDoneMt: numeric("do_done_mt", { precision: 12, scale: 2 }),
  projectionVsActualOrderMt: numeric("projection_vs_actual_order_mt", { precision: 12, scale: 2 }),
  actualOrderVsDoMt: numeric("actual_order_vs_do_mt", { precision: 12, scale: 2 }),
  collectionProjection: numeric("collection_projection", { precision: 14, scale: 2 }),
  actualCollection: numeric("actual_collection", { precision: 14, scale: 2 }),
  shortFall: numeric("short_fall", { precision: 14, scale: 2 }),
  percent: numeric({ precision: 6, scale: 2 }),
  sourceMessageId: text("source_message_id"),
  sourceFileName: text("source_file_name"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  verifiedDealerId: integer("verified_dealer_id"),
  userId: integer("user_id"),
}, (table) => [
  index("idx_proj_actual_date").using("btree", table.reportDate.asc().nullsLast()),
  index("idx_proj_actual_dealer").using("btree", table.dealerName.asc().nullsLast()),
  index("idx_proj_actual_institution").using("btree", table.institution.asc().nullsLast()),
  index("idx_proj_actual_user").using("btree", table.userId.asc().nullsLast()),
  index("idx_proj_actual_verified_dealer").using("btree", table.verifiedDealerId.asc().nullsLast()),
  index("idx_proj_actual_zone").using("btree", table.zone.asc().nullsLast()),
  uniqueIndex("uniq_proj_actual_snapshot").using("btree", table.reportDate.asc().nullsLast(), table.dealerName.asc().nullsLast(), table.institution.asc().nullsLast()),
  foreignKey({
    columns: [table.verifiedDealerId],
    foreignColumns: [verifiedDealers.id],
    name: "projection_vs_actual_reports_verified_dealer_id_fkey"
  }).onDelete("set null"),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "projection_vs_actual_reports_user_id_fkey"
  }).onDelete("set null"),
]);

export const collectionReports = myCustomSchema.table("collection_reports", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  institution: varchar({ length: 10 }).notNull(),
  voucherNo: varchar("voucher_no", { length: 100 }).notNull(),
  voucherDate: date("voucher_date").notNull(),
  amount: numeric({ precision: 14, scale: 2 }).notNull(),
  bankAccount: varchar("bank_account", { length: 255 }),
  remarks: varchar({ length: 500 }),
  partyName: varchar("party_name", { length: 255 }).notNull(),
  salesPromoterName: varchar("sales_promoter_name", { length: 255 }),
  zone: varchar({ length: 100 }),
  district: varchar({ length: 100 }),
  salesPromoterUserId: integer("sales_promoter_user_id"),
  sourceMessageId: text("source_message_id"),
  sourceFileName: text("source_file_name"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  verifiedDealerId: integer("verified_dealer_id"),
  userId: integer("user_id"),
  emailReportId: uuid("email_report_id"),
}, (table) => [
  index("idx_collection_date").using("btree", table.voucherDate.asc().nullsLast()),
  index("idx_collection_email_report").using("btree", table.emailReportId.asc().nullsLast()),
  index("idx_collection_institution").using("btree", table.institution.asc().nullsLast()),
  index("idx_collection_user").using("btree", table.salesPromoterUserId.asc().nullsLast()),
  index("idx_collection_verified_dealer").using("btree", table.verifiedDealerId.asc().nullsLast()),
  index("idx_collection_voucher").using("btree", table.voucherNo.asc().nullsLast()),
  uniqueIndex("uniq_collection_voucher_inst").using("btree", table.voucherNo.asc().nullsLast(), table.institution.asc().nullsLast()),
  foreignKey({
    columns: [table.salesPromoterUserId],
    foreignColumns: [users.id],
    name: "collection_reports_sales_promoter_user_id_fkey"
  }).onDelete("set null"),
  foreignKey({
    columns: [table.verifiedDealerId],
    foreignColumns: [verifiedDealers.id],
    name: "collection_reports_verified_dealer_id_fkey"
  }).onDelete("set null"),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "collection_reports_user_id_fkey"
  }).onDelete("set null"),
  foreignKey({
    columns: [table.emailReportId],
    foreignColumns: [emailReports.id],
    name: "fk_collection_email_report"
  }).onDelete("cascade"),
]);

export const projectionReports = myCustomSchema.table("projection_reports", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  institution: varchar({ length: 10 }).notNull(),
  reportDate: date("report_date").notNull(),
  zone: varchar({ length: 100 }).notNull(),
  orderDealerName: varchar("order_dealer_name", { length: 255 }),
  orderQtyMt: numeric("order_qty_mt", { precision: 10, scale: 2 }),
  collectionDealerName: varchar("collection_dealer_name", { length: 255 }),
  collectionAmount: numeric("collection_amount", { precision: 14, scale: 2 }),
  salesPromoterUserId: integer("sales_promoter_user_id"),
  sourceMessageId: text("source_message_id"),
  sourceFileName: text("source_file_name"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  verifiedDealerId: integer("verified_dealer_id"),
  userId: integer("user_id"),
  emailReportId: uuid("email_report_id"),
}, (table) => [
  index("idx_projection_date").using("btree", table.reportDate.asc().nullsLast()),
  index("idx_projection_email_report").using("btree", table.emailReportId.asc().nullsLast()),
  index("idx_projection_institution").using("btree", table.institution.asc().nullsLast()),
  index("idx_projection_user").using("btree", table.userId.asc().nullsLast()),
  index("idx_projection_verified_dealer").using("btree", table.verifiedDealerId.asc().nullsLast()),
  index("idx_projection_zone").using("btree", table.zone.asc().nullsLast()),
  uniqueIndex("uniq_projection_snapshot").using("btree", table.reportDate.asc().nullsLast(), table.orderDealerName.asc().nullsLast(), table.collectionDealerName.asc().nullsLast(), table.institution.asc().nullsLast()),
  foreignKey({
    columns: [table.verifiedDealerId],
    foreignColumns: [verifiedDealers.id],
    name: "projection_reports_verified_dealer_id_fkey"
  }).onDelete("set null"),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "projection_reports_user_id_fkey"
  }).onDelete("set null"),
  foreignKey({
    columns: [table.emailReportId],
    foreignColumns: [emailReports.id],
    name: "fk_projection_email_report"
  }).onDelete("cascade"),
  unique("projection_reports_unique_key").on(table.institution, table.reportDate, table.zone, table.orderDealerName, table.collectionDealerName),
]);

export const outstandingReports = myCustomSchema.table("outstanding_reports", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  securityDepositAmt: numeric("security_deposit_amt", { precision: 14, scale: 2 }),
  pendingAmt: numeric("pending_amt", { precision: 14, scale: 2 }),
  lessThan10Days: numeric("less_than_10_days", { precision: 14, scale: 2 }),
  "10To15Days": numeric("10_to_15_days", { precision: 14, scale: 2 }),
  "15To21Days": numeric("15_to_21_days", { precision: 14, scale: 2 }),
  "21To30Days": numeric("21_to_30_days", { precision: 14, scale: 2 }),
  "30To45Days": numeric("30_to_45_days", { precision: 14, scale: 2 }),
  "45To60Days": numeric("45_to_60_days", { precision: 14, scale: 2 }),
  "60To75Days": numeric("60_to_75_days", { precision: 14, scale: 2 }),
  "75To90Days": numeric("75_to_90_days", { precision: 14, scale: 2 }),
  greaterThan90Days: numeric("greater_than_90_days", { precision: 14, scale: 2 }),
  isOverdue: boolean("is_overdue").default(false),
  isAccountJsbJud: boolean("is_account_jsb_jud").default(false),
  verifiedDealerId: integer("verified_dealer_id"),
  collectionReportId: uuid("collection_report_id"),
  dvrId: varchar("dvr_id", { length: 255 }),
  createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  reportDate: date("report_date"),
  tempDealerName: text("temp_dealer_name"),
  emailReportId: uuid("email_report_id"),
  institution: varchar({ length: 10 }).default('UNKNOWN').notNull(),
}, (table) => [
  index("idx_outstanding_collection_report").using("btree", table.collectionReportId.asc().nullsLast()),
  index("idx_outstanding_dvr").using("btree", table.dvrId.asc().nullsLast()),
  index("idx_outstanding_email_report").using("btree", table.emailReportId.asc().nullsLast()),
  index("idx_outstanding_verified_dealer").using("btree", table.verifiedDealerId.asc().nullsLast()),
  foreignKey({
    columns: [table.verifiedDealerId],
    foreignColumns: [verifiedDealers.id],
    name: "fk_outstanding_verified_dealer"
  }).onDelete("set null"),
  foreignKey({
    columns: [table.collectionReportId],
    foreignColumns: [collectionReports.id],
    name: "fk_outstanding_collection_report"
  }).onDelete("set null"),
  foreignKey({
    columns: [table.dvrId],
    foreignColumns: [dailyVisitReports.id],
    name: "fk_outstanding_dvr"
  }).onDelete("set null"),
  foreignKey({
    columns: [table.emailReportId],
    foreignColumns: [emailReports.id],
    name: "fk_outstanding_email_report"
  }).onDelete("cascade"),
  unique("unique_outstanding_entry").on(table.isAccountJsbJud, table.verifiedDealerId, table.reportDate),
]);

export const emailReports = myCustomSchema.table("email_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  messageId: text("message_id").notNull(),
  subject: text("subject"),
  sender: text("sender"),
  fileName: text("file_name"),
  payload: jsonb("payload").notNull(),
  processed: boolean("processed").default(false),
  isSuccess: boolean("is_success"),
  errorMessage: text("error_message"),
  fingerprint: text("fingerprint"),
  hash: text("hash"),
  payloadHash: text("payload_hash"),
  schemaVersion: integer("schema_version"),
  reportType: text("report_type"),
  cycleDate: date("cycle_date"),
  version: integer("version"),
  isLatestVersion: boolean("is_latest_version"),
  sheetCount: integer("sheet_count"),
  numericRatio: numeric("numeric_ratio"),
  hasAgeingPattern: boolean("has_ageing_pattern"),
  hasDatePattern: boolean("has_date_pattern"),
  processingStage: text("processing_stage"),
  institution: text("institution"),
  reportName: text("report_name"),
  dealerNames: jsonb("dealer_names"),
  reportDate: date("report_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("idx_email_reports_message").on(t.messageId),
]);

// ------- Mason PC --------
export const masonPcSide = myCustomSchema.table("mason_pc_side", {
  id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
  name: varchar({ length: 100 }).notNull(),
  phoneNumber: varchar("phone_number", { length: 50 }).notNull(),
  kycDocName: varchar("kyc_doc_name", { length: 100 }),
  kycDocIdNum: varchar("kyc_doc_id_num", { length: 150 }),
  kycStatus: varchar("kyc_status", { length: 50 }).default('none'),
  bagsLifted: integer("bags_lifted"),
  pointsBalance: integer("points_balance").default(0),
  isReferred: boolean("is_referred"),
  referredByUser: varchar("referred_by_user", { length: 255 }),
  referredToUser: varchar("referred_to_user", { length: 255 }),
  dealerId: varchar("dealer_id", { length: 255 }),
  userId: integer("user_id"),
  firebaseUid: varchar("firebase_uid", { length: 128 }),
  deviceId: varchar("device_id", { length: 255 }),
  fcmToken: varchar("fcm_token", { length: 500 }),
}, (table) => [
  foreignKey({
    columns: [table.dealerId],
    foreignColumns: [dealers.id],
    name: "fk_mason_dealer"
  }).onUpdate("cascade").onDelete("set null"),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "fk_mason_user"
  }).onUpdate("cascade").onDelete("set null"),
  unique("mason_pc_side_firebase_uid_key").on(table.firebaseUid),
  unique("mason_pc_side_device_id_unique").on(table.deviceId),
]);

export const bagLifts = myCustomSchema.table("bag_lifts", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  masonId: uuid("mason_id").notNull(),
  dealerId: varchar("dealer_id", { length: 255 }),
  purchaseDate: timestamp("purchase_date", { withTimezone: true, mode: 'string' }).notNull(),
  bagCount: integer("bag_count").notNull(),
  pointsCredited: integer("points_credited").notNull(),
  status: varchar({ length: 20 }).default('pending').notNull(),
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at", { withTimezone: true, mode: 'string' }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  imageUrl: text("image_url"),
  siteId: uuid("site_id"),
  siteKeyPersonName: varchar("site_key_person_name", { length: 255 }),
  siteKeyPersonPhone: varchar("site_key_person_phone", { length: 20 }),
  verificationSiteImageUrl: text("verification_site_image_url"),
  verificationProofImageUrl: text("verification_proof_image_url"),
}, (table) => [
  index("idx_bag_lifts_dealer_id").using("btree", table.dealerId.asc().nullsLast()),
  index("idx_bag_lifts_mason_id").using("btree", table.masonId.asc().nullsLast()),
  index("idx_bag_lifts_site_id").using("btree", table.siteId.asc().nullsLast()),
  index("idx_bag_lifts_status").using("btree", table.status.asc().nullsLast()),
  foreignKey({
    columns: [table.masonId],
    foreignColumns: [masonPcSide.id],
    name: "fk_bag_lifts_mason_id"
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.dealerId],
    foreignColumns: [dealers.id],
    name: "fk_bag_lifts_dealer_id"
  }).onDelete("set null"),
  foreignKey({
    columns: [table.approvedBy],
    foreignColumns: [users.id],
    name: "fk_bag_lifts_approved_by"
  }).onDelete("set null"),
  foreignKey({
    columns: [table.siteId],
    foreignColumns: [technicalSites.id],
    name: "bag_lifts_site_id_fkey"
  }).onUpdate("cascade").onDelete("set null"),
]);

export const pointsLedger = myCustomSchema.table("points_ledger", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  masonId: uuid("mason_id").notNull(),
  sourceType: varchar("source_type", { length: 32 }).notNull(),
  sourceId: uuid("source_id"),
  points: integer().notNull(),
  memo: text(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("idx_points_ledger_mason_id").using("btree", table.masonId.asc().nullsLast()),
  index("idx_points_ledger_source_id").using("btree", table.sourceId.asc().nullsLast()),
  foreignKey({
    columns: [table.masonId],
    foreignColumns: [masonPcSide.id],
    name: "fk_points_ledger_mason_id"
  }).onDelete("cascade"),
  unique("points_ledger_source_id_unique").on(table.sourceId),
]);

export const kycSubmissions = myCustomSchema.table("kyc_submissions", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  masonId: uuid("mason_id").notNull(),
  aadhaarNumber: varchar("aadhaar_number", { length: 20 }),
  panNumber: varchar("pan_number", { length: 20 }),
  voterIdNumber: varchar("voter_id_number", { length: 20 }),
  documents: jsonb(),
  status: varchar({ length: 20 }).default('pending').notNull(),
  remark: text(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("idx_kyc_submissions_mason_id").using("btree", table.masonId.asc().nullsLast()),
  foreignKey({
    columns: [table.masonId],
    foreignColumns: [masonPcSide.id],
    name: "fk_kyc_submissions_mason_id"
  }).onDelete("cascade"),
]);

export const otpVerifications = myCustomSchema.table("otp_verifications", {
  id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
  otpCode: varchar("otp_code", { length: 10 }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
  masonId: uuid("mason_id").notNull(),
}, (table) => [
  index("idx_otp_verifications_mason_id").using("btree", table.masonId.asc().nullsLast()),
  foreignKey({
    columns: [table.masonId],
    foreignColumns: [masonPcSide.id],
    name: "fk_otp_mason"
  }).onDelete("cascade"),
]);

export const schemesOffers = myCustomSchema.table("schemes_offers", {
  id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
  name: varchar({ length: 200 }).notNull(),
  description: text(),
  startDate: timestamp("start_date", { withTimezone: true, mode: 'string' }),
  endDate: timestamp("end_date", { withTimezone: true, mode: 'string' }),
});

export const rewardRedemptions = myCustomSchema.table("reward_redemptions", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  masonId: uuid("mason_id").notNull(),
  rewardId: integer("reward_id").notNull(),
  quantity: integer().default(1).notNull(),
  status: varchar({ length: 20 }).default('placed').notNull(),
  pointsDebited: integer("points_debited").notNull(),
  deliveryName: varchar("delivery_name", { length: 160 }),
  deliveryPhone: varchar("delivery_phone", { length: 20 }),
  deliveryAddress: text("delivery_address"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  fulfillmentNotes: text("fulfillment_notes"),
}, (table) => [
  index("idx_reward_redemptions_mason_id").using("btree", table.masonId.asc().nullsLast()),
  index("idx_reward_redemptions_status").using("btree", table.status.asc().nullsLast()),
  foreignKey({
    columns: [table.masonId],
    foreignColumns: [masonPcSide.id],
    name: "fk_reward_redemptions_mason_id"
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.rewardId],
    foreignColumns: [rewards.id],
    name: "fk_reward_redemptions_reward_id"
  }),
]);

export const rewardCategories = myCustomSchema.table("reward_categories", {
  id: serial().primaryKey().notNull(),
  name: varchar({ length: 120 }).notNull(),
}, (table) => [
  unique("reward_categories_name_key").on(table.name),
]);

export const rewards = myCustomSchema.table("rewards", {
  id: serial().primaryKey().notNull(),
  itemName: varchar("item_name", { length: 255 }).notNull(),
  pointCost: integer("point_cost").notNull(),
  stock: integer().default(0).notNull(),
  totalAvailableQuantity: integer("total_available_quantity").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  meta: jsonb(),
  categoryId: integer("category_id"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("idx_rewards_category_id").using("btree", table.categoryId.asc().nullsLast()),
  foreignKey({
    columns: [table.categoryId],
    foreignColumns: [rewardCategories.id],
    name: "fk_rewards_category_id"
  }),
  unique("rewards_item_name_key").on(table.itemName),
]);

export const schemeSlabs = myCustomSchema.table("scheme_slabs", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  schemeId: uuid("scheme_id").notNull(),
  minBagsBest: integer("min_bags_best"),
  minBagsOthers: integer("min_bags_others"),
  pointsEarned: integer("points_earned").notNull(),
  slabDescription: varchar("slab_description", { length: 255 }),
  rewardId: integer("reward_id"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
  index("idx_scheme_slabs_reward_id").using("btree", table.rewardId.asc().nullsLast()),
  index("idx_scheme_slabs_scheme_id").using("btree", table.schemeId.asc().nullsLast()),
  foreignKey({
    columns: [table.schemeId],
    foreignColumns: [schemesOffers.id],
    name: "scheme_slabs_scheme_id_fkey"
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.rewardId],
    foreignColumns: [rewards.id],
    name: "scheme_slabs_reward_id_fkey"
  }).onDelete("set null"),
]);

export const masonSlabAchievements = myCustomSchema.table("mason_slab_achievements", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  masonId: uuid("mason_id").notNull(),
  schemeSlabId: uuid("scheme_slab_id").notNull(),
  achievedAt: timestamp("achieved_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  pointsAwarded: integer("points_awarded").notNull(),
}, (table) => [
  index("idx_msa_mason_id").using("btree", table.masonId.asc().nullsLast()),
  index("idx_msa_slab_id").using("btree", table.schemeSlabId.asc().nullsLast()),
  uniqueIndex("unique_mason_slab_claim").using("btree", table.masonId.asc().nullsLast(), table.schemeSlabId.asc().nullsLast()),
  foreignKey({
    columns: [table.masonId],
    foreignColumns: [masonPcSide.id],
    name: "mason_slab_achievements_mason_id_fkey"
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.schemeSlabId],
    foreignColumns: [schemeSlabs.id],
    name: "mason_slab_achievements_scheme_slab_id_fkey"
  }).onDelete("cascade"),
]);

export const masonsOnMeetings = myCustomSchema.table("masons_on_meetings", {
  masonId: uuid("mason_id").notNull(),
  meetingId: uuid("meeting_id").notNull(),
  attendedAt: timestamp("attended_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  foreignKey({
    columns: [table.masonId],
    foreignColumns: [masonPcSide.id],
    name: "fk_mom_mason"
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.meetingId],
    foreignColumns: [tsoMeetings.id],
    name: "fk_mom_meeting"
  }).onDelete("cascade"),
  primaryKey({ columns: [table.masonId, table.meetingId], name: "masons_on_meetings_pkey" }),
]);

export const masonOnScheme = myCustomSchema.table("mason_on_scheme", {
  masonId: uuid("mason_id").notNull(),
  schemeId: uuid("scheme_id").notNull(),
  enrolledAt: timestamp("enrolled_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
  status: varchar({ length: 50 }),
  siteId: uuid("site_id"),
}, (table) => [
  index("idx_mos_site_id").using("btree", table.siteId.asc().nullsLast()),
  foreignKey({
    columns: [table.masonId],
    foreignColumns: [masonPcSide.id],
    name: "fk_mos_mason"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.schemeId],
    foreignColumns: [schemesOffers.id],
    name: "fk_mos_scheme"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.siteId],
    foreignColumns: [technicalSites.id],
    name: "mason_on_scheme_site_id_fkey"
  }).onDelete("set null"),
  primaryKey({ columns: [table.masonId, table.schemeId], name: "mason_on_scheme_pkey" }),
]);

export const tsoAssignments = myCustomSchema.table("tso_assignments", {
  tsoId: integer("tso_id").notNull().references(() => users.id),
  masonId: uuid("mason_id").notNull().references(() => masonPcSide.id, { onDelete: "cascade" }), // The mason being managed
  createdAt: timestamp("created_at", { withTimezone: true, precision: 6 }).defaultNow().notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.tsoId, t.masonId] }),
  tsoIdIndex: index("idx_tso_assignments_tso_id").on(t.tsoId),
}));

export const schemeToRewards = myCustomSchema.table("_SchemeToRewards", {
  a: integer("A").notNull(),
  b: uuid("B").notNull(),
}, (table) => [
  uniqueIndex("_SchemeToRewards_AB_unique").using("btree", table.a.asc().nullsLast(), table.b.asc().nullsLast()),
  index().using("btree", table.b.asc().nullsLast()),
  foreignKey({
    columns: [table.a],
    foreignColumns: [rewards.id],
    name: "_SchemeToRewards_A_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.b],
    foreignColumns: [schemesOffers.id],
    name: "_SchemeToRewards_B_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
]);

export const giftAllocationLogs = myCustomSchema.table("gift_allocation_logs", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  giftId: integer("gift_id").notNull(),
  userId: integer("user_id").notNull(),
  transactionType: varchar("transaction_type", { length: 50 }).notNull(),
  quantity: integer().notNull(),
  sourceUserId: integer("source_user_id"),
  destinationUserId: integer("destination_user_id"),
  relatedReportId: varchar("related_report_id", { length: 255 }),
  createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: 'string' }).defaultNow(),
  rewardId: integer("reward_id"),
}, (table) => [
  index("idx_gift_allocation_logs_destination_user_id").using("btree", table.destinationUserId.asc().nullsLast()),
  index("idx_gift_allocation_logs_gift_id").using("btree", table.giftId.asc().nullsLast()),
  index("idx_gift_allocation_logs_source_user_id").using("btree", table.sourceUserId.asc().nullsLast()),
  index("idx_gift_allocation_logs_user_id").using("btree", table.userId.asc().nullsLast()),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "fk_gift_logs_user"
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.sourceUserId],
    foreignColumns: [users.id],
    name: "fk_gift_logs_source_user"
  }).onDelete("set null"),
  foreignKey({
    columns: [table.destinationUserId],
    foreignColumns: [users.id],
    name: "fk_gift_logs_dest_user"
  }).onDelete("set null"),
  foreignKey({
    columns: [table.rewardId],
    foreignColumns: [rewards.id],
    name: "fk_gift_allocation_logs_reward_id"
  }),
]);

/* ========================= drizzle-zod insert schemas ========================= */
export const insertCompanySchema = createInsertSchema(companies);
export const insertUserSchema = createInsertSchema(users);
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
import { pgTable, text, serial, integer, boolean, timestamp, jsonb, numeric, real, varchar, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema (dealer staff)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull().default("staff"), // staff, manager, admin, superadmin
  dealershipId: integer("dealership_id"),
  permissions: jsonb("permissions").default([]).notNull(), // array of permission strings
  status: text("status").default("active").notNull(), // active, inactive, suspended
  lastLogin: timestamp("last_login"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
  dealershipId: true,
  permissions: true,
  status: true,
});

// Customer schema
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zipCode: text("zip_code").notNull(),
  annualIncome: numeric("annual_income"),
  employer: text("employer"),
  creditScore: integer("credit_score"),
});

export const insertCustomerSchema = createInsertSchema(customers).pick({
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  address: true,
  city: true,
  state: true,
  zipCode: true,
  annualIncome: true,
  employer: true,
  creditScore: true,
});

// Vehicle schema
export const vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  year: integer("year").notNull(),
  make: text("make").notNull(),
  model: text("model").notNull(),
  trim: text("trim"),
  vin: text("vin").notNull().unique(),
  color: text("color"),
  odometer: integer("odometer").notNull(),
  price: numeric("price").notNull(),
  status: text("status").notNull().default("available"),
});

export const insertVehicleSchema = createInsertSchema(vehicles).pick({
  year: true,
  make: true,
  model: true,
  trim: true,
  vin: true,
  color: true,
  odometer: true,
  price: true,
  status: true,
});

// Product Provider schema
export const productProviders = pgTable("product_providers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  apiEndpoint: text("api_endpoint"),
  apiKey: text("api_key"),
  status: text("status").default("active").notNull(), // active, inactive
  logoUrl: text("logo_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertProductProviderSchema = createInsertSchema(productProviders).pick({
  name: true,
  description: true,
  contactName: true,
  contactEmail: true,
  contactPhone: true,
  apiEndpoint: true,
  apiKey: true,
  status: true,
  logoUrl: true,
});

// Warranty Providers table
export const warrantyProviders = pgTable("warranty_providers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  logo: varchar("logo", { length: 500 }),
  website: varchar("website", { length: 500 }),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  rating: decimal("rating", { precision: 3, scale: 2 }),
  reviewCount: integer("review_count").default(0),
  licenseNumber: varchar("license_number", { length: 100 }),
  established: integer("established"),
  coverageTypes: text("coverage_types").array(),
  marketAreas: text("market_areas").array(),
  minVehicleAge: integer("min_vehicle_age").default(0),
  maxVehicleAge: integer("max_vehicle_age").default(20),
  maxMileage: integer("max_mileage").default(200000),
  isActive: boolean("is_active").default(true),
  seoKeywords: text("seo_keywords").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Warranty Plans table  
export const warrantyPlans = pgTable("warranty_plans", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").references(() => warrantyProviders.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  coverageType: varchar("coverage_type", { length: 100 }).notNull(),
  termMonths: integer("term_months").notNull(),
  termMiles: integer("term_miles").notNull(),
  deductible: decimal("deductible", { precision: 10, scale: 2 }).notNull(),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
  monthlyPrice: decimal("monthly_price", { precision: 10, scale: 2 }),
  maxVehicleValue: decimal("max_vehicle_value", { precision: 10, scale: 2 }),
  coveredComponents: text("covered_components").array(),
  exclusions: text("exclusions").array(),
  benefits: text("benefits").array(),
  transferable: boolean("transferable").default(false),
  cancellable: boolean("cancellable").default(true),
  isPopular: boolean("is_popular").default(false),
  seoScore: decimal("seo_score", { precision: 5, scale: 2 }).default('0'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// F&I Product schema (keeping for backwards compatibility)
export const fiProducts = pgTable("fi_products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  basePrice: numeric("base_price").notNull(),
  monthlyPrice: numeric("monthly_price"),
  category: text("category").notNull(),
  icon: text("icon"),
  recommended: boolean("recommended").default(false),
  providerId: integer("provider_id").references(() => productProviders.id),
  providerProductCode: text("provider_product_code"),
  commissionRate: numeric("commission_rate"),
});

export const insertFiProductSchema = createInsertSchema(fiProducts).pick({
  name: true,
  description: true,
  basePrice: true,
  monthlyPrice: true,
  category: true,
  icon: true,
  recommended: true,
  providerId: true,
  providerProductCode: true,
  commissionRate: true,
});

// Deal schema
export const deals = pgTable("deals", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  vehicleId: integer("vehicle_id").notNull(),
  userId: integer("user_id").notNull(),
  dealType: text("deal_type").notNull(), // finance, lease, cash
  status: text("status").notNull().default("pending"), // pending, active, completed, cancelled
  amount: numeric("amount").notNull(),
  downPayment: numeric("down_payment"),
  term: integer("term"), // months
  apr: real("apr"), // annual percentage rate
  monthlyPayment: numeric("monthly_payment"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  progress: integer("progress").notNull().default(0), // percentage complete
  currentStage: text("current_stage").notNull().default("credit-application"),
  zipCode: text("zip_code"), // Customer ZIP code for tax calculation
  taxRate: real("tax_rate"), // Tax rate applied to the deal
  taxAmount: numeric("tax_amount"), // Total tax amount
  registrationFee: numeric("registration_fee"), // DMV registration fee
  titleFee: numeric("title_fee"), // Title fee
  docFee: numeric("doc_fee"), // Documentation fee
  totalFees: numeric("total_fees"), // Sum of all fees
  totalDue: numeric("total_due"), // Final out-the-door price
  tradeInValue: numeric("trade_in_value"), // Value of trade-in vehicle
  tradeInPayoff: numeric("trade_in_payoff"), // Payoff amount on trade-in
  netTradeEquity: numeric("net_trade_equity"), // Net equity from trade-in
});

export const insertDealSchema = createInsertSchema(deals).pick({
  customerId: true,
  vehicleId: true,
  userId: true,
  dealType: true,
  status: true,
  amount: true,
  downPayment: true,
  term: true,
  apr: true,
  monthlyPayment: true,
  progress: true,
  currentStage: true,
  zipCode: true,
  taxRate: true,
  taxAmount: true,
  registrationFee: true,
  titleFee: true,
  docFee: true,
  totalFees: true,
  totalDue: true,
  tradeInValue: true,
  tradeInPayoff: true,
  netTradeEquity: true,
});

// Deal Progress Tracking
export const dealProgressSteps = pgTable("deal_progress_steps", {
  id: serial("id").primaryKey(),
  dealId: integer("deal_id").notNull(),
  stage: text("stage").notNull(),
  completed: boolean("completed").notNull().default(false),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  timeSpentSeconds: integer("time_spent_seconds").default(0),
  notes: text("notes"),
  metadata: jsonb("metadata"),
});

export const insertDealProgressStepSchema = createInsertSchema(dealProgressSteps).pick({
  dealId: true,
  stage: true,
  completed: true,
  startedAt: true,
  completedAt: true,
  timeSpentSeconds: true,
  notes: true,
  metadata: true,
});

// Deal F&I Products (junction table)
export const dealFiProducts = pgTable("deal_fi_products", {
  id: serial("id").primaryKey(),
  dealId: integer("deal_id").notNull(),
  fiProductId: integer("fi_product_id").notNull(),
  price: numeric("price").notNull(),
});

export const insertDealFiProductSchema = createInsertSchema(dealFiProducts).pick({
  dealId: true,
  fiProductId: true,
  price: true,
});

// Documents schema
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  dealId: integer("deal_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull().default("pending"),
  content: jsonb("content"),
  signedAt: timestamp("signed_at"),
  signatureData: text("signature_data"),
  order: integer("order").notNull(),
});

export const insertDocumentSchema = createInsertSchema(documents).pick({
  dealId: true,
  name: true,
  type: true,
  status: true,
  content: true,
  signedAt: true,
  signatureData: true,
  order: true,
});

// Credit application schema
export const creditApplications = pgTable("credit_applications", {
  id: serial("id").primaryKey(),
  dealId: integer("deal_id").notNull().unique(),
  customerId: integer("customer_id").notNull(),
  status: text("status").notNull().default("pending"),
  annualIncome: numeric("annual_income").notNull(),
  employmentStatus: text("employment_status").notNull(),
  employer: text("employer").notNull(),
  jobTitle: text("job_title"),
  yearsEmployed: real("years_employed"),
  housingStatus: text("housing_status"),
  monthlyHousingPayment: numeric("monthly_housing_payment"),
  creditScore: integer("credit_score"),
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
});

export const insertCreditApplicationSchema = createInsertSchema(creditApplications).pick({
  dealId: true,
  customerId: true,
  status: true,
  annualIncome: true,
  employmentStatus: true,
  employer: true,
  jobTitle: true,
  yearsEmployed: true,
  housingStatus: true,
  monthlyHousingPayment: true,
  creditScore: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type Vehicle = typeof vehicles.$inferSelect;
export type InsertFiProduct = z.infer<typeof insertFiProductSchema>;
export type FiProduct = typeof fiProducts.$inferSelect;
export type InsertDeal = z.infer<typeof insertDealSchema>;
export type Deal = typeof deals.$inferSelect;
export type InsertDealProgressStep = z.infer<typeof insertDealProgressStepSchema>;
export type DealProgressStep = typeof dealProgressSteps.$inferSelect;
export type InsertDealFiProduct = z.infer<typeof insertDealFiProductSchema>;
export type DealFiProduct = typeof dealFiProducts.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertCreditApplication = z.infer<typeof insertCreditApplicationSchema>;
export type CreditApplication = typeof creditApplications.$inferSelect;

// Tax rates storage
export const taxRates = pgTable("tax_rates", {
  id: serial("id").primaryKey(),
  zipCode: text("zip_code").notNull(),
  combinedRate: text("combined_rate").notNull(),
  stateRate: text("state_rate").notNull(),
  countyRate: text("county_rate").notNull().default('0'),
  cityRate: text("city_rate").notNull().default('0'),
  districtRate: text("district_rate").notNull().default('0'),
  specialTaxes: text("special_taxes"),
  source: text("source"),
  lastUpdated: timestamp("last_updated").defaultNow(),
  confidence: text("confidence").default('low'),
});

export const insertTaxRateSchema = createInsertSchema(taxRates).pick({
  zipCode: true,
  combinedRate: true,
  stateRate: true,
  countyRate: true,
  cityRate: true,
  districtRate: true,
  specialTaxes: true,
  source: true,
  confidence: true,
});

export type InsertTaxRate = z.infer<typeof insertTaxRateSchema>;
export type TaxRate = typeof taxRates.$inferSelect;

// DMS Integration tables
export const dmsIntegrations = pgTable("dms_integrations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  provider: text("provider").notNull(),
  apiUrl: text("api_url").notNull(),
  apiKey: text("api_key"),
  apiUser: text("api_user"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const dmsIntegrationLogs = pgTable("dms_integration_logs", {
  id: serial("id").primaryKey(),
  dmsIntegrationId: integer("dms_integration_id").references(() => dmsIntegrations.id),
  dealId: integer("deal_id").references(() => deals.id),
  action: text("action").notNull(),
  status: text("status").notNull(),
  requestPayload: text("request_payload"),
  responsePayload: text("response_payload"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Contract Integration tables
export const contractTemplates = pgTable("contract_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  template: text("template").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const dealContracts = pgTable("deal_contracts", {
  id: serial("id").primaryKey(),
  dealId: integer("deal_id").references(() => deals.id).notNull(),
  contractTemplateId: integer("contract_template_id").references(() => contractTemplates.id).notNull(),
  content: text("content").notNull(),
  status: text("status").notNull().default('draft'),
  signedByCustomer: boolean("signed_by_customer").notNull().default(false),
  signedByDealer: boolean("signed_by_dealer").notNull().default(false),
  signatureCustomerData: text("signature_customer_data"),
  signatureDealerData: text("signature_dealer_data"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDmsIntegrationSchema = createInsertSchema(dmsIntegrations).pick({
  name: true, provider: true, apiUrl: true, apiKey: true, apiUser: true, active: true,
});
export const insertDmsIntegrationLogSchema = createInsertSchema(dmsIntegrationLogs).pick({
  dmsIntegrationId: true, dealId: true, action: true, status: true,
  requestPayload: true, responsePayload: true, errorMessage: true,
});
export const insertContractTemplateSchema = createInsertSchema(contractTemplates).pick({
  name: true, category: true, template: true, active: true,
});
export const insertDealContractSchema = createInsertSchema(dealContracts).pick({
  dealId: true, contractTemplateId: true, content: true, status: true,
  signedByCustomer: true, signedByDealer: true, signatureCustomerData: true, signatureDealerData: true,
});

// Trade-in Value Provider tables
export const tradeInProviders = pgTable("trade_in_providers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  apiKey: text("api_key").notNull(),
  apiUrl: text("api_url").notNull(),
  isActive: boolean("is_active").default(true),
  providerType: text("provider_type").notNull(),
  settings: jsonb("settings"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tradeInApiLogs = pgTable("trade_in_api_logs", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").references(() => tradeInProviders.id).notNull(),
  vehicleId: integer("vehicle_id").references(() => vehicles.id),
  dealId: integer("deal_id").references(() => deals.id),
  requestData: jsonb("request_data"),
  responseData: jsonb("response_data"),
  status: text("status").notNull(),
  suggestedValue: numeric("suggested_value", { precision: 10, scale: 2 }),
  valueType: text("value_type"),
  condition: text("condition"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTradeInProviderSchema = createInsertSchema(tradeInProviders).pick({
  name: true, description: true, apiKey: true, apiUrl: true, isActive: true, providerType: true, settings: true,
});
export const insertTradeInApiLogSchema = createInsertSchema(tradeInApiLogs).pick({
  providerId: true, vehicleId: true, dealId: true, requestData: true, responseData: true,
  status: true, suggestedValue: true, valueType: true, condition: true,
});

export type InsertDmsIntegration = z.infer<typeof insertDmsIntegrationSchema>;
export type DmsIntegration = typeof dmsIntegrations.$inferSelect;
export type InsertDmsIntegrationLog = z.infer<typeof insertDmsIntegrationLogSchema>;
export type DmsIntegrationLog = typeof dmsIntegrationLogs.$inferSelect;
export type InsertContractTemplate = z.infer<typeof insertContractTemplateSchema>;
export type ContractTemplate = typeof contractTemplates.$inferSelect;
export type InsertDealContract = z.infer<typeof insertDealContractSchema>;
export type DealContract = typeof dealContracts.$inferSelect;
export type InsertTradeInProvider = z.infer<typeof insertTradeInProviderSchema>;
export type TradeInProvider = typeof tradeInProviders.$inferSelect;
export type InsertTradeInApiLog = z.infer<typeof insertTradeInApiLogSchema>;
export type TradeInApiLog = typeof tradeInApiLogs.$inferSelect;

// Credit integration providers schema
export const integrationProviders = pgTable("integration_providers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  credentials: jsonb("credentials").notNull(),
  apiEndpoint: varchar("api_endpoint", { length: 255 }).notNull(),
  apiKey: varchar("api_key", { length: 255 }),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertIntegrationProviderSchema = createInsertSchema(integrationProviders).pick({
  name: true, type: true, credentials: true, apiEndpoint: true, apiKey: true, active: true,
});

export const creditSubmissions = pgTable("credit_submissions", {
  id: serial("id").primaryKey(),
  dealId: integer("deal_id").notNull(),
  creditApplicationId: integer("credit_application_id").notNull(),
  providerId: integer("provider_id").notNull(),
  submissionData: jsonb("submission_data").notNull(),
  responseData: jsonb("response_data"),
  status: varchar("status", { length: 50 }).notNull(),
  providerReferenceId: varchar("provider_reference_id", { length: 100 }),
  bankId: varchar("bank_id", { length: 100 }),
  bankName: varchar("bank_name", { length: 100 }),
  approvalAmount: numeric("approval_amount"),
  term: integer("term"),
  apr: real("apr"),
  stipulations: jsonb("stipulations"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCreditSubmissionSchema = createInsertSchema(creditSubmissions).pick({
  dealId: true, creditApplicationId: true, providerId: true, submissionData: true,
  responseData: true, status: true, providerReferenceId: true, bankId: true,
  bankName: true, approvalAmount: true, term: true, apr: true, stipulations: true,
});

export type InsertIntegrationProvider = z.infer<typeof insertIntegrationProviderSchema>;
export type IntegrationProvider = typeof integrationProviders.$inferSelect;
export type InsertCreditSubmission = z.infer<typeof insertCreditSubmissionSchema>;
export type CreditSubmission = typeof creditSubmissions.$inferSelect;

// Warranty Quote Requests table
export const warrantyQuoteRequests = pgTable("warranty_quote_requests", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id"),
  vin: varchar("vin", { length: 17 }).notNull(),
  vehicleYear: integer("vehicle_year").notNull(),
  vehicleMake: varchar("vehicle_make", { length: 100 }).notNull(),
  vehicleModel: varchar("vehicle_model", { length: 100 }).notNull(),
  vehicleTrim: varchar("vehicle_trim", { length: 100 }),
  mileage: integer("mileage").notNull(),
  zipCode: varchar("zip_code", { length: 10 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  preferredCoverage: varchar("preferred_coverage", { length: 100 }),
  preferredTerm: integer("preferred_term"),
  maxBudget: decimal("max_budget", { precision: 10, scale: 2 }),
  sessionId: varchar("session_id", { length: 255 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  referrer: text("referrer"),
  utmSource: varchar("utm_source", { length: 100 }),
  utmMedium: varchar("utm_medium", { length: 100 }),
  utmCampaign: varchar("utm_campaign", { length: 100 }),
  seoKeywords: text("seo_keywords").array(),
  marketCondition: varchar("market_condition", { length: 50 }).default('standard'),
  planToKeepVehicleYears: integer("plan_to_keep_vehicle_years"),
  annualMileage: integer("annual_mileage"),
  commercialUse: boolean("commercial_use").default(false),
  roadConditions: varchar("road_conditions", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const warrantyQuoteResponses = pgTable("warranty_quote_responses", {
  id: serial("id").primaryKey(),
  quoteRequestId: integer("quote_request_id").references(() => warrantyQuoteRequests.id).notNull(),
  planId: integer("plan_id").references(() => warrantyPlans.id).notNull(),
  providerId: integer("provider_id").references(() => warrantyProviders.id).notNull(),
  quotedPrice: decimal("quoted_price", { precision: 10, scale: 2 }).notNull(),
  monthlyPrice: decimal("monthly_price", { precision: 10, scale: 2 }),
  effectiveDate: timestamp("effective_date"),
  expirationDate: timestamp("expiration_date"),
  seoRank: integer("seo_rank"),
  matchScore: decimal("match_score", { precision: 5, scale: 2 }),
  discountApplied: decimal("discount_applied", { precision: 5, scale: 2 }),
  specialOffers: text("special_offers").array(),
  isRecommended: boolean("is_recommended").default(false),
  clickCount: integer("click_count").default(0),
  conversionTracking: jsonb("conversion_tracking"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const seoOptimization = pgTable("seo_optimization", {
  id: serial("id").primaryKey(),
  vinPattern: varchar("vin_pattern", { length: 50 }).notNull(),
  keywords: text("keywords").array().notNull(),
  targetAudience: varchar("target_audience", { length: 100 }),
  seasonalFactors: jsonb("seasonal_factors"),
  competitorAnalysis: jsonb("competitor_analysis"),
  contentStrategy: text("content_strategy"),
  metaTitle: varchar("meta_title", { length: 255 }),
  metaDescription: varchar("meta_description", { length: 500 }),
  landingPageUrl: varchar("landing_page_url", { length: 500 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertWarrantyProviderSchema = createInsertSchema(warrantyProviders).pick({
  name: true, companyName: true, logo: true, website: true, phone: true, email: true,
  rating: true, reviewCount: true, licenseNumber: true, established: true,
  coverageTypes: true, marketAreas: true, minVehicleAge: true, maxVehicleAge: true,
  maxMileage: true, isActive: true, seoKeywords: true,
});
export const insertWarrantyPlanSchema = createInsertSchema(warrantyPlans).pick({
  providerId: true, name: true, coverageType: true, termMonths: true, termMiles: true,
  deductible: true, basePrice: true, monthlyPrice: true, maxVehicleValue: true,
  coveredComponents: true, exclusions: true, benefits: true, transferable: true,
  cancellable: true, isPopular: true, seoScore: true,
});
export const insertWarrantyQuoteRequestSchema = createInsertSchema(warrantyQuoteRequests).pick({
  customerId: true, vin: true, vehicleYear: true, vehicleMake: true, vehicleModel: true,
  vehicleTrim: true, mileage: true, zipCode: true, email: true, phone: true,
  firstName: true, lastName: true, preferredCoverage: true, preferredTerm: true,
  maxBudget: true, sessionId: true, ipAddress: true, userAgent: true, referrer: true,
  utmSource: true, utmMedium: true, utmCampaign: true, seoKeywords: true,
  marketCondition: true, planToKeepVehicleYears: true, annualMileage: true,
  commercialUse: true, roadConditions: true,
});
export const insertWarrantyQuoteResponseSchema = createInsertSchema(warrantyQuoteResponses).pick({
  quoteRequestId: true, planId: true, providerId: true, quotedPrice: true,
  monthlyPrice: true, effectiveDate: true, expirationDate: true, seoRank: true,
  matchScore: true, discountApplied: true, specialOffers: true, isRecommended: true,
  clickCount: true, conversionTracking: true,
});
export const insertSeoOptimizationSchema = createInsertSchema(seoOptimization).pick({
  vinPattern: true, keywords: true, targetAudience: true, seasonalFactors: true,
  competitorAnalysis: true, contentStrategy: true, metaTitle: true,
  metaDescription: true, landingPageUrl: true, isActive: true,
});

export type InsertWarrantyProvider = z.infer<typeof insertWarrantyProviderSchema>;
export type WarrantyProvider = typeof warrantyProviders.$inferSelect;
export type InsertWarrantyPlan = z.infer<typeof insertWarrantyPlanSchema>;
export type WarrantyPlan = typeof warrantyPlans.$inferSelect;
export type InsertWarrantyQuoteRequest = z.infer<typeof insertWarrantyQuoteRequestSchema>;
export type WarrantyQuoteRequest = typeof warrantyQuoteRequests.$inferSelect;
export type InsertWarrantyQuoteResponse = z.infer<typeof insertWarrantyQuoteResponseSchema>;
export type WarrantyQuoteResponse = typeof warrantyQuoteResponses.$inferSelect;
export type InsertSeoOptimization = z.infer<typeof insertSeoOptimizationSchema>;
export type SeoOptimization = typeof seoOptimization.$inferSelect;

export type DealWithRelations = Deal & {
  customer: Customer;
  vehicle: Vehicle;
  user: User;
  fiProducts?: FiProduct[];
  documents?: Document[];
  creditApplication?: CreditApplication;
  progressSteps?: DealProgressStep[];
  contracts?: DealContract[];
  creditSubmissions?: CreditSubmission[];
};

// Compliance Management Tables
export const stateComplianceRules = pgTable("state_compliance_rules", {
  id: serial("id").primaryKey(),
  state: varchar("state", { length: 50 }).notNull(),
  stateName: varchar("state_name", { length: 100 }).notNull(),
  brokerLicenseNeeded: boolean("broker_license_needed").default(true),
  licenseType: varchar("license_type", { length: 200 }).notNull(),
  regulatoryAuthority: varchar("regulatory_authority", { length: 200 }).notNull(),
  providerComplianceRequired: text("provider_compliance_required").notNull(),
  appointmentRequired: boolean("appointment_required").default(true),
  keyComplianceNotes: text("key_compliance_notes"),
  refundPeriodDays: integer("refund_period_days").default(30),
  specialRequirements: text("special_requirements").array(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const adminTargetList = pgTable("admin_target_list", {
  id: serial("id").primaryKey(),
  administrator: varchar("administrator", { length: 255 }).notNull(),
  type: varchar("type", { length: 100 }).notNull(),
  keyChannels: text("key_channels").array(),
  stateExclusions: text("state_exclusions").array(),
  stateExclusionNotes: text("state_exclusion_notes"),
  website: varchar("website", { length: 500 }),
  comment: text("comment"),
  contactName: varchar("contact_name", { length: 255 }),
  contactEmail: varchar("contact_email", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  apiAvailable: boolean("api_available").default(false),
  apiEndpoint: varchar("api_endpoint", { length: 500 }),
  apiKey: varchar("api_key", { length: 255 }),
  integrationStatus: varchar("integration_status", { length: 50 }).default('pending'),
  integrationNotes: text("integration_notes"),
  priority: integer("priority").default(5),
  salesQuotaRequired: boolean("sales_quota_required").default(false),
  minimumVolume: integer("minimum_volume"),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }),
  mapPricingRequired: boolean("map_pricing_required").default(false),
  whitelistRequired: boolean("whitelist_required").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const providerComplianceStatus = pgTable("provider_compliance_status", {
  id: serial("id").primaryKey(),
  adminTargetId: integer("admin_target_id").references(() => adminTargetList.id).notNull(),
  state: varchar("state", { length: 50 }).notNull(),
  isCompliant: boolean("is_compliant").default(false),
  licenseNumber: varchar("license_number", { length: 100 }),
  licenseExpiry: timestamp("license_expiry"),
  appointmentStatus: varchar("appointment_status", { length: 50 }).default('pending'),
  appointmentDate: timestamp("appointment_date"),
  complianceNotes: text("compliance_notes"),
  documentsRequired: text("documents_required").array(),
  documentsReceived: text("documents_received").array(),
  lastVerified: timestamp("last_verified"),
  nextReviewDate: timestamp("next_review_date"),
  riskLevel: varchar("risk_level", { length: 20 }).default('medium'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const b4uSignLicenses = pgTable("b4u_sign_licenses", {
  id: serial("id").primaryKey(),
  state: varchar("state", { length: 50 }).notNull(),
  licenseType: varchar("license_type", { length: 200 }).notNull(),
  licenseNumber: varchar("license_number", { length: 100 }),
  issueDate: timestamp("issue_date"),
  expiryDate: timestamp("expiry_date"),
  status: varchar("status", { length: 50 }).default('pending'),
  regulatoryAuthority: varchar("regulatory_authority", { length: 200 }),
  applicationFee: decimal("application_fee", { precision: 10, scale: 2 }),
  renewalFee: decimal("renewal_fee", { precision: 10, scale: 2 }),
  continuingEducationRequired: boolean("continuing_education_required").default(false),
  continuingEducationHours: integer("continuing_education_hours"),
  lastRenewal: timestamp("last_renewal"),
  nextRenewal: timestamp("next_renewal"),
  licenseDocument: varchar("license_document", { length: 500 }),
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertStateComplianceRuleSchema = createInsertSchema(stateComplianceRules).pick({
  state: true, stateName: true, brokerLicenseNeeded: true, licenseType: true,
  regulatoryAuthority: true, providerComplianceRequired: true, appointmentRequired: true,
  keyComplianceNotes: true, refundPeriodDays: true, specialRequirements: true, isActive: true,
});
export const insertAdminTargetSchema = createInsertSchema(adminTargetList).pick({
  administrator: true, type: true, keyChannels: true, stateExclusions: true,
  stateExclusionNotes: true, website: true, comment: true, contactName: true,
  contactEmail: true, contactPhone: true, apiAvailable: true, apiEndpoint: true,
  apiKey: true, integrationStatus: true, integrationNotes: true, priority: true,
  salesQuotaRequired: true, minimumVolume: true, commissionRate: true,
  mapPricingRequired: true, whitelistRequired: true, isActive: true,
});
export const insertProviderComplianceStatusSchema = createInsertSchema(providerComplianceStatus).pick({
  adminTargetId: true, state: true, isCompliant: true, licenseNumber: true,
  licenseExpiry: true, appointmentStatus: true, appointmentDate: true,
  complianceNotes: true, documentsRequired: true, documentsReceived: true,
  lastVerified: true, nextReviewDate: true, riskLevel: true,
});
export const insertB4uSignLicenseSchema = createInsertSchema(b4uSignLicenses).pick({
  state: true, licenseType: true, licenseNumber: true, issueDate: true,
  expiryDate: true, status: true, regulatoryAuthority: true, applicationFee: true,
  renewalFee: true, continuingEducationRequired: true, continuingEducationHours: true,
  lastRenewal: true, nextRenewal: true, licenseDocument: true, notes: true, isActive: true,
});

export type InsertStateComplianceRule = z.infer<typeof insertStateComplianceRuleSchema>;
export type StateComplianceRule = typeof stateComplianceRules.$inferSelect;
export type InsertAdminTarget = z.infer<typeof insertAdminTargetSchema>;
export type AdminTarget = typeof adminTargetList.$inferSelect;
export type InsertProviderComplianceStatus = z.infer<typeof insertProviderComplianceStatusSchema>;
export type ProviderComplianceStatus = typeof providerComplianceStatus.$inferSelect;
export type InsertB4uSignLicense = z.infer<typeof insertB4uSignLicenseSchema>;
export type B4uSignLicense = typeof b4uSignLicenses.$inferSelect;

export type WarrantyQuoteWithRelations = WarrantyQuoteRequest & {
  responses: (WarrantyQuoteResponse & { plan: WarrantyPlan; provider: WarrantyProvider; })[];
};
export type AdminTargetWithCompliance = AdminTarget & { complianceStatus: ProviderComplianceStatus[]; };

// Provider Performance and Claims Intelligence Schema
export const providerPerformance = pgTable("provider_performance", {
  id: serial("id").primaryKey(),
  providerId: varchar("provider_id", { length: 50 }).notNull(),
  providerName: varchar("provider_name", { length: 255 }).notNull(),
  monthYear: varchar("month_year", { length: 7 }).notNull(),
  totalClaims: integer("total_claims").default(0),
  approvedClaims: integer("approved_claims").default(0),
  deniedClaims: integer("denied_claims").default(0),
  pendingClaims: integer("pending_claims").default(0),
  avgProcessingDays: decimal("avg_processing_days", { precision: 5, scale: 2 }).default("0"),
  customerSatisfactionScore: decimal("customer_satisfaction_score", { precision: 3, scale: 2 }).default("0"),
  totalClaimAmount: decimal("total_claim_amount", { precision: 12, scale: 2 }).default("0"),
  avgClaimAmount: decimal("avg_claim_amount", { precision: 10, scale: 2 }).default("0"),
  financialStabilityRating: varchar("financial_stability_rating", { length: 3 }),
  totalContracts: integer("total_contracts").default(0),
  activeContracts: integer("active_contracts").default(0),
  renewalRate: decimal("renewal_rate", { precision: 5, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const claimsTracking = pgTable("claims_tracking", {
  id: serial("id").primaryKey(),
  claimId: varchar("claim_id", { length: 100 }).notNull().unique(),
  contractId: varchar("contract_id", { length: 100 }).notNull(),
  customerId: integer("customer_id").references(() => customers.id),
  providerId: varchar("provider_id", { length: 50 }).notNull(),
  vehicleVin: varchar("vehicle_vin", { length: 17 }),
  claimType: varchar("claim_type", { length: 100 }),
  claimDescription: text("claim_description"),
  claimAmount: decimal("claim_amount", { precision: 10, scale: 2 }),
  dateSubmitted: timestamp("date_submitted").defaultNow(),
  dateProcessed: timestamp("date_processed"),
  status: varchar("status", { length: 50 }).default("pending"),
  reasonCode: varchar("reason_code", { length: 100 }),
  processingNotes: text("processing_notes"),
  repairShop: varchar("repair_shop", { length: 255 }),
  customerRating: integer("customer_rating"),
  customerFeedback: text("customer_feedback"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const providerAlerts = pgTable("provider_alerts", {
  id: serial("id").primaryKey(),
  providerId: varchar("provider_id", { length: 50 }).notNull(),
  alertType: varchar("alert_type", { length: 50 }).notNull(),
  severity: varchar("severity", { length: 20 }).default("medium"),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  triggerValue: decimal("trigger_value", { precision: 10, scale: 2 }),
  thresholdValue: decimal("threshold_value", { precision: 10, scale: 2 }),
  isActive: boolean("is_active").default(true),
  isResolved: boolean("is_resolved").default(false),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow()
});

export const brokerRevenue = pgTable("broker_revenue", {
  id: serial("id").primaryKey(),
  contractId: varchar("contract_id", { length: 100 }).notNull(),
  providerId: varchar("provider_id", { length: 50 }).notNull(),
  customerId: integer("customer_id").references(() => customers.id),
  contractValue: decimal("contract_value", { precision: 10, scale: 2 }).notNull(),
  baseCommissionRate: decimal("base_commission_rate", { precision: 5, scale: 4 }).notNull(),
  performanceBonusRate: decimal("performance_bonus_rate", { precision: 5, scale: 4 }).default("0"),
  volumeBonusRate: decimal("volume_bonus_rate", { precision: 5, scale: 4 }).default("0"),
  totalCommissionAmount: decimal("total_commission_amount", { precision: 10, scale: 2 }).notNull(),
  paymentStatus: varchar("payment_status", { length: 50 }).default("pending"),
  paymentDate: timestamp("payment_date"),
  saleDate: timestamp("sale_date").defaultNow(),
  monthYear: varchar("month_year", { length: 7 }).notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertProviderPerformanceSchema = createInsertSchema(providerPerformance).omit({ id: true, createdAt: true, updatedAt: true });
export const insertClaimsTrackingSchema = createInsertSchema(claimsTracking).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProviderAlertsSchema = createInsertSchema(providerAlerts).omit({ id: true, createdAt: true });
export const insertBrokerRevenueSchema = createInsertSchema(brokerRevenue).omit({ id: true, createdAt: true });

export type ProviderPerformance = typeof providerPerformance.$inferSelect;
export type InsertProviderPerformance = z.infer<typeof insertProviderPerformanceSchema>;
export type ClaimsTracking = typeof claimsTracking.$inferSelect;
export type InsertClaimsTracking = z.infer<typeof insertClaimsTrackingSchema>;
export type ProviderAlert = typeof providerAlerts.$inferSelect;
export type InsertProviderAlert = z.infer<typeof insertProviderAlertsSchema>;
export type BrokerRevenue = typeof brokerRevenue.$inferSelect;
export type InsertBrokerRevenue = z.infer<typeof insertBrokerRevenueSchema>;

// Provider Onboarding and Integration Schema
export const providerOnboarding = pgTable("provider_onboarding", {
  id: serial("id").primaryKey(),
  applicationId: varchar("application_id", { length: 100 }).notNull().unique(),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  legalBusinessName: varchar("legal_business_name", { length: 255 }).notNull(),
  dbaName: varchar("dba_name", { length: 255 }),
  federalTaxId: varchar("federal_tax_id", { length: 20 }).notNull(),
  businessLicenseNumber: varchar("business_license_number", { length: 100 }),
  businessAddress: text("business_address").notNull(),
  businessCity: varchar("business_city", { length: 100 }).notNull(),
  businessState: varchar("business_state", { length: 2 }).notNull(),
  businessZipCode: varchar("business_zip_code", { length: 10 }).notNull(),
  mailingAddress: text("mailing_address"),
  mailingCity: varchar("mailing_city", { length: 100 }),
  mailingState: varchar("mailing_state", { length: 2 }),
  mailingZipCode: varchar("mailing_zip_code", { length: 10 }),
  primaryContactName: varchar("primary_contact_name", { length: 255 }).notNull(),
  primaryContactTitle: varchar("primary_contact_title", { length: 100 }),
  primaryContactEmail: varchar("primary_contact_email", { length: 255 }).notNull(),
  primaryContactPhone: varchar("primary_contact_phone", { length: 20 }).notNull(),
  technicalContactName: varchar("technical_contact_name", { length: 255 }),
  technicalContactEmail: varchar("technical_contact_email", { length: 255 }),
  technicalContactPhone: varchar("technical_contact_phone", { length: 20 }),
  businessType: varchar("business_type", { length: 50 }).notNull(),
  yearsInBusiness: integer("years_in_business").notNull(),
  annualRevenue: decimal("annual_revenue", { precision: 15, scale: 2 }),
  numberOfEmployees: integer("number_of_employees"),
  coverageTypes: text("coverage_types").array().notNull(),
  marketAreas: text("market_areas").array().notNull(),
  financialStabilityRating: varchar("financial_stability_rating", { length: 10 }),
  insuranceCarrier: varchar("insurance_carrier", { length: 255 }),
  insurancePolicyNumber: varchar("insurance_policy_number", { length: 100 }),
  minimumCoverage: decimal("minimum_coverage", { precision: 12, scale: 2 }),
  maximumCoverage: decimal("maximum_coverage", { precision: 12, scale: 2 }),
  apiIntegrationType: varchar("api_integration_type", { length: 50 }),
  preferredDataFormat: varchar("preferred_data_format", { length: 20 }),
  webhookUrl: varchar("webhook_url", { length: 500 }),
  callbackUrl: varchar("callback_url", { length: 500 }),
  applicationStatus: varchar("application_status", { length: 50 }).default("pending"),
  approvalDate: timestamp("approval_date"),
  rejectionReason: text("rejection_reason"),
  onboardingStage: varchar("onboarding_stage", { length: 50 }).default("application"),
  commissionStructure: jsonb("commission_structure"),
  contractTerms: text("contract_terms"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const providerApiIntegration = pgTable("provider_api_integration", {
  id: serial("id").primaryKey(),
  providerId: varchar("provider_id", { length: 50 }).notNull(),
  providerName: varchar("provider_name", { length: 255 }).notNull(),
  apiType: varchar("api_type", { length: 50 }).notNull(),
  baseUrl: varchar("base_url", { length: 500 }).notNull(),
  authType: varchar("auth_type", { length: 50 }).notNull(),
  authCredentials: jsonb("auth_credentials").notNull(),
  dataFormat: varchar("data_format", { length: 20 }).default("json"),
  rateLimit: integer("rate_limit").default(1000),
  timeout: integer("timeout").default(30),
  retryAttempts: integer("retry_attempts").default(3),
  apiVersion: varchar("api_version", { length: 20 }),
  sandboxMode: boolean("sandbox_mode").default(true),
  webhookSecret: varchar("webhook_secret", { length: 255 }),
  supportedOperations: text("supported_operations").array().notNull(),
  fieldMappings: jsonb("field_mappings").notNull(),
  validationRules: jsonb("validation_rules"),
  errorHandlingConfig: jsonb("error_handling_config"),
  monitoringEnabled: boolean("monitoring_enabled").default(true),
  lastHealthCheck: timestamp("last_health_check"),
  healthStatus: varchar("health_status", { length: 20 }).default("unknown"),
  avgResponseTime: decimal("avg_response_time", { precision: 8, scale: 3 }),
  isActive: boolean("is_active").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const providerApiLogs = pgTable("provider_api_logs", {
  id: serial("id").primaryKey(),
  providerId: varchar("provider_id", { length: 50 }).notNull(),
  operation: varchar("operation", { length: 50 }).notNull(),
  endpoint: varchar("endpoint", { length: 500 }).notNull(),
  httpMethod: varchar("http_method", { length: 10 }).notNull(),
  requestHeaders: jsonb("request_headers"),
  requestBody: text("request_body"),
  responseStatus: integer("response_status"),
  responseHeaders: jsonb("response_headers"),
  responseBody: text("response_body"),
  responseTime: decimal("response_time", { precision: 8, scale: 3 }),
  errorMessage: text("error_message"),
  customerId: integer("customer_id"),
  sessionId: varchar("session_id", { length: 255 }),
  success: boolean("success").notNull(),
  retryAttempt: integer("retry_attempt").default(0),
  createdAt: timestamp("created_at").defaultNow()
});

export const providerDocuments = pgTable("provider_documents", {
  id: serial("id").primaryKey(),
  providerId: varchar("provider_id", { length: 50 }),
  onboardingId: integer("onboarding_id").references(() => providerOnboarding.id),
  documentType: varchar("document_type", { length: 100 }).notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type", { length: 100 }),
  documentUrl: varchar("document_url", { length: 500 }),
  s3Bucket: varchar("s3_bucket", { length: 100 }),
  s3Key: varchar("s3_key", { length: 500 }),
  uploadedBy: varchar("uploaded_by", { length: 255 }),
  verificationStatus: varchar("verification_status", { length: 50 }).default("pending"),
  verificationNotes: text("verification_notes"),
  expirationDate: timestamp("expiration_date"),
  isRequired: boolean("is_required").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const providerComplianceChecks = pgTable("provider_compliance_checks", {
  id: serial("id").primaryKey(),
  providerId: varchar("provider_id", { length: 50 }),
  onboardingId: integer("onboarding_id").references(() => providerOnboarding.id),
  checkType: varchar("check_type", { length: 100 }).notNull(),
  checkProvider: varchar("check_provider", { length: 100 }),
  status: varchar("status", { length: 50 }).default("pending"),
  result: jsonb("result"),
  score: decimal("score", { precision: 5, scale: 2 }),
  notes: text("notes"),
  expirationDate: timestamp("expiration_date"),
  nextCheckDate: timestamp("next_check_date"),
  automaticRenewal: boolean("automatic_renewal").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertProviderOnboardingSchema = createInsertSchema(providerOnboarding).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProviderApiIntegrationSchema = createInsertSchema(providerApiIntegration).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProviderApiLogsSchema = createInsertSchema(providerApiLogs).omit({ id: true, createdAt: true });
export const insertProviderDocumentsSchema = createInsertSchema(providerDocuments).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProviderComplianceChecksSchema = createInsertSchema(providerComplianceChecks).omit({ id: true, createdAt: true, updatedAt: true });

export type ProviderOnboarding = typeof providerOnboarding.$inferSelect;
export type InsertProviderOnboarding = z.infer<typeof insertProviderOnboardingSchema>;
export type ProviderApiIntegration = typeof providerApiIntegration.$inferSelect;
export type InsertProviderApiIntegration = z.infer<typeof insertProviderApiIntegrationSchema>;
export type ProviderApiLog = typeof providerApiLogs.$inferSelect;
export type InsertProviderApiLog = z.infer<typeof insertProviderApiLogsSchema>;
export type ProviderDocument = typeof providerDocuments.$inferSelect;
export type InsertProviderDocument = z.infer<typeof insertProviderDocumentsSchema>;
export type ProviderComplianceCheck = typeof providerComplianceChecks.$inferSelect;
export type InsertProviderComplianceCheck = z.infer<typeof insertProviderComplianceChecksSchema>;

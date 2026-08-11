import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull().default("client"),
    status: text("status").notNull().default("active"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    emailUnique: uniqueIndex("users_email_unique").on(table.email),
  }),
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (table) => ({
    tokenUnique: uniqueIndex("sessions_token_unique").on(table.tokenHash),
    userIndex: index("sessions_user_idx").on(table.userId),
    expiryIndex: index("sessions_expiry_idx").on(table.expiresAt),
  }),
);

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => ({
    tokenUnique: uniqueIndex("password_reset_tokens_token_unique").on(table.tokenHash),
    userIndex: index("password_reset_tokens_user_idx").on(table.userId),
    expiryIndex: index("password_reset_tokens_expiry_idx").on(table.expiresAt),
  }),
);

export const clients = pgTable(
  "clients",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    whatsapp: text("whatsapp"),
    email: text("email"),
    birthDate: text("birth_date"),
    address: text("address"),
    preferences: text("preferences"),
    allergies: text("allergies"),
    notes: text("notes"),
    photoConsent: boolean("photo_consent").notNull().default(false),
    marketingConsent: boolean("marketing_consent").notNull().default(false),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    phoneIndex: index("clients_phone_idx").on(table.phone),
    emailIndex: index("clients_email_idx").on(table.email),
    activeNameIndex: index("clients_active_name_idx").on(
      table.active,
      table.name,
    ),
    userIndex: index("clients_user_idx").on(table.userId),
  }),
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (table) => ({
    entityIndex: index("audit_logs_entity_idx").on(
      table.entity,
      table.entityId,
    ),
    userDateIndex: index("audit_logs_user_date_idx").on(
      table.userId,
      table.createdAt,
    ),
  }),
);

export const serviceCategories = pgTable(
  "service_categories",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    displayOrder: integer("display_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    activeOrderIndex: index("service_categories_active_order_idx").on(
      table.active,
      table.displayOrder,
    ),
  }),
);

export const services = pgTable(
  "services",
  {
    id: text("id").primaryKey(),
    categoryId: text("category_id").references(() => serviceCategories.id),
    name: text("name").notNull(),
    description: text("description").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    priceType: text("price_type").notNull().default("fixed"),
    priceCents: integer("price_cents"),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    categoryIndex: index("services_category_idx").on(table.categoryId),
    activeIndex: index("services_active_idx").on(table.active),
  }),
);

export const professionals = pgTable(
  "professionals",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    title: text("title"),
    phone: text("phone"),
    active: boolean("active").notNull().default(true),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    activeOrderIndex: index("professionals_active_order_idx").on(
      table.active,
      table.displayOrder,
    ),
  }),
);

export const portfolioItems = pgTable(
  "portfolio_items",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    category: text("category").notNull(),
    serviceId: text("service_id").references(() => services.id),
    professionalId: text("professional_id").references(() => professionals.id),
    mainImageUrl: text("main_image_url").notNull(),
    beforeImageUrl: text("before_image_url"),
    afterImageUrl: text("after_image_url"),
    published: boolean("published").notNull().default(false),
    featured: boolean("featured").notNull().default(false),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    publishedOrderIndex: index("portfolio_items_published_order_idx").on(
      table.published,
      table.displayOrder,
    ),
    categoryPublishedIndex: index("portfolio_items_category_published_idx").on(
      table.category,
      table.published,
    ),
    featuredIndex: index("portfolio_items_featured_idx").on(table.featured),
  }),
);

export const professionalServices = pgTable(
  "professional_services",
  {
    id: text("id").primaryKey(),
    professionalId: text("professional_id")
      .notNull()
      .references(() => professionals.id),
    serviceId: text("service_id")
      .notNull()
      .references(() => services.id),
    createdAt: createdAt(),
  },
  (table) => ({
    professionalIndex: index("professional_services_professional_idx").on(
      table.professionalId,
    ),
    serviceIndex: index("professional_services_service_idx").on(
      table.serviceId,
    ),
    professionalServiceUnique: uniqueIndex("professional_services_unique").on(
      table.professionalId,
      table.serviceId,
    ),
  }),
);

export const businessHours = pgTable(
  "business_hours",
  {
    id: text("id").primaryKey(),
    professionalId: text("professional_id")
      .notNull()
      .references(() => professionals.id),
    weekday: integer("weekday").notNull(),
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
    breakStart: text("break_start"),
    breakEnd: text("break_end"),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    professionalWeekdayUnique: uniqueIndex(
      "business_hours_professional_weekday_unique",
    ).on(table.professionalId, table.weekday),
    professionalIndex: index("business_hours_professional_idx").on(
      table.professionalId,
    ),
  }),
);

export const blockedTimes = pgTable(
  "blocked_times",
  {
    id: text("id").primaryKey(),
    professionalId: text("professional_id")
      .notNull()
      .references(() => professionals.id),
    blockDate: text("block_date").notNull(),
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
    reason: text("reason"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    professionalDateIndex: index("blocked_times_professional_date_idx").on(
      table.professionalId,
      table.blockDate,
    ),
  }),
);

export const paymentMethods = pgTable(
  "payment_methods",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    active: boolean("active").notNull().default(true),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    activeOrderIndex: index("payment_methods_active_order_idx").on(
      table.active,
      table.displayOrder,
    ),
  }),
);

export const appointments = pgTable(
  "appointments",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id),
    professionalId: text("professional_id").references(() => professionals.id),
    appointmentDate: text("appointment_date").notNull(),
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
    status: text("status").notNull().default("pending_confirmation"),
    totalEstimatedCents: integer("total_estimated_cents"),
    notesClient: text("notes_client"),
    source: text("source").notNull().default("website"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    dateIndex: index("appointments_date_idx").on(table.appointmentDate),
    clientDateIndex: index("appointments_client_date_idx").on(
      table.clientId,
      table.appointmentDate,
    ),
    slotIndex: index("appointments_slot_idx").on(
      table.appointmentDate,
      table.startTime,
      table.endTime,
    ),
    professionalSlotIndex: index("appointments_professional_slot_idx").on(
      table.professionalId,
      table.appointmentDate,
      table.startTime,
      table.endTime,
    ),
  }),
);

export const payments = pgTable(
  "payments",
  {
    id: text("id").primaryKey(),
    appointmentId: text("appointment_id")
      .notNull()
      .references(() => appointments.id),
    paymentMethodId: text("payment_method_id").references(
      () => paymentMethods.id,
    ),
    kind: text("kind").notNull().default("full"),
    amountCents: integer("amount_cents").notNull(),
    discountCents: integer("discount_cents").notNull().default(0),
    surchargeCents: integer("surcharge_cents").notNull().default(0),
    status: text("status").notNull().default("pending"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    transactionReference: text("transaction_reference"),
    notes: text("notes"),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    appointmentIndex: index("payments_appointment_idx").on(
      table.appointmentId,
    ),
    statusPaidIndex: index("payments_status_paid_idx").on(
      table.status,
      table.paidAt,
    ),
    methodIndex: index("payments_method_idx").on(table.paymentMethodId),
  }),
);

export const promotions = pgTable(
  "promotions",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    discountType: text("discount_type").notNull().default("percentage"),
    discountValue: integer("discount_value").notNull().default(0),
    couponCode: text("coupon_code"),
    audience: text("audience").notNull().default("all"),
    comboDescription: text("combo_description"),
    startDate: text("start_date").notNull(),
    endDate: text("end_date").notNull(),
    active: boolean("active").notNull().default(true),
    featured: boolean("featured").notNull().default(false),
    createdBy: text("created_by").notNull().references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    activeDateIndex: index("promotions_active_date_idx").on(
      table.active,
      table.startDate,
      table.endDate,
    ),
    couponUnique: uniqueIndex("promotions_coupon_unique").on(table.couponCode),
  }),
);

export const promotionServices = pgTable(
  "promotion_services",
  {
    id: text("id").primaryKey(),
    promotionId: text("promotion_id").notNull().references(() => promotions.id),
    serviceId: text("service_id").notNull().references(() => services.id),
    createdAt: createdAt(),
  },
  (table) => ({
    promotionIndex: index("promotion_services_promotion_idx").on(table.promotionId),
    promotionServiceUnique: uniqueIndex("promotion_services_unique").on(
      table.promotionId,
      table.serviceId,
    ),
  }),
);

export const loyaltyAccounts = pgTable(
  "loyalty_accounts",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id").notNull().references(() => clients.id),
    points: integer("points").notNull().default(0),
    stamps: integer("stamps").notNull().default(0),
    referrals: integer("referrals").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    clientUnique: uniqueIndex("loyalty_accounts_client_unique").on(table.clientId),
  }),
);

export const loyaltyTransactions = pgTable(
  "loyalty_transactions",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id").notNull().references(() => clients.id),
    appointmentId: text("appointment_id").references(() => appointments.id),
    kind: text("kind").notNull(),
    pointsDelta: integer("points_delta").notNull().default(0),
    stampsDelta: integer("stamps_delta").notNull().default(0),
    referralsDelta: integer("referrals_delta").notNull().default(0),
    description: text("description").notNull(),
    createdBy: text("created_by").notNull().references(() => users.id),
    createdAt: createdAt(),
  },
  (table) => ({
    clientDateIndex: index("loyalty_transactions_client_date_idx").on(
      table.clientId,
      table.createdAt,
    ),
    appointmentIndex: index("loyalty_transactions_appointment_idx").on(table.appointmentId),
  }),
);

export const reminderRules = pgTable(
  "reminder_rules",
  {
    id: text("id").primaryKey(),
    hoursBefore: integer("hours_before").notNull(),
    channel: text("channel").notNull().default("in_app"),
    active: boolean("active").notNull().default(true),
    createdBy: text("created_by").notNull().references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    hoursChannelUnique: uniqueIndex("reminder_rules_hours_channel_unique").on(
      table.hoursBefore,
      table.channel,
    ),
  }),
);

export const notifications = pgTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id),
    appointmentId: text("appointment_id").references(() => appointments.id),
    title: text("title").notNull(),
    message: text("message").notNull(),
    type: text("type").notNull(),
    channel: text("channel").notNull().default("in_app"),
    status: text("status").notNull().default("pending"),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdBy: text("created_by").references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    userStatusIndex: index("notifications_user_status_idx").on(
      table.userId,
      table.status,
    ),
    scheduleIndex: index("notifications_schedule_idx").on(
      table.status,
      table.scheduledFor,
    ),
    appointmentIndex: index("notifications_appointment_idx").on(table.appointmentId),
  }),
);

export const reviews = pgTable(
  "reviews",
  {
    id: text("id").primaryKey(),
    appointmentId: text("appointment_id").notNull().references(() => appointments.id),
    clientId: text("client_id").notNull().references(() => clients.id),
    serviceQuality: integer("service_quality").notNull(),
    resultRating: integer("result_rating").notNull(),
    punctuality: integer("punctuality").notNull(),
    environmentRating: integer("environment_rating").notNull(),
    overallRating: integer("overall_rating").notNull(),
    comment: text("comment").notNull(),
    status: text("status").notNull().default("pending"),
    adminResponse: text("admin_response"),
    featured: boolean("featured").notNull().default(false),
    moderatedBy: text("moderated_by").references(() => users.id),
    moderatedAt: timestamp("moderated_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    appointmentUnique: uniqueIndex("reviews_appointment_unique").on(table.appointmentId),
    publicIndex: index("reviews_public_idx").on(table.status, table.featured, table.createdAt),
    clientIndex: index("reviews_client_idx").on(table.clientId, table.createdAt),
  }),
);

export const salonSettings = pgTable("salon_settings", {
  id: text("id").primaryKey(),
  salonName: text("salon_name").notNull(),
  logoUrl: text("logo_url"),
  address: text("address"),
  phone: text("phone"),
  whatsapp: text("whatsapp"),
  instagram: text("instagram"),
  cancellationHours: integer("cancellation_hours").notNull().default(24),
  depositPercent: integer("deposit_percent").notNull().default(0),
  toleranceMinutes: integer("tolerance_minutes").notNull().default(15),
  rescheduleAllowed: boolean("reschedule_allowed").notNull().default(true),
  noShowBlockThreshold: integer("no_show_block_threshold").notNull().default(3),
  noShowBlockDays: integer("no_show_block_days").notNull().default(30),
  cancellationPolicy: text("cancellation_policy").notNull(),
  privacyPolicy: text("privacy_policy").notNull(),
  homepageHeadline: text("homepage_headline"),
  homepageDescription: text("homepage_description"),
  bannerImageUrl: text("banner_image_url"),
  primaryColor: text("primary_color").notNull().default("#0B0B0B"),
  accentColor: text("accent_color").notNull().default("#D4AF37"),
  updatedBy: text("updated_by").notNull().references(() => users.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const waitlistEntries = pgTable(
  "waitlist_entries",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id").references(() => clients.id),
    serviceId: text("service_id").notNull().references(() => services.id),
    professionalId: text("professional_id").references(() => professionals.id),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    desiredDate: text("desired_date").notNull(),
    period: text("period").notNull().default("any"),
    notes: text("notes"),
    status: text("status").notNull().default("waiting"),
    createdBy: text("created_by").references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    statusDateIndex: index("waitlist_status_date_idx").on(table.status, table.desiredDate),
    serviceIndex: index("waitlist_service_idx").on(table.serviceId),
  }),
);

export const appointmentServices = pgTable(
  "appointment_services",
  {
    id: text("id").primaryKey(),
    appointmentId: text("appointment_id")
      .notNull()
      .references(() => appointments.id),
    serviceId: text("service_id")
      .notNull()
      .references(() => services.id),
    priceCents: integer("price_cents"),
    durationMinutes: integer("duration_minutes").notNull(),
    createdAt: createdAt(),
  },
  (table) => ({
    appointmentIndex: index("appointment_services_appointment_idx").on(
      table.appointmentId,
    ),
    serviceIndex: index("appointment_services_service_idx").on(table.serviceId),
  }),
);

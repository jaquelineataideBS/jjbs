import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("client"),
  status: text("status").notNull().default("active"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => ({
  emailUnique: uniqueIndex("users_email_unique").on(table.email),
}));

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: createdAt(),
}, (table) => ({
  tokenUnique: uniqueIndex("sessions_token_unique").on(table.tokenHash),
  userIndex: index("sessions_user_idx").on(table.userId),
  expiryIndex: index("sessions_expiry_idx").on(table.expiresAt),
}));

export const clients = pgTable("clients", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  notes: text("notes"),
  marketingConsent: boolean("marketing_consent").notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => ({
  phoneIndex: index("clients_phone_idx").on(table.phone),
  userIndex: index("clients_user_idx").on(table.userId),
}));

export const serviceCategories = pgTable("service_categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  displayOrder: integer("display_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => ({
  activeOrderIndex: index("service_categories_active_order_idx").on(table.active, table.displayOrder),
}));

export const services = pgTable("services", {
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
}, (table) => ({
  categoryIndex: index("services_category_idx").on(table.categoryId),
  activeIndex: index("services_active_idx").on(table.active),
}));

export const appointments = pgTable("appointments", {
  id: text("id").primaryKey(),
  clientId: text("client_id").notNull().references(() => clients.id),
  appointmentDate: text("appointment_date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  status: text("status").notNull().default("pending_confirmation"),
  totalEstimatedCents: integer("total_estimated_cents"),
  notesClient: text("notes_client"),
  source: text("source").notNull().default("website"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => ({
  dateIndex: index("appointments_date_idx").on(table.appointmentDate),
  clientDateIndex: index("appointments_client_date_idx").on(table.clientId, table.appointmentDate),
  slotIndex: index("appointments_slot_idx").on(table.appointmentDate, table.startTime, table.endTime),
}));

export const appointmentServices = pgTable("appointment_services", {
  id: text("id").primaryKey(),
  appointmentId: text("appointment_id").notNull().references(() => appointments.id),
  serviceId: text("service_id").notNull().references(() => services.id),
  priceCents: integer("price_cents"),
  durationMinutes: integer("duration_minutes").notNull(),
  createdAt: createdAt(),
}, (table) => ({
  appointmentIndex: index("appointment_services_appointment_idx").on(table.appointmentId),
  serviceIndex: index("appointment_services_service_idx").on(table.serviceId),
}));

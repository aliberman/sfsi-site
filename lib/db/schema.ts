import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// All money values are stored as integer cents.

export const userRole = pgEnum("user_role", ["client", "operator", "admin"]);

export const eventType = pgEnum("event_type", [
  "wedding",
  "bar_mitzvah",
  "bat_mitzvah",
  "bris",
  "kiddush",
  "sheva_brachos",
  "upsherin",
  "engagement",
  "other",
]);

// Lifecycle of an event from the client's first draft to completion.
export const eventStatus = pgEnum("event_status", [
  "draft", // client is still filling it in
  "submitted", // client sent it to SFSI for review
  "quoted", // operator sent a quote, waiting on client
  "booked", // client accepted a quote; payment plan + provisioning begin
  "in_production", // staff/equipment/logistics being finalized
  "completed",
  "cancelled",
]);

export const catalogCategory = pgEnum("catalog_category", [
  "equipment",
  "service",
  "staffing",
  "catering",
  "decor",
  "venue",
]);

export const pricingUnit = pgEnum("pricing_unit", ["each", "per_guest", "per_hour", "flat"]);

export const requestStatus = pgEnum("request_status", ["requested", "approved", "declined"]);

export const mealType = pgEnum("meal_type", ["meat", "dairy", "pareve"]);
export const serviceStyle = pgEnum("service_style", [
  "plated",
  "buffet",
  "family_style",
  "stations",
  "kiddush",
  "cocktail",
]);
export const cateringStatus = pgEnum("catering_status", ["requested", "quoted", "closed"]);

export const quoteStatus = pgEnum("quote_status", ["draft", "sent", "accepted", "declined", "superseded"]);

export const planStatus = pgEnum("plan_status", ["active", "completed", "cancelled"]);
export const installmentStatus = pgEnum("installment_status", ["pending", "paid", "waived"]);
export const paymentMethod = pgEnum("payment_method", ["card", "check", "zelle", "ach", "cash", "other"]);

export const staffRole = pgEnum("staff_role", [
  "coordinator",
  "server",
  "bartender",
  "chef",
  "mashgiach",
  "setup_crew",
  "photographer",
  "videographer",
  "musician",
  "security",
  "valet",
  "other",
]);
export const assignmentStatus = pgEnum("assignment_status", ["tentative", "confirmed", "declined"]);

export const taskCategory = pgEnum("task_category", [
  "planning",
  "staffing",
  "equipment",
  "catering",
  "logistics",
  "vendor",
  "finance",
]);
export const taskStatus = pgEnum("task_status", ["todo", "in_progress", "done"]);

export const inquiryKind = pgEnum("inquiry_kind", ["plan", "partner", "donate", "general"]);

export const vendorCategory = pgEnum("vendor_category", [
  "caterer",
  "music",
  "photo_video",
  "florist_decor",
  "rentals",
  "other",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
};

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  role: userRole("role").notNull().default("client"),
  ...timestamps,
});

export const venues = pgTable("venues", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  neighborhood: text("neighborhood"),
  capacity: integer("capacity"),
  shabbosFriendly: boolean("shabbos_friendly").notNull().default(false),
  description: text("description"),
  active: boolean("active").notNull().default(true),
  ...timestamps,
});

export const packages = pgTable("packages", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  tagline: text("tagline"),
  startingPrice: integer("starting_price"), // null = "pricing on request"
  features: jsonb("features").$type<string[]>().notNull().default([]),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  ...timestamps,
});

export const catalogItems = pgTable("catalog_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  category: catalogCategory("category").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  unit: pricingUnit("unit").notNull().default("each"),
  unitPrice: integer("unit_price").notNull().default(0),
  // Physical stock SFSI owns; used to detect double-booking. Null = not tracked.
  inventoryQty: integer("inventory_qty"),
  active: boolean("active").notNull().default(true),
  ...timestamps,
});

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  coordinatorId: uuid("coordinator_id").references(() => users.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  type: eventType("type").notNull(),
  status: eventStatus("status").notNull().default("draft"),
  eventDate: date("event_date"),
  startTime: text("start_time"),
  endTime: text("end_time"),
  guestCount: integer("guest_count"),
  venueId: uuid("venue_id").references(() => venues.id, { onDelete: "set null" }),
  venueNotes: text("venue_notes"),
  packageId: uuid("package_id").references(() => packages.id, { onDelete: "set null" }),
  budget: integer("budget"),
  notes: text("notes"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  ...timestamps,
});

export const serviceRequests = pgTable("service_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  catalogItemId: uuid("catalog_item_id").references(() => catalogItems.id, { onDelete: "set null" }),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull().default(1),
  notes: text("notes"),
  status: requestStatus("status").notNull().default("requested"),
  ...timestamps,
});

export const cateringRequests = pgTable("catering_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  mealType: mealType("meal_type").notNull(),
  serviceStyle: serviceStyle("service_style").notNull(),
  guestCount: integer("guest_count").notNull(),
  hechsher: text("hechsher"),
  menuNotes: text("menu_notes"),
  dietaryNotes: text("dietary_notes"),
  budgetPerGuest: integer("budget_per_guest"),
  status: cateringStatus("status").notNull().default("requested"),
  ...timestamps,
});

export const quotes = pgTable("quotes", {
  id: uuid("id").primaryKey().defaultRandom(),
  number: serial("number").notNull(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  status: quoteStatus("status").notNull().default("draft"),
  notes: text("notes"),
  validUntil: date("valid_until"),
  discount: integer("discount").notNull().default(0),
  // Community subsidy SFSI applies on top of any discount.
  subsidy: integer("subsidy").notNull().default(0),
  taxRateBps: integer("tax_rate_bps").notNull().default(0),
  createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
  ...timestamps,
});

export const quoteLines = pgTable("quote_lines", {
  id: uuid("id").primaryKey().defaultRandom(),
  quoteId: uuid("quote_id")
    .notNull()
    .references(() => quotes.id, { onDelete: "cascade" }),
  catalogItemId: uuid("catalog_item_id").references(() => catalogItems.id, { onDelete: "set null" }),
  category: catalogCategory("category").notNull().default("service"),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: integer("unit_price").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const paymentPlans = pgTable("payment_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .notNull()
    .unique()
    .references(() => events.id, { onDelete: "cascade" }),
  quoteId: uuid("quote_id").references(() => quotes.id, { onDelete: "set null" }),
  total: integer("total").notNull(),
  status: planStatus("status").notNull().default("active"),
  ...timestamps,
});

export const installments = pgTable("installments", {
  id: uuid("id").primaryKey().defaultRandom(),
  planId: uuid("plan_id")
    .notNull()
    .references(() => paymentPlans.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  dueDate: date("due_date").notNull(),
  amount: integer("amount").notNull(),
  status: installmentStatus("status").notNull().default("pending"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  method: paymentMethod("method"),
  reference: text("reference"),
  stripeSessionId: text("stripe_session_id"),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

export const staffMembers = pgTable("staff_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  primaryRole: staffRole("primary_role").notNull(),
  hourlyRate: integer("hourly_rate"),
  notes: text("notes"),
  active: boolean("active").notNull().default(true),
  ...timestamps,
});

export const staffAssignments = pgTable("staff_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  staffMemberId: uuid("staff_member_id")
    .notNull()
    .references(() => staffMembers.id, { onDelete: "cascade" }),
  role: staffRole("role").notNull(),
  callTime: text("call_time"),
  endTime: text("end_time"),
  status: assignmentStatus("status").notNull().default("tentative"),
  notes: text("notes"),
  ...timestamps,
});

export const equipmentAllocations = pgTable("equipment_allocations", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  catalogItemId: uuid("catalog_item_id")
    .notNull()
    .references(() => catalogItems.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull(),
  notes: text("notes"),
  ...timestamps,
});

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  category: taskCategory("category").notNull().default("planning"),
  dueDate: date("due_date"),
  assigneeId: uuid("assignee_id").references(() => users.id, { onDelete: "set null" }),
  status: taskStatus("status").notNull().default("todo"),
  ...timestamps,
});

// Run-of-show / logistics timeline for the day (load-in, vendor arrivals, etc).
export const scheduleItems = pgTable("schedule_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  time: text("time").notNull(),
  title: text("title").notNull(),
  details: text("details"),
  clientVisible: boolean("client_visible").notNull().default(true),
  ...timestamps,
});

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
  body: text("body").notNull(),
  // Internal notes are only visible to operators.
  internal: boolean("internal").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const activity = pgTable("activity", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Partner businesses in SFSI's approved network (listed publicly when active).
export const vendors = pgTable("vendors", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  category: vendorCategory("category").notNull(),
  description: text("description"),
  website: text("website"),
  phone: text("phone"),
  email: text("email"),
  hechsher: text("hechsher"),
  active: boolean("active").notNull().default(true),
  ...timestamps,
});

// Operator-editable site settings, stored as JSON values by key.
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export const inquiries = pgTable("inquiries", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: inquiryKind("kind").notNull().default("general"),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  subject: text("subject"),
  guestCount: integer("guest_count"),
  message: text("message"),
  handled: boolean("handled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const eventsRelations = relations(events, ({ one, many }) => ({
  owner: one(users, { fields: [events.ownerId], references: [users.id] }),
  coordinator: one(users, { fields: [events.coordinatorId], references: [users.id] }),
  venue: one(venues, { fields: [events.venueId], references: [venues.id] }),
  package: one(packages, { fields: [events.packageId], references: [packages.id] }),
  serviceRequests: many(serviceRequests),
  cateringRequests: many(cateringRequests),
  quotes: many(quotes),
  paymentPlan: one(paymentPlans),
  staffAssignments: many(staffAssignments),
  equipmentAllocations: many(equipmentAllocations),
  tasks: many(tasks),
  scheduleItems: many(scheduleItems),
  messages: many(messages),
  activity: many(activity),
}));

export const serviceRequestsRelations = relations(serviceRequests, ({ one }) => ({
  event: one(events, { fields: [serviceRequests.eventId], references: [events.id] }),
  catalogItem: one(catalogItems, { fields: [serviceRequests.catalogItemId], references: [catalogItems.id] }),
}));

export const cateringRequestsRelations = relations(cateringRequests, ({ one }) => ({
  event: one(events, { fields: [cateringRequests.eventId], references: [events.id] }),
}));

export const quotesRelations = relations(quotes, ({ one, many }) => ({
  event: one(events, { fields: [quotes.eventId], references: [events.id] }),
  lines: many(quoteLines),
}));

export const quoteLinesRelations = relations(quoteLines, ({ one }) => ({
  quote: one(quotes, { fields: [quoteLines.quoteId], references: [quotes.id] }),
  catalogItem: one(catalogItems, { fields: [quoteLines.catalogItemId], references: [catalogItems.id] }),
}));

export const paymentPlansRelations = relations(paymentPlans, ({ one, many }) => ({
  event: one(events, { fields: [paymentPlans.eventId], references: [events.id] }),
  installments: many(installments),
}));

export const installmentsRelations = relations(installments, ({ one }) => ({
  plan: one(paymentPlans, { fields: [installments.planId], references: [paymentPlans.id] }),
}));

export const staffAssignmentsRelations = relations(staffAssignments, ({ one }) => ({
  event: one(events, { fields: [staffAssignments.eventId], references: [events.id] }),
  staffMember: one(staffMembers, { fields: [staffAssignments.staffMemberId], references: [staffMembers.id] }),
}));

export const equipmentAllocationsRelations = relations(equipmentAllocations, ({ one }) => ({
  event: one(events, { fields: [equipmentAllocations.eventId], references: [events.id] }),
  catalogItem: one(catalogItems, { fields: [equipmentAllocations.catalogItemId], references: [catalogItems.id] }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  event: one(events, { fields: [tasks.eventId], references: [events.id] }),
  assignee: one(users, { fields: [tasks.assigneeId], references: [users.id] }),
}));

export const scheduleItemsRelations = relations(scheduleItems, ({ one }) => ({
  event: one(events, { fields: [scheduleItems.eventId], references: [events.id] }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  event: one(events, { fields: [messages.eventId], references: [events.id] }),
  author: one(users, { fields: [messages.authorId], references: [users.id] }),
}));

export const activityRelations = relations(activity, ({ one }) => ({
  event: one(events, { fields: [activity.eventId], references: [events.id] }),
  actor: one(users, { fields: [activity.actorId], references: [users.id] }),
}));

export type User = typeof users.$inferSelect;
export type Event = typeof events.$inferSelect;
export type CatalogItem = typeof catalogItems.$inferSelect;
export type Quote = typeof quotes.$inferSelect;
export type QuoteLine = typeof quoteLines.$inferSelect;
export type Installment = typeof installments.$inferSelect;

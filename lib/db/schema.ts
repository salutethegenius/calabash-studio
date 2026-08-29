import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * App-specific tables only.
 * Better Auth owns `user`, `session`, `account`, and `verification` — do not redefine them here.
 */

export const paymentLinks = pgTable("payment_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  label: text("label").notNull(),
  amountCents: integer("amount_cents").notNull(),
  status: text("status").notNull().default("pending"),
  linkToken: text("link_token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
});

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  linkId: uuid("link_id").references(() => paymentLinks.id),
  customerRef: text("customer_ref"),
  /** Gross — what the customer paid (CNG `amount` / webhook AMOUNT). */
  amountCents: integer("amount_cents").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  rawPayload: jsonb("raw_payload"),
  cngPaymentId: text("cng_payment_id"),
  orderNumber: text("order_number"),
  /** PayLanes fee (CNG `fee`). */
  feeCents: integer("fee_cents"),
  /** Merchant net after fees (CNG `total`). */
  netCents: integer("net_cents"),
  payerEmail: text("payer_email"),
  payerPhone: text("payer_phone"),
  paymentMethod: text("payment_method"),
  cardType: text("card_type"),
  processed: boolean("processed"),
  cngCreatedAt: timestamp("cng_created_at", { withTimezone: true }),
  syncedAt: timestamp("synced_at", { withTimezone: true }),
});

export const settings = pgTable("settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  value: text("value"),
});

export const checkoutSessions = pgTable("checkout_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  linkId: uuid("link_id")
    .notNull()
    .references(() => paymentLinks.id),
  orderNumber: text("order_number").notNull().unique(),
  expectedAmountCents: integer("expected_amount_cents").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export type PaymentLink = typeof paymentLinks.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Setting = typeof settings.$inferSelect;
export type CheckoutSession = typeof checkoutSessions.$inferSelect;

/** Known settings keys. Sensitive values marked encrypted are AES-GCM via lib/crypto.ts */
export const SETTINGS_KEYS = {
  businessName: "business_name",
  contactEmail: "contact_email",
  logoPath: "logo_path",
  cngMerchantId: "cng_merchant_id",
  cngApiKey: "cng_api_key", // encrypted
  cngWebhookSecret: "cng_webhook_secret", // encrypted
  cngEnvironment: "cng_environment", // 'qa' | 'prod'
  cngEndpointOverride: "cng_endpoint_override",
  cngLastSyncAt: "cng_last_sync_at",
  promoCode: "promo_code",
  promoPercent: "promo_percent",
} as const;

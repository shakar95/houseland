import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

// ——— Enums (exact match to PostgreSQL types created by Prisma) ———
export const userRoleEnum = pgEnum('UserRole', ['ADMIN', 'STAFF', 'CLIENT']);
export const propertyTypeEnum = pgEnum('PropertyType', [
  'HOUSE',
  'APARTMENT',
  'VILLA',
  'LAND',
  'COMMERCIAL',
  'FARM',
]);
export const transactionTypeEnum = pgEnum('TransactionType', [
  'FOR_SALE',
  'FOR_RENT',
  'FOR_EXCHANGE',
]);
export const facingDirectionEnum = pgEnum('FacingDirection', [
  'NORTH',
  'SOUTH',
  'EAST',
  'WEST',
]);
export const propertyStatusEnum = pgEnum('PropertyStatus', [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'SOLD',
  'RENTED',
]);
export const currencyEnum = pgEnum('Currency', ['USD', 'IQD']);
export const crmStatusEnum = pgEnum('CrmStatus', ['LEAD', 'ACTIVE', 'CLOSED']);
export const contractTypeEnum = pgEnum('ContractType', ['SALE', 'RENT']);

// TypeScript Enum types
export type UserRole = (typeof userRoleEnum.enumValues)[number];
export type PropertyType = (typeof propertyTypeEnum.enumValues)[number];
export type TransactionType = (typeof transactionTypeEnum.enumValues)[number];
export type FacingDirection = (typeof facingDirectionEnum.enumValues)[number];
export type PropertyStatus = (typeof propertyStatusEnum.enumValues)[number];
export type Currency = (typeof currencyEnum.enumValues)[number];
export type CrmStatus = (typeof crmStatusEnum.enumValues)[number];
export type ContractType = (typeof contractTypeEnum.enumValues)[number];

// ——— Profiles Table ———
export const profiles = pgTable('profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  fullName: text('full_name').notNull(),
  role: userRoleEnum('role').default('CLIENT').notNull(),
  googleAuthId: text('google_auth_id').unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ——— Staff Table ———
export const staff = pgTable('staff', {
  id: uuid('id').defaultRandom().primaryKey(),
  profileId: uuid('profile_id')
    .unique()
    .references(() => profiles.id),
  name: text('name').notNull(),
  photoUrl: text('photo_url'),
  position: text('position').notNull(),
  phoneNumber: text('phone_number').notNull(),
  bio: text('bio'),
  active: boolean('active').default(true).notNull(),
});

// ——— Agency Settings Table ———
export const agencySettings = pgTable('agency_settings', {
  id: text('id').default('default').primaryKey(),
  name: text('name').default('Houseland Real Estate').notNull(),
  logoUrl: text('logo_url'),
  phonePrimary: text('phone_primary').notNull(),
  phoneSecondary: text('phone_secondary'),
  whatsapp: text('whatsapp').notNull(),
  address: text('address').notNull(),
  email: text('email'),
});

// ——— Properties Table ———
export const properties = pgTable(
  'properties',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    code: text('code').notNull().unique(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    propertyType: propertyTypeEnum('property_type').notNull(),
    transactionType: transactionTypeEnum('transaction_type').notNull(),
    areaSqm: doublePrecision('area_sqm').notNull(),
    dimensions: text('dimensions'),
    frontageMeters: doublePrecision('frontage_meters'),
    streetWidth: doublePrecision('street_width'),
    streetWidth2: doublePrecision('street_width_2'),
    isCorner: boolean('is_corner').default(false).notNull(),
    price: doublePrecision('price').notNull(),
    currency: currencyEnum('currency').default('USD').notNull(),
    floors: integer('floors'),
    bedrooms: integer('bedrooms'),
    bathrooms: integer('bathrooms'),
    facing: facingDirectionEnum('facing'),
    latitude: doublePrecision('latitude').notNull(),
    longitude: doublePrecision('longitude').notNull(),
    neighborhood: text('neighborhood').notNull(),
    nearestLandmark: text('nearest_landmark'),
    images: text('images').array().notNull(),
    thumbnailUrl: text('thumbnail_url'),
    imageCount: integer('image_count').default(0).notNull(),
    videoLink: text('video_link'),
    status: propertyStatusEnum('status').default('PENDING').notNull(),
    submitterId: uuid('submitter_id').references(() => profiles.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('properties_status_idx').on(table.status),
    index('properties_status_created_at_idx').on(table.status, table.createdAt.desc()),
    index('properties_neighborhood_idx').on(table.neighborhood),
    index('properties_property_type_idx').on(table.propertyType),
    index('properties_transaction_type_idx').on(table.transactionType),
    index('properties_price_idx').on(table.price),
    index('properties_area_sqm_idx').on(table.areaSqm),
  ]
);

// ——— Materialized View (property_details_mv) ———
export const propertyDetailsMv = pgTable('property_details_mv', {
  id: uuid('id').primaryKey(),
  code: text('code').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  propertyType: propertyTypeEnum('property_type').notNull(),
  transactionType: transactionTypeEnum('transaction_type').notNull(),
  areaSqm: doublePrecision('area_sqm').notNull(),
  dimensions: text('dimensions'),
  frontageMeters: doublePrecision('frontage_meters'),
  streetWidth: doublePrecision('street_width'),
  streetWidth2: doublePrecision('street_width_2'),
  isCorner: boolean('is_corner').notNull(),
  price: doublePrecision('price').notNull(),
  currency: currencyEnum('currency').notNull(),
  floors: integer('floors'),
  bedrooms: integer('bedrooms'),
  bathrooms: integer('bathrooms'),
  facing: facingDirectionEnum('facing'),
  latitude: doublePrecision('latitude').notNull(),
  longitude: doublePrecision('longitude').notNull(),
  neighborhood: text('neighborhood').notNull(),
  nearestLandmark: text('nearest_landmark'),
  images: text('images').array().notNull(),
  thumbnailUrl: text('thumbnail_url'),
  imageCount: integer('image_count').notNull(),
  videoLink: text('video_link'),
  status: propertyStatusEnum('status').notNull(),
  submitterId: uuid('submitter_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  viewsCount: integer('views_count').notNull(),
  phoneClicks: integer('phone_clicks').notNull(),
  whatsappClicks: integer('whatsapp_clicks').notNull(),
  saleContractsCount: integer('sale_contracts_count').notNull(),
  rentContractsCount: integer('rent_contracts_count').notNull(),
});

// ——— Analytics Table ———
export const analytics = pgTable('analytics', {
  id: uuid('id').defaultRandom().primaryKey(),
  propertyId: uuid('property_id')
    .notNull()
    .unique()
    .references(() => properties.id, { onDelete: 'cascade' }),
  viewsCount: integer('views_count').default(0).notNull(),
  phoneClicks: integer('phone_clicks').default(0).notNull(),
  whatsappClicks: integer('whatsapp_clicks').default(0).notNull(),
  saleContractsCount: integer('sale_contracts_count').default(0).notNull(),
  rentContractsCount: integer('rent_contracts_count').default(0).notNull(),
});

// ——— CRM Entries Table ———
export const crmEntries = pgTable('crm_entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerName: text('customer_name').notNull(),
  phone: text('phone').notNull(),
  email: text('email'),
  propertyInterests: text('property_interests').array().notNull(),
  notes: text('notes'),
  budget: doublePrecision('budget'),
  budgetCurrency: currencyEnum('budget_currency'),
  status: crmStatusEnum('status').default('LEAD').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// ——— Contracts Table ———
export const contracts = pgTable('contracts', {
  id: uuid('id').defaultRandom().primaryKey(),
  propertyId: uuid('property_id')
    .notNull()
    .references(() => properties.id),
  clientName: text('client_name').notNull(),
  amount: doublePrecision('amount').notNull(),
  date: timestamp('date', { withTimezone: true }).notNull(),
  contractType: contractTypeEnum('contract_type').notNull(),
  documentUrl: text('document_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ——— Neighborhoods Table ———
export const neighborhoods = pgTable('neighborhoods', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
  nameEn: text('nameEn'),
  nameKu: text('nameKu'),
  nameAr: text('nameAr'),
  latitude: doublePrecision('latitude').notNull(),
  longitude: doublePrecision('longitude').notNull(),
  aliases: text('aliases').array().notNull().default(sql`'{}'`),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ——— Drizzle Relations (for relational queries) ———
export const profilesRelations = relations(profiles, ({ many, one }) => ({
  submittedProperties: many(properties),
  staff: one(staff, {
    fields: [profiles.id],
    references: [staff.profileId],
  }),
}));

export const staffRelations = relations(staff, ({ one }) => ({
  profile: one(profiles, {
    fields: [staff.profileId],
    references: [profiles.id],
  }),
}));

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  submitter: one(profiles, {
    fields: [properties.submitterId],
    references: [profiles.id],
  }),
  analytics: one(analytics, {
    fields: [properties.id],
    references: [analytics.propertyId],
  }),
  contracts: many(contracts),
}));

export const analyticsRelations = relations(analytics, ({ one }) => ({
  property: one(properties, {
    fields: [analytics.propertyId],
    references: [properties.id],
  }),
}));

export const contractsRelations = relations(contracts, ({ one }) => ({
  property: one(properties, {
    fields: [contracts.propertyId],
    references: [properties.id],
  }),
}));

// ——— TypeScript Inferred Model Types ———
export type Profile = InferSelectModel<typeof profiles>;
export type NewProfile = InferInsertModel<typeof profiles>;

export type Staff = InferSelectModel<typeof staff>;
export type NewStaff = InferInsertModel<typeof staff>;

export type AgencySettings = InferSelectModel<typeof agencySettings>;
export type NewAgencySettings = InferInsertModel<typeof agencySettings>;

export type Property = InferSelectModel<typeof properties>;
export type NewProperty = InferInsertModel<typeof properties>;

export type Analytics = InferSelectModel<typeof analytics>;
export type NewAnalytics = InferInsertModel<typeof analytics>;

export type CrmEntry = InferSelectModel<typeof crmEntries>;
export type NewCrmEntry = InferInsertModel<typeof crmEntries>;

export type Contract = InferSelectModel<typeof contracts>;
export type NewContract = InferInsertModel<typeof contracts>;

export type Neighborhood = InferSelectModel<typeof neighborhoods>;
export type NewNeighborhood = InferInsertModel<typeof neighborhoods>;

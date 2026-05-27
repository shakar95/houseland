-- ============================================================
-- Houseland — Supabase SQL Setup
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- Optional: reset (ONLY if re-running on empty project — deletes all data)
-- DROP TABLE IF EXISTS contracts CASCADE;
-- DROP TABLE IF EXISTS analytics CASCADE;
-- DROP TABLE IF EXISTS crm_entries CASCADE;
-- DROP TABLE IF EXISTS properties CASCADE;
-- DROP TABLE IF EXISTS staff CASCADE;
-- DROP TABLE IF EXISTS agency_settings CASCADE;
-- DROP TABLE IF EXISTS profiles CASCADE;
-- DROP TYPE IF EXISTS "ContractType" CASCADE;
-- DROP TYPE IF EXISTS "CrmStatus" CASCADE;
-- DROP TYPE IF EXISTS "Currency" CASCADE;
-- DROP TYPE IF EXISTS "PropertyStatus" CASCADE;
-- DROP TYPE IF EXISTS "FacingDirection" CASCADE;
-- DROP TYPE IF EXISTS "TransactionType" CASCADE;
-- DROP TYPE IF EXISTS "PropertyType" CASCADE;
-- DROP TYPE IF EXISTS "UserRole" CASCADE;

-- Extensions (usually already enabled on Supabase)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===================== ENUMS =====================
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'STAFF', 'CLIENT');
CREATE TYPE "PropertyType" AS ENUM ('HOUSE', 'APARTMENT', 'VILLA', 'LAND', 'COMMERCIAL');
CREATE TYPE "TransactionType" AS ENUM ('FOR_SALE', 'FOR_RENT');
CREATE TYPE "FacingDirection" AS ENUM ('NORTH', 'SOUTH', 'EAST', 'WEST');
CREATE TYPE "PropertyStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SOLD', 'RENTED');
CREATE TYPE "Currency" AS ENUM ('USD', 'IQD');
CREATE TYPE "CrmStatus" AS ENUM ('LEAD', 'ACTIVE', 'CLOSED');
CREATE TYPE "ContractType" AS ENUM ('SALE', 'RENT');

-- ===================== TABLES =====================
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "email" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CLIENT',
    "google_auth_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "staff" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "profile_id" TEXT,
    "name" TEXT NOT NULL,
    "photo_url" TEXT,
    "position" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "bio" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "agency_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "name" TEXT NOT NULL DEFAULT 'Houseland',
    "logo_url" TEXT,
    "phone_primary" TEXT NOT NULL,
    "phone_secondary" TEXT,
    "whatsapp" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "email" TEXT,
    CONSTRAINT "agency_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "properties" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "property_type" "PropertyType" NOT NULL,
    "transaction_type" "TransactionType" NOT NULL,
    "area_sqm" DOUBLE PRECISION NOT NULL,
    "dimensions" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'USD',
    "floors" INTEGER,
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "facing" "FacingDirection",
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "neighborhood" TEXT NOT NULL,
    "images" TEXT[] NOT NULL DEFAULT '{}',
    "video_link" TEXT,
    "status" "PropertyStatus" NOT NULL DEFAULT 'PENDING',
    "submitter_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "analytics" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "property_id" TEXT NOT NULL,
    "views_count" INTEGER NOT NULL DEFAULT 0,
    "phone_clicks" INTEGER NOT NULL DEFAULT 0,
    "whatsapp_clicks" INTEGER NOT NULL DEFAULT 0,
    "sale_contracts_count" INTEGER NOT NULL DEFAULT 0,
    "rent_contracts_count" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "analytics_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "crm_entries" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "customer_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "property_interests" TEXT[] NOT NULL DEFAULT '{}',
    "notes" TEXT,
    "budget" DOUBLE PRECISION,
    "budget_currency" "Currency",
    "status" "CrmStatus" NOT NULL DEFAULT 'LEAD',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "crm_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "contracts" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "property_id" TEXT NOT NULL,
    "client_name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMPTZ NOT NULL,
    "contract_type" "ContractType" NOT NULL,
    "document_url" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- ===================== INDEXES =====================
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");
CREATE UNIQUE INDEX "profiles_google_auth_id_key" ON "profiles"("google_auth_id");
CREATE UNIQUE INDEX "staff_profile_id_key" ON "staff"("profile_id");
CREATE UNIQUE INDEX "properties_code_key" ON "properties"("code");
CREATE UNIQUE INDEX "analytics_property_id_key" ON "analytics"("property_id");
CREATE INDEX "properties_status_idx" ON "properties"("status");
CREATE INDEX "properties_neighborhood_idx" ON "properties"("neighborhood");

-- ===================== FOREIGN KEYS =====================
ALTER TABLE "staff"
    ADD CONSTRAINT "staff_profile_id_fkey"
    FOREIGN KEY ("profile_id") REFERENCES "profiles"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "properties"
    ADD CONSTRAINT "properties_submitter_id_fkey"
    FOREIGN KEY ("submitter_id") REFERENCES "profiles"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "analytics"
    ADD CONSTRAINT "analytics_property_id_fkey"
    FOREIGN KEY ("property_id") REFERENCES "properties"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "contracts"
    ADD CONSTRAINT "contracts_property_id_fkey"
    FOREIGN KEY ("property_id") REFERENCES "properties"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ===================== updated_at TRIGGER =====================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER properties_updated_at
  BEFORE UPDATE ON "properties"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER crm_entries_updated_at
  BEFORE UPDATE ON "crm_entries"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ===================== SEED DATA =====================
INSERT INTO "agency_settings" (
  "id", "name", "phone_primary", "phone_secondary", "whatsapp", "address", "email"
) VALUES (
  'default',
  'Houseland',
  '+964 770 123 4567',
  '+964 750 987 6543',
  '+9647701234567',
  'Sulaymaniyah, Kurdistan Region, Iraq — Malik Mahmood Ring Road',
  'info@houseland.iq'
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "profiles" ("id", "email", "full_name", "role")
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'admin@houseland.iq',
  'Houseland Admin',
  'ADMIN'
) ON CONFLICT ("email") DO UPDATE SET "role" = 'ADMIN';

INSERT INTO "staff" ("id", "name", "position", "phone_number", "bio", "photo_url")
VALUES (
  'seed-staff-1',
  'Rebaz Ahmed',
  'Senior Agent',
  '+964 770 111 2222',
  'Specialist in Sarchinar and Bakrajo residential sales.',
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200'
) ON CONFLICT ("id") DO NOTHING;

-- Sample properties
INSERT INTO "properties" (
  "code", "title", "description", "property_type", "transaction_type",
  "area_sqm", "dimensions", "price", "floors", "bedrooms", "bathrooms",
  "neighborhood", "latitude", "longitude", "images", "status", "submitter_id"
) VALUES
(
  'SULI-001',
  'Luxury Villa in Sarchinar',
  'Spacious villa with garden, modern finishes, and panoramic mountain views.',
  'VILLA', 'FOR_SALE', 450, '20x22m', 285000, 2, 5, 4,
  'Sarchinar', 35.583, 45.432,
  ARRAY['https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800'],
  'APPROVED',
  '00000000-0000-4000-8000-000000000001'
),
(
  'SULI-002',
  'Modern Apartment — Bakrajo',
  'Brand-new apartment near main road, elevator, parking.',
  'APARTMENT', 'FOR_RENT', 120, NULL, 650, NULL, 2, 2,
  'Bakrajo', 35.561, 45.418,
  ARRAY['https://images.unsplash.com/photo-1502672260266-1c1ef1d93788?w=800'],
  'APPROVED',
  '00000000-0000-4000-8000-000000000001'
),
(
  'SULI-003',
  'Commercial Space — Raparin',
  'Prime commercial unit on busy street, ideal for retail.',
  'COMMERCIAL', 'FOR_SALE', 200, NULL, 175000, NULL, NULL, NULL,
  'Raparin', 35.555, 45.44,
  ARRAY['https://images.unsplash.com/photo-1486406146925-ccea4e2f0d3a?w=800'],
  'APPROVED',
  '00000000-0000-4000-8000-000000000001'
)
ON CONFLICT ("code") DO NOTHING;

-- Analytics for each property
INSERT INTO "analytics" ("property_id", "views_count")
SELECT p."id", (20 + floor(random() * 180))::int
FROM "properties" p
WHERE p."code" IN ('SULI-001', 'SULI-002', 'SULI-003')
ON CONFLICT ("property_id") DO NOTHING;

-- ===================== AFTER GOOGLE SIGN-IN =====================
-- Replace with YOUR email:
-- UPDATE profiles SET role = 'ADMIN' WHERE email = 'your@gmail.com';

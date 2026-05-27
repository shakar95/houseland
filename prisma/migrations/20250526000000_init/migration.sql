-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'STAFF', 'CLIENT');
CREATE TYPE "PropertyType" AS ENUM ('HOUSE', 'APARTMENT', 'VILLA', 'LAND', 'COMMERCIAL');
CREATE TYPE "TransactionType" AS ENUM ('FOR_SALE', 'FOR_RENT');
CREATE TYPE "FacingDirection" AS ENUM ('NORTH', 'SOUTH', 'EAST', 'WEST');
CREATE TYPE "PropertyStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SOLD', 'RENTED');
CREATE TYPE "Currency" AS ENUM ('USD', 'IQD');
CREATE TYPE "CrmStatus" AS ENUM ('LEAD', 'ACTIVE', 'CLOSED');
CREATE TYPE "ContractType" AS ENUM ('SALE', 'RENT');

-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CLIENT',
    "google_auth_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "staff" (
    "id" TEXT NOT NULL,
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
    "id" TEXT NOT NULL,
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
    "id" TEXT NOT NULL,
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
    "images" TEXT[],
    "video_link" TEXT,
    "status" "PropertyStatus" NOT NULL DEFAULT 'PENDING',
    "submitter_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "analytics" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "views_count" INTEGER NOT NULL DEFAULT 0,
    "phone_clicks" INTEGER NOT NULL DEFAULT 0,
    "whatsapp_clicks" INTEGER NOT NULL DEFAULT 0,
    "sale_contracts_count" INTEGER NOT NULL DEFAULT 0,
    "rent_contracts_count" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "analytics_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "crm_entries" (
    "id" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "property_interests" TEXT[],
    "notes" TEXT,
    "budget" DOUBLE PRECISION,
    "budget_currency" "Currency",
    "status" "CrmStatus" NOT NULL DEFAULT 'LEAD',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "crm_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "client_name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "contract_type" "ContractType" NOT NULL,
    "document_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");
CREATE UNIQUE INDEX "profiles_google_auth_id_key" ON "profiles"("google_auth_id");
CREATE UNIQUE INDEX "staff_profile_id_key" ON "staff"("profile_id");
CREATE UNIQUE INDEX "properties_code_key" ON "properties"("code");
CREATE UNIQUE INDEX "analytics_property_id_key" ON "analytics"("property_id");

ALTER TABLE "staff" ADD CONSTRAINT "staff_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "properties" ADD CONSTRAINT "properties_submitter_id_fkey" FOREIGN KEY ("submitter_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "analytics" ADD CONSTRAINT "analytics_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

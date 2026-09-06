CREATE TYPE "public"."ContractType" AS ENUM('SALE', 'RENT');--> statement-breakpoint
CREATE TYPE "public"."CrmStatus" AS ENUM('LEAD', 'ACTIVE', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."Currency" AS ENUM('USD', 'IQD');--> statement-breakpoint
CREATE TYPE "public"."FacingDirection" AS ENUM('NORTH', 'SOUTH', 'EAST', 'WEST');--> statement-breakpoint
CREATE TYPE "public"."PropertyStatus" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'SOLD', 'RENTED');--> statement-breakpoint
CREATE TYPE "public"."PropertyType" AS ENUM('HOUSE', 'APARTMENT', 'VILLA', 'LAND', 'COMMERCIAL', 'FARM');--> statement-breakpoint
CREATE TYPE "public"."TransactionType" AS ENUM('FOR_SALE', 'FOR_RENT', 'FOR_EXCHANGE');--> statement-breakpoint
CREATE TYPE "public"."UserRole" AS ENUM('ADMIN', 'STAFF', 'CLIENT');--> statement-breakpoint
CREATE TABLE "agency_settings" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"name" text DEFAULT 'Houseland Real Estate' NOT NULL,
	"logo_url" text,
	"phone_primary" text NOT NULL,
	"phone_secondary" text,
	"whatsapp" text NOT NULL,
	"address" text NOT NULL,
	"email" text
);
--> statement-breakpoint
CREATE TABLE "analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"views_count" integer DEFAULT 0 NOT NULL,
	"phone_clicks" integer DEFAULT 0 NOT NULL,
	"whatsapp_clicks" integer DEFAULT 0 NOT NULL,
	"sale_contracts_count" integer DEFAULT 0 NOT NULL,
	"rent_contracts_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "analytics_property_id_unique" UNIQUE("property_id")
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"client_name" text NOT NULL,
	"amount" double precision NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"contract_type" "ContractType" NOT NULL,
	"document_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"property_interests" text[] NOT NULL,
	"notes" text,
	"budget" double precision,
	"budget_currency" "Currency",
	"status" "CrmStatus" DEFAULT 'LEAD' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "neighborhoods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "neighborhoods_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"full_name" text NOT NULL,
	"role" "UserRole" DEFAULT 'CLIENT' NOT NULL,
	"google_auth_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_email_unique" UNIQUE("email"),
	CONSTRAINT "profiles_google_auth_id_unique" UNIQUE("google_auth_id")
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"property_type" "PropertyType" NOT NULL,
	"transaction_type" "TransactionType" NOT NULL,
	"area_sqm" double precision NOT NULL,
	"dimensions" text,
	"frontage_meters" double precision,
	"street_width" double precision,
	"street_width_2" double precision,
	"is_corner" boolean DEFAULT false NOT NULL,
	"price" double precision NOT NULL,
	"currency" "Currency" DEFAULT 'USD' NOT NULL,
	"floors" integer,
	"bedrooms" integer,
	"bathrooms" integer,
	"facing" "FacingDirection",
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"neighborhood" text NOT NULL,
	"nearest_landmark" text,
	"images" text[] NOT NULL,
	"thumbnail_url" text,
	"image_count" integer DEFAULT 0 NOT NULL,
	"video_link" text,
	"status" "PropertyStatus" DEFAULT 'PENDING' NOT NULL,
	"submitter_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "properties_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid,
	"name" text NOT NULL,
	"photo_url" text,
	"position" text NOT NULL,
	"phone_number" text NOT NULL,
	"bio" text,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "staff_profile_id_unique" UNIQUE("profile_id")
);
--> statement-breakpoint
ALTER TABLE "analytics" ADD CONSTRAINT "analytics_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_submitter_id_profiles_id_fk" FOREIGN KEY ("submitter_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "properties_status_idx" ON "properties" USING btree ("status");--> statement-breakpoint
CREATE INDEX "properties_status_created_at_idx" ON "properties" USING btree ("status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "properties_neighborhood_idx" ON "properties" USING btree ("neighborhood");--> statement-breakpoint
CREATE INDEX "properties_property_type_idx" ON "properties" USING btree ("property_type");--> statement-breakpoint
CREATE INDEX "properties_transaction_type_idx" ON "properties" USING btree ("transaction_type");--> statement-breakpoint
CREATE INDEX "properties_price_idx" ON "properties" USING btree ("price");--> statement-breakpoint
CREATE INDEX "properties_area_sqm_idx" ON "properties" USING btree ("area_sqm");
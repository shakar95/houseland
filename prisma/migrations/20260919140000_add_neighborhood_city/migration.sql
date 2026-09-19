-- AlterTable
ALTER TABLE "neighborhoods" ADD COLUMN IF NOT EXISTS "city" TEXT NOT NULL DEFAULT 'sulaymaniyah';

-- CreateIndex
CREATE INDEX IF NOT EXISTS "neighborhoods_city_idx" ON "neighborhoods"("city");

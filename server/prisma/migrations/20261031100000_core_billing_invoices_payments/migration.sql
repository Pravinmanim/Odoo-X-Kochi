-- CreateEnum
ALTER TYPE "InvoiceStatus" ADD VALUE IF NOT EXISTS 'CONFIRMED';
ALTER TYPE "InvoiceStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

-- AlterTable
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "recorded_by" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "subscriptions_status_next_billing_date_idx" ON "subscriptions"("status", "next_billing_date");

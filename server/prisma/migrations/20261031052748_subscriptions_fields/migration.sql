-- AlterTable
ALTER TABLE "plans" ADD COLUMN     "available_from" TIMESTAMP(3),
ADD COLUMN     "available_to" TIMESTAMP(3),
ADD COLUMN     "closable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "min_quantity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "pausable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "renewable" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "quotation_templates" ADD COLUMN     "quotation_valid_days" INTEGER DEFAULT 30;

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "expiry_date" TIMESTAMP(3),
ADD COLUMN     "is_paused" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "payment_terms" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "quotation_valid_until" TIMESTAMP(3);

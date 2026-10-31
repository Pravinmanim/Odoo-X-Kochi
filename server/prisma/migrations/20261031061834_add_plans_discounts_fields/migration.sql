-- AlterTable
ALTER TABLE "discounts" ADD COLUMN     "min_purchase" DECIMAL(12,2) DEFAULT 0.00,
ADD COLUMN     "min_quantity" INTEGER DEFAULT 1,
ADD COLUMN     "scope" TEXT NOT NULL DEFAULT 'SUBSCRIPTION',
ADD COLUMN     "start_date" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "plans" ADD COLUMN     "auto_close" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "available_from" TIMESTAMP(3),
ADD COLUMN     "available_to" TIMESTAMP(3),
ADD COLUMN     "closable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "min_quantity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "pausable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "renewable" BOOLEAN NOT NULL DEFAULT true;

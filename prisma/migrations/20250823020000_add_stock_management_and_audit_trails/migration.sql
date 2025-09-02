-- CreateEnum
CREATE TYPE "public"."StockAdjustmentReason" AS ENUM ('SALE', 'RETURN', 'DAMAGE', 'THEFT', 'CORRECTION', 'RECEIPT', 'TRANSFER', 'RESERVATION', 'RESERVATION_RELEASE');

-- CreateEnum
CREATE TYPE "public"."OrderStatusTransition" AS ENUM ('PENDING_TO_PROCESSING', 'PENDING_TO_CANCELLED', 'PROCESSING_TO_COMPLETED', 'PROCESSING_TO_CANCELLED', 'COMPLETED_TO_REFUNDED');

-- CreateTable
CREATE TABLE "public"."stock_reservations" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "quantity" INTEGER NOT NULL,
    "reservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "storeId" TEXT NOT NULL,

    CONSTRAINT "stock_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."stock_movements" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "storeId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" "public"."StockAdjustmentReason" NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "notes" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."audit_logs" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "userId" TEXT,
    "storeId" TEXT,
    "oldValues" JSONB,
    "newValues" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."stock_reservations" ADD CONSTRAINT "stock_reservations_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stock_reservations" ADD CONSTRAINT "stock_reservations_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stock_reservations" ADD CONSTRAINT "stock_reservations_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "public"."product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stock_reservations" ADD CONSTRAINT "stock_reservations_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "public"."stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stock_movements" ADD CONSTRAINT "stock_movements_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stock_movements" ADD CONSTRAINT "stock_movements_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "public"."product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stock_movements" ADD CONSTRAINT "stock_movements_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "public"."stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stock_movements" ADD CONSTRAINT "stock_movements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "public"."stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "stock_reservations_orderId_idx" ON "public"."stock_reservations"("orderId");

-- CreateIndex
CREATE INDEX "stock_reservations_productId_idx" ON "public"."stock_reservations"("productId");

-- CreateIndex
CREATE INDEX "stock_reservations_variantId_idx" ON "public"."stock_reservations"("variantId");

-- CreateIndex
CREATE INDEX "stock_reservations_storeId_idx" ON "public"."stock_reservations"("storeId");

-- CreateIndex
CREATE INDEX "stock_reservations_status_expiresAt_idx" ON "public"."stock_reservations"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "stock_movements_productId_idx" ON "public"."stock_movements"("productId");

-- CreateIndex
CREATE INDEX "stock_movements_variantId_idx" ON "public"."stock_movements"("variantId");

-- CreateIndex
CREATE INDEX "stock_movements_storeId_idx" ON "public"."stock_movements"("storeId");

-- CreateIndex
CREATE INDEX "stock_movements_reason_idx" ON "public"."stock_movements"("reason");

-- CreateIndex
CREATE INDEX "stock_movements_createdAt_idx" ON "public"."stock_movements"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "public"."audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "public"."audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_storeId_idx" ON "public"."audit_logs"("storeId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "public"."audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "public"."audit_logs"("createdAt");

-- Add created/updated timestamps to existing tables if not present
ALTER TABLE "public"."products" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "public"."product_variants" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "public"."orders" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "public"."customers" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

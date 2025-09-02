/*
  Warnings:

  - You are about to drop the column `deletedAt` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `product_variants` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `products` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."customers" DROP COLUMN "deletedAt";

-- AlterTable
ALTER TABLE "public"."orders" DROP COLUMN "deletedAt";

-- AlterTable
ALTER TABLE "public"."product_variants" DROP COLUMN "deletedAt";

-- AlterTable
ALTER TABLE "public"."products" DROP COLUMN "deletedAt";

-- Add createdByAdminId column to Store table
ALTER TABLE "stores" ADD COLUMN "createdByAdminId" TEXT;

-- Add foreign key constraint for createdByAdminId
ALTER TABLE "stores" ADD CONSTRAINT "stores_createdByAdminId_fkey" 
    FOREIGN KEY ("createdByAdminId") 
    REFERENCES "users"("id") 
    ON DELETE SET NULL 
    ON UPDATE CASCADE;

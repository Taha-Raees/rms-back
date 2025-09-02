# Migration: Add Stock Management and Audit Trails

## Description
This migration adds comprehensive stock management and audit trail capabilities to the retail management system.

## Changes Included

### New Tables
1. **stock_reservations** - Track stock held for pending orders
2. **stock_movements** - Log all stock adjustments and movements  
3. **audit_logs** - Track all system changes and user actions

### New Enums
1. **StockAdjustmentReason** - Valid reasons for stock adjustments
2. **OrderStatusTransition** - Valid order status transitions

### Enhanced Existing Tables
- Added `deletedAt` columns for soft delete support
- Added reverse relations for new foreign keys

### Indexes
- Added indexes for performance on frequently queried fields
- Created composite indexes for common query patterns

## Migration Steps
1. Creates new tables and enums
2. Adds foreign key relationships
3. Creates necessary indexes
4. Preserves existing data

## Rollback
This migration can be rolled back to restore the previous schema state.

## Testing
- Verified data integrity after migration
- Tested foreign key relationships
- Confirmed index creation
- Validated enum values

## Dependencies
- Requires Prisma Client regeneration after migration
- Backend services updated to use new models
- Frontend components updated for new features

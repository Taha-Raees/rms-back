import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { StockService } from '../../services/stock.service';
import { ValidationService } from '../../services/validation.service';
import { AuditService } from '../../services/audit.service';

const prisma = new PrismaClient();

export default async function stockAdjustmentRoutes(fastify: FastifyInstance) {
  // GET /inventory/stock/adjustments - Get stock movement history
  fastify.get('/adjustments', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.user as any;
      const storeId = user.storeId;
      
      if (!storeId) {
        return reply.status(400).send({
          success: false,
          error: 'No store associated with this user'
        });
      }

      // Check permissions
      if (user.role !== 'OWNER' && user.role !== 'MANAGER') {
        return reply.status(403).send({
          success: false,
          error: 'Insufficient permissions to view stock adjustments'
        });
      }

      const { productId, variantId, limit = 50 } = request.query as any;

      const movements = await prisma.stockMovement.findMany({
        where: {
          storeId,
          productId: productId || undefined,
          variantId: variantId || undefined
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: parseInt(limit),
        include: {
          product: {
            select: {
              name: true,
              brand: true,
              category: true
            }
          },
          variant: {
            select: {
              name: true,
              sku: true
            }
          },
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      });

      return reply.status(200).send({
        success: true,
        data: movements,
        total: movements.length
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch stock adjustments'
      });
    }
  });

  // POST /inventory/stock/adjustments - Create stock adjustment
  fastify.post('/adjustments', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.user as any;
      const storeId = user.storeId;
      
      if (!storeId) {
        return reply.status(400).send({
          success: false,
          error: 'No store associated with this user'
        });
      }

      // Check permissions
      if (user.role !== 'OWNER' && user.role !== 'MANAGER') {
        return reply.status(403).send({
          success: false,
          error: 'Insufficient permissions to adjust stock'
        });
      }

      const { productId, variantId, quantityChange, reason, notes } = request.body as any;

      // Validate input
      if (!productId) {
        return reply.status(400).send({
          success: false,
          error: 'Product ID is required'
        });
      }

      if (typeof quantityChange !== 'number') {
        return reply.status(400).send({
          success: false,
          error: 'Quantity change must be a number'
        });
      }

      if (!reason) {
        return reply.status(400).send({
          success: false,
          error: 'Reason is required'
        });
      }

      // Validate stock update
      const validation = await ValidationService.validateStockUpdate(
        productId,
        variantId,
        quantityChange,
        reason,
        storeId
      );

      if (!validation.isValid) {
        return reply.status(400).send({
          success: false,
          error: 'Validation failed',
          details: validation.errors
        });
      }

      // Update stock and log movement
      await StockService.updateStock(
        productId,
        variantId,
        quantityChange,
        reason as any,
        storeId,
        user.id,
        'MANUAL_ADJUSTMENT',
        undefined,
        notes
      );

      // Log audit event
      await AuditService.logEvent(
        'Stock',
        variantId || productId,
        `STOCK_ADJUSTED_${reason}`,
        user.id,
        storeId,
        undefined,
        {
          productId,
          variantId,
          quantityChange,
          reason,
          notes,
          previousStock: validation.currentStock,
          newStock: validation.currentStock !== undefined ? validation.currentStock + quantityChange : undefined
        }
      );

      return reply.status(200).send({
        success: true,
        message: 'Stock adjusted successfully'
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to adjust stock'
      });
    }
  });

  // GET /inventory/stock/reservations - Get stock reservations
  fastify.get('/reservations', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.user as any;
      const storeId = user.storeId;
      
      if (!storeId) {
        return reply.status(400).send({
          success: false,
          error: 'No store associated with this user'
        });
      }

      // Check permissions
      if (user.role !== 'OWNER' && user.role !== 'MANAGER' && user.role !== 'STAFF') {
        return reply.status(403).send({
          success: false,
          error: 'Insufficient permissions to view stock reservations'
        });
      }

      const { status, orderId } = request.query as any;

      const reservations = await prisma.stockReservation.findMany({
        where: {
          storeId,
          status: status || undefined,
          orderId: orderId || undefined
        },
        orderBy: {
          reservedAt: 'desc'
        },
        include: {
          product: {
            select: {
              name: true,
              brand: true,
              category: true
            }
          },
          variant: {
            select: {
              name: true,
              sku: true
            }
          },
          order: {
            select: {
              orderNumber: true,
              status: true,
              total: true
            }
          }
        }
      });

      return reply.status(200).send({
        success: true,
        data: reservations,
        total: reservations.length
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch stock reservations'
      });
    }
  });

  // POST /inventory/stock/reservations/cleanup - Cleanup expired reservations
  fastify.post('/reservations/cleanup', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.user as any;
      const storeId = user.storeId;
      
      if (!storeId) {
        return reply.status(400).send({
          success: false,
          error: 'No store associated with this user'
        });
      }

      // Check permissions
      if (user.role !== 'OWNER' && user.role !== 'MANAGER') {
        return reply.status(403).send({
          success: false,
          error: 'Insufficient permissions to cleanup reservations'
        });
      }

      await StockService.cleanupExpiredReservations();

      return reply.status(200).send({
        success: true,
        message: 'Expired reservations cleaned up successfully'
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to cleanup expired reservations'
      });
    }
  });

  // POST /inventory/stock/transfer - Transfer stock between products/variants
  fastify.post('/transfer', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.user as any;
      const storeId = user.storeId;
      
      if (!storeId) {
        return reply.status(400).send({
          success: false,
          error: 'No store associated with this user'
        });
      }

      // Check permissions
      if (user.role !== 'OWNER' && user.role !== 'MANAGER') {
        return reply.status(403).send({
          success: false,
          error: 'Insufficient permissions to transfer stock'
        });
      }

      const { fromProductId, fromVariantId, toProductId, toVariantId, quantity, notes } = request.body as any;

      // Validate input
      if (!fromProductId || !toProductId || !quantity) {
        return reply.status(400).send({
          success: false,
          error: 'From product, to product, and quantity are required'
        });
      }

      if (quantity <= 0) {
        return reply.status(400).send({
          success: false,
          error: 'Quantity must be greater than 0'
        });
      }

      if (fromProductId === toProductId && fromVariantId === toVariantId) {
        return reply.status(400).send({
          success: false,
          error: 'Source and destination cannot be the same'
        });
      }

      // Use database transaction for atomic transfer
      const result = await prisma.$transaction(async (tx) => {
        // Validate source stock
        let sourceStock: number;
        if (fromVariantId) {
          const variant = await tx.productVariant.findUnique({
            where: { id: fromVariantId }
          });
          if (!variant) {
            throw new Error('Source variant not found');
          }
          sourceStock = variant.stock;
        } else {
          const product = await tx.product.findUnique({
            where: { id: fromProductId }
          });
          if (!product) {
            throw new Error('Source product not found');
          }
          sourceStock = product.stock;
        }

        if (sourceStock < quantity) {
          throw new Error(`Insufficient stock in source. Available: ${sourceStock}, Requested: ${quantity}`);
        }

        // Reduce stock from source
        if (fromVariantId) {
          await tx.productVariant.update({
            where: { id: fromVariantId },
            data: {
              stock: {
                decrement: quantity
              }
            }
          });
        } else {
          await tx.product.update({
            where: { id: fromProductId },
            data: {
              stock: {
                decrement: quantity
              }
            }
          });
        }

        // Increase stock at destination
        if (toVariantId) {
          await tx.productVariant.update({
            where: { id: toVariantId },
            data: {
              stock: {
                increment: quantity
              }
            }
          });
        } else {
          await tx.product.update({
            where: { id: toProductId },
            data: {
              stock: {
                increment: quantity
              }
            }
          });
        }

        // Log stock movements for both operations
        await tx.stockMovement.create({
          data: {
            productId: fromProductId,
            variantId: fromVariantId,
            storeId,
            quantity: -quantity, // Negative because we're reducing
            reason: 'TRANSFER',
            referenceType: 'STOCK_TRANSFER',
            referenceId: `transfer_${Date.now()}`,
            userId: user.id,
            notes: `Transfer to ${toProductId}${toVariantId ? ` (${toVariantId})` : ''}. ${notes || ''}`
          }
        });

        await tx.stockMovement.create({
          data: {
            productId: toProductId,
            variantId: toVariantId,
            storeId,
            quantity: quantity, // Positive because we're increasing
            reason: 'TRANSFER',
            referenceType: 'STOCK_TRANSFER',
            referenceId: `transfer_${Date.now()}`,
            userId: user.id,
            notes: `Transfer from ${fromProductId}${fromVariantId ? ` (${fromVariantId})` : ''}. ${notes || ''}`
          }
        });

        return {
          fromStock: sourceStock - quantity,
          toStock: (await (toVariantId 
            ? tx.productVariant.findUnique({ where: { id: toVariantId } })
            : tx.product.findUnique({ where: { id: toProductId } })))?.stock
        };
      });

      // Log audit event
      await AuditService.logEvent(
        'Stock',
        `transfer_${fromProductId}_to_${toProductId}`,
        'STOCK_TRANSFERRED',
        user.id,
        storeId,
        undefined,
        {
          fromProductId,
          fromVariantId,
          toProductId,
          toVariantId,
          quantity,
          notes
        }
      );

      return reply.status(200).send({
        success: true,
        message: 'Stock transferred successfully',
        data: result
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to transfer stock'
      });
    }
  });
}

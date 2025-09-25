"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StockService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class StockService {
    /**
     * Reserve stock for an order
     */
    static async reserveStock(orderId, items, storeId, userId) {
        try {
            // Check if we have enough stock for all items
            for (const item of items) {
                let availableStock;
                if (item.variantId) {
                    const variant = await prisma.productVariant.findUnique({
                        where: { id: item.variantId }
                    });
                    if (!variant) {
                        throw new Error(`Variant not found: ${item.variantId}`);
                    }
                    availableStock = variant.stock;
                }
                else {
                    const product = await prisma.product.findUnique({
                        where: { id: item.productId }
                    });
                    if (!product) {
                        throw new Error(`Product not found: ${item.productId}`);
                    }
                    availableStock = product.stock;
                }
                if (availableStock < item.quantity) {
                    throw new Error(`Insufficient stock for product ${item.productId}. Available: ${availableStock}, Requested: ${item.quantity}`);
                }
            }
            // Create stock reservations (expires in 30 minutes)
            const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
            const reservationPromises = items.map(item => prisma.stockReservation.create({
                data: {
                    orderId,
                    productId: item.productId,
                    variantId: item.variantId,
                    quantity: item.quantity,
                    expiresAt,
                    storeId
                }
            }));
            await Promise.all(reservationPromises);
            // Log stock reservation movement
            const movementPromises = items.map(item => prisma.stockMovement.create({
                data: {
                    productId: item.productId,
                    variantId: item.variantId,
                    storeId,
                    quantity: -item.quantity, // Negative because we're reserving (reducing available stock)
                    reason: 'RESERVATION',
                    referenceType: 'ORDER',
                    referenceId: orderId,
                    userId,
                    notes: `Stock reserved for order ${orderId}`
                }
            }));
            await Promise.all(movementPromises);
            return true;
        }
        catch (error) {
            console.error('Error reserving stock:', error);
            throw error;
        }
    }
    /**
     * Release stock reservation (when order is cancelled or expired)
     */
    static async releaseReservation(orderId, storeId, userId) {
        try {
            // Find active reservations for this order
            const reservations = await prisma.stockReservation.findMany({
                where: {
                    orderId,
                    storeId,
                    status: 'ACTIVE'
                }
            });
            if (reservations.length === 0)
                return;
            // Update reservation status to RELEASED
            await prisma.stockReservation.updateMany({
                where: {
                    orderId,
                    storeId,
                    status: 'ACTIVE'
                },
                data: {
                    status: 'RELEASED'
                }
            });
            // Log stock release movement
            const movementPromises = reservations.map(reservation => prisma.stockMovement.create({
                data: {
                    productId: reservation.productId,
                    variantId: reservation.variantId,
                    storeId,
                    quantity: reservation.quantity, // Positive because we're releasing (increasing available stock)
                    reason: 'RESERVATION_RELEASE',
                    referenceType: 'ORDER',
                    referenceId: orderId,
                    userId,
                    notes: `Stock reservation released for order ${orderId}`
                }
            }));
            await Promise.all(movementPromises);
        }
        catch (error) {
            console.error('Error releasing stock reservation:', error);
            throw error;
        }
    }
    /**
     * Confirm stock reservation (when order is completed)
     */
    static async confirmReservation(orderId, storeId, userId) {
        try {
            // Find active reservations for this order
            const reservations = await prisma.stockReservation.findMany({
                where: {
                    orderId,
                    storeId,
                    status: 'ACTIVE'
                }
            });
            if (reservations.length === 0)
                return;
            // Update reservation status to CONFIRMED
            await prisma.stockReservation.updateMany({
                where: {
                    orderId,
                    storeId,
                    status: 'ACTIVE'
                },
                data: {
                    status: 'CONFIRMED'
                }
            });
            // Log stock confirmation movement (this is the actual sale)
            const movementPromises = reservations.map(reservation => prisma.stockMovement.create({
                data: {
                    productId: reservation.productId,
                    variantId: reservation.variantId,
                    storeId,
                    quantity: -reservation.quantity, // Negative because we're selling
                    reason: 'SALE',
                    referenceType: 'ORDER',
                    referenceId: orderId,
                    userId,
                    notes: `Stock confirmed for order ${orderId}`
                }
            }));
            await Promise.all(movementPromises);
        }
        catch (error) {
            console.error('Error confirming stock reservation:', error);
            throw error;
        }
    }
    /**
     * Update actual stock levels
     */
    static async updateStock(productId, variantId, quantityChange, reason, storeId, userId, referenceType, referenceId, notes) {
        try {
            if (variantId) {
                // Update variant stock
                await prisma.productVariant.update({
                    where: { id: variantId },
                    data: {
                        stock: {
                            increment: quantityChange
                        }
                    }
                });
            }
            else {
                // Update product stock
                await prisma.product.update({
                    where: { id: productId },
                    data: {
                        stock: {
                            increment: quantityChange
                        }
                    }
                });
            }
            // Log stock movement
            await prisma.stockMovement.create({
                data: {
                    productId,
                    variantId,
                    storeId,
                    quantity: quantityChange,
                    reason,
                    referenceType,
                    referenceId,
                    userId,
                    notes
                }
            });
        }
        catch (error) {
            console.error('Error updating stock:', error);
            throw error;
        }
    }
    /**
     * Cleanup expired reservations
     */
    static async cleanupExpiredReservations() {
        try {
            const now = new Date();
            // Find expired reservations
            const expiredReservations = await prisma.stockReservation.findMany({
                where: {
                    expiresAt: {
                        lt: now
                    },
                    status: 'ACTIVE'
                }
            });
            if (expiredReservations.length === 0)
                return;
            // Update reservation status to EXPIRED
            await prisma.stockReservation.updateMany({
                where: {
                    id: {
                        in: expiredReservations.map(r => r.id)
                    }
                },
                data: {
                    status: 'EXPIRED'
                }
            });
            // Log expiration movements
            const movementPromises = expiredReservations.map(reservation => prisma.stockMovement.create({
                data: {
                    productId: reservation.productId,
                    variantId: reservation.variantId,
                    storeId: reservation.storeId,
                    quantity: reservation.quantity, // Positive because expired reservations are released
                    reason: 'RESERVATION_RELEASE',
                    referenceType: 'RESERVATION',
                    referenceId: reservation.id,
                    notes: `Stock reservation expired for order ${reservation.orderId}`
                }
            }));
            await Promise.all(movementPromises);
        }
        catch (error) {
            console.error('Error cleaning up expired reservations:', error);
            throw error;
        }
    }
    /**
     * Get stock movements for a product
     */
    static async getStockMovements(productId, storeId, limit = 50) {
        try {
            return await prisma.stockMovement.findMany({
                where: {
                    productId,
                    storeId
                },
                orderBy: {
                    createdAt: 'desc'
                },
                take: limit,
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                }
            });
        }
        catch (error) {
            console.error('Error fetching stock movements:', error);
            throw error;
        }
    }
    /**
     * Validate minimum stock levels
     */
    static async validateMinimumStock(productId, variantId, requestedQuantity) {
        try {
            let stock;
            let lowStockThreshold;
            if (variantId) {
                const variant = await prisma.productVariant.findUnique({
                    where: { id: variantId },
                    include: {
                        product: {
                            select: {
                                lowStockThreshold: true
                            }
                        }
                    }
                });
                if (!variant) {
                    return { isValid: false, message: 'Variant not found' };
                }
                stock = variant.stock;
                lowStockThreshold = variant.product.lowStockThreshold;
            }
            else {
                const product = await prisma.product.findUnique({
                    where: { id: productId }
                });
                if (!product) {
                    return { isValid: false, message: 'Product not found' };
                }
                stock = product.stock;
                lowStockThreshold = product.lowStockThreshold;
            }
            const remainingStock = stock - requestedQuantity;
            if (remainingStock < 0) {
                return { isValid: false, message: `Insufficient stock. Available: ${stock}, Requested: ${requestedQuantity}` };
            }
            if (remainingStock < lowStockThreshold) {
                return { isValid: true, message: `Warning: Stock will fall below minimum threshold (${lowStockThreshold}) after this transaction` };
            }
            return { isValid: true };
        }
        catch (error) {
            console.error('Error validating minimum stock:', error);
            throw error;
        }
    }
}
exports.StockService = StockService;
//# sourceMappingURL=stock.service.js.map
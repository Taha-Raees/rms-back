"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = posCheckoutRoutes;
const client_1 = require("@prisma/client");
const order_service_1 = require("../services/order.service");
const stock_service_1 = require("../services/stock.service");
const prisma = new client_1.PrismaClient();
async function posCheckoutRoutes(fastify) {
    fastify.post('/', async (request, reply) => {
        try {
            const user = request.user;
            const storeId = user.storeId;
            if (!storeId) {
                return reply.status(400).send({
                    success: false,
                    error: 'No store associated with this user'
                });
            }
            // Check if user has access to this store
            if (user.role !== 'OWNER' && user.role !== 'MANAGER' && user.role !== 'STAFF') {
                return reply.status(403).send({
                    success: false,
                    error: 'Insufficient permissions to perform checkout'
                });
            }
            const { items, customerType = 'REGULAR', discountPercentage = 0, taxRate, paymentMethod, amountPaid, } = request.body;
            if (!items || !Array.isArray(items) || items.length === 0) {
                return reply.status(400).send({
                    success: false,
                    error: 'Cart items are required and must be a non-empty array',
                });
            }
            if (!paymentMethod) {
                return reply.status(400).send({
                    success: false,
                    error: 'Payment method is required',
                });
            }
            if (amountPaid === undefined) {
                return reply.status(400).send({
                    success: false,
                    error: 'Amount paid is required',
                });
            }
            // Get store to get tax rate if not provided in request
            let effectiveTaxRate = taxRate;
            if (effectiveTaxRate === undefined) {
                const store = await prisma.store.findUnique({
                    where: { id: storeId },
                });
                effectiveTaxRate = store?.taxRate || 0.17; // Default to 17% if not found
            }
            let subtotal = 0;
            const orderItems = [];
            const productIds = items.map(item => item.productId);
            const products = await prisma.product.findMany({
                where: {
                    id: { in: productIds },
                    isActive: true,
                    storeId: storeId,
                },
                include: {
                    variants: true,
                },
            });
            const productMap = new Map(products.map(p => [p.id, p]));
            for (const item of items) {
                const product = productMap.get(item.productId);
                if (!product) {
                    return reply.status(404).send({
                        success: false,
                        error: `Product with ID ${item.productId} not found or inactive`,
                    });
                }
                let finalPrice = item.price ?? product.basePrice;
                let itemName = item.name ?? product.name;
                let itemUnit = item.unit ?? product.unit;
                if (item.variantId) {
                    const variant = product.variants?.find((v) => v.id === item.variantId);
                    if (!variant) {
                        return reply.status(404).send({
                            success: false,
                            error: `Variant with ID ${item.variantId} not found for product ${product.name}`,
                        });
                    }
                    finalPrice = variant.price;
                    itemName = `${product.name} - ${variant.name}`;
                    itemUnit = product.unit;
                }
                // Check stock
                if (product.stock < item.quantity) {
                    return reply.status(400).send({
                        success: false,
                        error: `Insufficient stock for product ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`,
                    });
                }
                orderItems.push({
                    productId: product.id,
                    variantId: item.variantId,
                    quantity: item.quantity,
                    price: finalPrice,
                    name: itemName,
                    unit: itemUnit,
                });
                subtotal += finalPrice * item.quantity;
            }
            const discountAmount = subtotal * (discountPercentage / 100);
            const amountAfterDiscount = subtotal - discountAmount;
            const taxAmount = amountAfterDiscount * effectiveTaxRate;
            const totalAmount = amountAfterDiscount + taxAmount;
            const change = amountPaid - totalAmount;
            if (change < 0) {
                return reply.status(400).send({
                    success: false,
                    error: 'Insufficient payment amount',
                });
            }
            // Generate order number first for stock reservation
            const orderNumber = order_service_1.OrderService.generateOrderNumber(storeId);
            // Reserve stock before creating order
            const stockReservationItems = items.map(item => ({
                productId: item.productId,
                variantId: item.variantId,
                quantity: item.quantity
            }));
            // Reserve stock
            await stock_service_1.StockService.reserveStock('', // Temporary - will be updated after order creation
            stockReservationItems, storeId, user.id);
            // Use the new OrderService with proper transaction handling
            const orderData = {
                items: items.map(item => ({
                    productId: item.productId,
                    variantId: item.variantId,
                    quantity: item.quantity,
                    unitPrice: orderItems.find(oi => oi.productId === item.productId && oi.variantId === item.variantId)?.price || 0
                })),
                paymentMethod: paymentMethod,
                notes: `POS order - Change: ${change}`
            };
            const newOrder = await order_service_1.OrderService.createOrder(orderData, storeId, user.id);
            // Process payment immediately for POS
            const paymentResult = await order_service_1.OrderService.processPayment(newOrder.id, {
                amount: totalAmount,
                method: paymentMethod,
                transactionId: `POS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            }, storeId, user.id);
            return reply.status(201).send({
                success: true,
                data: paymentResult.order,
                message: 'Order placed successfully',
            });
        }
        catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({
                success: false,
                error: 'Internal server error during checkout',
            });
        }
    });
    fastify.get('/orders', async (request, reply) => {
        try {
            const user = request.user;
            const storeId = user.storeId;
            if (!storeId) {
                return reply.status(400).send({
                    success: false,
                    error: 'No store associated with this user'
                });
            }
            // Check if user has access to this store
            if (user.role !== 'OWNER' && user.role !== 'MANAGER' && user.role !== 'STAFF') {
                return reply.status(403).send({
                    success: false,
                    error: 'Insufficient permissions to view orders'
                });
            }
            const orders = await prisma.order.findMany({
                where: {
                    storeId: storeId
                },
                include: {
                    items: {
                        include: {
                            product: true,
                            variant: true,
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });
            return reply.status(200).send({
                success: true,
                data: orders,
                total: orders.length,
            });
        }
        catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({
                success: false,
                error: 'Internal server error',
            });
        }
    });
}
//# sourceMappingURL=checkout.js.map
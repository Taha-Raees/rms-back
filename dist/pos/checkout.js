"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = posCheckoutRoutes;
const client_1 = require("@prisma/client");
const order_service_1 = require("../services/order.service");
const auth_middleware_1 = require("../middleware/auth.middleware");
const token_service_1 = require("../services/token.service");
const prisma = new client_1.PrismaClient();
async function posCheckoutRoutes(fastify) {
    const tokenService = new token_service_1.TokenService(fastify);
    // Add authentication hook for all POS checkout routes
    fastify.addHook('preHandler', async (request, reply) => {
        await (0, auth_middleware_1.authenticateStoreUser)(request, reply, tokenService);
    });
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
                // For POS transactions, use frontend tax calculation by defaulting to 0% (as it's being calculated independently)
                effectiveTaxRate = 0; // Override: Use frontend's tax calculation - typically 0%
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
            try {
                console.log('Creating order with data:', {
                    orderNumber,
                    subtotal,
                    taxAmount,
                    totalAmount,
                    paymentMethod: paymentMethod.toLowerCase(),
                    storeId
                });
                // Create order directly with minimal data to isolate the issue
                const order = await prisma.order.create({
                    data: {
                        orderNumber,
                        subtotal,
                        tax: taxAmount,
                        total: totalAmount,
                        status: 'pending',
                        paymentMethod: paymentMethod.toLowerCase(),
                        storeId,
                    }
                });
                console.log('Order created successfully:', order.id);
                // Create payment record
                const paymentData = {
                    amount: totalAmount,
                    method: paymentMethod.toLowerCase(),
                    status: 'paid',
                    transactionId: `POS-${Date.now()}`,
                    orderId: order.id
                };
                console.log('Creating payment with data:', paymentData);
                const payment = await prisma.payment.create({
                    data: paymentData
                });
                console.log('Payment created successfully:', payment.id);
                // Update order status to completed
                const updatedOrder = await prisma.order.update({
                    where: { id: order.id },
                    data: {
                        status: 'completed',
                        paymentStatus: 'paid'
                    }
                });
                // Create order items and reduce inventory
                console.log('Creating order items and updating inventory...');
                for (const item of orderItems) {
                    // Create order item
                    await prisma.orderItem.create({
                        data: {
                            orderId: order.id,
                            productId: item.productId,
                            variantId: item.variantId,
                            quantity: item.quantity,
                            unitPrice: item.price,
                            totalPrice: item.price * item.quantity,
                        }
                    });
                    // Reduce inventory
                    const updateData = {
                        stock: {
                            decrement: item.quantity
                        }
                    };
                    // If it's a variant, also reduce variant stock
                    if (item.variantId) {
                        await prisma.productVariant.update({
                            where: { id: item.variantId },
                            data: {
                                stock: {
                                    decrement: item.quantity
                                }
                            }
                        });
                    }
                    // Update main product stock
                    await prisma.product.update({
                        where: { id: item.productId },
                        data: updateData
                    });
                    console.log(`Reduced inventory for product ${item.productId}${item.variantId ? ` (variant ${item.variantId})` : ''} by ${item.quantity}`);
                }
                console.log('Order status updated to completed:', updatedOrder.id);
                return reply.status(201).send({
                    success: true,
                    data: updatedOrder,
                    message: 'Order placed successfully',
                });
            }
            catch (dbError) {
                console.error('Database operation failed - detailed error:');
                console.error('Error name:', dbError?.name || 'Unknown');
                console.error('Error message:', dbError?.message || 'Unknown');
                console.error('Error code:', dbError?.code || 'Unknown');
                console.error('Error meta:', dbError?.meta || {});
                console.error('Full error:', JSON.stringify(dbError, null, 2));
                throw dbError; // Re-throw to see the exact error
            }
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
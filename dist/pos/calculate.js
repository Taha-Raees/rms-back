"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = posCalculateRoutes;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function posCalculateRoutes(fastify) {
    fastify.post('/', async (request, reply) => {
        try {
            const { items, customerType = 'REGULAR', discountPercentage = 0, taxRate } = request.body;
            // Get storeId from authenticated user
            const storeId = request.user?.storeId;
            if (!storeId) {
                return reply.status(401).send({
                    success: false,
                    error: 'Store ID not found in authentication context',
                });
            }
            if (!items || !Array.isArray(items) || items.length === 0) {
                return reply.status(400).send({
                    success: false,
                    error: 'Cart items are required and must be a non-empty array',
                });
            }
            let subtotal = 0;
            const processedItems = [];
            const lowStockItems = [];
            // Fetch store to get tax rate if not provided in request
            let effectiveTaxRate = taxRate;
            if (effectiveTaxRate === undefined) {
                const store = await prisma.store.findUnique({
                    where: { id: storeId },
                });
                effectiveTaxRate = store?.taxRate || 0.17; // Default to 17% if not found
            }
            // Fetch all products and variants in a single query
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
                    itemUnit = product.unit; // Variants usually don't have their own unit
                }
                // Check stock
                if (product.stock < item.quantity) {
                    lowStockItems.push({
                        productId: product.id,
                        currentStock: product.stock,
                        requestedQuantity: item.quantity,
                    });
                }
                const cartItem = {
                    ...item,
                    price: finalPrice,
                    name: itemName,
                    unit: itemUnit,
                };
                processedItems.push(cartItem);
                subtotal += finalPrice * item.quantity;
            }
            // Apply discount and tax
            const discountAmount = subtotal * (discountPercentage / 100);
            const amountAfterDiscount = subtotal - discountAmount;
            const taxAmount = amountAfterDiscount * effectiveTaxRate;
            const totalAmount = amountAfterDiscount + taxAmount;
            const response = {
                subtotal,
                discountAmount,
                taxableAmount: amountAfterDiscount,
                taxAmount,
                totalAmount,
                items: processedItems,
                lowStockItems,
            };
            return reply.status(200).send({
                success: true,
                data: response,
                message: 'Cart calculated successfully',
            });
        }
        catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({
                success: false,
                error: 'Internal server error during calculation',
            });
        }
    });
}
//# sourceMappingURL=calculate.js.map
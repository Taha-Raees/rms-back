"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class ValidationService {
    /**
     * Validate product data
     */
    static async validateProductData(productData, storeId, existingProductId) {
        const errors = [];
        // Validate required fields
        if (!productData.name?.trim()) {
            errors.push('Product name is required');
        }
        if (!productData.category?.trim()) {
            errors.push('Product category is required');
        }
        if (typeof productData.basePrice !== 'number' || productData.basePrice < 0) {
            errors.push('Base price must be a non-negative number');
        }
        if (typeof productData.baseCost !== 'number' || productData.baseCost < 0) {
            errors.push('Base cost must be a non-negative number');
        }
        if (typeof productData.stock !== 'number' || productData.stock < 0) {
            errors.push('Stock must be a non-negative number');
        }
        if (typeof productData.lowStockThreshold !== 'number' || productData.lowStockThreshold < 0) {
            errors.push('Low stock threshold must be a non-negative number');
        }
        // Validate barcode uniqueness if provided
        if (productData.barcode) {
            const existingProduct = await prisma.product.findFirst({
                where: {
                    barcode: productData.barcode,
                    storeId,
                    NOT: existingProductId ? { id: existingProductId } : undefined
                }
            });
            if (existingProduct) {
                errors.push('Product with this barcode already exists');
            }
        }
        // Validate stock vs low stock threshold
        if (productData.stock < productData.lowStockThreshold) {
            errors.push('Stock cannot be less than low stock threshold');
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    /**
     * Validate order data
     */
    static async validateOrderData(orderData, storeId) {
        const errors = [];
        // Validate required fields
        if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
            errors.push('Order must have at least one item');
        }
        if (!orderData.paymentMethod) {
            errors.push('Payment method is required');
        }
        // Validate items
        for (const [index, item] of orderData.items.entries()) {
            if (!item.productId) {
                errors.push(`Item ${index + 1}: Product ID is required`);
            }
            if (typeof item.quantity !== 'number' || item.quantity <= 0) {
                errors.push(`Item ${index + 1}: Quantity must be a positive number`);
            }
            if (typeof item.unitPrice !== 'number' || item.unitPrice < 0) {
                errors.push(`Item ${index + 1}: Unit price must be a non-negative number`);
            }
        }
        // Validate payment method
        const validPaymentMethods = ['cash', 'card', 'jazzcash', 'easypaisa', 'bank_transfer'];
        if (!validPaymentMethods.includes(orderData.paymentMethod)) {
            errors.push('Invalid payment method');
        }
        // Validate totals if provided
        if (orderData.subtotal !== undefined && (typeof orderData.subtotal !== 'number' || orderData.subtotal < 0)) {
            errors.push('Subtotal must be a non-negative number');
        }
        if (orderData.tax !== undefined && (typeof orderData.tax !== 'number' || orderData.tax < 0)) {
            errors.push('Tax must be a non-negative number');
        }
        if (orderData.total !== undefined && (typeof orderData.total !== 'number' || orderData.total < 0)) {
            errors.push('Total must be a non-negative number');
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    /**
     * Validate customer data
     */
    static async validateCustomerData(customerData, storeId, existingCustomerId) {
        const errors = [];
        // Validate required fields
        if (!customerData.name?.trim()) {
            errors.push('Customer name is required');
        }
        // Validate phone number format if provided
        if (customerData.phone) {
            // Simple Pakistani phone number validation
            const phoneRegex = /^(\+92|0)[0-9]{10}$/;
            if (!phoneRegex.test(customerData.phone)) {
                errors.push('Invalid phone number format. Use +92XXXXXXXXXX or 0XXXXXXXXXX');
            }
            // Check uniqueness
            const existingCustomer = await prisma.customer.findFirst({
                where: {
                    phone: customerData.phone,
                    storeId,
                    NOT: existingCustomerId ? { id: existingCustomerId } : undefined
                }
            });
            if (existingCustomer) {
                errors.push('Customer with this phone number already exists');
            }
        }
        // Validate email format if provided
        if (customerData.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(customerData.email)) {
                errors.push('Invalid email format');
            }
            // Check uniqueness
            const existingCustomer = await prisma.customer.findFirst({
                where: {
                    email: customerData.email,
                    storeId,
                    NOT: existingCustomerId ? { id: existingCustomerId } : undefined
                }
            });
            if (existingCustomer) {
                errors.push('Customer with this email already exists');
            }
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    /**
     * Validate stock update
     */
    static async validateStockUpdate(productId, variantId, quantityChange, reason, storeId) {
        const errors = [];
        // Validate reason
        const validReasons = ['SALE', 'RETURN', 'DAMAGE', 'THEFT', 'CORRECTION', 'RECEIPT', 'TRANSFER', 'RESERVATION', 'RESERVATION_RELEASE'];
        if (!validReasons.includes(reason)) {
            errors.push('Invalid stock adjustment reason');
        }
        // Get current stock
        let currentStock;
        if (variantId) {
            const variant = await prisma.productVariant.findUnique({
                where: { id: variantId }
            });
            if (!variant) {
                errors.push('Variant not found');
            }
            else {
                currentStock = variant.stock;
            }
        }
        else {
            const product = await prisma.product.findUnique({
                where: { id: productId }
            });
            if (!product) {
                errors.push('Product not found');
            }
            else {
                currentStock = product.stock;
            }
        }
        // Validate quantity change doesn't result in negative stock (except for corrections)
        if (currentStock !== undefined && reason !== 'CORRECTION') {
            const newStock = currentStock + quantityChange;
            if (newStock < 0) {
                errors.push(`Stock adjustment would result in negative stock. Current: ${currentStock}, Change: ${quantityChange}`);
            }
        }
        return {
            isValid: errors.length === 0,
            errors,
            currentStock
        };
    }
    /**
     * Validate foreign key constraints
     */
    static async validateForeignKeys(entity, data, storeId) {
        const errors = [];
        switch (entity) {
            case 'product':
                // Validate store exists
                const store = await prisma.store.findUnique({
                    where: { id: storeId }
                });
                if (!store) {
                    errors.push('Store not found');
                }
                break;
            case 'order':
                // Validate store exists
                const orderStore = await prisma.store.findUnique({
                    where: { id: storeId }
                });
                if (!orderStore) {
                    errors.push('Store not found');
                }
                // Validate customer if provided
                if (data.customerId) {
                    const customer = await prisma.customer.findUnique({
                        where: { id: data.customerId }
                    });
                    if (!customer || customer.storeId !== storeId) {
                        errors.push('Customer not found or does not belong to this store');
                    }
                }
                break;
            case 'customer':
                // Validate store exists
                const customerStore = await prisma.store.findUnique({
                    where: { id: storeId }
                });
                if (!customerStore) {
                    errors.push('Store not found');
                }
                break;
            case 'variant':
                // Validate product exists and belongs to store
                if (data.productId) {
                    const product = await prisma.product.findUnique({
                        where: { id: data.productId }
                    });
                    if (!product || product.storeId !== storeId) {
                        errors.push('Product not found or does not belong to this store');
                    }
                }
                break;
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    /**
     * Check data consistency
     */
    static async checkDataConsistency(storeId) {
        const issues = [];
        try {
            // Check for orders with inconsistent totals
            const inconsistentOrders = await prisma.$queryRaw `
        SELECT id, subtotal, tax, total, 
               (subtotal + tax) as calculated_total
        FROM orders 
        WHERE storeId = ${storeId} 
        AND ABS(total - (subtotal + tax)) > 0.01
      `;
            if (inconsistentOrders.length > 0) {
                issues.push(`Found ${inconsistentOrders.length} orders with inconsistent totals`);
            }
            // Check for negative stock products
            const negativeStockProducts = await prisma.product.findMany({
                where: {
                    storeId,
                    stock: {
                        lt: 0
                    }
                }
            });
            if (negativeStockProducts.length > 0) {
                issues.push(`Found ${negativeStockProducts.length} products with negative stock`);
            }
            // Check for negative stock variants
            const negativeStockVariants = await prisma.productVariant.findMany({
                where: {
                    product: {
                        storeId
                    },
                    stock: {
                        lt: 0
                    }
                }
            });
            if (negativeStockVariants.length > 0) {
                issues.push(`Found ${negativeStockVariants.length} variants with negative stock`);
            }
            // Check for orphaned order items
            const orphanedOrderItems = await prisma.$queryRaw `
        SELECT oi.id
        FROM order_items oi
        LEFT JOIN orders o ON oi."orderId" = o.id
        WHERE o.id IS NULL
      `;
            if (orphanedOrderItems.length > 0) {
                issues.push(`Found ${orphanedOrderItems.length} orphaned order items`);
            }
        }
        catch (error) {
            console.error('Error checking data consistency:', error);
            issues.push('Error occurred while checking data consistency');
        }
        return {
            isConsistent: issues.length === 0,
            issues
        };
    }
}
exports.ValidationService = ValidationService;
//# sourceMappingURL=validation.service.js.map
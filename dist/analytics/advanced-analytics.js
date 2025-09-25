"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = advancedAnalyticsRoutes;
const prisma_1 = __importStar(require("../lib/prisma"));
const cross_domain_auth_middleware_1 = require("../middleware/cross-domain-auth.middleware");
const token_service_1 = require("../services/token.service");
async function advancedAnalyticsRoutes(fastify) {
    const tokenService = new token_service_1.TokenService(fastify);
    // GET /analytics/advanced/financial - Comprehensive financial analytics
    fastify.get('/financial', async (request, reply) => {
        await (0, cross_domain_auth_middleware_1.authenticateStoreUserCrossDomain)(request, reply, tokenService);
        if (reply.sent)
            return;
        try {
            const user = request.user;
            const storeId = user.storeId;
            if (!storeId) {
                return reply.status(400).send({ success: false, error: 'No store associated with this user' });
            }
            // Enhanced retry for heavy financial queries
            const retryHeavyQuery = (operation) => (0, prisma_1.withRetry)(operation, 5, 2000); // 5 retries, 2-second base delay
            // Get orders with items and variants
            const ordersWithItems = await retryHeavyQuery(() => prisma_1.default.order.findMany({
                where: {
                    storeId: storeId,
                    status: 'completed'
                },
                include: {
                    items: {
                        include: {
                            product: true,
                            variant: true
                        }
                    }
                }
            }));
            // Calculate total revenue and costs
            let totalRevenue = 0;
            let totalCost = 0;
            const revenueByPayment = {};
            const monthlyPnL = {};
            const dailyRevenue = {};
            ordersWithItems.forEach(order => {
                // Total revenue
                totalRevenue += order.total;
                // Revenue by payment method
                const paymentMethod = order.paymentMethod || 'cash'; // Default to cash if null
                if (!revenueByPayment[paymentMethod]) {
                    revenueByPayment[paymentMethod] = { revenue: 0, count: 0 };
                }
                revenueByPayment[paymentMethod].revenue += order.total;
                revenueByPayment[paymentMethod].count++;
                // Monthly P&L and costs
                const monthKey = new Date(order.createdAt).toISOString().slice(0, 7); // YYYY-MM format
                if (!monthlyPnL[monthKey]) {
                    monthlyPnL[monthKey] = { revenue: 0, cost: 0 };
                }
                monthlyPnL[monthKey].revenue += order.total;
                // Calculate cost for each item
                order.items.forEach(item => {
                    const cost = item.variantId ? (item.variant?.cost || item.product.baseCost) : item.product.baseCost;
                    const itemCost = cost * item.quantity;
                    totalCost += itemCost;
                    monthlyPnL[monthKey].cost += itemCost;
                });
                // Daily revenue trends (last 90 days)
                const dateKey = order.createdAt.toISOString().split('T')[0];
                if (!dailyRevenue[dateKey]) {
                    dailyRevenue[dateKey] = { revenue: 0, orders: 0 };
                }
                dailyRevenue[dateKey].revenue += order.total;
                dailyRevenue[dateKey].orders++;
            });
            // Format revenue by payment method
            const revenueByPaymentMethod = Object.entries(revenueByPayment)
                .sort(([, a], [, b]) => b.revenue - a.revenue)
                .map(([paymentMethod, data]) => ({
                paymentMethod,
                revenue: data.revenue,
                transactionCount: data.count
            }));
            // Format monthly P&L
            const monthlyPnLResult = Object.entries(monthlyPnL)
                .sort(([a], [b]) => b.localeCompare(a))
                .slice(0, 12)
                .map(([month, data]) => ({
                month: new Date(month + '-01').toISOString(),
                revenue: data.revenue,
                cost: data.cost,
                profit: data.revenue - data.cost
            }));
            // Format daily revenue trends (last 90 days)
            const revenueTrends = Object.entries(dailyRevenue)
                .sort(([a], [b]) => b.localeCompare(a))
                .slice(0, 90)
                .map(([date, data]) => ({
                date: date,
                revenue: data.revenue,
                orders: data.orders
            }));
            return {
                success: true,
                data: {
                    summary: {
                        totalRevenue: totalRevenue,
                        totalCost: totalCost,
                        totalProfit: totalRevenue - totalCost,
                        profitMargin: totalRevenue > 0 ? (totalRevenue - totalCost) / totalRevenue * 100 : 0
                    },
                    revenueByPaymentMethod: revenueByPaymentMethod,
                    monthlyPnL: monthlyPnLResult,
                    revenueTrends: revenueTrends
                }
            };
        }
        catch (error) {
            fastify.log.error('Failed to fetch financial analytics:', error);
            reply.status(500).send({
                success: false,
                error: 'Failed to fetch financial analytics',
                details: error.message
            });
        }
    });
    // GET /analytics/advanced/product - Product performance analytics
    fastify.get('/product', async (request, reply) => {
        await (0, cross_domain_auth_middleware_1.authenticateStoreUserCrossDomain)(request, reply, tokenService);
        if (reply.sent)
            return;
        try {
            const user = request.user;
            const storeId = user.storeId;
            if (!storeId) {
                return reply.status(400).send({ success: false, error: 'No store associated with this user' });
            }
            // Enhanced retry for heavy analytics queries
            const retryHeavyQuery = (operation) => (0, prisma_1.withRetry)(operation, 5, 2000); // 5 retries, 2-second base delay
            // Product performance by revenue and velocity
            const productPerformance = await retryHeavyQuery(() => prisma_1.default.$queryRaw `
          SELECT
            p."id",
            p."name",
            p."category",
            SUM(oi."quantity") as totalSold,
            SUM(oi."totalPrice") as totalRevenue,
            SUM(
              CASE
                WHEN oi."variantId" IS NOT NULL THEN pv."cost" * oi."quantity"
                ELSE p."baseCost" * oi."quantity"
              END
            ) as totalCost,
            SUM(oi."totalPrice") - SUM(
              CASE
                WHEN oi."variantId" IS NOT NULL THEN pv."cost" * oi."quantity"
                ELSE p."baseCost" * oi."quantity"
              END
            ) as totalProfit,
            AVG(oi."totalPrice" / oi."quantity") as avgSellingPrice,
            AVG(
              CASE
                WHEN oi."variantId" IS NOT NULL THEN pv."cost"
                ELSE p."baseCost"
              END
            ) as avgCostPrice,
            COUNT(DISTINCT o."id") as orderCount,
            MIN(o."createdAt") as firstSold,
            MAX(o."createdAt") as lastSold
          FROM "products" p
          JOIN "order_items" oi ON p."id" = oi."productId"
          JOIN "orders" o ON oi."orderId" = o."id"
          LEFT JOIN "product_variants" pv ON oi."variantId" = pv."id"
          WHERE p."storeId" = ${storeId} AND o."status" = 'completed'
          GROUP BY p."id", p."name", p."category"
          ORDER BY totalRevenue DESC
          LIMIT 50
        `);
            // Inventory turnover analysis
            const inventoryTurnover = await retryHeavyQuery(() => prisma_1.default.$queryRaw `
          SELECT
            p."id",
            p."name",
            p."stock",
            p."lowStockThreshold",
            COALESCE(SUM(oi."quantity"), 0) as totalSold,
            CASE
              WHEN p."stock" > 0 THEN COALESCE(SUM(oi."quantity"), 0.0) / p."stock"
              ELSE 0
            END as turnoverRatio,
            CASE
              WHEN COALESCE(SUM(oi."quantity"), 0) > 0 THEN p."stock" / (COALESCE(SUM(oi."quantity"), 0.0) / 30.0)
              ELSE NULL
            END as daysOfInventory
          FROM "products" p
          LEFT JOIN "order_items" oi ON p."id" = oi."productId"
          LEFT JOIN "orders" o ON oi."orderId" = o."id" AND o."status" = 'completed' AND o."createdAt" >= CURRENT_DATE - INTERVAL '30 days'
          WHERE p."storeId" = ${storeId}
          GROUP BY p."id", p."name", p."stock", p."lowStockThreshold"
          ORDER BY turnoverRatio DESC
          LIMIT 50
        `);
            return {
                success: true,
                data: {
                    productPerformance: productPerformance.map((item) => ({
                        id: item.id,
                        name: item.name,
                        category: item.category,
                        totalSold: parseInt(item.totalSold) || 0,
                        totalRevenue: parseFloat(item.totalRevenue) || 0,
                        totalCost: parseFloat(item.totalCost) || 0,
                        totalProfit: parseFloat(item.totalProfit) || 0,
                        profitMargin: parseFloat(item.totalRevenue) > 0 ? (parseFloat(item.totalProfit) / parseFloat(item.totalRevenue)) * 100 : 0,
                        avgSellingPrice: parseFloat(item.avgSellingPrice) || 0,
                        avgCostPrice: parseFloat(item.avgCostPrice) || 0,
                        orderCount: parseInt(item.orderCount) || 0,
                        firstSold: item.firstSold,
                        lastSold: item.lastSold
                    })),
                    inventoryTurnover: inventoryTurnover.map((item) => ({
                        id: item.id,
                        name: item.name,
                        currentStock: parseInt(item.stock) || 0,
                        lowStockThreshold: parseInt(item.lowStockThreshold) || 0,
                        totalSoldMonth: parseInt(item.totalSold) || 0,
                        turnoverRatio: parseFloat(item.turnoverRatio) || 0,
                        daysOfInventory: item.daysOfInventory ? parseFloat(item.daysOfInventory) : null
                    }))
                }
            };
        }
        catch (error) {
            fastify.log.error('Failed to fetch product analytics:', error);
            reply.status(500).send({
                success: false,
                error: 'Failed to fetch product analytics',
                details: error.message
            });
        }
    });
    // GET /analytics/advanced/operational - Operational analytics
    fastify.get('/operational', async (request, reply) => {
        await (0, cross_domain_auth_middleware_1.authenticateStoreUserCrossDomain)(request, reply, tokenService);
        if (reply.sent)
            return;
        try {
            const user = request.user;
            const storeId = user.storeId;
            if (!storeId) {
                return reply.status(400).send({ success: false, error: 'No store associated with this user' });
            }
            // Enhanced retry for heavy analytics queries
            const retryHeavyQuery = (operation) => (0, prisma_1.withRetry)(operation, 5, 2000); // 5 retries, 2-second base delay
            // Get orders from the last 30 days for hourly pattern
            const hourlyOrders = await retryHeavyQuery(() => prisma_1.default.order.findMany({
                where: {
                    storeId: storeId,
                    status: 'completed',
                    createdAt: {
                        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
                    }
                },
                select: {
                    createdAt: true,
                    total: true
                }
            }));
            // Get orders from the last 90 days for daily pattern
            const dailyOrders = await retryHeavyQuery(() => prisma_1.default.order.findMany({
                where: {
                    storeId: storeId,
                    status: 'completed',
                    createdAt: {
                        gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // 90 days ago
                    }
                },
                select: {
                    createdAt: true,
                    total: true
                }
            }));
            // Calculate hourly sales pattern
            const hourlyMap = new Map();
            hourlyOrders.forEach(order => {
                const hour = order.createdAt.getHours();
                const existing = hourlyMap.get(hour) || { count: 0, revenue: 0 };
                existing.count++;
                existing.revenue += order.total;
                hourlyMap.set(hour, existing);
            });
            const hourlySales = Array.from(hourlyMap.entries())
                .sort(([a], [b]) => a - b)
                .map(([hour, data]) => ({
                hour: hour.toString(),
                orderCount: data.count,
                totalRevenue: data.revenue,
                avgOrderValue: data.revenue / data.count
            }));
            // Calculate daily sales pattern (by day of week)
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const dailyMap = new Map();
            dailyOrders.forEach(order => {
                const dayOfWeek = order.createdAt.getDay(); // 0 = Sunday, 1 = Monday, etc.
                const existing = dailyMap.get(dayOfWeek) || { count: 0, revenue: 0 };
                existing.count++;
                existing.revenue += order.total;
                dailyMap.set(dayOfWeek, existing);
            });
            const dailySales = Array.from(dailyMap.entries())
                .sort(([a], [b]) => a - b)
                .map(([dayOfWeek, data]) => ({
                dayOfWeek,
                dayName: dayNames[dayOfWeek],
                orderCount: data.count,
                totalRevenue: data.revenue,
                avgOrderValue: data.revenue / data.count
            }));
            return {
                success: true,
                data: {
                    hourlySales: hourlySales.map((item) => ({
                        hour: parseInt(item.hour) || 0,
                        orderCount: parseInt(item.orderCount) || 0,
                        totalRevenue: parseFloat(item.totalRevenue) || 0,
                        avgOrderValue: parseFloat(item.avgOrderValue) || 0
                    })),
                    dailySales: dailySales.map((item) => ({
                        dayOfWeek: parseInt(item.dayOfWeek) || 0,
                        dayName: item.dayName?.trim(),
                        orderCount: parseInt(item.orderCount) || 0,
                        totalRevenue: parseFloat(item.totalRevenue) || 0,
                        avgOrderValue: parseFloat(item.avgOrderValue) || 0
                    }))
                }
            };
        }
        catch (error) {
            fastify.log.error('Failed to fetch operational analytics:', error);
            reply.status(500).send({
                success: false,
                error: 'Failed to fetch operational analytics',
                details: error.message
            });
        }
    });
}
//# sourceMappingURL=advanced-analytics.js.map
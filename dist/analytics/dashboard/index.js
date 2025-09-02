"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = dashboardRoutes;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function dashboardRoutes(fastify) {
    // GET /analytics/dashboard - Get dashboard analytics
    fastify.get('/', async (request, reply) => {
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
                    error: 'Insufficient permissions to access analytics'
                });
            }
            // Get total revenue and orders
            const totalRevenueResult = await prisma.$queryRaw `SELECT SUM(total) as sum FROM "orders" WHERE "storeId" = ${storeId} AND "status" = 'completed'`;
            const totalOrdersResult = await prisma.$queryRaw `SELECT COUNT(*) as count FROM "orders" WHERE "storeId" = ${storeId} AND "status" = 'completed'`;
            // Get low stock products using raw query
            const lowStockProducts = await prisma.$queryRaw `
        SELECT * FROM "products" 
        WHERE "storeId" = ${storeId} 
        AND "stock" <= "lowStockThreshold"
      `;
            const recentOrders = await prisma.order.findMany({
                where: {
                    storeId: storeId
                },
                orderBy: {
                    createdAt: 'desc'
                },
                take: 10
            });
            // Get top selling products by total quantity sold
            const topSellingProducts = await prisma.$queryRaw `
        SELECT 
          p.*,
          SUM(oi."quantity") as "totalQuantitySold"
        FROM "products" p
        JOIN "order_items" oi ON p."id" = oi."productId"
        JOIN "orders" o ON oi."orderId" = o."id"
        WHERE p."storeId" = ${storeId} AND o."status" = 'completed'
        GROUP BY p."id"
        ORDER BY "totalQuantitySold" DESC
        LIMIT 10
      `;
            // Get sales data by month for the last 12 months
            const salesByMonth = await prisma.$queryRaw `
        SELECT 
          DATE_TRUNC('month', "createdAt") as month,
          SUM("total") as "totalSales",
          COUNT(*) as "orderCount"
        FROM "orders"
        WHERE "storeId" = ${storeId} 
          AND "status" = 'completed'
          AND "createdAt" >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months'
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY month
      `;
            // Get product sales distribution
            const productSalesDistribution = await prisma.$queryRaw `
        SELECT 
          p."name",
          SUM(oi."quantity") as "totalQuantitySold",
          SUM(oi."totalPrice") as "totalRevenue"
        FROM "products" p
        JOIN "order_items" oi ON p."id" = oi."productId"
        JOIN "orders" o ON oi."orderId" = o."id"
        WHERE p."storeId" = ${storeId} AND o."status" = 'completed'
        GROUP BY p."id", p."name"
        ORDER BY "totalQuantitySold" DESC
        LIMIT 10
      `;
            // Get top categories by sales
            const categorySales = await prisma.$queryRaw `
        SELECT 
          p."category",
          SUM(oi."quantity") as "totalQuantitySold",
          SUM(oi."totalPrice") as "totalRevenue",
          COUNT(DISTINCT o."id") as "orderCount"
        FROM "products" p
        JOIN "order_items" oi ON p."id" = oi."productId"
        JOIN "orders" o ON oi."orderId" = o."id"
        WHERE p."storeId" = ${storeId} AND o."status" = 'completed'
        GROUP BY p."category"
        ORDER BY "totalRevenue" DESC
        LIMIT 5
      `;
            // Get top category
            const topCategory = categorySales.length > 0 ? categorySales[0].category : '';
            return {
                success: true,
                data: {
                    totalRevenue: parseFloat(totalRevenueResult[0]?.sum) || 0,
                    totalOrders: parseInt(totalOrdersResult[0]?.count) || 0,
                    lowStockProducts,
                    recentOrders,
                    topSellingProducts,
                    salesByMonth,
                    productSalesDistribution,
                    categorySales,
                    topCategory,
                }
            };
        }
        catch (error) {
            fastify.log.error('Failed to fetch dashboard analytics:', error);
            reply.status(500).send({
                success: false,
                error: 'Failed to fetch dashboard analytics',
                details: error.message || 'Unknown error'
            });
        }
    });
}
//# sourceMappingURL=index.js.map
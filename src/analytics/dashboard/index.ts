import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import prisma, { withRetry } from '../../lib/prisma';
import { authenticateStoreUserCrossDomain } from '../../middleware/cross-domain-auth.middleware';
import { TokenService } from '../../services/token.service';
import { JwtPayload } from '../../services/token.service';

export default async function dashboardRoutes(fastify: FastifyInstance) {
  const tokenService = new TokenService(fastify);

  // GET /analytics/dashboard - Get dashboard analytics
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    // Authenticate first
    await authenticateStoreUserCrossDomain(request, reply, tokenService);
    if (reply.sent) return; // If authentication failed, response already sent

    try {
      const user = request.user as JwtPayload;
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
      const totalRevenueResult = await withRetry<any[]>(() => prisma.$queryRaw`SELECT SUM(total) as sum FROM "orders" WHERE "storeId" = ${storeId} AND "status" = 'completed'`);
      const totalOrdersResult = await withRetry<any[]>(() => prisma.$queryRaw`SELECT COUNT(*) as count FROM "orders" WHERE "storeId" = ${storeId} AND "status" = 'completed'`);

      // Get low stock products using raw query
      const lowStockProducts = await withRetry<any[]>(() => prisma.$queryRaw`
        SELECT * FROM "products"
        WHERE "storeId" = ${storeId}
        AND "stock" <= "lowStockThreshold"
      `);

      const recentOrders = await withRetry(() => prisma.order.findMany({
        where: {
          storeId: storeId
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 10
      }));

      // Get top selling products by total quantity sold
      const topSellingProducts = await withRetry<any[]>(() => prisma.$queryRaw`
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
      `);

      // Get sales data by month for the last 12 months
      const salesByMonth = await withRetry<any[]>(() => prisma.$queryRaw`
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
      `);

      // Get product sales distribution
      const productSalesDistribution = await withRetry<any[]>(() => prisma.$queryRaw`
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
      `);

      // Get top categories by sales
      const categorySales = await withRetry<any[]>(() => prisma.$queryRaw`
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
      `);

      // Get top category
      const topCategory = categorySales.length > 0 ? categorySales[0].category : '';

      // Convert BigInt values to numbers for JSON serialization
      const safeSalesByMonth = salesByMonth.map((item: any) => ({
        month: item.month,
        totalSales: parseFloat(item.totalsales || item.totalSales) || 0,
        orderCount: parseInt(item.ordercount || item.orderCount) || 0
      }));

      const safeProductSales = productSalesDistribution.map((item: any) => ({
        name: item.name,
        totalQuantitySold: parseInt(item.totalquantitysold || item.totalQuantitySold) || 0,
        totalRevenue: parseFloat(item.totalrevenue || item.totalRevenue) || 0
      }));

      const safeCategorySales = categorySales.map((item: any) => ({
        category: item.category,
        totalQuantitySold: parseInt(item.totalquantitysold || item.totalQuantitySold) || 0,
        totalRevenue: parseFloat(item.totalrevenue || item.totalRevenue) || 0,
        orderCount: parseInt(item.ordercount || item.orderCount) || 0
      }));

      const safeTopSellingProducts = topSellingProducts.map((item: any) => ({
        ...item,
        totalQuantitySold: parseInt(item.totalquantitysold || item.totalQuantitySold) || 0
      }));

      return {
        success: true,
        data: {
          totalRevenue: parseFloat(totalRevenueResult[0]?.sum) || 0,
          totalOrders: parseInt(totalOrdersResult[0]?.count) || 0,
          lowStockProducts,
          recentOrders,
          topSellingProducts: safeTopSellingProducts,
          salesByMonth: safeSalesByMonth,
          productSalesDistribution: safeProductSales,
          categorySales: safeCategorySales,
          topCategory,
        }
      };
    } catch (error: any) {
      fastify.log.error('Failed to fetch dashboard analytics:', error);
      reply.status(500).send({ 
        success: false, 
        error: 'Failed to fetch dashboard analytics', 
        details: error.message || 'Unknown error' 
      });
    }
  });
}

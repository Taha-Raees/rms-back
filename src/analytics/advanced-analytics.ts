import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { authenticateStoreUserCrossDomain } from '../middleware/cross-domain-auth.middleware';
import { TokenService } from '../services/token.service';
import { JwtPayload } from '../services/token.service';

const prisma = new PrismaClient();

export default async function advancedAnalyticsRoutes(fastify: FastifyInstance) {
  const tokenService = new TokenService(fastify);

  // GET /analytics/advanced/financial - Comprehensive financial analytics
  fastify.get('/financial', async (request: FastifyRequest, reply: FastifyReply) => {
    await authenticateStoreUserCrossDomain(request, reply, tokenService);
    if (reply.sent) return;

    try {
      const user = request.user as JwtPayload;
      const storeId = user.storeId;

      if (!storeId) {
        return reply.status(400).send({ success: false, error: 'No store associated with this user' });
      }

      // Financial summary - calculate total revenue and costs correctly
      const totalRevenue = await prisma.$queryRaw`SELECT SUM(total) as sum FROM "orders" WHERE "storeId" = ${storeId} AND "status" = 'completed'` as any;

      // Calculate total cost properly - each item should be cost per unit * quantity
      const totalCost = await prisma.$queryRaw`
        SELECT COALESCE(SUM(
          CASE
            WHEN oi."variantId" IS NOT NULL THEN pv."cost" * oi."quantity"
            ELSE p."baseCost" * oi."quantity"
          END
        ), 0) as sum
        FROM "order_items" oi
        JOIN "orders" o ON oi."orderId" = o."id"
        JOIN "products" p ON oi."productId" = p."id"
        LEFT JOIN "product_variants" pv ON oi."variantId" = pv."id"
        WHERE o."storeId" = ${storeId} AND o."status" = 'completed'
      ` as any;

      // Revenue by payment method
      const revenueByPaymentMethod = await prisma.$queryRaw`
        SELECT
          "paymentMethod",
          SUM("total") as revenue,
          COUNT(*) as transactionCount
        FROM "orders"
        WHERE "storeId" = ${storeId} AND "status" = 'completed'
        GROUP BY "paymentMethod"
        ORDER BY revenue DESC
      ` as any;

      // Monthly P&L
      const monthlyPnL = await prisma.$queryRaw`
        SELECT
          datetime("createdAt", 'start of month') as month,
          SUM("total") as revenue,
          SUM(
            CASE
              WHEN oi."variantId" IS NOT NULL THEN pv."cost" * oi."quantity"
              ELSE p."baseCost" * oi."quantity"
            END
          ) as cost,
          SUM("total") - SUM(
            CASE
              WHEN oi."variantId" IS NOT NULL THEN pv."cost" * oi."quantity"
              ELSE p."baseCost" * oi."quantity"
            END
          ) as profit
        FROM "orders" o
        JOIN "order_items" oi ON o."id" = oi."orderId"
        JOIN "products" p ON oi."productId" = p."id"
        LEFT JOIN "product_variants" pv ON oi."variantId" = pv."id"
        WHERE o."storeId" = ${storeId} AND o."status" = 'completed'
        GROUP BY datetime("createdAt", 'start of month')
        ORDER BY month DESC
        LIMIT 12
      ` as any;

      // Revenue trends with comparisons
      const revenueTrends = await prisma.$queryRaw`
        SELECT
          date("createdAt") as date,
          SUM("total") as revenue,
          COUNT(*) as orders
        FROM "orders"
        WHERE "storeId" = ${storeId}
          AND "status" = 'completed'
          AND "createdAt" >= date('now', '-90 days')
        GROUP BY date("createdAt")
        ORDER BY date
      ` as any;

      return {
        success: true,
        data: {
          summary: {
            totalRevenue: parseFloat(totalRevenue[0]?.sum) || 0,
            totalCost: parseFloat(totalCost[0]?.sum) || 0,
            totalProfit: (parseFloat(totalRevenue[0]?.sum) || 0) - (parseFloat(totalCost[0]?.sum) || 0),
            profitMargin: ((parseFloat(totalRevenue[0]?.sum) || 0) - (parseFloat(totalCost[0]?.sum) || 0)) / (parseFloat(totalRevenue[0]?.sum) || 0) * 100
          },
          revenueByPaymentMethod: revenueByPaymentMethod.map((item: any) => ({
            paymentMethod: item.paymentMethod,
            revenue: parseFloat(item.revenue) || 0,
            transactionCount: parseInt(item.transactionCount) || 0
          })),
          monthlyPnL: monthlyPnL.map((item: any) => ({
            month: item.month,
            revenue: parseFloat(item.revenue) || 0,
            cost: parseFloat(item.cost) || 0,
            profit: parseFloat(item.profit) || 0
          })),
          revenueTrends: revenueTrends.map((item: any) => ({
            date: item.date,
            revenue: parseFloat(item.revenue) || 0,
            orders: parseInt(item.orders) || 0
          }))
        }
      };
    } catch (error: any) {
      fastify.log.error('Failed to fetch financial analytics:', error);
      reply.status(500).send({
        success: false,
        error: 'Failed to fetch financial analytics',
        details: error.message
      });
    }
  });



  // GET /analytics/advanced/product - Product performance analytics
  fastify.get('/product', async (request: FastifyRequest, reply: FastifyReply) => {
    await authenticateStoreUserCrossDomain(request, reply, tokenService);
    if (reply.sent) return;

    try {
      const user = request.user as JwtPayload;
      const storeId = user.storeId;

      if (!storeId) {
        return reply.status(400).send({ success: false, error: 'No store associated with this user' });
      }

      // Product performance by revenue and velocity
      const productPerformance = await prisma.$queryRaw`
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
      ` as any;

      // Inventory turnover analysis
      const inventoryTurnover = await prisma.$queryRaw`
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
        LEFT JOIN "orders" o ON oi."orderId" = o."id" AND o."status" = 'completed' AND o."createdAt" >= date('now', '-30 days')
        WHERE p."storeId" = ${storeId}
        GROUP BY p."id", p."name", p."stock", p."lowStockThreshold"
        ORDER BY turnoverRatio DESC
        LIMIT 50
      ` as any;

      return {
        success: true,
        data: {
          productPerformance: productPerformance.map((item: any) => ({
            id: item.id,
            name: item.name,
            category: item.category,
            totalSold: parseInt(item.totalSold) || 0,
            totalRevenue: parseFloat(item.totalRevenue) || 0,
            totalCost: parseFloat(item.totalCost) || 0,
            totalProfit: parseFloat(item.totalProfit) || 0,
            profitMargin: parseFloat(item.totalProfit) / parseFloat(item.totalRevenue) * 100,
            avgSellingPrice: parseFloat(item.avgSellingPrice) || 0,
            avgCostPrice: parseFloat(item.avgCostPrice) || 0,
            orderCount: parseInt(item.orderCount) || 0,
            firstSold: item.firstSold,
            lastSold: item.lastSold
          })),
          inventoryTurnover: inventoryTurnover.map((item: any) => ({
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
    } catch (error: any) {
      fastify.log.error('Failed to fetch product analytics:', error);
      reply.status(500).send({
        success: false,
        error: 'Failed to fetch product analytics',
        details: error.message
      });
    }
  });

  // GET /analytics/advanced/operational - Operational analytics
  fastify.get('/operational', async (request: FastifyRequest, reply: FastifyReply) => {
    await authenticateStoreUserCrossDomain(request, reply, tokenService);
    if (reply.sent) return;

    try {
      const user = request.user as JwtPayload;
      const storeId = user.storeId;

      if (!storeId) {
        return reply.status(400).send({ success: false, error: 'No store associated with this user' });
      }

      // Hourly sales pattern
      const hourlySales = await prisma.$queryRaw`
        SELECT
          strftime('%H', "createdAt") as hour,
          COUNT(*) as orderCount,
          SUM("total") as totalRevenue,
          AVG("total") as avgOrderValue
        FROM "orders"
        WHERE "storeId" = ${storeId}
          AND "status" = 'completed'
          AND "createdAt" >= date('now', '-30 days')
        GROUP BY strftime('%H', "createdAt")
        ORDER BY hour
      ` as any;

      // Daily sales pattern (by day of week)
      const dailySales = await prisma.$queryRaw`
        SELECT
          CAST(strftime('%w', "createdAt") AS INTEGER) as dayOfWeek,
          CASE CAST(strftime('%w', "createdAt") AS INTEGER)
            WHEN 0 THEN 'Sunday'
            WHEN 1 THEN 'Monday'
            WHEN 2 THEN 'Tuesday'
            WHEN 3 THEN 'Wednesday'
            WHEN 4 THEN 'Thursday'
            WHEN 5 THEN 'Friday'
          AND "createdAt" >= CURRENT_DATE - INTERVAL '90 days'
        GROUP BY EXTRACT(dow from "createdAt"), TO_CHAR("createdAt", 'Day')
        ORDER BY dayOfWeek
      ` as any;

      return {
        success: true,
        data: {
          hourlySales: hourlySales.map((item: any) => ({
            hour: parseInt(item.hour) || 0,
            orderCount: parseInt(item.orderCount) || 0,
            totalRevenue: parseFloat(item.totalRevenue) || 0,
            avgOrderValue: parseFloat(item.avgOrderValue) || 0
          })),
          dailySales: dailySales.map((item: any) => ({
            dayOfWeek: parseInt(item.dayOfWeek) || 0,
            dayName: item.dayName?.trim(),
            orderCount: parseInt(item.orderCount) || 0,
            totalRevenue: parseFloat(item.totalRevenue) || 0,
            avgOrderValue: parseFloat(item.avgOrderValue) || 0
          }))
        }
      };
    } catch (error: any) {
      fastify.log.error('Failed to fetch operational analytics:', error);
      reply.status(500).send({
        success: false,
        error: 'Failed to fetch operational analytics',
        details: error.message
      });
    }
  });
}

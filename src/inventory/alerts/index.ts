import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import prisma, { withRetry } from '../../lib/prisma';
import { JwtPayload } from '../../services/token.service';

export default async function alertsRoutes(fastify: FastifyInstance) {
  // GET /inventory/alerts - Get all low stock alerts for the authenticated user's store
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
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
      if (user.role !== 'OWNER' && user.role !== 'MANAGER') {
        return reply.status(403).send({
          success: false,
          error: 'Insufficient permissions to access inventory alerts'
        });
      }

      const alerts = await withRetry(
        () => prisma.$queryRaw`SELECT * FROM "products" WHERE "storeId" = ${storeId} AND "stock" <= "lowStockThreshold"` as any
      );
      return {
        success: true,
        data: alerts
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({
        success: false,
        error: 'Failed to fetch inventory alerts'
      });
    }
  });
}

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { JwtPayload } from '../../services/token.service';
import stockAdjustmentRoutes from './adjustments';

const prisma = new PrismaClient();

export default async function stockRoutes(fastify: FastifyInstance) {
  // Register adjustment routes
  fastify.register(stockAdjustmentRoutes, { prefix: '/stock' });

  // GET /inventory/stock - Get all stock items for the authenticated user's store
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
      if (user.role !== 'OWNER' && user.role !== 'MANAGER' && user.role !== 'STAFF') {
        return reply.status(403).send({
          success: false,
          error: 'Insufficient permissions to access stock items'
        });
      }

      const stock = await prisma.$queryRaw`SELECT * FROM "products" WHERE "storeId" = ${storeId}` as any;
      return {
        success: true,
        data: stock
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({
        success: false,
        error: 'Failed to fetch stock items'
      });
    }
  });

  // PUT /inventory/stock/[id] - Update stock item
  fastify.put('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.user as JwtPayload;
      const storeId = user.storeId;
      const { id } = request.params as { id: string };
      const { stock } = request.body as { stock: number };
      
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
          error: 'Insufficient permissions to update stock items'
        });
      }

      // Verify the product belongs to the user's store
      const product = await prisma.product.findUnique({
        where: { id },
        select: { storeId: true }
      });

      if (!product) {
        return reply.status(404).send({
          success: false,
          error: 'Product not found'
        });
      }

      if (product.storeId !== storeId) {
        return reply.status(403).send({
          success: false,
          error: 'Access denied. Product does not belong to your store.'
        });
      }

      const updatedStock = await prisma.$queryRaw`UPDATE "products" SET "stock" = ${stock} WHERE "id" = ${id} RETURNING *` as any;
      return {
        success: true,
        data: updatedStock,
        message: 'Stock updated successfully'
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({
        success: false,
        error: 'Failed to update stock item'
      });
    }
  });
}

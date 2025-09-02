import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { authenticateStoreUserCrossDomain } from '../middleware/cross-domain-auth.middleware';
import { TokenService } from '../services/token.service';
import { JwtPayload } from '../services/token.service';

const prisma = new PrismaClient();

export default async function ordersRoutes(fastify: FastifyInstance) {
  const tokenService = new TokenService(fastify);

  // Helper function to get user from request
  const getUserFromRequest = (request: FastifyRequest): JwtPayload => {
    return request.user as JwtPayload;
  };
  // GET /orders - Get all orders for the authenticated user's store
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    // Authenticate first
    await authenticateStoreUserCrossDomain(request, reply, tokenService);
    if (reply.sent) return; // If authentication failed, response already sent

    try {
      const user = getUserFromRequest(request);
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
          error: 'Insufficient permissions to access orders'
        });
      }

      const orders = await prisma.$queryRaw`SELECT * FROM "orders" WHERE "storeId" = ${storeId} ORDER BY "createdAt" DESC` as any;
      return {
        success: true,
        data: orders
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({
        success: false,
        error: 'Failed to fetch orders'
      });
    }
  });

  // GET /orders/[id] - Get an order by ID
  fastify.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    // Authenticate first
    await authenticateStoreUserCrossDomain(request, reply, tokenService);
    if (reply.sent) return; // If authentication failed, response already sent

    try {
      const user = getUserFromRequest(request);
      const storeId = user.storeId;
      const { id } = request.params as { id: string };
      
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
          error: 'Insufficient permissions to access orders'
        });
      }

      const order = await prisma.$queryRaw`SELECT * FROM "orders" WHERE "id" = ${id}` as any;
      if (!order || order.length === 0) {
        return reply.status(404).send({
          success: false,
          error: 'Order not found'
        });
      }

      // Verify the order belongs to the user's store
      if (order[0].storeId !== storeId) {
        return reply.status(403).send({
          success: false,
          error: 'Access denied. Order does not belong to your store.'
        });
      }

      return {
        success: true,
        data: order[0]
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({
        success: false,
        error: 'Failed to fetch order'
      });
    }
  });

  // POST /orders - Create a new order
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    // Authenticate first
    await authenticateStoreUserCrossDomain(request, reply, tokenService);
    if (reply.sent) return; // If authentication failed, response already sent

    try {
      const user = getUserFromRequest(request);
      const storeId = user.storeId;
      const { orderNo, status, subtotal, tax, total, items } = request.body as any;
      
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
          error: 'Insufficient permissions to create orders'
        });
      }

      const newOrder = await prisma.$queryRaw`INSERT INTO "orders" (orderNo, status, subtotal, tax, total, storeId) VALUES (${orderNo}, ${status}, ${subtotal}, ${tax}, ${total}, ${storeId}) RETURNING *` as any;
      
      for (const item of items) {
        await prisma.$queryRaw`INSERT INTO "order_items" (orderId, productId, variantId, quantity, unitPrice, totalPrice) VALUES (${newOrder[0].id}, ${item.productId}, ${item.variantId}, ${item.quantity}, ${item.unitPrice}, ${item.totalPrice})` as any;
      }

      return {
        success: true,
        data: newOrder[0],
        message: 'Order created successfully'
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({
        success: false,
        error: 'Failed to create order'
      });
    }
  });

  // PUT /orders/[id] - Update an order
  fastify.put('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    // Authenticate first
    await authenticateStoreUserCrossDomain(request, reply, tokenService);
    if (reply.sent) return; // If authentication failed, response already sent

    try {
      const user = getUserFromRequest(request);
      const storeId = user.storeId;
      const { id } = request.params as { id: string };
      const { status } = request.body as { status: string };
      
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
          error: 'Insufficient permissions to update orders'
        });
      }

      // Verify the order belongs to the user's store
      const order = await prisma.order.findUnique({
        where: { id },
        select: { storeId: true }
      });

      if (!order) {
        return reply.status(404).send({
          success: false,
          error: 'Order not found'
        });
      }

      if (order.storeId !== storeId) {
        return reply.status(403).send({
          success: false,
          error: 'Access denied. Order does not belong to your store.'
        });
      }

      const updatedOrder = await prisma.$queryRaw`UPDATE "orders" SET status = ${status} WHERE id = ${id} RETURNING *` as any;
      return {
        success: true,
        data: updatedOrder[0],
        message: 'Order updated successfully'
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({
        success: false,
        error: 'Failed to update order'
      });
    }
  });
}

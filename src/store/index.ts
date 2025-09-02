import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { authenticateStoreUser } from '../middleware/auth.middleware';
import { TokenService } from '../services/token.service';
import { JwtPayload } from '../services/token.service';

const prisma = new PrismaClient();

export default async function storeRoutes(fastify: FastifyInstance) {
  const tokenService = new TokenService(fastify);

  // Helper function to get user from request
  const getUserFromRequest = (request: FastifyRequest): JwtPayload => {
    return request.user as JwtPayload;
  };

  // GET /store/:id - Get store details (owner or store manager)
  fastify.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    // Authenticate first
    await authenticateStoreUser(request, reply, tokenService);
    if (reply.sent) return; // If authentication failed, response already sent

    const { id } = request.params as { id: string };
    const user = getUserFromRequest(request);
    
    try {
      // Check if user has access to this store
      if (user.storeId !== id) {
        return reply.status(403).send({
          success: false,
          error: 'Access denied. You do not have permission to view this store.'
        });
      }
      
      const store = await prisma.store.findUnique({
        where: { id },
      });
      
      if (!store) {
        return reply.status(404).send({ success: false, error: 'Store not found' });
      }
      
      return { success: true, data: store };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ success: false, error: 'Failed to fetch store data' });
    }
  });
  
  // GET /store - Get current user's store
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    // Authenticate first
    await authenticateStoreUser(request, reply, tokenService);
    if (reply.sent) return; // If authentication failed, response already sent

    const user = getUserFromRequest(request);
    
    try {
      const storeId = user.storeId;
      
      if (!storeId) {
        return reply.status(400).send({ success: false, error: 'No store associated with this user' });
      }
      
      // Check if user has access to this store
      if (user.role !== 'OWNER' && user.role !== 'MANAGER') {
        return reply.status(403).send({
          success: false,
          error: 'Access denied. You do not have permission to view store data.'
        });
      }
      
      const store = await prisma.store.findUnique({
        where: { id: storeId },
      });
      
      if (!store) {
        return reply.status(404).send({ success: false, error: 'Store not found' });
      }
      
      return { success: true, data: store };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ success: false, error: 'Failed to fetch store data' });
    }
  });
  
  // PUT /store - Update current user's store settings
  fastify.put('/', async (request: FastifyRequest, reply: FastifyReply) => {
    // Authenticate first
    await authenticateStoreUser(request, reply, tokenService);
    if (reply.sent) return; // If authentication failed, response already sent

    const user = getUserFromRequest(request);
    const updateData = request.body as any;
    
    try {
      const storeId = user.storeId;
      
      if (!storeId) {
        return reply.status(400).send({ success: false, error: 'No store associated with this user' });
      }
      
      // Only OWNER can update store settings
      if (user.role !== 'OWNER') {
        return reply.status(403).send({
          success: false,
          error: 'Access denied. Only store owners can update store settings.'
        });
      }
      
      // Prepare update data, only allow specific fields
      const allowedFields = [
        'name', 'businessType', 'currency', 'currencySymbol', 
        'settings', 'subscriptionPaymentMethod', 'phone', 'email',
        'street', 'city', 'state', 'postalCode', 'country'
      ];
      
      const dataToUpdate: any = {};
      
      // Add allowed fields to update data
      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          if (field === 'settings' && typeof updateData[field] === 'object') {
            // Merge settings instead of replacing
            const currentStore = await prisma.store.findUnique({
              where: { id: storeId },
              select: { settings: true }
            });
            
            dataToUpdate[field] = {
              ...(currentStore?.settings as object || {}),
              ...updateData[field]
            };
          } else {
            dataToUpdate[field] = updateData[field];
          }
        }
      }
      
      // Update store
      const updatedStore = await prisma.store.update({
        where: { id: storeId },
        data: dataToUpdate
      });
      
      return { success: true, data: updatedStore, message: 'Store settings updated successfully' };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ success: false, error: 'Failed to update store settings' });
    }
  });
  
}

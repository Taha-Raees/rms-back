import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import alerts from './alerts';
import stock from './stock';
import { authenticateStoreUser } from '../middleware/auth.middleware';
import { TokenService } from '../services/token.service';

export default async function inventoryRoutes(fastify: FastifyInstance) {
  const tokenService = new TokenService(fastify);
  
  // Add authentication hook for all inventory routes
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    await authenticateStoreUser(request, reply, tokenService);
  });
  
  fastify.register(alerts, { prefix: '/alerts' });
  fastify.register(stock, { prefix: '/stock' });
}

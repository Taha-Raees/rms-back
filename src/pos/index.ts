import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import calculateRoutes from './calculate';
import checkoutRoutes from './checkout';
import { authenticateStoreUser } from '../middleware/auth.middleware';
import { TokenService } from '../services/token.service';

export default async function posRoutes(fastify: FastifyInstance) {
  const tokenService = new TokenService(fastify);
  
  // Add authentication hook for all POS routes
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    await authenticateStoreUser(request, reply, tokenService);
  });
  
  fastify.register(calculateRoutes, { prefix: '/calculate' });
  fastify.register(checkoutRoutes, { prefix: '/checkout' });
}

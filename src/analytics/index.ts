import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import dashboard from './dashboard';
import { authenticateStoreUser } from '../middleware/auth.middleware';
import { TokenService } from '../services/token.service';

export default async function analyticsRoutes(fastify: FastifyInstance) {
  const tokenService = new TokenService(fastify);
  
  // Add authentication hook for all analytics routes
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    await authenticateStoreUser(request, reply, tokenService);
  });
  
  fastify.register(dashboard, { prefix: '/dashboard' });
}

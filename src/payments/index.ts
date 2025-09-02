import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import process from './process';
import { authenticateStoreUser } from '../middleware/auth.middleware';
import { TokenService } from '../services/token.service';

export default async function paymentsRoutes(fastify: FastifyInstance) {
  const tokenService = new TokenService(fastify);
  
  // Add authentication hook for all payments routes
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    await authenticateStoreUser(request, reply, tokenService);
  });
  
  fastify.register(process, { prefix: '/process' });
}

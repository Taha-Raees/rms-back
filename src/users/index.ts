import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { authenticateStoreUser } from '../middleware/auth.middleware';
import { TokenService } from '../services/token.service';
import { JwtPayload } from '../services/token.service';

const prisma = new PrismaClient();

export default async function userRoutes(fastify: FastifyInstance) {
  const tokenService = new TokenService(fastify);

  // Helper function to get user from request
  const getUserFromRequest = (request: FastifyRequest): JwtPayload => {
    return request.user as JwtPayload;
  };

  // GET /users - Get all users in the store (owner, manager, staff)
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    // Authenticate first
    await authenticateStoreUser(request, reply, tokenService);
    if (reply.sent) return; // If authentication failed, response already sent

    const user = getUserFromRequest(request);
    
    try {
      // Check if user has access to this store
      if (!user.storeId) {
        return reply.status(400).send({ success: false, error: 'No store associated with this user' });
      }
      
      // Only OWNER and MANAGER can view users
      if (user.role !== 'OWNER' && user.role !== 'MANAGER') {
        return reply.status(403).send({
          success: false,
          error: 'Access denied. Only owners and managers can view users.'
        });
      }
      
      const users = await prisma.user.findMany({
        where: {
          storeId: user.storeId
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          lastLogin: true
        }
      });
      
      return { success: true, data: users };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ success: false, error: 'Failed to fetch users' });
    }
  });

  // POST /users - Create a new user (manager or staff) in the store
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    // Authenticate first
    await authenticateStoreUser(request, reply, tokenService);
    if (reply.sent) return; // If authentication failed, response already sent

    const user = getUserFromRequest(request);
    const { email, name, role, password } = request.body as { email: string; name: string; role: string; password: string };
    
    try {
      // Check if user has access to this store
      if (!user.storeId) {
        return reply.status(400).send({ success: false, error: 'No store associated with this user' });
      }
      
      // Only OWNER can create new users
      if (user.role !== 'OWNER') {
        return reply.status(403).send({
          success: false,
          error: 'Access denied. Only owners can create new users.'
        });
      }
      
      // Validate role (only MANAGER or STAFF allowed)
      if (role !== 'MANAGER' && role !== 'STAFF') {
        return reply.status(400).send({
          success: false,
          error: 'Invalid role. Only MANAGER or STAFF roles can be assigned.'
        });
      }
      
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });
      
      if (existingUser) {
        return reply.status(409).send({
          success: false,
          error: 'User with this email already exists.'
        });
      }
      
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 12);
      
      // Create new user
      const newUser = await prisma.user.create({
        data: {
          email,
          name,
          role,
          password: hashedPassword,
          storeId: user.storeId
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true
        }
      });
      
      return { success: true, data: newUser, message: 'User created successfully' };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ success: false, error: 'Failed to create user' });
    }
  });

  // PUT /users/:id - Update a user
  fastify.put('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    // Authenticate first
    await authenticateStoreUser(request, reply, tokenService);
    if (reply.sent) return; // If authentication failed, response already sent

    const user = getUserFromRequest(request);
    const { id } = request.params as { id: string };
    const { email, name, role, password } = request.body as { email?: string; name?: string; role?: string; password?: string };
    
    try {
      // Check if user has access to this store
      if (!user.storeId) {
        return reply.status(400).send({ success: false, error: 'No store associated with this user' });
      }
      
      // Only OWNER can update users
      if (user.role !== 'OWNER') {
        return reply.status(403).send({
          success: false,
          error: 'Access denied. Only owners can update users.'
        });
      }
      
      // Validate role if provided (only MANAGER or STAFF allowed)
      if (role && role !== 'MANAGER' && role !== 'STAFF') {
        return reply.status(400).send({
          success: false,
          error: 'Invalid role. Only MANAGER or STAFF roles can be assigned.'
        });
      }
      
      // Check if user exists and belongs to the same store
      const existingUser = await prisma.user.findUnique({
        where: { id }
      });
      
      if (!existingUser) {
        return reply.status(404).send({
          success: false,
          error: 'User not found.'
        });
      }
      
      if (existingUser.storeId !== user.storeId) {
        return reply.status(403).send({
          success: false,
          error: 'Access denied. User does not belong to your store.'
        });
      }
      
      // Prepare update data
      const updateData: any = {};
      if (email) updateData.email = email;
      if (name) updateData.name = name;
      if (role) updateData.role = role;
      if (password) {
        updateData.password = await bcrypt.hash(password, 12);
      }
      
      // Update user
      const updatedUser = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          updatedAt: true
        }
      });
      
      return { success: true, data: updatedUser, message: 'User updated successfully' };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ success: false, error: 'Failed to update user' });
    }
  });

  // DELETE /users/:id - Delete a user
  fastify.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    // Authenticate first
    await authenticateStoreUser(request, reply, tokenService);
    if (reply.sent) return; // If authentication failed, response already sent

    const user = getUserFromRequest(request);
    const { id } = request.params as { id: string };
    
    try {
      // Check if user has access to this store
      if (!user.storeId) {
        return reply.status(400).send({ success: false, error: 'No store associated with this user' });
      }
      
      // Only OWNER can delete users
      if (user.role !== 'OWNER') {
        return reply.status(403).send({
          success: false,
          error: 'Access denied. Only owners can delete users.'
        });
      }
      
      // Check if user exists and belongs to the same store
      const existingUser = await prisma.user.findUnique({
        where: { id }
      });
      
      if (!existingUser) {
        return reply.status(404).send({
          success: false,
          error: 'User not found.'
        });
      }
      
      if (existingUser.storeId !== user.storeId) {
        return reply.status(403).send({
          success: false,
          error: 'Access denied. User does not belong to your store.'
        });
      }
      
      // Prevent owner from deleting themselves
      if (existingUser.id === user.id) {
        return reply.status(400).send({
          success: false,
          error: 'You cannot delete yourself.'
        });
      }
      
      // Delete user
      await prisma.user.delete({
        where: { id }
      });
      
      return { success: true, message: 'User deleted successfully' };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ success: false, error: 'Failed to delete user' });
    }
  });
}
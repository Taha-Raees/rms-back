import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { TokenService } from '../services/token.service';
import { loginRateLimiter, refreshRateLimiter } from '../middleware/rate-limiter';

const prisma = new PrismaClient();

interface LoginRequest {
  email: string;
  password: string;
}

export default async function authRoutes(fastify: FastifyInstance) {
  const tokenService = new TokenService(fastify);

  fastify.post('/login', { 
    preHandler: [loginRateLimiter]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { email, password } = request.body as LoginRequest;
      const ipAddress = request.ip;
      const userAgent = request.headers['user-agent'];

      if (!email || !password) {
        return reply.status(400).send({
          success: false,
          error: 'Email and password are required',
        });
      }

      // Validate credentials
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          store: true,
        },
      });

      if (!user) {
        return reply.status(401).send({
          success: false,
          error: 'Invalid email or password',
        });
      }

      // Compare hashed password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return reply.status(401).send({
          success: false,
          error: 'Invalid email or password',
        });
      }

      if (!user.store) {
        return reply.status(404).send({
          success: false,
          error: 'Store not found',
        });
      }

      // Generate JWT tokens
      const payload = {
        id: user.id,
        email: user.email,
        role: user.role,
        storeId: user.storeId || undefined
      };

      const accessToken = await tokenService.generateAccessToken(payload);
      const refreshToken = await tokenService.generateRefreshToken(user.id, ipAddress, userAgent);

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });

      // Create response with secure cookies
      const isProduction = process.env.NODE_ENV === 'production';
      
      reply.setCookie('store-token', accessToken, {
        path: '/',
        domain: isProduction ? undefined : 'localhost',
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 15 * 60, // 15 minutes for access token
      });

      reply.setCookie('store-refresh-token', refreshToken, {
        path: '/',
        domain: isProduction ? undefined : 'localhost',
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 days for refresh token
      });

      return reply.status(200).send({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            storeId: user.storeId,
          },
          store: user.store ? {
            id: user.store.id,
            name: user.store.name,
            businessType: user.store.businessType || 'GENERAL',
            settings: user.store.settings || {},
          } : null,
          accessToken,
          refreshToken
        },
        message: 'Login successful',
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  fastify.get('/me', async (request: FastifyRequest, reply: FastifyReply) => {
    // Use the new authentication middleware
    const tokenService = new TokenService(fastify);
    await tokenService.verifyAccessToken(request.cookies['store-token'] || '');
    
    const authHeader = request.headers.authorization;
    let token: string | undefined;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (request.cookies && request.cookies['store-token']) {
      token = request.cookies['store-token'];
    }

    if (!token) {
      return reply.status(401).send({
        success: false,
        error: 'Unauthorized',
      });
    }

    const decoded = await tokenService.verifyAccessToken(token);
    if (!decoded) {
      return reply.status(401).send({
        success: false,
        error: 'Unauthorized',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        role: true,
        storeId: true,
        lastLogin: true,
      },
    });

    if (!user) {
      return reply.status(401).send({
        success: false,
        error: 'Unauthorized',
      });
    }

    return reply.status(200).send({
      success: true,
      data: user,
    });
  });

  fastify.post('/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    const tokenService = new TokenService(fastify);
    
    // Get tokens from cookies
    const accessToken = request.cookies['store-token'];
    const refreshToken = request.cookies['store-refresh-token'];

    // Blacklist access token if it exists
    if (accessToken) {
      const decoded = await tokenService.verifyAccessToken(accessToken);
      if (decoded) {
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 15); // Token expires in 15 minutes anyway
        await tokenService.blacklistToken(accessToken, expiresAt);
      }
    }

    // Revoke refresh token if it exists
    if (refreshToken) {
      await tokenService.revokeRefreshToken(refreshToken);
    }

    // Clear cookies
    const isProduction = process.env.NODE_ENV === 'production';
    reply.clearCookie('store-token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
    });
    
    reply.clearCookie('store-refresh-token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
    });

    return reply.status(200).send({
      success: true,
      message: 'Logout successful',
    });
  });

  // Refresh token endpoint
  fastify.post('/refresh', { 
    preHandler: [refreshRateLimiter]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tokenService = new TokenService(fastify);
    const refreshToken = request.cookies['store-refresh-token'];
    const ipAddress = request.ip;
    const userAgent = request.headers['user-agent'];

    if (!refreshToken) {
      return reply.status(401).send({
        success: false,
        error: 'Refresh token required',
      });
    }

    const result = await tokenService.rotateRefreshToken(refreshToken, ipAddress, userAgent);
    if (!result) {
      // Clear cookies if refresh token is invalid
      const isProduction = process.env.NODE_ENV === 'production';
      reply.clearCookie('store-token', {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
      });
      reply.clearCookie('store-refresh-token', {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
      });
      
      return reply.status(401).send({
        success: false,
        error: 'Invalid refresh token',
      });
    }

    // Set new tokens in cookies
    const isProduction = process.env.NODE_ENV === 'production';
    
    reply.setCookie('store-token', result.accessToken, {
      path: '/',
      domain: isProduction ? undefined : 'localhost',
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 15 * 60, // 15 minutes
    });

    reply.setCookie('store-refresh-token', result.refreshToken, {
      path: '/',
      domain: isProduction ? undefined : 'localhost',
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return reply.status(200).send({
      success: true,
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken
      },
      message: 'Token refreshed successfully',
    });
  });
}

import { FastifyRequest, FastifyReply } from 'fastify';
import { TokenService, JwtPayload } from '../services/token.service';

export interface AuthenticatedRequest extends FastifyRequest {
  user: JwtPayload;
}

/**
 * Authentication middleware optimized for cross-domain requests
 * Prioritizes Authorization header over cookies for better cross-domain support
 */
export async function authenticateCrossDomain(request: FastifyRequest, reply: FastifyReply, tokenService: TokenService) {
  try {
    let token: string | undefined;

    // First check for Authorization header (preferred for cross-domain)
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Remove 'Bearer ' prefix
    }

    // Fallback to cookie for same-domain or legacy support
    if (!token && request.cookies && request.cookies['store-token']) {
      token = request.cookies['store-token'];
    }

    if (!token) {
      return reply.status(401).send({
        success: false,
        error: 'Missing authentication token'
      });
    }

    // Verify the JWT token
    const decoded = await tokenService.verifyAccessToken(token);
    if (!decoded) {
      return reply.status(401).send({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // Add user info to request
    request.user = decoded;
  } catch (error) {
    return reply.status(401).send({
      success: false,
      error: 'Authentication failed'
    });
  }
}

/**
 * Authentication middleware for store users with cross-domain support
 */
export async function authenticateStoreUserCrossDomain(request: FastifyRequest, reply: FastifyReply, tokenService: TokenService) {
  try {
    let token: string | undefined;

    // First check for Authorization header (preferred for cross-domain)
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Remove 'Bearer ' prefix
    }

    // Fallback to cookie for same-domain or legacy support
    if (!token && request.cookies && request.cookies['store-token']) {
      token = request.cookies['store-token'];
    }

    if (!token) {
      return reply.status(401).send({
        success: false,
        error: 'Missing authentication token'
      });
    }

    // Verify the JWT token
    const decoded = await tokenService.verifyAccessToken(token);
    if (!decoded) {
      return reply.status(401).send({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // Check if user has store access
    if (!decoded.storeId) {
      return reply.status(403).send({
        success: false,
        error: 'Store access required'
      });
    }

    // Add user info to request
    request.user = decoded;
  } catch (error) {
    return reply.status(401).send({
      success: false,
      error: 'Authentication failed'
    });
  }
}
import { FastifyRequest, FastifyReply } from 'fastify';
import { TokenService, JwtPayload } from '../services/token.service';
export interface AuthenticatedRequest extends FastifyRequest {
    user: JwtPayload;
}
/**
 * Authentication middleware optimized for cross-domain requests
 * Prioritizes Authorization header over cookies for better cross-domain support
 */
export declare function authenticateCrossDomain(request: FastifyRequest, reply: FastifyReply, tokenService: TokenService): Promise<undefined>;
/**
 * Authentication middleware for store users with cross-domain support
 */
export declare function authenticateStoreUserCrossDomain(request: FastifyRequest, reply: FastifyReply, tokenService: TokenService): Promise<undefined>;
//# sourceMappingURL=cross-domain-auth.middleware.d.ts.map
import { FastifyRequest, FastifyReply } from 'fastify';
import { TokenService, JwtPayload } from '../services/token.service';
export interface AuthenticatedRequest extends FastifyRequest {
    user: JwtPayload;
}
export declare function authenticateUser(request: FastifyRequest, reply: FastifyReply, tokenService: TokenService): Promise<undefined>;
export declare function authenticateStoreUser(request: FastifyRequest, reply: FastifyReply, tokenService: TokenService): Promise<undefined>;
//# sourceMappingURL=auth.middleware.d.ts.map
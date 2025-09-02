import { FastifyRequest, FastifyReply } from 'fastify';
interface RateLimitConfig {
    maxRequests: number;
    windowMs: number;
    keyPrefix?: string;
}
export declare function rateLimit(request: FastifyRequest, reply: FastifyReply, config: RateLimitConfig): Promise<undefined>;
export declare const authRateLimiter: (request: FastifyRequest, reply: FastifyReply) => Promise<undefined>;
export declare const loginRateLimiter: (request: FastifyRequest, reply: FastifyReply) => Promise<undefined>;
export declare const refreshRateLimiter: (request: FastifyRequest, reply: FastifyReply) => Promise<undefined>;
export {};
//# sourceMappingURL=rate-limiter.d.ts.map
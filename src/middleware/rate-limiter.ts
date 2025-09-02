import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyPrefix?: string;
}

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export async function rateLimit(request: FastifyRequest, reply: FastifyReply, config: RateLimitConfig) {
  const ip = request.ip;
  const key = `${config.keyPrefix || 'rate-limit'}:${ip}`;
  const now = Date.now();
  
  const rateLimitData = rateLimitStore.get(key);
  
  if (!rateLimitData || rateLimitData.resetTime < now) {
    // Reset the counter
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs
    });
    return;
  }
  
  if (rateLimitData.count >= config.maxRequests) {
    // Rate limit exceeded
    return reply.status(429).send({
      success: false,
      error: 'Too many requests, please try again later.'
    });
  }
  
  // Increment the counter
  rateLimitStore.set(key, {
    count: rateLimitData.count + 1,
    resetTime: rateLimitData.resetTime
  });
}

// Pre-configured rate limiters
export const authRateLimiter = (request: FastifyRequest, reply: FastifyReply) => {
  return rateLimit(request, reply, {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    keyPrefix: 'auth'
  });
};

export const loginRateLimiter = (request: FastifyRequest, reply: FastifyReply) => {
  return rateLimit(request, reply, {
    maxRequests: 10,
    windowMs: 15 * 60 * 1000, // 15 minutes
    keyPrefix: 'login'
  });
};

export const refreshRateLimiter = (request: FastifyRequest, reply: FastifyReply) => {
  return rateLimit(request, reply, {
    maxRequests: 20,
    windowMs: 15 * 60 * 1000, // 15 minutes
    keyPrefix: 'refresh'
  });
};

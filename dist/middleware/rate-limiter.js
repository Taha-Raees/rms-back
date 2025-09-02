"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshRateLimiter = exports.loginRateLimiter = exports.authRateLimiter = void 0;
exports.rateLimit = rateLimit;
const rateLimitStore = new Map();
async function rateLimit(request, reply, config) {
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
const authRateLimiter = (request, reply) => {
    return rateLimit(request, reply, {
        maxRequests: 5,
        windowMs: 15 * 60 * 1000, // 15 minutes
        keyPrefix: 'auth'
    });
};
exports.authRateLimiter = authRateLimiter;
const loginRateLimiter = (request, reply) => {
    return rateLimit(request, reply, {
        maxRequests: 10,
        windowMs: 15 * 60 * 1000, // 15 minutes
        keyPrefix: 'login'
    });
};
exports.loginRateLimiter = loginRateLimiter;
const refreshRateLimiter = (request, reply) => {
    return rateLimit(request, reply, {
        maxRequests: 20,
        windowMs: 15 * 60 * 1000, // 15 minutes
        keyPrefix: 'refresh'
    });
};
exports.refreshRateLimiter = refreshRateLimiter;
//# sourceMappingURL=rate-limiter.js.map
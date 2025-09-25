"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateCrossDomain = authenticateCrossDomain;
exports.authenticateStoreUserCrossDomain = authenticateStoreUserCrossDomain;
/**
 * Authentication middleware optimized for cross-domain requests
 * Prioritizes Authorization header over cookies for better cross-domain support
 */
async function authenticateCrossDomain(request, reply, tokenService) {
    try {
        let token;
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
    }
    catch (error) {
        return reply.status(401).send({
            success: false,
            error: 'Authentication failed'
        });
    }
}
/**
 * Authentication middleware for store users with cross-domain support
 */
async function authenticateStoreUserCrossDomain(request, reply, tokenService) {
    try {
        let token;
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
    }
    catch (error) {
        return reply.status(401).send({
            success: false,
            error: 'Authentication failed'
        });
    }
}
//# sourceMappingURL=cross-domain-auth.middleware.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateUser = authenticateUser;
exports.authenticateStoreUser = authenticateStoreUser;
async function authenticateUser(request, reply, tokenService) {
    try {
        let token;
        // First check for Authorization header (Bearer token)
        const authHeader = request.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7); // Remove 'Bearer ' prefix
        }
        // If no header token, check for cookie
        if (!token && request.cookies && request.cookies['token']) {
            token = request.cookies['token'];
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
            error: 'Invalid or expired token'
        });
    }
}
async function authenticateStoreUser(request, reply, tokenService) {
    try {
        let token;
        // First check for Authorization header (Bearer token)
        const authHeader = request.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7); // Remove 'Bearer ' prefix
        }
        // If no header token, check for cookie
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
            error: 'Invalid or expired token'
        });
    }
}
//# sourceMappingURL=auth.middleware.js.map
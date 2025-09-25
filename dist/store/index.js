"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = storeRoutes;
const prisma_1 = __importStar(require("../lib/prisma"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const token_service_1 = require("../services/token.service");
async function storeRoutes(fastify) {
    const tokenService = new token_service_1.TokenService(fastify);
    // Helper function to get user from request
    const getUserFromRequest = (request) => {
        return request.user;
    };
    // GET /store/:id - Get store details (owner or store manager)
    fastify.get('/:id', async (request, reply) => {
        // Authenticate first
        await (0, auth_middleware_1.authenticateStoreUser)(request, reply, tokenService);
        if (reply.sent)
            return; // If authentication failed, response already sent
        const { id } = request.params;
        const user = getUserFromRequest(request);
        try {
            // Check if user has access to this store
            if (user.storeId !== id) {
                return reply.status(403).send({
                    success: false,
                    error: 'Access denied. You do not have permission to view this store.'
                });
            }
            const store = await (0, prisma_1.withRetry)(() => prisma_1.default.store.findUnique({
                where: { id },
            }));
            if (!store) {
                return reply.status(404).send({ success: false, error: 'Store not found' });
            }
            return { success: true, data: store };
        }
        catch (error) {
            fastify.log.error(error);
            reply.status(500).send({ success: false, error: 'Failed to fetch store data' });
        }
    });
    // GET /store - Get current user's store
    fastify.get('/', async (request, reply) => {
        // Authenticate first
        await (0, auth_middleware_1.authenticateStoreUser)(request, reply, tokenService);
        if (reply.sent)
            return; // If authentication failed, response already sent
        const user = getUserFromRequest(request);
        try {
            const storeId = user.storeId;
            if (!storeId) {
                return reply.status(400).send({ success: false, error: 'No store associated with this user' });
            }
            // Check if user has access to this store
            if (user.role !== 'OWNER' && user.role !== 'MANAGER') {
                return reply.status(403).send({
                    success: false,
                    error: 'Access denied. You do not have permission to view store data.'
                });
            }
            const store = await (0, prisma_1.withRetry)(() => prisma_1.default.store.findUnique({
                where: { id: storeId },
                include: {
                    owner: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                        },
                    },
                },
            }));
            if (!store) {
                return reply.status(404).send({ success: false, error: 'Store not found' });
            }
            return { success: true, data: store };
        }
        catch (error) {
            fastify.log.error(error);
            reply.status(500).send({ success: false, error: 'Failed to fetch store data' });
        }
    });
    // PUT /store - Update current user's store settings
    fastify.put('/', async (request, reply) => {
        // Authenticate first
        await (0, auth_middleware_1.authenticateStoreUser)(request, reply, tokenService);
        if (reply.sent)
            return; // If authentication failed, response already sent
        const user = getUserFromRequest(request);
        const updateData = request.body;
        try {
            const storeId = user.storeId;
            if (!storeId) {
                return reply.status(400).send({ success: false, error: 'No store associated with this user' });
            }
            // Only OWNER can update store settings
            if (user.role !== 'OWNER') {
                return reply.status(403).send({
                    success: false,
                    error: 'Access denied. Only store owners can update store settings.'
                });
            }
            // Prepare update data, only allow specific fields
            const allowedFields = [
                'name', 'businessType', 'currency', 'currencySymbol',
                'settings', 'subscriptionPaymentMethod', 'phone', 'email',
                'street', 'city', 'state', 'postalCode', 'country'
            ];
            const dataToUpdate = {};
            // Add allowed fields to update data
            for (const field of allowedFields) {
                if (updateData[field] !== undefined) {
                    if (field === 'settings' && typeof updateData[field] === 'object') {
                        // Merge settings instead of replacing
                        const currentStore = await (0, prisma_1.withRetry)(() => prisma_1.default.store.findUnique({
                            where: { id: storeId },
                            select: { settings: true }
                        }));
                        dataToUpdate[field] = {
                            ...(currentStore?.settings || {}),
                            ...updateData[field]
                        };
                    }
                    else {
                        dataToUpdate[field] = updateData[field];
                    }
                }
            }
            // Update store
            const updatedStore = await (0, prisma_1.withRetry)(() => prisma_1.default.store.update({
                where: { id: storeId },
                data: dataToUpdate
            }));
            return { success: true, data: updatedStore, message: 'Store settings updated successfully' };
        }
        catch (error) {
            fastify.log.error(error);
            reply.status(500).send({ success: false, error: 'Failed to update store settings' });
        }
    });
}
//# sourceMappingURL=index.js.map
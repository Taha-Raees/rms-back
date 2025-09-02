"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = alertsRoutes;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function alertsRoutes(fastify) {
    // GET /inventory/alerts - Get all low stock alerts for the authenticated user's store
    fastify.get('/', async (request, reply) => {
        try {
            const user = request.user;
            const storeId = user.storeId;
            if (!storeId) {
                return reply.status(400).send({
                    success: false,
                    error: 'No store associated with this user'
                });
            }
            // Check if user has access to this store
            if (user.role !== 'OWNER' && user.role !== 'MANAGER') {
                return reply.status(403).send({
                    success: false,
                    error: 'Insufficient permissions to access inventory alerts'
                });
            }
            const alerts = await prisma.$queryRaw `SELECT * FROM "products" WHERE "storeId" = ${storeId} AND "stock" <= "lowStockThreshold"`;
            return {
                success: true,
                data: alerts
            };
        }
        catch (error) {
            fastify.log.error(error);
            reply.status(500).send({
                success: false,
                error: 'Failed to fetch inventory alerts'
            });
        }
    });
}
//# sourceMappingURL=index.js.map
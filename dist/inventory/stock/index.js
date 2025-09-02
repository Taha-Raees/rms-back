"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = stockRoutes;
const client_1 = require("@prisma/client");
const adjustments_1 = __importDefault(require("./adjustments"));
const prisma = new client_1.PrismaClient();
async function stockRoutes(fastify) {
    // Register adjustment routes
    fastify.register(adjustments_1.default, { prefix: '/stock' });
    // GET /inventory/stock - Get all stock items for the authenticated user's store
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
            if (user.role !== 'OWNER' && user.role !== 'MANAGER' && user.role !== 'STAFF') {
                return reply.status(403).send({
                    success: false,
                    error: 'Insufficient permissions to access stock items'
                });
            }
            const stock = await prisma.$queryRaw `SELECT * FROM "products" WHERE "storeId" = ${storeId}`;
            return {
                success: true,
                data: stock
            };
        }
        catch (error) {
            fastify.log.error(error);
            reply.status(500).send({
                success: false,
                error: 'Failed to fetch stock items'
            });
        }
    });
    // PUT /inventory/stock/[id] - Update stock item
    fastify.put('/:id', async (request, reply) => {
        try {
            const user = request.user;
            const storeId = user.storeId;
            const { id } = request.params;
            const { stock } = request.body;
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
                    error: 'Insufficient permissions to update stock items'
                });
            }
            // Verify the product belongs to the user's store
            const product = await prisma.product.findUnique({
                where: { id },
                select: { storeId: true }
            });
            if (!product) {
                return reply.status(404).send({
                    success: false,
                    error: 'Product not found'
                });
            }
            if (product.storeId !== storeId) {
                return reply.status(403).send({
                    success: false,
                    error: 'Access denied. Product does not belong to your store.'
                });
            }
            const updatedStock = await prisma.$queryRaw `UPDATE "products" SET "stock" = ${stock} WHERE "id" = ${id} RETURNING *`;
            return {
                success: true,
                data: updatedStock,
                message: 'Stock updated successfully'
            };
        }
        catch (error) {
            fastify.log.error(error);
            reply.status(500).send({
                success: false,
                error: 'Failed to update stock item'
            });
        }
    });
}
//# sourceMappingURL=index.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = processRoutes;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function processRoutes(fastify) {
    // POST /payments/process - Process a payment
    fastify.post('/', async (request, reply) => {
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
                    error: 'Insufficient permissions to process payments'
                });
            }
            const { orderId, amount, paymentMethod } = request.body;
            // Verify the order belongs to the user's store
            const order = await prisma.order.findUnique({
                where: {
                    id: orderId,
                    storeId: storeId
                }
            });
            if (!order) {
                return reply.status(404).send({
                    success: false,
                    error: 'Order not found or does not belong to your store'
                });
            }
            // Update order status to completed
            const updatedOrder = await prisma.order.update({
                where: { id: orderId },
                data: {
                    status: 'completed',
                    paymentStatus: 'paid'
                }
            });
            // Create a payment record
            const payment = await prisma.payment.create({
                data: {
                    amount: amount,
                    method: paymentMethod,
                    status: 'paid',
                    orderId: orderId
                }
            });
            return reply.status(200).send({
                success: true,
                data: {
                    order: updatedOrder,
                    payment: payment
                },
                message: 'Payment processed successfully'
            });
        }
        catch (error) {
            fastify.log.error(error);
            reply.status(500).send({
                success: false,
                error: 'Failed to process payment'
            });
        }
    });
}
//# sourceMappingURL=index.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = auditRoutes;
const client_1 = require("@prisma/client");
const auth_middleware_1 = require("../middleware/auth.middleware");
const token_service_1 = require("../services/token.service");
const prisma = new client_1.PrismaClient();
async function auditRoutes(fastify) {
    const tokenService = new token_service_1.TokenService(fastify);
    // Add authentication hook for all audit routes
    fastify.addHook('preHandler', async (request, reply) => {
        await (0, auth_middleware_1.authenticateStoreUser)(request, reply, tokenService);
    });
    // GET /audit/logs - Get audit logs for the store
    fastify.get('/logs', async (request, reply) => {
        try {
            const user = request.user;
            const storeId = user.storeId;
            if (!storeId) {
                return reply.status(400).send({
                    success: false,
                    error: 'No store associated with this user'
                });
            }
            const { limit = 100, offset = 0, entityType, action, userId } = request.query;
            const whereClause = {
                storeId
            };
            if (entityType) {
                whereClause.entityType = entityType;
            }
            if (action) {
                whereClause.action = {
                    contains: action,
                    mode: 'insensitive'
                };
            }
            if (userId) {
                whereClause.userId = userId;
            }
            const [logs, total] = await Promise.all([
                prisma.auditLog.findMany({
                    where: whereClause,
                    orderBy: {
                        createdAt: 'desc'
                    },
                    take: parseInt(limit),
                    skip: parseInt(offset),
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                role: true
                            }
                        }
                    }
                }),
                prisma.auditLog.count({
                    where: whereClause
                })
            ]);
            return reply.status(200).send({
                success: true,
                data: logs,
                total,
                limit: parseInt(limit),
                offset: parseInt(offset)
            });
        }
        catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({
                success: false,
                error: 'Failed to fetch audit logs'
            });
        }
    });
    // GET /audit/logs/:entityType/:entityId - Get audit logs for a specific entity
    fastify.get('/logs/:entityType/:entityId', async (request, reply) => {
        try {
            const user = request.user;
            const storeId = user.storeId;
            const { entityType, entityId } = request.params;
            if (!storeId) {
                return reply.status(400).send({
                    success: false,
                    error: 'No store associated with this user'
                });
            }
            const { limit = 50 } = request.query;
            const logs = await prisma.auditLog.findMany({
                where: {
                    storeId,
                    entityType,
                    entityId
                },
                orderBy: {
                    createdAt: 'desc'
                },
                take: parseInt(limit),
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            role: true
                        }
                    }
                }
            });
            return reply.status(200).send({
                success: true,
                data: logs,
                total: logs.length
            });
        }
        catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({
                success: false,
                error: 'Failed to fetch entity audit logs'
            });
        }
    });
    // GET /audit/users - Get users who have audit logs
    fastify.get('/users', async (request, reply) => {
        try {
            const user = request.user;
            const storeId = user.storeId;
            if (!storeId) {
                return reply.status(400).send({
                    success: false,
                    error: 'No store associated with this user'
                });
            }
            const usersWithLogs = await prisma.$queryRaw `
        SELECT DISTINCT u.id, u.name, u.email, u.role
        FROM "users" u
        INNER JOIN "audit_logs" al ON u.id = al."userId"
        WHERE al."storeId" = ${storeId}
        ORDER BY u.name
      `;
            return reply.status(200).send({
                success: true,
                data: usersWithLogs
            });
        }
        catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({
                success: false,
                error: 'Failed to fetch users with audit logs'
            });
        }
    });
    // GET /audit/entity-types - Get available entity types
    fastify.get('/entity-types', async (request, reply) => {
        try {
            const user = request.user;
            const storeId = user.storeId;
            if (!storeId) {
                return reply.status(400).send({
                    success: false,
                    error: 'No store associated with this user'
                });
            }
            const entityTypes = await prisma.$queryRaw `
        SELECT DISTINCT "entityType", COUNT(*) as count
        FROM "audit_logs"
        WHERE "storeId" = ${storeId}
        GROUP BY "entityType"
        ORDER BY count DESC
      `;
            return reply.status(200).send({
                success: true,
                data: entityTypes
            });
        }
        catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({
                success: false,
                error: 'Failed to fetch entity types'
            });
        }
    });
    // GET /audit/actions - Get available actions
    fastify.get('/actions', async (request, reply) => {
        try {
            const user = request.user;
            const storeId = user.storeId;
            if (!storeId) {
                return reply.status(400).send({
                    success: false,
                    error: 'No store associated with this user'
                });
            }
            const actions = await prisma.$queryRaw `
        SELECT DISTINCT "action", COUNT(*) as count
        FROM "audit_logs"
        WHERE "storeId" = ${storeId}
        GROUP BY "action"
        ORDER BY count DESC
      `;
            return reply.status(200).send({
                success: true,
                data: actions
            });
        }
        catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({
                success: false,
                error: 'Failed to fetch actions'
            });
        }
    });
    // POST /audit/export - Export audit logs
    fastify.post('/export', async (request, reply) => {
        try {
            const user = request.user;
            const storeId = user.storeId;
            if (!storeId) {
                return reply.status(400).send({
                    success: false,
                    error: 'No store associated with this user'
                });
            }
            const { format = 'csv', entityType, action, userId, startDate, endDate } = request.body;
            const whereClause = {
                storeId
            };
            if (entityType) {
                whereClause.entityType = entityType;
            }
            if (action) {
                whereClause.action = {
                    contains: action,
                    mode: 'insensitive'
                };
            }
            if (userId) {
                whereClause.userId = userId;
            }
            if (startDate || endDate) {
                whereClause.createdAt = {};
                if (startDate) {
                    whereClause.createdAt.gte = new Date(startDate);
                }
                if (endDate) {
                    whereClause.createdAt.lte = new Date(endDate);
                }
            }
            const logs = await prisma.auditLog.findMany({
                where: whereClause,
                orderBy: {
                    createdAt: 'desc'
                },
                include: {
                    user: {
                        select: {
                            name: true,
                            email: true,
                            role: true
                        }
                    }
                }
            });
            if (format === 'csv') {
                // Generate CSV content
                const headers = ['Timestamp', 'User', 'Entity Type', 'Entity ID', 'Action', 'Details'];
                const csvRows = logs.map((log) => [
                    log.createdAt.toISOString(),
                    log.user?.name || log.userId || 'System',
                    log.entityType,
                    log.entityId,
                    log.action,
                    log.newValues ? JSON.stringify(log.newValues) : ''
                ]);
                const csvContent = [
                    headers.join(','),
                    ...csvRows.map((row) => row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(','))
                ].join('\n');
                reply.header('Content-Type', 'text/csv');
                reply.header('Content-Disposition', 'attachment; filename=audit-logs.csv');
                return reply.send(csvContent);
            }
            else {
                // JSON format
                reply.header('Content-Type', 'application/json');
                reply.header('Content-Disposition', 'attachment; filename=audit-logs.json');
                return reply.send(logs);
            }
        }
        catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({
                success: false,
                error: 'Failed to export audit logs'
            });
        }
    });
}
//# sourceMappingURL=index.js.map
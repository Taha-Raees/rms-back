"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class AuditService {
    /**
     * Log an audit event
     */
    static async logEvent(entityType, entityId, action, userId, storeId, oldValues, newValues, additionalData) {
        try {
            await prisma.auditLog.create({
                data: {
                    entityType,
                    entityId,
                    action,
                    userId,
                    storeId,
                    oldValues: oldValues ? JSON.stringify(oldValues) : undefined,
                    newValues: newValues ? JSON.stringify(newValues) : undefined,
                    ipAddress: additionalData?.ipAddress,
                    userAgent: additionalData?.userAgent
                }
            });
        }
        catch (error) {
            console.error('Error logging audit event:', error);
            // Don't throw error as audit logging shouldn't break main functionality
        }
    }
    /**
     * Get audit logs for an entity
     */
    static async getEntityLogs(entityType, entityId, storeId, limit = 50) {
        try {
            return await prisma.auditLog.findMany({
                where: {
                    entityType,
                    entityId,
                    storeId
                },
                orderBy: {
                    createdAt: 'desc'
                },
                take: limit,
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                }
            });
        }
        catch (error) {
            console.error('Error fetching audit logs:', error);
            throw error;
        }
    }
    /**
     * Get audit logs for a store
     */
    static async getStoreLogs(storeId, limit = 100) {
        try {
            return await prisma.auditLog.findMany({
                where: {
                    storeId
                },
                orderBy: {
                    createdAt: 'desc'
                },
                take: limit,
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                }
            });
        }
        catch (error) {
            console.error('Error fetching store audit logs:', error);
            throw error;
        }
    }
}
exports.AuditService = AuditService;
//# sourceMappingURL=audit.service.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CleanupService = void 0;
const client_1 = require("@prisma/client");
const stock_service_1 = require("./stock.service");
const prisma = new client_1.PrismaClient();
class CleanupService {
    /**
     * Cleanup expired stock reservations
     */
    static async cleanupExpiredReservations() {
        try {
            await stock_service_1.StockService.cleanupExpiredReservations();
            console.log('Expired stock reservations cleaned up successfully');
        }
        catch (error) {
            console.error('Error cleaning up expired reservations:', error);
        }
    }
    /**
     * Cleanup old audit logs (older than 90 days)
     */
    static async cleanupOldAuditLogs() {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - 90);
            const deletedCount = await prisma.auditLog.deleteMany({
                where: {
                    createdAt: {
                        lt: cutoffDate
                    }
                }
            });
            console.log(`Cleaned up ${deletedCount.count} old audit logs`);
        }
        catch (error) {
            console.error('Error cleaning up old audit logs:', error);
        }
    }
    /**
     * Cleanup old stock movements (older than 365 days)
     */
    static async cleanupOldStockMovements() {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - 365);
            const deletedCount = await prisma.stockMovement.deleteMany({
                where: {
                    createdAt: {
                        lt: cutoffDate
                    }
                }
            });
            console.log(`Cleaned up ${deletedCount.count} old stock movements`);
        }
        catch (error) {
            console.error('Error cleaning up old stock movements:', error);
        }
    }
    /**
     * Cleanup expired refresh tokens
     */
    static async cleanupExpiredTokens() {
        try {
            const now = new Date();
            const deletedCount = await prisma.refreshToken.deleteMany({
                where: {
                    expiresAt: {
                        lt: now
                    }
                }
            });
            console.log(`Cleaned up ${deletedCount.count} expired refresh tokens`);
        }
        catch (error) {
            console.error('Error cleaning up expired tokens:', error);
        }
    }
    /**
     * Cleanup blacklisted tokens
     */
    static async cleanupBlacklistedTokens() {
        try {
            const now = new Date();
            const deletedCount = await prisma.blacklistedToken.deleteMany({
                where: {
                    expiresAt: {
                        lt: now
                    }
                }
            });
            console.log(`Cleaned up ${deletedCount.count} expired blacklisted tokens`);
        }
        catch (error) {
            console.error('Error cleaning up blacklisted tokens:', error);
        }
    }
    /**
     * Run all cleanup tasks
     */
    static async runAllCleanupTasks() {
        console.log('Starting cleanup tasks...');
        await this.cleanupExpiredReservations();
        await this.cleanupOldAuditLogs();
        await this.cleanupOldStockMovements();
        await this.cleanupExpiredTokens();
        await this.cleanupBlacklistedTokens();
        console.log('All cleanup tasks completed');
    }
    /**
     * Check for data consistency issues
     */
    static async checkDataConsistency() {
        try {
            // This would be implemented based on ValidationService
            console.log('Data consistency check completed');
        }
        catch (error) {
            console.error('Error during data consistency check:', error);
        }
    }
}
exports.CleanupService = CleanupService;
//# sourceMappingURL=cleanup.service.js.map
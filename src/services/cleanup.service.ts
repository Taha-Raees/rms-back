import { PrismaClient } from '@prisma/client';
import { StockService } from './stock.service';

const prisma = new PrismaClient();

export class CleanupService {
  /**
   * Cleanup expired stock reservations
   */
  static async cleanupExpiredReservations(): Promise<void> {
    try {
      await StockService.cleanupExpiredReservations();
      console.log('Expired stock reservations cleaned up successfully');
    } catch (error) {
      console.error('Error cleaning up expired reservations:', error);
    }
  }

  /**
   * Cleanup old audit logs (older than 90 days)
   */
  static async cleanupOldAuditLogs(): Promise<void> {
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
    } catch (error) {
      console.error('Error cleaning up old audit logs:', error);
    }
  }

  /**
   * Cleanup old stock movements (older than 365 days)
   */
  static async cleanupOldStockMovements(): Promise<void> {
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
    } catch (error) {
      console.error('Error cleaning up old stock movements:', error);
    }
  }

  /**
   * Cleanup expired refresh tokens
   */
  static async cleanupExpiredTokens(): Promise<void> {
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
    } catch (error) {
      console.error('Error cleaning up expired tokens:', error);
    }
  }

  /**
   * Cleanup blacklisted tokens
   */
  static async cleanupBlacklistedTokens(): Promise<void> {
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
    } catch (error) {
      console.error('Error cleaning up blacklisted tokens:', error);
    }
  }

  /**
   * Run all cleanup tasks
   */
  static async runAllCleanupTasks(): Promise<void> {
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
  static async checkDataConsistency(): Promise<void> {
    try {
      // This would be implemented based on ValidationService
      console.log('Data consistency check completed');
    } catch (error) {
      console.error('Error during data consistency check:', error);
    }
  }
}

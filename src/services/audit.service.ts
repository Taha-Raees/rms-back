import { PrismaClient } from '@prisma/client';
import { JwtPayload } from './token.service';

const prisma = new PrismaClient();

export class AuditService {
  /**
   * Log an audit event
   */
  static async logEvent(
    entityType: string,
    entityId: string,
    action: string,
    userId?: string,
    storeId?: string,
    oldValues?: any,
    newValues?: any,
    additionalData?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
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
    } catch (error) {
      console.error('Error logging audit event:', error);
      // Don't throw error as audit logging shouldn't break main functionality
    }
  }

  /**
   * Get audit logs for an entity
   */
  static async getEntityLogs(
    entityType: string,
    entityId: string,
    storeId: string,
    limit: number = 50
  ): Promise<any[]> {
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
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      throw error;
    }
  }

  /**
   * Get audit logs for a store
   */
  static async getStoreLogs(
    storeId: string,
    limit: number = 100
  ): Promise<any[]> {
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
    } catch (error) {
      console.error('Error fetching store audit logs:', error);
      throw error;
    }
  }
}

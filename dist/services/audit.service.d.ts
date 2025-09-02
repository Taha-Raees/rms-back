export declare class AuditService {
    /**
     * Log an audit event
     */
    static logEvent(entityType: string, entityId: string, action: string, userId?: string, storeId?: string, oldValues?: any, newValues?: any, additionalData?: {
        ipAddress?: string;
        userAgent?: string;
    }): Promise<void>;
    /**
     * Get audit logs for an entity
     */
    static getEntityLogs(entityType: string, entityId: string, storeId: string, limit?: number): Promise<any[]>;
    /**
     * Get audit logs for a store
     */
    static getStoreLogs(storeId: string, limit?: number): Promise<any[]>;
}
//# sourceMappingURL=audit.service.d.ts.map
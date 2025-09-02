export declare class CleanupService {
    /**
     * Cleanup expired stock reservations
     */
    static cleanupExpiredReservations(): Promise<void>;
    /**
     * Cleanup old audit logs (older than 90 days)
     */
    static cleanupOldAuditLogs(): Promise<void>;
    /**
     * Cleanup old stock movements (older than 365 days)
     */
    static cleanupOldStockMovements(): Promise<void>;
    /**
     * Cleanup expired refresh tokens
     */
    static cleanupExpiredTokens(): Promise<void>;
    /**
     * Cleanup blacklisted tokens
     */
    static cleanupBlacklistedTokens(): Promise<void>;
    /**
     * Run all cleanup tasks
     */
    static runAllCleanupTasks(): Promise<void>;
    /**
     * Check for data consistency issues
     */
    static checkDataConsistency(): Promise<void>;
}
//# sourceMappingURL=cleanup.service.d.ts.map
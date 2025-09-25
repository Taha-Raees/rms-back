export declare class StockService {
    /**
     * Reserve stock for an order
     */
    static reserveStock(orderId: string, items: {
        productId: string;
        variantId?: string;
        quantity: number;
    }[], storeId: string, userId?: string): Promise<boolean>;
    /**
     * Release stock reservation (when order is cancelled or expired)
     */
    static releaseReservation(orderId: string, storeId: string, userId?: string): Promise<void>;
    /**
     * Confirm stock reservation (when order is completed)
     */
    static confirmReservation(orderId: string, storeId: string, userId?: string): Promise<void>;
    /**
     * Update actual stock levels
     */
    static updateStock(productId: string, variantId: string | undefined, quantityChange: number, reason: 'SALE' | 'RETURN' | 'DAMAGE' | 'THEFT' | 'CORRECTION' | 'RECEIPT' | 'TRANSFER', storeId: string, userId?: string, referenceType?: string, referenceId?: string, notes?: string): Promise<void>;
    /**
     * Cleanup expired reservations
     */
    static cleanupExpiredReservations(): Promise<void>;
    /**
     * Get stock movements for a product
     */
    static getStockMovements(productId: string, storeId: string, limit?: number): Promise<any[]>;
    /**
     * Validate minimum stock levels
     */
    static validateMinimumStock(productId: string, variantId: string | undefined, requestedQuantity: number): Promise<{
        isValid: boolean;
        message?: string;
    }>;
}
//# sourceMappingURL=stock.service.d.ts.map
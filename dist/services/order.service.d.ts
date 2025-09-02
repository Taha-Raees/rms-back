export declare class OrderService {
    /**
     * Generate a unique order number
     */
    static generateOrderNumber(storeId: string): string;
    /**
     * Validate order status transition
     */
    static validateStatusTransition(currentStatus: string, newStatus: string): boolean;
    /**
     * Create an order with proper transaction handling
     */
    static createOrder(orderData: {
        items: {
            productId: string;
            variantId?: string;
            quantity: number;
            unitPrice: number;
        }[];
        customerId?: string;
        paymentMethod: string;
        notes?: string;
    }, storeId: string, userId?: string): Promise<any>;
    /**
     * Update order status with validation
     */
    static updateOrderStatus(orderId: string, newStatus: string, storeId: string, userId?: string): Promise<any>;
    /**
     * Process payment for an order
     */
    static processPayment(orderId: string, paymentData: {
        amount: number;
        method: string;
        transactionId?: string;
        gatewayResponse?: any;
    }, storeId: string, userId?: string): Promise<any>;
    /**
     * Cancel order with refund processing
     */
    static cancelOrder(orderId: string, storeId: string, userId?: string, refundData?: {
        amount?: number;
        method?: string;
        notes?: string;
    }): Promise<any>;
    /**
     * Get order with all related data
     */
    static getOrder(orderId: string, storeId: string): Promise<any>;
}
//# sourceMappingURL=order.service.d.ts.map
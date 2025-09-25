export declare class ValidationService {
    /**
     * Validate product data
     */
    static validateProductData(productData: any, storeId: string, existingProductId?: string): Promise<{
        isValid: boolean;
        errors: string[];
    }>;
    /**
     * Validate order data
     */
    static validateOrderData(orderData: any, storeId: string): Promise<{
        isValid: boolean;
        errors: string[];
    }>;
    /**
     * Validate customer data
     */
    static validateCustomerData(customerData: any, storeId: string, existingCustomerId?: string): Promise<{
        isValid: boolean;
        errors: string[];
    }>;
    /**
     * Validate stock update
     */
    static validateStockUpdate(productId: string, variantId: string | undefined, quantityChange: number, reason: string, storeId: string): Promise<{
        isValid: boolean;
        errors: string[];
        currentStock?: number;
    }>;
    /**
     * Validate foreign key constraints
     */
    static validateForeignKeys(entity: 'product' | 'order' | 'customer' | 'variant', data: any, storeId: string): Promise<{
        isValid: boolean;
        errors: string[];
    }>;
    /**
     * Check data consistency
     */
    static checkDataConsistency(storeId: string): Promise<{
        isConsistent: boolean;
        issues: string[];
    }>;
}
//# sourceMappingURL=validation.service.d.ts.map
import { PrismaClient, Prisma } from '@prisma/client';
import { StockService } from './stock.service';
import { AuditService } from './audit.service';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

export class OrderService {
  /**
   * Generate a unique order number
   */
  static generateOrderNumber(storeId: string): string {
    const timestamp = Date.now().toString().slice(-8); // Last 8 digits of timestamp
    const random = Math.random().toString(36).substring(2, 6).toUpperCase(); // 4 random chars
    const storePrefix = storeId.substring(0, 4).toUpperCase(); // First 4 chars of store ID
    return `ORD-${storePrefix}-${timestamp}-${random}`;
  }

  /**
   * Validate order status transition
   */
  static validateStatusTransition(
    currentStatus: string,
    newStatus: string
  ): boolean {
    const validTransitions: Record<string, string[]> = {
      'pending': ['processing', 'cancelled'],
      'processing': ['completed', 'cancelled'],
      'completed': ['refunded'],
      'cancelled': [],
      'refunded': []
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  /**
   * Create an order with proper transaction handling
   */
  static async createOrder(
    orderData: {
      items: { productId: string; variantId?: string; quantity: number; unitPrice: number }[];
      customerId?: string;
      paymentMethod: string;
      notes?: string;
    },
    storeId: string,
    userId?: string
  ): Promise<any> {
    return await prisma.$transaction(async (tx) => {
      try {
        // Calculate order totals
        let subtotal = 0;
        const orderItems = orderData.items.map(item => {
          const totalPrice = item.quantity * item.unitPrice;
          subtotal += totalPrice;
          return {
            ...item,
            totalPrice
          };
        });

        // Get store tax rate
        const store = await tx.store.findUnique({
          where: { id: storeId }
        });

        const taxRate = store?.taxRate || 0.17;
        const tax = subtotal * taxRate;
        const total = subtotal + tax;

        // Reserve stock first
        const stockReservationItems = orderData.items.map(item => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity
        }));

        await StockService.reserveStock(
          '', // We'll update this after order creation
          stockReservationItems,
          storeId,
          userId
        );

        // Create the order
        const orderNumber = this.generateOrderNumber(storeId);
        const order = await tx.order.create({
          data: {
            orderNumber,
            subtotal,
            tax,
            total,
            status: 'pending',
            paymentMethod: orderData.paymentMethod as any,
            paymentStatus: 'pending',
            notes: orderData.notes,
            storeId,
            customerId: orderData.customerId,
            items: {
              create: orderItems.map(item => ({
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
                productId: item.productId,
                variantId: item.variantId
              }))
            }
          },
          include: {
            items: {
              include: {
                product: true,
                variant: true
              }
            },
            customer: true
          }
        });

        // Update stock reservation with actual order ID
        await tx.stockReservation.updateMany({
          where: {
            orderId: '',
            storeId,
            status: 'ACTIVE'
          },
          data: {
            orderId: order.id
          }
        });

        // Log audit event
        await AuditService.logEvent(
          'Order',
          order.id,
          'CREATE',
          userId,
          storeId,
          undefined,
          order
        );

        return order;
      } catch (error) {
        // If stock reservation was made, release it
        // Note: In a real implementation, we'd need to track the reservation ID
        console.error('Error creating order:', error);
        throw error;
      }
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5000,
      timeout: 10000
    });
  }

  /**
   * Update order status with validation
   */
  static async updateOrderStatus(
    orderId: string,
    newStatus: string,
    storeId: string,
    userId?: string
  ): Promise<any> {
    return await prisma.$transaction(async (tx) => {
      // Get current order
      const currentOrder = await tx.order.findUnique({
        where: { id: orderId, storeId }
      });

      if (!currentOrder) {
        throw new Error('Order not found');
      }

      // Validate status transition
      if (!this.validateStatusTransition(currentOrder.status, newStatus)) {
        throw new Error(`Invalid status transition from ${currentOrder.status} to ${newStatus}`);
      }

      // Handle special cases
      if (newStatus === 'completed') {
        // Confirm stock reservation
        await StockService.confirmReservation(orderId, storeId, userId);
      } else if (newStatus === 'cancelled') {
        // Release stock reservation
        await StockService.releaseReservation(orderId, storeId, userId);
      }

      // Update order status
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: newStatus as any,
          paymentStatus: newStatus === 'completed' ? 'paid' :
                        newStatus === 'cancelled' ? 'refunded' :
                        currentOrder.paymentStatus
        },
        include: {
          items: {
            include: {
              product: true,
              variant: true
            }
          },
          customer: true
        }
      });

      // Log audit event
      await AuditService.logEvent(
        'Order',
        orderId,
        `STATUS_CHANGE_${currentOrder.status}_TO_${newStatus}`,
        userId,
        storeId,
        currentOrder,
        updatedOrder
      );

      return updatedOrder;
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable
    });
  }

  /**
   * Process payment for an order
   */
  static async processPayment(
    orderId: string,
    paymentData: {
      amount: number;
      method: string;
      transactionId?: string;
      gatewayResponse?: any;
    },
    storeId: string,
    userId?: string
  ): Promise<any> {
    return await prisma.$transaction(async (tx) => {
      // Get order
      const order = await tx.order.findUnique({
        where: { id: orderId, storeId }
      });

      if (!order) {
        throw new Error('Order not found');
      }

      if (order.status !== 'pending' && order.status !== 'processing') {
        throw new Error('Order cannot be paid in current status');
      }

      // Verify payment amount matches order total
      if (Math.abs(paymentData.amount - order.total) > 0.01) {
        throw new Error('Payment amount does not match order total');
      }

      // Create payment record
      const payment = await tx.payment.create({
        data: {
          amount: paymentData.amount,
          method: paymentData.method as any,
          status: 'paid',
          transactionId: paymentData.transactionId,
          gatewayResponse: paymentData.gatewayResponse,
          orderId: orderId
        }
      });

      // Update order status
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'completed',
          paymentStatus: 'paid'
        },
        include: {
          items: {
            include: {
              product: true,
              variant: true
            }
          },
          customer: true
        }
      });

      // Confirm stock reservation
      await StockService.confirmReservation(orderId, storeId, userId);

      // Log audit events
      await AuditService.logEvent(
        'Payment',
        payment.id,
        'CREATE',
        userId,
        storeId,
        undefined,
        payment
      );

      await AuditService.logEvent(
        'Order',
        orderId,
        'PAYMENT_COMPLETED',
        userId,
        storeId,
        order,
        updatedOrder
      );

      return {
        order: updatedOrder,
        payment
      };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable
    });
  }

  /**
   * Cancel order with refund processing
   */
  static async cancelOrder(
    orderId: string,
    storeId: string,
    userId?: string,
    refundData?: {
      amount?: number;
      method?: string;
      notes?: string;
    }
  ): Promise<any> {
    return await prisma.$transaction(async (tx) => {
      // Get order
      const order = await tx.order.findUnique({
        where: { id: orderId, storeId }
      });

      if (!order) {
        throw new Error('Order not found');
      }

      if (order.status === 'cancelled' || order.status === 'refunded') {
        throw new Error('Order is already cancelled or refunded');
      }

      // Release stock reservation
      await StockService.releaseReservation(orderId, storeId, userId);

      // Update order status
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'cancelled',
          paymentStatus: order.paymentStatus === 'paid' ? 'refunded' : order.paymentStatus
        },
        include: {
          items: {
            include: {
              product: true,
              variant: true
            }
          },
          customer: true
        }
      });

      // Create refund payment if order was paid
      let refundPayment = null;
      if (order.paymentStatus === 'paid' && refundData) {
        const refundAmount = refundData.amount || order.total;
        refundPayment = await tx.payment.create({
          data: {
            amount: -Math.abs(refundAmount), // Negative amount for refund
            method: (refundData.method || order.paymentMethod) as any,
            status: 'refunded',
            orderId: orderId
          }
        });
      }

      // Log audit events
      await AuditService.logEvent(
        'Order',
        orderId,
        'CANCELLED',
        userId,
        storeId,
        order,
        updatedOrder
      );

      if (refundPayment) {
        await AuditService.logEvent(
          'Payment',
          refundPayment.id,
          'REFUND',
          userId,
          storeId,
          undefined,
          refundPayment
        );
      }

      return {
        order: updatedOrder,
        refund: refundPayment
      };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable
    });
  }

  /**
   * Get order with all related data
   */
  static async getOrder(
    orderId: string,
    storeId: string
  ): Promise<any> {
    try {
      return await prisma.order.findUnique({
        where: { id: orderId, storeId },
        include: {
          items: {
            include: {
              product: true,
              variant: true
            }
          },
          customer: true,
          payments: true,
          stockReservations: true
        }
      });
    } catch (error) {
      console.error('Error fetching order:', error);
      throw error;
    }
  }
}

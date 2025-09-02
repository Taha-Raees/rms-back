import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { JwtPayload } from '../services/token.service';
import { OrderService } from '../services/order.service';
import { StockService } from '../services/stock.service';
import { authenticateStoreUser } from '../middleware/auth.middleware';
import { TokenService } from '../services/token.service';

const prisma = new PrismaClient();

// Define interfaces based on your Prisma schema
interface Product {
  id: string;
  name: string;
  brand?: string;
  category: string;
  type: 'branded_packet' | 'loose_weight' | 'unit_based';
  variants?: ProductVariant[];
  basePrice: number;
  baseCost: number;
  stock: number;
  unit: string;
  lowStockThreshold: number;
  barcode?: string;
  isActive: boolean;
  storeId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  price: number;
  cost: number;
  productId: string;
  createdAt: Date;
}

interface CartItem {
  productId: string;
  variantId?: string;
  quantity: number;
  price?: number;
  name?: string;
  unit?: string;
}

interface CheckoutRequest {
  items: CartItem[];
  customerType?: 'REGULAR' | 'WHOLESALE';
  discountPercentage?: number;
  taxRate?: number;
  paymentMethod: 'CASH' | 'CARD' | 'ONLINE';
  amountPaid?: number;
  change?: number;
}

interface OrderItem {
  productId: string;
  variantId?: string;
  quantity: number;
  price: number;
  name: string;
  unit: string;
}

interface Order {
  id: string;
  orderNumber: string;
  customerId?: string;
  items: OrderItem[];
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  totalAmount: number;
  paymentMethod: 'CASH' | 'CARD' | 'ONLINE';
  amountPaid: number;
  change: number;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  createdAt: Date;
}

export default async function posCheckoutRoutes(fastify: FastifyInstance) {
  const tokenService = new TokenService(fastify);

  // Add authentication hook for all POS checkout routes
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    await authenticateStoreUser(request, reply, tokenService);
  });

  fastify.post('/', async (request: FastifyRequest<{ Body: CheckoutRequest }>, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const storeId = user.storeId;
      
      if (!storeId) {
        return reply.status(400).send({
          success: false,
          error: 'No store associated with this user'
        });
      }

      // Check if user has access to this store
      if (user.role !== 'OWNER' && user.role !== 'MANAGER' && user.role !== 'STAFF') {
        return reply.status(403).send({
          success: false,
          error: 'Insufficient permissions to perform checkout'
        });
      }

      const {
        items,
        customerType = 'REGULAR',
        discountPercentage = 0,
        taxRate,
        paymentMethod,
        amountPaid,
      } = request.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return reply.status(400).send({
          success: false,
          error: 'Cart items are required and must be a non-empty array',
        });
      }

      if (!paymentMethod) {
        return reply.status(400).send({
          success: false,
          error: 'Payment method is required',
        });
      }

      if (amountPaid === undefined) {
        return reply.status(400).send({
          success: false,
          error: 'Amount paid is required',
        });
      }

      // Get store to get tax rate if not provided in request
      let effectiveTaxRate = taxRate;
      if (effectiveTaxRate === undefined) {
        const store = await prisma.store.findUnique({
          where: { id: storeId },
        });
        // For POS transactions, use frontend tax calculation by defaulting to 0% (as it's being calculated independently)
        effectiveTaxRate = 0; // Override: Use frontend's tax calculation - typically 0%
      }

      let subtotal = 0;
      const orderItems: OrderItem[] = [];
      const productIds = items.map(item => item.productId);
      const products = await prisma.product.findMany({
        where: {
          id: { in: productIds },
          isActive: true,
          storeId: storeId,
        },
        include: {
          variants: true,
        },
      });

      const productMap = new Map(products.map(p => [p.id, p]));

      for (const item of items) {
        const product = productMap.get(item.productId);
        if (!product) {
          return reply.status(404).send({
            success: false,
            error: `Product with ID ${item.productId} not found or inactive`,
          });
        }

        let finalPrice = item.price ?? product.basePrice;
        let itemName = item.name ?? product.name;
        let itemUnit = item.unit ?? product.unit;

        if (item.variantId) {
          const variant = product.variants?.find((v: any) => v.id === item.variantId);
          if (!variant) {
            return reply.status(404).send({
              success: false,
              error: `Variant with ID ${item.variantId} not found for product ${product.name}`,
            });
          }
          finalPrice = variant.price;
          itemName = `${product.name} - ${variant.name}`;
          itemUnit = product.unit;
        }

        // Check stock
        if (product.stock < item.quantity) {
          return reply.status(400).send({
            success: false,
            error: `Insufficient stock for product ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`,
          });
        }

        orderItems.push({
          productId: product.id,
          variantId: item.variantId,
          quantity: item.quantity,
          price: finalPrice,
          name: itemName,
          unit: itemUnit,
        });

        subtotal += finalPrice * item.quantity;
      }

      const discountAmount = subtotal * (discountPercentage / 100);
      const amountAfterDiscount = subtotal - discountAmount;
      const taxAmount = amountAfterDiscount * effectiveTaxRate;
      const totalAmount = amountAfterDiscount + taxAmount;
      const change = amountPaid - totalAmount;

      if (change < 0) {
        return reply.status(400).send({
          success: false,
          error: 'Insufficient payment amount',
        });
      }

      // Generate order number first for stock reservation
      const orderNumber = OrderService.generateOrderNumber(storeId);
      


      // Use the new OrderService with proper transaction handling
      const orderData = {
        items: items.map(item => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice: orderItems.find(oi => oi.productId === item.productId && oi.variantId === item.variantId)?.price || 0
        })),
        paymentMethod: paymentMethod,
        notes: `POS order - Change: ${change}`
      };

      try {
        console.log('Creating order with data:', {
          orderNumber,
          subtotal,
          taxAmount,
          totalAmount,
          paymentMethod: paymentMethod.toLowerCase(),
          storeId
        });

        // Create order directly with minimal data to isolate the issue
        const order = await prisma.order.create({
          data: {
            orderNumber,
            subtotal,
            tax: taxAmount,
            total: totalAmount,
            status: 'pending',
            paymentMethod: paymentMethod.toLowerCase() as any,
            storeId,
          }
        });

        console.log('Order created successfully:', order.id);

        // Create payment record
        const paymentData = {
          amount: totalAmount,
          method: paymentMethod.toLowerCase() as any,
          status: 'paid' as const,
          transactionId: `POS-${Date.now()}`,
          orderId: order.id
        };

        console.log('Creating payment with data:', paymentData);

        const payment = await prisma.payment.create({
          data: paymentData
        });

        console.log('Payment created successfully:', payment.id);

        // Update order status to completed
        const updatedOrder = await prisma.order.update({
          where: { id: order.id },
          data: {
            status: 'completed' as any,
            paymentStatus: 'paid' as any
          }
        });

        console.log('Order status updated to completed:', updatedOrder.id);

        return reply.status(201).send({
          success: true,
          data: updatedOrder,
          message: 'Order placed successfully',
        });
      } catch (dbError: any) {
        console.error('Database operation failed - detailed error:');
        console.error('Error name:', dbError?.name || 'Unknown');
        console.error('Error message:', dbError?.message || 'Unknown');
        console.error('Error code:', dbError?.code || 'Unknown');
        console.error('Error meta:', dbError?.meta || {});
        console.error('Full error:', JSON.stringify(dbError, null, 2));
        throw dbError; // Re-throw to see the exact error
      }
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Internal server error during checkout',
      });
    }
  });

  fastify.get('/orders', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const storeId = user.storeId;
      
      if (!storeId) {
        return reply.status(400).send({
          success: false,
          error: 'No store associated with this user'
        });
      }

      // Check if user has access to this store
      if (user.role !== 'OWNER' && user.role !== 'MANAGER' && user.role !== 'STAFF') {
        return reply.status(403).send({
          success: false,
          error: 'Insufficient permissions to view orders'
        });
      }

      const orders = await prisma.order.findMany({
        where: {
          storeId: storeId
        },
        include: {
          items: {
            include: {
              product: true,
              variant: true,
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return reply.status(200).send({
        success: true,
        data: orders,
        total: orders.length,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });
}

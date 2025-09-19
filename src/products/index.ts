import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { authenticateStoreUser } from '../middleware/auth.middleware';
import { TokenService } from '../services/token.service';
import { JwtPayload } from '../services/token.service';

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
  stock: number;
  weight?: number;
  weightUnit?: string;
  productId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

interface CreateProductRequest {
  name: string;
  brand?: string;
  category: string;
  type: 'branded_packet' | 'loose_weight' | 'unit_based';
  variants?: Omit<ProductVariant, 'id' | 'productId' | 'createdAt' | 'updatedAt' | 'deletedAt'>[];
  basePrice: number;
  baseCost: number;
  stock: number;
  unit: string;
  lowStockThreshold?: number;
  barcode?: string;
  isActive?: boolean;
}

export default async function productRoutes(fastify: FastifyInstance) {
  const tokenService = new TokenService(fastify);

  // Helper function to get user from request
  const getUserFromRequest = (request: FastifyRequest): JwtPayload => {
    return request.user as JwtPayload;
  };
  // GET /products - Get all products for the authenticated user's store
  fastify.get('/', async (request: FastifyRequest<{ Querystring: { category?: string; type?: string; search?: string } }>, reply: FastifyReply) => {
    // Authenticate first
    await authenticateStoreUser(request, reply, tokenService);
    if (reply.sent) return; // If authentication failed, response already sent

    try {
      const user = getUserFromRequest(request);
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
          error: 'Insufficient permissions to access products'
        });
      }

      const { category, type, search } = request.query;

      const where: any = {
        storeId: storeId,
        isActive: true,
      };

      if (category && category !== 'all') {
        where.category = category;
      }

      if (type && type !== 'all') {
        where.type = type;
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { brand: { contains: search, mode: 'insensitive' } },
          { category: { contains: search, mode: 'insensitive' } },
        ];
      }

      const products = await prisma.product.findMany({
        where,
        include: {
          variants: true,
        },
        orderBy: [
          {
            variants: {
              _count: 'desc',
            },
          },
          {
            name: 'asc',
          },
        ],
      });

      return reply.status(200).send({
        success: true,
        data: products,
        total: products.length,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch products',
      });
    }
  });

  // POST /products - Create new product
  fastify.post('/', async (request: FastifyRequest<{ Body: CreateProductRequest }>, reply: FastifyReply) => {
    // Authenticate first
    await authenticateStoreUser(request, reply, tokenService);
    if (reply.sent) return; // If authentication failed, response already sent

    try {
      const user = getUserFromRequest(request);
      const storeId = user.storeId;
      const body = request.body;

      if (!storeId) {
        return reply.status(400).send({
          success: false,
          error: 'No store associated with this user'
        });
      }

      // Check if user has access to this store
      if (user.role !== 'OWNER' && user.role !== 'MANAGER') {
        return reply.status(403).send({
          success: false,
          error: 'Insufficient permissions to create products'
        });
      }

      const newProduct = await prisma.product.create({
        data: {
          name: body.name,
          brand: body.brand,
          category: body.category,
          type: body.type,
          basePrice: body.basePrice,
          baseCost: body.baseCost,
          stock: body.stock,
          unit: body.unit,
          lowStockThreshold: body.lowStockThreshold || 10,
          barcode: body.barcode,
          isActive: body.isActive ?? true,
          storeId: storeId,
          variants: body.variants
            ? {
                create: body.variants.map(v => ({
                  name: v.name,
                  sku: v.sku,
                  price: v.price,
                  cost: v.cost,
                  stock: v.stock || 0,
                  weight: v.weight,
                  weightUnit: v.weightUnit,
                })),
              }
            : undefined,
        },
        include: {
          variants: true,
        },
      });

      return reply.status(201).send({
        success: true,
        data: newProduct,
        message: 'Product created successfully',
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to create product',
      });
    }
  });

  // GET /products/:id - Get a single product
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    // Authenticate first
    await authenticateStoreUser(request, reply, tokenService);
    if (reply.sent) return; // If authentication failed, response already sent

    try {
      const user = getUserFromRequest(request);
      const storeId = user.storeId;
      const { id } = request.params;

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
          error: 'Insufficient permissions to access products'
        });
      }

      const product = await prisma.product.findUnique({
        where: { id },
        include: {
          variants: true,
        },
      });

      if (!product) {
        return reply.status(404).send({
          success: false,
          error: 'Product not found',
        });
      }

      // Verify the product belongs to the user's store
      if (product.storeId !== storeId) {
        return reply.status(403).send({
          success: false,
          error: 'Access denied. Product does not belong to your store.'
        });
      }

      return reply.status(200).send({
        success: true,
        data: product,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch product',
      });
    }
  });

  // PUT /products/:id - Update a product
  fastify.put<{ Params: { id: string }; Body: Partial<CreateProductRequest> }>('/:id', async (request, reply) => {
    // Authenticate first
    await authenticateStoreUser(request, reply, tokenService);
    if (reply.sent) return; // If authentication failed, response already sent

    try {
      const user = getUserFromRequest(request);
      const storeId = user.storeId;
      const { id } = request.params;
      const body = request.body;

      if (!storeId) {
        return reply.status(400).send({
          success: false,
          error: 'No store associated with this user'
        });
      }

      // Check if user has access to this store
      if (user.role !== 'OWNER' && user.role !== 'MANAGER') {
        return reply.status(403).send({
          success: false,
          error: 'Insufficient permissions to update products'
        });
      }

      const existingProduct = await prisma.product.findUnique({
        where: { id },
      });

      if (!existingProduct) {
        return reply.status(404).send({
          success: false,
          error: 'Product not found',
        });
      }

      // Verify the product belongs to the user's store
      if (existingProduct.storeId !== storeId) {
        return reply.status(403).send({
          success: false,
          error: 'Access denied. Product does not belong to your store.'
        });
      }

      const updatedProduct = await prisma.product.update({
        where: { id },
        data: {
          name: body.name,
          brand: body.brand,
          category: body.category,
          type: body.type,
          basePrice: body.basePrice,
          baseCost: body.baseCost,
          stock: body.stock,
          unit: body.unit,
          lowStockThreshold: body.lowStockThreshold,
          barcode: body.barcode,
          isActive: body.isActive,
          variants: body.variants
            ? {
                deleteMany: {}, // Delete existing variants
                create: body.variants.map(v => ({
                  name: v.name,
                  sku: v.sku,
                  price: v.price,
                  cost: v.cost,
                  stock: v.stock || 0,
                  weight: v.weight,
                  weightUnit: v.weightUnit,
                })),
              }
            : undefined,
        },
        include: {
          variants: true,
        },
      });

      return reply.status(200).send({
        success: true,
        data: updatedProduct,
        message: 'Product updated successfully',
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to update product',
      });
    }
  });

  // DELETE /products/:id - Delete a product
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    // Authenticate first
    await authenticateStoreUser(request, reply, tokenService);
    if (reply.sent) return; // If authentication failed, response already sent

    try {
      const user = getUserFromRequest(request);
      const storeId = user.storeId;
      const { id } = request.params;

      if (!storeId) {
        return reply.status(400).send({
          success: false,
          error: 'No store associated with this user'
        });
      }

      // Check if user has access to this store
      if (user.role !== 'OWNER' && user.role !== 'MANAGER') {
        return reply.status(403).send({
          success: false,
          error: 'Insufficient permissions to delete products'
        });
      }

      const existingProduct = await prisma.product.findUnique({
        where: { id },
      });

      if (!existingProduct) {
        return reply.status(404).send({
          success: false,
          error: 'Product not found',
        });
      }

      // Verify the product belongs to the user's store
      if (existingProduct.storeId !== storeId) {
        return reply.status(403).send({
          success: false,
          error: 'Access denied. Product does not belong to your store.'
        });
      }

      await prisma.product.delete({
        where: { id },
      });

      return reply.status(200).send({
        success: true,
        message: 'Product deleted successfully',
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to delete product',
      });
    }
  });
}

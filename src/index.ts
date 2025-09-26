import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import cookie from '@fastify/cookie';
import session from '@fastify/session';
import jwt from '@fastify/jwt';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import prisma from './lib/prisma';
import { TokenService } from './services/token.service';
import { CleanupService } from './services/cleanup.service';

// Import route handlers
import authRoutes from './auth/login';
import productRoutes from './products';
import posCalculateRoutes from './pos/calculate';
import posCheckoutRoutes from './pos/checkout';
import analyticsRoutes from './analytics';
import inventoryRoutes from './inventory';
import ordersRoutes from './orders';
import paymentsRoutes from './payments';
import storeRoutes from './store';
import { createWebSocketServer } from './websocket';
import auditRoutes from './audit';
import userRoutes from './users';
import chatRoutes from './chat';

const fastify = Fastify({
  logger: true,
});

// Register plugins
fastify.register(cors, {
  origin: (origin, cb) => {
    // Allow requests with no origin (like mobile apps, curl requests, or Tauri)
    if (!origin) return cb(null, true);
    // Allow specific origins
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://192.168.2.107:3000',
      'tauri://localhost',
      'https://tauri.localhost',
      'https://rms-front-server.vercel.app'  // Add Vercel frontend URL
    ];
    if (allowedOrigins.includes(origin)) {
      return cb(null, true);
    }

    // Also allow any vercel.app subdomain in production (like ZetraTech)
    if (process.env.NODE_ENV === 'production' && origin.endsWith('.vercel.app')) {
      return cb(null, true);
    }
    // Allow all origins in development (you might want to restrict this in production)
    if (process.env.NODE_ENV === 'development') {
      return cb(null, true);
    }
    return cb(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['set-cookie'],
});

fastify.register(multipart);
fastify.register(cookie);

fastify.register(session, {
  secret: process.env.SESSION_SECRET || 'a-very-strong-secret-key-for-sessions',
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
  saveUninitialized: false,
  rolling: true,
});

fastify.register(jwt, {
  secret: process.env.JWT_SECRET || 'a-very-strong-secret-key-for-jwt-tokens',
  sign: { expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '15m' },
});

// Socket.IO integration after Fastify registration
let io: SocketIOServer;

// Add Prisma client to Fastify instance
fastify.decorate('prisma', prisma);

// A simple root route for testing
fastify.get('/', async (request, reply) => {
  return { message: 'Fastify server is running!' };
});

// Register routes
fastify.register(authRoutes, { prefix: '/auth' });
fastify.register(productRoutes, { prefix: '/products' });
fastify.register(posCalculateRoutes, { prefix: '/pos/calculate' });
fastify.register(posCheckoutRoutes, { prefix: '/pos/checkout' });
fastify.register(analyticsRoutes, { prefix: '/analytics' });
fastify.register(inventoryRoutes, { prefix: '/inventory' });
fastify.register(ordersRoutes, { prefix: '/orders' });
fastify.register(paymentsRoutes, { prefix: '/payments' });
fastify.register(storeRoutes, { prefix: '/store' });
fastify.register(auditRoutes, { prefix: '/audit' });
fastify.register(userRoutes, { prefix: '/users' });
fastify.register(chatRoutes, { prefix: '/chat' });

// Error handling
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);
  
  // Handle Prisma errors
  if (error.code === 'P2002') {
    return reply.status(409).send({
      success: false,
      error: 'Resource already exists',
    });
  }
  
  if (error.code === 'P2025') {
    return reply.status(404).send({
      success: false,
      error: 'Resource not found',
    });
  }
  
  // Handle validation errors
  if (error.statusCode === 400) {
    return reply.status(400).send({
      success: false,
      error: 'Invalid request data',
    });
  }
  
  // Default error
  reply.status(500).send({
    success: false,
    error: 'Internal Server Error',
  });
});

// 404 handler
fastify.setNotFoundHandler((request, reply) => {
  reply.status(404).send({
    success: false,
    error: 'Route not found',
  });
});

// Periodic token cleanup
const tokenService = new TokenService(fastify);
setInterval(async () => {
  try {
    await tokenService.cleanupExpiredTokens();
    fastify.log.info('Token cleanup completed');
  } catch (error: any) {
    fastify.log.error('Token cleanup failed:', error);
  }
}, 60 * 60 * 1000); // Run every hour

// Periodic cleanup tasks
setInterval(async () => {
  try {
    await CleanupService.runAllCleanupTasks();
    fastify.log.info('Periodic cleanup completed');
  } catch (error: any) {
    fastify.log.error('Periodic cleanup failed:', error);
  }
}, 24 * 60 * 60 * 1000); // Run every 24 hours

// Start the server
const start = async () => {
  try {
    await fastify.listen({ port: 3001, host: '0.0.0.0' }); // Using port 3001 to avoid conflict with Next.js
    fastify.log.info('Server started on port 3001');

    // Initialize Socket.IO server after Fastify is ready
    io = createWebSocketServer(fastify);
    console.log('Socket.IO WebSocket server initialized');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

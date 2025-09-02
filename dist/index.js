"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const multipart_1 = __importDefault(require("@fastify/multipart"));
const cookie_1 = __importDefault(require("@fastify/cookie"));
const session_1 = __importDefault(require("@fastify/session"));
const jwt_1 = __importDefault(require("@fastify/jwt"));
const client_1 = require("@prisma/client");
const token_service_1 = require("./services/token.service");
const cleanup_service_1 = require("./services/cleanup.service");
// Import route handlers
const login_1 = __importDefault(require("./auth/login"));
const products_1 = __importDefault(require("./products"));
const calculate_1 = __importDefault(require("./pos/calculate"));
const checkout_1 = __importDefault(require("./pos/checkout"));
const analytics_1 = __importDefault(require("./analytics"));
const inventory_1 = __importDefault(require("./inventory"));
const orders_1 = __importDefault(require("./orders"));
const payments_1 = __importDefault(require("./payments"));
const store_1 = __importDefault(require("./store"));
const websocket_1 = require("./websocket");
const audit_1 = __importDefault(require("./audit"));
const users_1 = __importDefault(require("./users"));
const prisma = new client_1.PrismaClient();
const fastify = (0, fastify_1.default)({
    logger: true,
});
// Register plugins
fastify.register(cors_1.default, {
    origin: (origin, cb) => {
        // Allow requests with no origin (like mobile apps, curl requests, or Tauri)
        if (!origin)
            return cb(null, true);
        // Allow specific origins
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:3001',
            'http://192.168.2.107:3000',
            'tauri://localhost',
            'https://tauri.localhost',
            'https://rms-front-server.vercel.app' // Add Vercel frontend URL
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
fastify.register(multipart_1.default);
fastify.register(cookie_1.default);
fastify.register(session_1.default, {
    secret: process.env.SESSION_SECRET || 'a-very-strong-secret-key-for-sessions',
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
    saveUninitialized: false,
    rolling: true,
});
fastify.register(jwt_1.default, {
    secret: process.env.JWT_SECRET || 'a-very-strong-secret-key-for-jwt-tokens',
    sign: { expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '15m' },
});
// Socket.IO integration after Fastify registration
let io;
// Add Prisma client to Fastify instance
fastify.decorate('prisma', prisma);
// A simple root route for testing
fastify.get('/', async (request, reply) => {
    return { message: 'Fastify server is running!' };
});
// Register routes
fastify.register(login_1.default, { prefix: '/auth' });
fastify.register(products_1.default, { prefix: '/products' });
fastify.register(calculate_1.default, { prefix: '/pos/calculate' });
fastify.register(checkout_1.default, { prefix: '/pos/checkout' });
fastify.register(analytics_1.default, { prefix: '/analytics' });
fastify.register(inventory_1.default, { prefix: '/inventory' });
fastify.register(orders_1.default, { prefix: '/orders' });
fastify.register(payments_1.default, { prefix: '/payments' });
fastify.register(store_1.default, { prefix: '/store' });
fastify.register(audit_1.default, { prefix: '/audit' });
fastify.register(users_1.default, { prefix: '/users' });
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
const tokenService = new token_service_1.TokenService(fastify);
setInterval(async () => {
    try {
        await tokenService.cleanupExpiredTokens();
        fastify.log.info('Token cleanup completed');
    }
    catch (error) {
        fastify.log.error('Token cleanup failed:', error);
    }
}, 60 * 60 * 1000); // Run every hour
// Periodic cleanup tasks
setInterval(async () => {
    try {
        await cleanup_service_1.CleanupService.runAllCleanupTasks();
        fastify.log.info('Periodic cleanup completed');
    }
    catch (error) {
        fastify.log.error('Periodic cleanup failed:', error);
    }
}, 24 * 60 * 60 * 1000); // Run every 24 hours
// Start the server
const start = async () => {
    try {
        await fastify.listen({ port: 3001, host: '0.0.0.0' }); // Using port 3001 to avoid conflict with Next.js
        fastify.log.info('Server started on port 3001');
        // Initialize Socket.IO server after Fastify is ready
        io = (0, websocket_1.createWebSocketServer)(fastify);
        console.log('Socket.IO WebSocket server initialized');
    }
    catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};
start();
//# sourceMappingURL=index.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.withRetry = withRetry;
const client_1 = require("@prisma/client");
// Singleton PrismaClient instance
let prisma;
// Prevent multiple instances of Prisma Client in development
if (process.env.NODE_ENV === 'production') {
    exports.prisma = prisma = new client_1.PrismaClient();
}
else {
    if (!globalThis.__prisma) {
        globalThis.__prisma = new client_1.PrismaClient({
            log: ['query', 'error', 'warn'],
        });
    }
    exports.prisma = prisma = globalThis.__prisma;
}
// Connection retry utility with exponential backoff
async function withRetry(operation, maxRetries = 3, baseDelay = 1000) {
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        }
        catch (error) {
            lastError = error;
            // Only retry on connection-related errors
            if (!isRetryableError(error)) {
                throw error;
            }
            if (attempt < maxRetries) {
                const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
                console.log(`Database operation failed (attempt ${attempt + 1}), retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    throw lastError;
}
// Helper to determine if an error is retryable
function isRetryableError(error) {
    // Prisma connection errors
    if (error.code === 'P1001')
        return true; // Can't reach database server
    if (error.code === 'P1002')
        return true; // The database server at ... was reached but timed out
    if (error.code === 'P1017')
        return true; // Server has closed the connection
    // Generic connection errors
    if (error.message?.includes('connect ECONNREFUSED'))
        return true;
    if (error.message?.includes('timeout'))
        return true;
    if (error.name === 'PrismaClientInitializationError')
        return true;
    return false;
}
exports.default = prisma;
//# sourceMappingURL=prisma.js.map
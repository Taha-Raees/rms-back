import { PrismaClient } from '@prisma/client';

// Singleton PrismaClient instance
let prisma: PrismaClient;

declare global {
  var __prisma: PrismaClient | undefined;
}

// Prevent multiple instances of Prisma Client in development
if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!globalThis.__prisma) {
    globalThis.__prisma = new PrismaClient({
      log: ['query', 'error', 'warn'],
    });
  }
  prisma = globalThis.__prisma;
}

// Connection retry utility with exponential backoff
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
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

  throw lastError!;
}

// Helper to determine if an error is retryable
function isRetryableError(error: any): boolean {
  // Prisma connection errors
  if (error.code === 'P1001') return true; // Can't reach database server
  if (error.code === 'P1002') return true; // The database server at ... was reached but timed out
  if (error.code === 'P1017') return true; // Server has closed the connection

  // Generic connection errors
  if (error.message?.includes('connect ECONNREFUSED')) return true;
  if (error.message?.includes('timeout')) return true;
  if (error.name === 'PrismaClientInitializationError') return true;

  return false;
}

export { prisma };
export default prisma;

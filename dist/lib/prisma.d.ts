import { PrismaClient } from '@prisma/client';
declare let prisma: PrismaClient;
declare global {
    var __prisma: PrismaClient | undefined;
}
export declare function withRetry<T>(operation: () => Promise<T>, maxRetries?: number, baseDelay?: number): Promise<T>;
export { prisma };
export default prisma;
//# sourceMappingURL=prisma.d.ts.map
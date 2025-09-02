import { FastifyInstance } from 'fastify';
export interface JwtPayload {
    id: string;
    email: string;
    role: string;
    storeId?: string;
}
export declare class TokenService {
    private fastify;
    constructor(fastify: FastifyInstance);
    /**
     * Generate access token (JWT)
     */
    generateAccessToken(payload: JwtPayload): Promise<string>;
    /**
     * Generate refresh token
     */
    generateRefreshToken(userId: string, ipAddress?: string, userAgent?: string): Promise<string>;
    /**
     * Rotate refresh token - invalidate old token and generate new one
     */
    rotateRefreshToken(oldToken: string, ipAddress?: string, userAgent?: string): Promise<{
        accessToken: string;
        refreshToken: string;
    } | null>;
    /**
     * Verify access token
     */
    verifyAccessToken(token: string): Promise<JwtPayload | null>;
    /**
     * Blacklist a token (for logout)
     */
    blacklistToken(token: string, expiresAt: Date): Promise<void>;
    /**
     * Revoke refresh token (for logout)
     */
    revokeRefreshToken(token: string): Promise<void>;
    /**
     * Revoke all refresh tokens for a user (for logout from all devices)
     */
    revokeAllUserRefreshTokens(userId: string): Promise<void>;
    /**
     * Clean up expired tokens
     */
    cleanupExpiredTokens(): Promise<void>;
}
//# sourceMappingURL=token.service.d.ts.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenService = void 0;
const client_1 = require("@prisma/client");
const uuid_1 = require("uuid");
const prisma = new client_1.PrismaClient();
class TokenService {
    fastify;
    constructor(fastify) {
        this.fastify = fastify;
    }
    /**
     * Generate access token (JWT)
     */
    async generateAccessToken(payload) {
        return this.fastify.jwt.sign(payload, {
            expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '15m'
        });
    }
    /**
     * Generate refresh token
     */
    async generateRefreshToken(userId, ipAddress, userAgent) {
        const token = (0, uuid_1.v4)();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days default
        await prisma.refreshToken.create({
            data: {
                token,
                userId,
                expiresAt,
                ipAddress,
                userAgent
            }
        });
        return token;
    }
    /**
     * Rotate refresh token - invalidate old token and generate new one
     */
    async rotateRefreshToken(oldToken, ipAddress, userAgent) {
        const refreshToken = await prisma.refreshToken.findUnique({
            where: { token: oldToken },
            include: { user: true }
        });
        if (!refreshToken) {
            return null;
        }
        // Check if token is expired or revoked
        if (refreshToken.expiresAt < new Date() || refreshToken.revoked) {
            // Revoke all tokens for this user (potential token theft)
            await prisma.refreshToken.updateMany({
                where: { userId: refreshToken.userId },
                data: { revoked: true }
            });
            return null;
        }
        // Revoke the old token
        await prisma.refreshToken.update({
            where: { id: refreshToken.id },
            data: { revoked: true }
        });
        // Generate new tokens
        const payload = {
            id: refreshToken.user.id,
            email: refreshToken.user.email,
            role: refreshToken.user.role,
            storeId: refreshToken.user.storeId || undefined
        };
        const accessToken = await this.generateAccessToken(payload);
        const newRefreshToken = await this.generateRefreshToken(refreshToken.userId, ipAddress, userAgent);
        return {
            accessToken,
            refreshToken: newRefreshToken
        };
    }
    /**
     * Verify access token
     */
    async verifyAccessToken(token) {
        try {
            // Check if token is blacklisted
            const blacklisted = await prisma.blacklistedToken.findUnique({
                where: { token }
            });
            if (blacklisted) {
                return null;
            }
            const decoded = this.fastify.jwt.verify(token);
            return decoded;
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Blacklist a token (for logout)
     */
    async blacklistToken(token, expiresAt) {
        try {
            await prisma.blacklistedToken.create({
                data: {
                    token,
                    expiresAt
                }
            });
        }
        catch (error) {
            // Token might already be blacklisted, ignore
        }
    }
    /**
     * Revoke refresh token (for logout)
     */
    async revokeRefreshToken(token) {
        await prisma.refreshToken.updateMany({
            where: { token },
            data: { revoked: true }
        });
    }
    /**
     * Revoke all refresh tokens for a user (for logout from all devices)
     */
    async revokeAllUserRefreshTokens(userId) {
        await prisma.refreshToken.updateMany({
            where: { userId },
            data: { revoked: true }
        });
    }
    /**
     * Clean up expired tokens
     */
    async cleanupExpiredTokens() {
        const now = new Date();
        // Delete expired refresh tokens
        await prisma.refreshToken.deleteMany({
            where: { expiresAt: { lt: now } }
        });
        // Delete expired blacklisted tokens
        await prisma.blacklistedToken.deleteMany({
            where: { expiresAt: { lt: now } }
        });
    }
}
exports.TokenService = TokenService;
//# sourceMappingURL=token.service.js.map
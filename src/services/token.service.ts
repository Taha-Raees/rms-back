import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

export interface JwtPayload {
  id: string;
  email: string;
  role: string;
  storeId?: string;
}

export class TokenService {
  private fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
  }

  /**
   * Generate access token (JWT)
   */
  async generateAccessToken(payload: JwtPayload): Promise<string> {
    return this.fastify.jwt.sign(payload, {
      expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '15m'
    });
  }

  /**
   * Generate refresh token
   */
  async generateRefreshToken(userId: string, ipAddress?: string, userAgent?: string): Promise<string> {
    const token = uuidv4();
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
  async rotateRefreshToken(oldToken: string, ipAddress?: string, userAgent?: string): Promise<{ accessToken: string; refreshToken: string } | null> {
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
    const payload: JwtPayload = {
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
  async verifyAccessToken(token: string): Promise<JwtPayload | null> {
    try {
      // Check if token is blacklisted
      const blacklisted = await prisma.blacklistedToken.findUnique({
        where: { token }
      });

      if (blacklisted) {
        return null;
      }

      const decoded = this.fastify.jwt.verify(token) as JwtPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }

  /**
   * Blacklist a token (for logout)
   */
  async blacklistToken(token: string, expiresAt: Date): Promise<void> {
    try {
      await prisma.blacklistedToken.create({
        data: {
          token,
          expiresAt
        }
      });
    } catch (error) {
      // Token might already be blacklisted, ignore
    }
  }

  /**
   * Revoke refresh token (for logout)
   */
  async revokeRefreshToken(token: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { token },
      data: { revoked: true }
    });
  }

  /**
   * Revoke all refresh tokens for a user (for logout from all devices)
   */
  async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { userId },
      data: { revoked: true }
      });
  }

  /**
   * Clean up expired tokens
   */
  async cleanupExpiredTokens(): Promise<void> {
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

# Authentication System Documentation

## Overview

This document describes the new JWT-based authentication system with refresh token rotation that replaces the old session-based authentication system.

## Key Features

1. **JWT Tokens**: Uses JSON Web Tokens for stateless authentication
2. **Refresh Token Rotation**: Implements secure refresh token rotation for enhanced security
3. **Token Blacklisting**: Supports logout functionality through token blacklisting
4. **Rate Limiting**: Built-in rate limiting for authentication endpoints
5. **Automatic Cleanup**: Periodic cleanup of expired tokens

## Token Flow

### Login Process
1. User submits credentials
2. Server validates credentials
3. Server generates:
   - Access Token (15 minutes expiry)
   - Refresh Token (7 days expiry)
4. Tokens are stored in secure HTTP-only cookies
5. Refresh tokens are stored in the database with metadata

### Token Refresh Process
1. Client sends refresh token
2. Server validates refresh token
3. If valid, server:
   - Revokes the old refresh token
   - Generates new access and refresh tokens
   - Returns new tokens to client
4. If invalid/expired, server revokes all user tokens (security measure)

### Logout Process
1. Client sends logout request
2. Server:
   - Blacklists the access token
   - Revokes the refresh token
   - Clears cookies

## Security Features

### Refresh Token Rotation
- Each refresh token can only be used once
- Using an already-used refresh token triggers security measures
- All user tokens are revoked if token theft is detected

### Token Blacklisting
- Access tokens are blacklisted on logout
- Blacklisted tokens are checked during verification
- Automatic cleanup of expired blacklisted tokens

### Rate Limiting
- Login: 10 requests per 15 minutes per IP
- Refresh: 20 requests per 15 minutes per IP
- General auth: 5 requests per 15 minutes per IP

## API Endpoints

### Store User Authentication
- `POST /auth/login` - Login store user
- `GET /auth/me` - Get current user info
- `POST /auth/logout` - Logout user
- `POST /auth/refresh` - Refresh tokens

## Environment Variables

```env
# JWT Configuration
JWT_SECRET="your-jwt-secret-key"
JWT_ACCESS_TOKEN_EXPIRES_IN="15m"
JWT_REFRESH_TOKEN_EXPIRES_IN="7d"
```

## Database Schema

### Refresh Tokens
```prisma
model RefreshToken {
  id              String   @id @default(cuid())
  token           String   @unique
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt       DateTime
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  revoked         Boolean  @default(false)
  replacedByToken String?
  ipAddress       String?
  userAgent       String?

  @@index([userId])
  @@index([expiresAt])
  @@index([revoked])
}
```

### Blacklisted Tokens
```prisma
model BlacklistedToken {
  id        String   @id @default(cuid())
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@index([expiresAt])
}
```

## Implementation Details

### Token Service
The `TokenService` class handles all token operations:
- JWT generation and verification
- Refresh token generation and rotation
- Token blacklisting
- Database cleanup

### Middleware
Authentication middleware is available in `auth.middleware.ts`:
- `authenticateUser` - General user authentication
- `authenticateStoreUser` - Store user authentication

### Rate Limiting
Rate limiting middleware in `rate-limiter.ts`:
- Configurable rate limits
- IP-based tracking
- Pre-configured limiters for common use cases

## Migration from Old System

### Breaking Changes
- Session cookies are no longer used
- New cookie names: `store-token`, `store-refresh-token`
- Token format changed from `session_userId_timestamp` to JWT

### Backward Compatibility
- Old session endpoints return 501 Not Implemented
- Old middleware files are deprecated but preserved

## Testing

### Authentication Flow Testing
1. Login and verify token generation
2. Access protected routes with valid tokens
3. Test token refresh functionality
4. Test logout and token invalidation
5. Test rate limiting

### Security Testing
1. Attempt to use expired tokens
2. Attempt to use blacklisted tokens
3. Attempt to reuse refresh tokens
4. Test concurrent login scenarios
5. Test cross-site request forgery protection

## Best Practices

### Client-Side Implementation
1. Always use secure HTTP-only cookies
2. Implement automatic token refresh
3. Handle 401 responses gracefully
4. Clear all auth data on logout
5. Store minimal user data in localStorage/sessionStorage

### Server-Side Implementation
1. Validate all tokens before processing requests
2. Implement proper error handling
3. Log authentication events
4. Monitor for suspicious activity
5. Regular database cleanup of expired tokens

## Troubleshooting

### Common Issues
1. **401 Unauthorized**: Token expired or invalid
2. **429 Too Many Requests**: Rate limit exceeded
3. **500 Internal Server Error**: Database or configuration issues

### Debugging Steps
1. Check token expiration times
2. Verify JWT secret configuration
3. Check database connectivity
4. Review server logs
5. Test with fresh tokens

## Future Enhancements

### Planned Features
1. Multi-factor authentication support
2. Device management
3. Session monitoring dashboard
4. Advanced rate limiting strategies
5. Token usage analytics

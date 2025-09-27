# Retail Management Backend

Fastify-based backend for the retail management system with Prisma ORM, PostgreSQL database, and AI-powered chat functionality.

## Setup Instructions

### 1. Environment Variables

Copy the example environment file and configure your settings:

```bash
cp .env.example .env
```

Edit the `.env` file with your actual configuration:

#### Required Environment Variables

- `DATABASE_URL`: Your PostgreSQL database connection string
- `JWT_SECRET`: Strong secret key for JWT tokens (generate randomly)
- `SESSION_SECRET`: Strong secret key for sessions (generate randomly)
- `OPENROUTER_API_KEY`: API key from OpenRouter.ai (see below)

### 2. OpenRouter API Setup

The AI chat functionality requires an OpenRouter API key:

1. Visit [OpenRouter.ai](https://openrouter.ai/keys)
2. Create an account and generate an API key
3. Add the key to your `.env` file:
   ```
   OPENROUTER_API_KEY=your-actual-api-key-here
   ```

**⚠️ Security Warning:**
- Never commit your `.env` file to version control
- The `.env` file is already in `.gitignore`
- Share your API key with your development team securely (environment variables, secrets management)

### 3. Database Setup

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm prisma:generate

# Run database migrations
pnpm prisma:push

# (Optional) Seed the database
pnpm prisma:seed
```

### 4. Development

```bash
# Start development server
pnpm dev
```

The server will start on `http://localhost:3001`

## API Routes

### Authentication
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `GET /auth/me` - Get current user info

### Chat (AI Assistant)
- `POST /chat/message` - Send message to AI assistant
- `GET /chat/health` - Check AI service health

### Other Routes
- `/products` - Product management
- `/orders` - Order management
- `/inventory` - Inventory management
- `/analytics` - Analytics data

## Security Features

- JWT-based authentication with access/refresh tokens
- Store-level data isolation
- Rate limiting
- Input validation with Zod schemas
- CORS protection
- Session management

## Database Schema

The application uses Prisma ORM with PostgreSQL:

- **Store**: Multi-tenant store management
- **User**: Store-specific user accounts
- **Product**: Inventory management with variants
- **Order**: Transaction management with items
- **AnalyticsData**: Business intelligence data
- **AuditLog**: Change tracking and compliance

See `prisma/schema.prisma` for complete schema definition.

## Production Deployment

Make sure to set all environment variables in your production environment:

```bash
export DATABASE_URL="your-production-db-url"
export JWT_SECRET="strong-production-secret"
export SESSION_SECRET="strong-session-secret"
export OPENROUTER_API_KEY="your-openrouter-key"
export NODE_ENV="production"
```

## API Documentation

The AI chat feature provides:

- Business intelligence analysis
- Sales trend identification
- Inventory optimization recommendations
- Customer behavior insights
- Strategic planning assistance

All chat responses are isolated to the user's store and business context.

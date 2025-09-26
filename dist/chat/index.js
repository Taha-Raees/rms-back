"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = chatRoutes;
const auth_middleware_1 = require("../middleware/auth.middleware");
const token_service_1 = require("../services/token.service");
const prisma_1 = __importDefault(require("../lib/prisma"));
const zod_1 = require("zod");
const MessageSchema = zod_1.z.object({
    message: zod_1.z.string().min(1).max(2000),
    conversationHistory: zod_1.z.array(zod_1.z.object({
        role: zod_1.z.enum(['user', 'assistant']),
        content: zod_1.z.string(),
    })).optional().default([]),
});
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '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';
const MODEL = 'x-ai/grok-4-fast:free';
async function chatRoutes(fastify) {
    const tokenService = new token_service_1.TokenService(fastify);
    // Add authentication hook for all chat routes
    fastify.addHook('preHandler', async (request, reply) => {
        await (0, auth_middleware_1.authenticateStoreUser)(request, reply, tokenService);
    });
    // POST /chat/message - Send a message and get AI response
    fastify.post('/message', {
        schema: {
            body: {
                type: 'object',
                required: ['message'],
                properties: {
                    message: { type: 'string', minLength: 1, maxLength: 2000 },
                    conversationHistory: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                role: { type: 'string', enum: ['user', 'assistant'] },
                                content: { type: 'string' },
                            },
                        },
                    },
                },
            },
        },
    }, async (request, reply) => {
        try {
            const { message, conversationHistory } = request.body;
            const storeId = request.user.storeId;
            if (!storeId) {
                return reply.status(400).send({
                    success: false,
                    error: 'Store ID is required for chat functionality',
                });
            }
            // Validate input
            try {
                MessageSchema.parse(request.body);
            }
            catch (validationError) {
                return reply.status(400).send({
                    success: false,
                    error: 'Invalid message format',
                    details: validationError.errors,
                });
            }
            // Get comprehensive store data for context
            const storeData = await getStoreCompleteData(storeId);
            // Prepare system prompt
            const systemPrompt = `You are an AI assistant for ${storeData.store.name} (${storeData.store.businessType}) retail business.

Your role: You are an expert business analyst, strategist, and assistant specifically for this retail store. You have access to all the store's data and can provide insights, analysis, recommendations, and answer any questions about the business.

IMPORTANT RULES:
- Only use data from this specific store. Never provide general advice or mention other businesses.
- You can perform complex analysis: sales trends, inventory management, customer behavior, profitability, optimization suggestions.
- Be proactive in identifying opportunities and potential issues.
- Provide actionable insights and specific recommendations based on the data.
- If asked about something not in the data, say so clearly.

STORE DATA:
${JSON.stringify(storeData, null, 2)}

CONVERSATION HISTORY:
${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

USER QUESTION: ${message}`;
            // Prepare messages for OpenRouter API
            const messages = [
                {
                    role: 'user',
                    content: systemPrompt,
                },
            ];
            // Add conversation history if provided
            if (conversationHistory && conversationHistory.length > 0) {
                // Only add last 5 pairs to avoid token limit
                const recentHistory = conversationHistory.slice(-10);
                messages.unshift(...recentHistory.map(msg => ({
                    role: 'user',
                    content: msg.content,
                })));
            }
            try {
                // Call OpenRouter API
                const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'https://your-site.com', // Optional
                        'X-Title': 'Retail Management Chatbot', // Optional
                    },
                    body: JSON.stringify({
                        model: MODEL,
                        messages: messages,
                        temperature: 0.7,
                        max_tokens: 2048,
                        top_p: 0.9,
                    }),
                });
                if (!response.ok) {
                    const errorData = await response.text();
                    fastify.log.error(`OpenRouter API error: ${errorData}`);
                    return reply.status(500).send({
                        success: false,
                        error: 'Failed to get AI response',
                    });
                }
                const aiResponse = await response.json();
                if (!aiResponse.choices || !aiResponse.choices[0]) {
                    return reply.status(500).send({
                        success: false,
                        error: 'Invalid AI response format',
                    });
                }
                const aiMessage = aiResponse.choices[0].message.content;
                return reply.status(200).send({
                    success: true,
                    data: {
                        message: aiMessage,
                        model: MODEL,
                        timestamp: new Date().toISOString(),
                    },
                });
            }
            catch (apiError) {
                fastify.log.error('OpenRouter API call failed:', apiError);
                return reply.status(500).send({
                    success: false,
                    error: 'AI service temporarily unavailable',
                });
            }
        }
        catch (error) {
            fastify.log.error('Chat message error:', error);
            return reply.status(500).send({
                success: false,
                error: 'Internal server error',
            });
        }
    });
    // GET /chat/health - Check if chat service is available
    fastify.get('/health', async (request, reply) => {
        try {
            const response = await fetch('https://openrouter.ai/api/v1/models', {
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                },
            });
            return reply.status(200).send({
                success: true,
                data: {
                    service: 'OpenRouter',
                    model: MODEL,
                    available: response.ok,
                    timestamp: new Date().toISOString(),
                },
            });
        }
        catch (error) {
            return reply.status(500).send({
                success: false,
                error: 'Chat service health check failed',
            });
        }
    });
}
// Comprehensive store data aggregation function
async function getStoreCompleteData(storeId) {
    try {
        // Start with minimal data first for testing
        const store = await prisma_1.default.store.findUnique({
            where: { id: storeId },
            select: {
                id: true,
                name: true,
                businessType: true,
                currency: true,
                currencySymbol: true,
                taxRate: true,
            },
        });
        if (!store) {
            throw new Error('Store not found');
        }
        return {
            store: {
                id: store.id,
                name: store.name,
                businessType: store.businessType,
                currency: store.currency,
                currencySymbol: store.currencySymbol,
                taxRate: store.taxRate,
                message: "AI analysis coming soon - testing basic connection"
            }
        };
        /* Uncomment below when basic connection works
        // Get basic counts
        const orderCount = await prisma.order.count({ where: { storeId } });
        const productCount = await prisma.product.count({ where: { storeId, deletedAt: null } });
        const customerCount = await prisma.customer.count({ where: { storeId } });
    
        const summaryData = {
          store: {
            id: store.id,
            name: store.name,
            businessType: store.businessType,
            currency: store.currency,
            currencySymbol: store.currencySymbol,
            taxRate: store.taxRate,
            metrics: {
              totalOrders: orderCount,
              totalProducts: productCount,
              totalCustomers: customerCount,
            }
          }
        };
    
        return summaryData;
        */
    }
    catch (error) {
        console.error('Error aggregating store data:', error);
        // Return basic store info even on error
        return {
            store: {
                id: storeId,
                name: 'Store',
                businessType: 'GENERAL',
                message: "Unable to load full store data"
            }
        };
    }
}
//# sourceMappingURL=index.js.map
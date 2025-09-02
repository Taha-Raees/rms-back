"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = analyticsRoutes;
const dashboard_1 = __importDefault(require("./dashboard"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const token_service_1 = require("../services/token.service");
async function analyticsRoutes(fastify) {
    const tokenService = new token_service_1.TokenService(fastify);
    // Add authentication hook for all analytics routes
    fastify.addHook('preHandler', async (request, reply) => {
        await (0, auth_middleware_1.authenticateStoreUser)(request, reply, tokenService);
    });
    fastify.register(dashboard_1.default, { prefix: '/dashboard' });
}
//# sourceMappingURL=index.js.map
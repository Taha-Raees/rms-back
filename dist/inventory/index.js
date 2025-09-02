"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = inventoryRoutes;
const alerts_1 = __importDefault(require("./alerts"));
const stock_1 = __importDefault(require("./stock"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const token_service_1 = require("../services/token.service");
async function inventoryRoutes(fastify) {
    const tokenService = new token_service_1.TokenService(fastify);
    // Add authentication hook for all inventory routes
    fastify.addHook('preHandler', async (request, reply) => {
        await (0, auth_middleware_1.authenticateStoreUser)(request, reply, tokenService);
    });
    fastify.register(alerts_1.default, { prefix: '/alerts' });
    fastify.register(stock_1.default, { prefix: '/stock' });
}
//# sourceMappingURL=index.js.map
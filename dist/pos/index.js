"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = posRoutes;
const calculate_1 = __importDefault(require("./calculate"));
const checkout_1 = __importDefault(require("./checkout"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const token_service_1 = require("../services/token.service");
async function posRoutes(fastify) {
    const tokenService = new token_service_1.TokenService(fastify);
    // Add authentication hook for all POS routes
    fastify.addHook('preHandler', async (request, reply) => {
        await (0, auth_middleware_1.authenticateStoreUser)(request, reply, tokenService);
    });
    fastify.register(calculate_1.default, { prefix: '/calculate' });
    fastify.register(checkout_1.default, { prefix: '/checkout' });
}
//# sourceMappingURL=index.js.map
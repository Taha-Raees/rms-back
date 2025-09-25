"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWebSocketServer = createWebSocketServer;
exports.getWebSocketServer = getWebSocketServer;
const socket_io_1 = require("socket.io");
// Global Socket.IO server instance
let io;
function createWebSocketServer(fastify) {
    console.log('Creating WebSocket server...');
    // Attach Socket.IO to Fastify's HTTP server
    const { server } = fastify;
    io = new socket_io_1.Server(server, {
        cors: {
            origin: ['http://localhost:3000', 'http://192.168.2.107:3000'],
            methods: ['GET', 'POST'],
            credentials: true
        }
    });
    // Store connections by store ID for broadcasting
    const storeConnections = new Map();
    // Handle Socket.IO connections
    io.on('connection', (socket) => {
        const storeId = socket.handshake.auth?.storeId || 'demo-store-001';
        console.log('Socket.IO connection established for store:', storeId);
        // Add connection to store group
        if (!storeConnections.has(storeId)) {
            storeConnections.set(storeId, []);
        }
        storeConnections.get(storeId).push(socket);
        // Send connection confirmation
        socket.emit('connection_established', {
            type: 'connection_established',
            data: { message: `Connected to WebSocket server for store: ${storeId}`, storeId },
            timestamp: new Date()
        });
        // Handle POS events
        socket.on('pos_cart_update', (data) => {
            console.log('Received pos_cart_update:', data);
            // Broadcast to other sockets in the same store
            const connections = storeConnections.get(storeId) || [];
            connections.forEach(conn => {
                if (conn !== socket && conn.connected) {
                    conn.emit('pos_cart_update', data);
                }
            });
        });
        socket.on('pos_payment_started', (data) => {
            console.log('Received pos_payment_started:', data);
            // Broadcast to other sockets in the same store
            const connections = storeConnections.get(storeId) || [];
            connections.forEach(conn => {
                if (conn !== socket && conn.connected) {
                    conn.emit('pos_payment_started', data);
                }
            });
        });
        socket.on('pos_order_completed', (data) => {
            console.log('Received pos_order_completed:', data);
            // Broadcast to other sockets in the same store
            const connections = storeConnections.get(storeId) || [];
            connections.forEach(conn => {
                if (conn !== socket && conn.connected) {
                    conn.emit('pos_order_completed', data);
                }
            });
        });
        socket.on('pos_cart_cleared', (data) => {
            console.log('Received pos_cart_cleared:', data);
            // Broadcast to other sockets in the same store
            const connections = storeConnections.get(storeId) || [];
            connections.forEach(conn => {
                if (conn !== socket && conn.connected) {
                    conn.emit('pos_cart_cleared', data);
                }
            });
        });
        socket.on('ping', () => {
            socket.emit('pong');
        });
        // Handle disconnection
        socket.on('disconnect', () => {
            console.log('Socket.IO connection closed');
            // Remove connection from store group
            const connections = storeConnections.get(storeId) || [];
            const index = connections.indexOf(socket);
            if (index > -1) {
                connections.splice(index, 1);
            }
            if (connections.length === 0) {
                storeConnections.delete(storeId);
            }
        });
    });
    console.log('WebSocket server created successfully');
    return io;
}
function getWebSocketServer() {
    return io;
}
//# sourceMappingURL=index.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = void 0;
const app_1 = require("./app");
Object.defineProperty(exports, "server", { enumerable: true, get: function () { return app_1.server; } });
const PORT = process.env.PORT || 3001;
app_1.server.listen(PORT, () => {
    console.log(`🚀 Claude App Builder API server started on port ${PORT}`);
    console.log(`📡 WebSocket server ready for connections`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`📊 API endpoints: http://localhost:${PORT}/api`);
});
// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    app_1.server.close(() => {
        console.log('Server closed.');
        process.exit(0);
    });
});
process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    app_1.server.close(() => {
        console.log('Server closed.');
        process.exit(0);
    });
});
//# sourceMappingURL=server.js.map
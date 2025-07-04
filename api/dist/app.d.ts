import { WebSocketService } from './services/websocket-service';
declare const app: import("express-serve-static-core").Express;
declare const server: import("http").Server<typeof import("http").IncomingMessage, typeof import("http").ServerResponse>;
declare const webSocketService: WebSocketService;
export declare function createApp(workflowService?: any, fileService?: any, webSocketService?: any): import("express-serve-static-core").Express;
export { app, server, webSocketService };
//# sourceMappingURL=app.d.ts.map
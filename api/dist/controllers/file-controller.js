"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileController = void 0;
class FileController {
    constructor(fileService) {
        this.fileService = fileService;
    }
    async getTodos(req, res) {
        try {
            const todos = await this.fileService.readTodoFile();
            const response = {
                success: true,
                data: todos,
                timestamp: new Date()
            };
            res.json(response);
        }
        catch (error) {
            const response = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date()
            };
            res.status(500).json(response);
        }
    }
    async addTodo(req, res) {
        try {
            const { content, priority } = req.body;
            if (!content || typeof content !== 'string') {
                const response = {
                    success: false,
                    error: 'Content is required and must be a string',
                    timestamp: new Date()
                };
                res.status(400).json(response);
                return;
            }
            const todo = await this.fileService.addTodo(content, priority);
            const response = {
                success: true,
                data: todo,
                timestamp: new Date()
            };
            res.json(response);
        }
        catch (error) {
            const response = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date()
            };
            res.status(500).json(response);
        }
    }
    async updateTodo(req, res) {
        try {
            const { id } = req.params;
            const updates = req.body;
            const todo = await this.fileService.updateTodo(id, updates);
            const response = {
                success: true,
                data: todo,
                timestamp: new Date()
            };
            res.json(response);
        }
        catch (error) {
            const response = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date()
            };
            res.status(404).json(response);
        }
    }
    async deleteTodo(req, res) {
        try {
            const { id } = req.params;
            await this.fileService.deleteTodo(id);
            const response = {
                success: true,
                data: { deleted: true },
                timestamp: new Date()
            };
            res.json(response);
        }
        catch (error) {
            const response = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date()
            };
            res.status(404).json(response);
        }
    }
    async getMemory(req, res) {
        try {
            const content = await this.fileService.readMemoryFile();
            const response = {
                success: true,
                data: { content },
                timestamp: new Date()
            };
            res.json(response);
        }
        catch (error) {
            const response = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date()
            };
            res.status(500).json(response);
        }
    }
    async updateMemory(req, res) {
        try {
            const { content } = req.body;
            if (typeof content !== 'string') {
                const response = {
                    success: false,
                    error: 'Content must be a string',
                    timestamp: new Date()
                };
                res.status(400).json(response);
                return;
            }
            await this.fileService.writeMemoryFile(content);
            const response = {
                success: true,
                data: { updated: true },
                timestamp: new Date()
            };
            res.json(response);
        }
        catch (error) {
            const response = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date()
            };
            res.status(500).json(response);
        }
    }
    async backupFiles(req, res) {
        try {
            const backupInfo = await this.fileService.backupFiles();
            const response = {
                success: true,
                data: backupInfo,
                timestamp: new Date()
            };
            res.json(response);
        }
        catch (error) {
            const response = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date()
            };
            res.status(500).json(response);
        }
    }
}
exports.FileController = FileController;
//# sourceMappingURL=file-controller.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileService = exports.filesRouter = void 0;
const express_1 = require("express");
const file_controller_1 = require("../controllers/file-controller");
const file_service_1 = require("../services/file-service");
const router = (0, express_1.Router)();
exports.filesRouter = router;
const fileService = new file_service_1.FileService();
exports.fileService = fileService;
const fileController = new file_controller_1.FileController(fileService);
// GET /api/files/todos - Get all todos
router.get('/todos', (req, res) => fileController.getTodos(req, res));
// POST /api/files/todos - Add new todo
router.post('/todos', (req, res) => fileController.addTodo(req, res));
// PUT /api/files/todos/:id - Update todo
router.put('/todos/:id', (req, res) => fileController.updateTodo(req, res));
// DELETE /api/files/todos/:id - Delete todo
router.delete('/todos/:id', (req, res) => fileController.deleteTodo(req, res));
// GET /api/files/memory - Get memory content
router.get('/memory', (req, res) => fileController.getMemory(req, res));
// PUT /api/files/memory - Update memory content
router.put('/memory', (req, res) => fileController.updateMemory(req, res));
// POST /api/files/backup - Backup files
router.post('/backup', (req, res) => fileController.backupFiles(req, res));
//# sourceMappingURL=files.js.map
import { Router } from 'express';
import { FileController } from '../controllers/file-controller';
import { FileService } from '../services/file-service';

const router = Router();
const fileService = new FileService();
const fileController = new FileController(fileService);

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

export { router as filesRouter, fileService };
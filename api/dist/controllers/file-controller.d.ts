import { Request, Response } from 'express';
import { FileService } from '../services/file-service';
export declare class FileController {
    private fileService;
    constructor(fileService: FileService);
    getTodos(req: Request, res: Response): Promise<void>;
    addTodo(req: Request, res: Response): Promise<void>;
    updateTodo(req: Request, res: Response): Promise<void>;
    deleteTodo(req: Request, res: Response): Promise<void>;
    getMemory(req: Request, res: Response): Promise<void>;
    updateMemory(req: Request, res: Response): Promise<void>;
    backupFiles(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=file-controller.d.ts.map
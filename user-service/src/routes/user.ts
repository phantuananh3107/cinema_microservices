import { Router, Request, Response, NextFunction } from 'express';
import { UserController } from '../controllers/userController.js';
import DatabaseManager from '../config/database.js';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();
const models = DatabaseManager.getInstance().getModels();
const userController = new UserController(models);

const handleAsync = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

const handleAsyncAuth = (fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req as AuthenticatedRequest, res, next)).catch(next);
  };
};

router.get('/:userId', handleAsync(userController.getUserById));

router.put('/:userId', authenticateToken, handleAsyncAuth(userController.updateUser));

router.get('/admin/users', authenticateToken, requireRole(['admin', 'manager_staff']), handleAsyncAuth(userController.getAllUsers));
router.get('/admin/staffs', authenticateToken, requireRole(['admin', 'manager_staff']), handleAsyncAuth(userController.getAllStaffs));
router.delete('/:userId', authenticateToken, requireRole(['admin']), handleAsyncAuth(userController.deleteUser));

export default router;

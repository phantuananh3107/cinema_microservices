import { Router, Request, Response, NextFunction } from 'express';
import { RoleController } from '../controllers/roleController.js';
import DatabaseManager from '../config/database.js';
import { authenticateToken, requirePermission } from '../middleware/auth.js';

const router = Router();
const models = DatabaseManager.getInstance().getModels();
const roleController = new RoleController(models);

const handleAsync = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

router.get(
  '/roles',
  authenticateToken,
  requirePermission(['permission_manage']),
  handleAsync(roleController.getAllRoles)
);

router.get(
  '/permissions',
  authenticateToken,
  requirePermission(['permission_manage']),
  handleAsync(roleController.getAllPermissions)
);

router.get(
  '/roles/:roleId/permissions',
  authenticateToken,
  requirePermission(['permission_manage']),
  handleAsync(roleController.getRolePermissions)
);

router.put(
  '/roles/:roleId/permissions',
  authenticateToken,
  requirePermission(['permission_manage']),
  handleAsync(roleController.updateRolePermissions)
);

router.post(
  '/roles/:roleId/permissions',
  authenticateToken,
  requirePermission(['permission_manage']),
  handleAsync(roleController.assignPermission)
);

router.delete(
  '/roles/:roleId/permissions/:permissionId',
  authenticateToken,
  requirePermission(['permission_manage']),
  handleAsync(roleController.unassignPermission)
);

export default router;

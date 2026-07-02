import { Request, Response, NextFunction } from 'express';
import { Models } from '../models/models.js';
import { RoleService } from '../services/roleService.js';
import { HttpStatus, IApiResponse } from '../types/index.js';
import type { IPermission, IRoleWithPermissions, IUpdateRolePermissionsRequest, IAssignPermissionRequest } from '../types/index.js';

export class RoleController {
  private roleService: RoleService;

  constructor(models: Models) {
    this.roleService = new RoleService(models);
  }

  // GET /api/roles
  public getAllRoles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const roles = await this.roleService.getAllRoles();

      const response: IApiResponse = {
        success: true,
        message: 'Roles retrieved successfully',
        data: roles,
        status: HttpStatus.OK
      };

      res.status(HttpStatus.OK).json(response);
    } catch (error) {
      next(error);
    }
  };

  // GET /api/permissions
  public getAllPermissions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const permissions = await this.roleService.getAllPermissions();

      const response: IApiResponse = {
        success: true,
        message: 'Permissions retrieved successfully',
        data: permissions,
        status: HttpStatus.OK
      };

      res.status(HttpStatus.OK).json(response);
    } catch (error) {
      next(error);
    }
  };

  // GET /api/roles/:roleId/permissions
  public getRolePermissions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { roleId } = req.params;
      const roleWithPermissions = await this.roleService.getRoleWithPermissions(roleId);

      const response: IApiResponse<IRoleWithPermissions> = {
        success: true,
        message: 'Role permissions retrieved successfully',
        data: roleWithPermissions,
        status: HttpStatus.OK
      };

      res.status(HttpStatus.OK).json(response);
    } catch (error: any) {
      if (error.message === 'Role not found') {
        const response: IApiResponse = {
          success: false,
          message: error.message,
          status: HttpStatus.NOT_FOUND
        };
        res.status(HttpStatus.NOT_FOUND).json(response);
        return;
      }
      next(error);
    }
  };

  // PUT /api/roles/:roleId/permissions
  public updateRolePermissions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { roleId } = req.params;
      const { permission_ids }: IUpdateRolePermissionsRequest = req.body;

      if (!Array.isArray(permission_ids)) {
        const response: IApiResponse = {
          success: false,
          message: 'permission_ids must be an array',
          status: HttpStatus.BAD_REQUEST
        };
        res.status(HttpStatus.BAD_REQUEST).json(response);
        return;
      }

      await this.roleService.updateRolePermissions(roleId, permission_ids);

      const response: IApiResponse = {
        success: true,
        message: 'Role permissions updated successfully',
        status: HttpStatus.OK
      };

      res.status(HttpStatus.OK).json(response);
    } catch (error: any) {
      if (error.message === 'Role not found') {
        const response: IApiResponse = {
          success: false,
          message: error.message,
          status: HttpStatus.NOT_FOUND
        };
        res.status(HttpStatus.NOT_FOUND).json(response);
        return;
      }
      next(error);
    }
  };

  // POST /api/roles/:roleId/permissions
  public assignPermission = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { roleId } = req.params;
      const { permission_id }: IAssignPermissionRequest = req.body;

      if (!permission_id) {
        const response: IApiResponse = {
          success: false,
          message: 'permission_id is required',
          status: HttpStatus.BAD_REQUEST
        };
        res.status(HttpStatus.BAD_REQUEST).json(response);
        return;
      }

      await this.roleService.assignPermission(roleId, permission_id);

      const response: IApiResponse = {
        success: true,
        message: 'Permission assigned successfully',
        status: HttpStatus.OK
      };

      res.status(HttpStatus.OK).json(response);
    } catch (error: any) {
      if (error.message === 'Permission already assigned to this role') {
        const response: IApiResponse = {
          success: false,
          message: error.message,
          status: HttpStatus.BAD_REQUEST
        };
        res.status(HttpStatus.BAD_REQUEST).json(response);
        return;
      }
      next(error);
    }
  };

  // DELETE /api/roles/:roleId/permissions/:permissionId
  public unassignPermission = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { roleId, permissionId } = req.params;

      await this.roleService.unassignPermission(roleId, permissionId);

      const response: IApiResponse = {
        success: true,
        message: 'Permission unassigned successfully',
        status: HttpStatus.OK
      };

      res.status(HttpStatus.OK).json(response);
    } catch (error: any) {
      if (error.message === 'Permission not found for this role') {
        const response: IApiResponse = {
          success: false,
          message: error.message,
          status: HttpStatus.NOT_FOUND
        };
        res.status(HttpStatus.NOT_FOUND).json(response);
        return;
      }
      next(error);
    }
  };
}

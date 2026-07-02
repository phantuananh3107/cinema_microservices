import { Models } from '../models/models.js';
import { ErrorMessages } from '../types/index.js';
import type { IPermission, IRole, IRoleWithPermissions } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { Op } from 'sequelize';

export class RoleService {
  private models: Models;
  private authGrpcClient: any = null;

  constructor(models: Models) {
    this.models = models;
  }

  private getAuthGrpcClient(): any {
    if (this.authGrpcClient) return this.authGrpcClient;

    try {
      const authGrpcAddress = process.env.AUTH_GRPC_ADDRESS || 'auth-service:50052';
      const PROTO_PATH = path.resolve(process.cwd(), 'proto/auth.proto');
      
      const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
      });

      const proto = grpc.loadPackageDefinition(packageDefinition) as any;
      const authService = proto.pb;
      this.authGrpcClient = new authService.AuthService(authGrpcAddress, grpc.credentials.createInsecure());

      return this.authGrpcClient;
    } catch (error: any) {
      console.error('Failed to initialize auth gRPC client:', error);
      return null;
    }
  }

  public async getAllRoles(): Promise<IRole[]> {
    const roles = await this.models.Role.findAll({
      where: {
        name: {
          [Op.notIn]: ['customer']
        }
      },
      order: [['name', 'ASC']]
    });
    return roles.map(r => r.toJSON());
  }

  public async getAllPermissions(): Promise<IPermission[]> {
    const permissions = await this.models.Permission.findAll({
      order: [['name', 'ASC']]
    });
    return permissions.map(p => p.toJSON());
  }

  public async getRoleWithPermissions(roleId: string): Promise<IRoleWithPermissions> {
    if (!roleId) {
      throw new Error(ErrorMessages.INVALID_REQUEST);
    }

    const role = await this.models.Role.findOne({
      where: { id: roleId }
    });

    if (!role) {
      throw new Error('Role not found');
    }

    const rolePermissions = await this.models.RolePermission.findAll({
      where: { role_id: roleId },
      include: [{
        model: this.models.Permission,
        as: 'permission'
      }]
    });

    const permissions = rolePermissions.map((rp: any) => rp.permission?.toJSON()).filter(Boolean);

    return {
      ...role.toJSON(),
      permissions
    };
  }

  public async updateRolePermissions(roleId: string, permissionIds: string[]): Promise<void> {
    if (!roleId) {
      throw new Error(ErrorMessages.INVALID_REQUEST);
    }

    const role = await this.models.Role.findOne({ where: { id: roleId } });
    if (!role) {
      throw new Error('Role not found');
    }

    const transaction = await this.models.sequelize.transaction();

    try {
      await this.models.RolePermission.destroy({
        where: { role_id: roleId },
        transaction
      });

      if (permissionIds.length > 0) {
        const rolePermissions = permissionIds.map(permissionId => ({
          id: uuidv4(),
          role_id: roleId,
          permission_id: permissionId
        }));

        await this.models.RolePermission.bulkCreate(rolePermissions, { transaction });
      }

      await transaction.commit();

      await this.clearAuthServicePermissionsCache(roleId).catch(err => {
        console.error('Failed to clear auth-service permissions cache:', err);
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  private async clearAuthServicePermissionsCache(roleId: string): Promise<void> {
    return new Promise<void>((resolve) => {
      const client = this.getAuthGrpcClient();
      if (!client) {
        console.error(`Failed to get auth gRPC client to clear permissions cache for role ${roleId}`);
        resolve(); // Don't throw - this is a best-effort operation
        return;
      }

      client.clearPermissionsCache({ role_id: roleId }, (error: any, response: any) => {
        if (error) {
          console.error(`Error clearing permissions cache for role ${roleId}:`, error.message);
          resolve(); // Don't throw - this is a best-effort operation
          return;
        }

        if (response && response.success) {
          console.log(`Permissions cache cleared for role: ${roleId}`);
        } else {
          console.warn(`Failed to clear permissions cache for role ${roleId}`);
        }
        resolve();
      });
    });
  }

  public async assignPermission(roleId: string, permissionId: string): Promise<void> {
    if (!roleId || !permissionId) {
      throw new Error(ErrorMessages.INVALID_REQUEST);
    }

    const existing = await this.models.RolePermission.findOne({
      where: { role_id: roleId, permission_id: permissionId }
    });

    if (existing) {
      throw new Error('Permission already assigned to this role');
    }

    await this.models.RolePermission.create({
      id: uuidv4(),
      role_id: roleId,
      permission_id: permissionId
    });

    await this.clearAuthServicePermissionsCache(roleId).catch(err => {
      console.error('Failed to clear auth-service permissions cache:', err);
    });
  }

  public async unassignPermission(roleId: string, permissionId: string): Promise<void> {
    if (!roleId || !permissionId) {
      throw new Error(ErrorMessages.INVALID_REQUEST);
    }

    const deleted = await this.models.RolePermission.destroy({
      where: { role_id: roleId, permission_id: permissionId }
    });

    if (deleted === 0) {
      throw new Error('Permission not found for this role');
    }
  }
}

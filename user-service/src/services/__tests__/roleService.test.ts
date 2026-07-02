import { RoleService } from '../roleService';
import { ErrorMessages } from '../../types';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

jest.mock('@grpc/grpc-js');
jest.mock('@grpc/proto-loader');
jest.mock('uuid', () => ({ v4: () => 'mock-uuid-v4' }));

describe('RoleService', () => {
  let roleService: RoleService;
  let mockModels: any;
  let mockGrpcClient: any;

  const mockRole = {
    id: 'r1',
    name: 'admin',
    description: 'Admin role',
    toJSON: jest.fn().mockReturnValue({ id: 'r1', name: 'admin', description: 'Admin role' })
  };

  const mockPermission = {
    id: 'p1',
    name: 'create_user',
    code: 'user.create',
    toJSON: jest.fn().mockReturnValue({ id: 'p1', name: 'create_user', code: 'user.create' })
  };

  const mockRolePermission = {
    role_id: 'r1',
    permission_id: 'p1',
    permission: mockPermission
  };

  beforeEach(() => {
    mockGrpcClient = {
      clearPermissionsCache: jest.fn((req: any, cb: any) => cb(null, { success: true }))
    };

    (grpc.loadPackageDefinition as jest.Mock).mockReturnValue({
      pb: {
        AuthService: jest.fn().mockReturnValue(mockGrpcClient)
      }
    });

    (protoLoader.loadSync as jest.Mock).mockReturnValue({});
    (grpc.credentials.createInsecure as jest.Mock).mockReturnValue({});

    mockModels = {
      Role: {
        findAll: jest.fn(),
        findOne: jest.fn()
      },
      Permission: {
        findAll: jest.fn()
      },
      RolePermission: {
        findAll: jest.fn(),
        findOne: jest.fn(),
        destroy: jest.fn(),
        bulkCreate: jest.fn(),
        create: jest.fn()
      },
      sequelize: {
        transaction: jest.fn().mockResolvedValue({
          commit: jest.fn(),
          rollback: jest.fn()
        })
      }
    };

    roleService = new RoleService(mockModels as any);
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  describe('getAllRoles', () => {
    test('should return all roles except customer', async () => {
      mockModels.Role.findAll.mockResolvedValue([mockRole]);
      const result = await roleService.getAllRoles();
      expect(result).toHaveLength(1);
      expect(mockModels.Role.findAll).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.any(Object)
      }));
    });
  });

  describe('getAllPermissions', () => {
    test('should return all permissions sorted by name', async () => {
      mockModels.Permission.findAll.mockResolvedValue([mockPermission]);
      const result = await roleService.getAllPermissions();
      expect(result).toHaveLength(1);
      expect(mockModels.Permission.findAll).toHaveBeenCalledWith(expect.objectContaining({
        order: [['name', 'ASC']]
      }));
    });
  });

  describe('getRoleWithPermissions', () => {
    test('should return role with its permissions', async () => {
      mockModels.Role.findOne.mockResolvedValue(mockRole);
      mockModels.RolePermission.findAll.mockResolvedValue([mockRolePermission]);

      const result = await roleService.getRoleWithPermissions('r1');

      expect(result.id).toBe('r1');
      expect(result.permissions).toHaveLength(1);
      expect(result.permissions[0].code).toBe('user.create');
    });

    test('should throw INVALID_REQUEST if roleId is missing', async () => {
      await expect(roleService.getRoleWithPermissions('')).rejects.toThrow(ErrorMessages.INVALID_REQUEST);
    });

    test('should throw error if role is not found', async () => {
      mockModels.Role.findOne.mockResolvedValue(null);
      await expect(roleService.getRoleWithPermissions('none')).rejects.toThrow('Role not found');
    });
  });

  describe('updateRolePermissions', () => {
    test('should update permissions in a transaction and clear cache', async () => {
      mockModels.Role.findOne.mockResolvedValue(mockRole);
      const transaction = await mockModels.sequelize.transaction();

      await roleService.updateRolePermissions('r1', ['p1', 'p2']);

      expect(mockModels.RolePermission.destroy).toHaveBeenCalled();
      expect(mockModels.RolePermission.bulkCreate).toHaveBeenCalled();
      expect(transaction.commit).toHaveBeenCalled();
      expect(mockGrpcClient.clearPermissionsCache).toHaveBeenCalled();
    });

    test('should rollback transaction on error', async () => {
      mockModels.Role.findOne.mockResolvedValue(mockRole);
      mockModels.RolePermission.destroy.mockRejectedValue(new Error('DB error'));
      const transaction = await mockModels.sequelize.transaction();

      await expect(roleService.updateRolePermissions('r1', ['p1']))
        .rejects.toThrow('DB error');

      expect(transaction.rollback).toHaveBeenCalled();
    });

    test('should not clear cache if gRPC client fails to initialize', async () => {
      mockModels.Role.findOne.mockResolvedValue(mockRole);
      (grpc.loadPackageDefinition as jest.Mock).mockImplementation(() => { throw new Error('GRPC Error'); });
      
      await roleService.updateRolePermissions('r1', []);
      
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Failed to initialize auth gRPC client'), expect.any(Error));
    });
  });

  describe('assignPermission', () => {
    test('should assign a new permission to a role', async () => {
      mockModels.RolePermission.findOne.mockResolvedValue(null);
      
      await roleService.assignPermission('r1', 'p1');

      expect(mockModels.RolePermission.create).toHaveBeenCalledWith(expect.objectContaining({
        role_id: 'r1',
        permission_id: 'p1'
      }));
      expect(mockGrpcClient.clearPermissionsCache).toHaveBeenCalled();
    });

    // TC-NODE-ROLE-019
    test('should throw error if permission is already assigned', async () => {
      mockModels.RolePermission.findOne.mockResolvedValue({ id: 'exists' });
      
      await expect(roleService.assignPermission('r1', 'p1'))
        .rejects.toThrow('Permission already assigned to this role');
    });

    test('should throw INVALID_REQUEST if IDs are missing', async () => {
      await expect(roleService.assignPermission('', 'p1')).rejects.toThrow(ErrorMessages.INVALID_REQUEST);
    });
  });

  describe('unassignPermission', () => {
    test('should unassign permission successfully', async () => {
      mockModels.RolePermission.destroy.mockResolvedValue(1);
      
      await roleService.unassignPermission('r1', 'p1');

      expect(mockModels.RolePermission.destroy).toHaveBeenCalled();
    });

    test('should throw error if permission not found for role', async () => {
      mockModels.RolePermission.destroy.mockResolvedValue(0);
      
      await expect(roleService.unassignPermission('r1', 'p2'))
        .rejects.toThrow('Permission not found for this role');
    });
  });

  describe('clearAuthServicePermissionsCache', () => {
    test('should log success when cache is cleared', async () => {
      mockModels.Role.findOne.mockResolvedValue(mockRole);
      mockGrpcClient.clearPermissionsCache.mockImplementation((req: any, cb: any) => cb(null, { success: true }));
      
      await roleService.assignPermission('r1', 'p1'); // triggers clearAuthServicePermissionsCache
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Permissions cache cleared'));
    });

    test('should log error when gRPC call fails', async () => {
      mockModels.Role.findOne.mockResolvedValue(mockRole);
      mockGrpcClient.clearPermissionsCache.mockImplementation((req: any, cb: any) => cb(new Error('RPC Failed')));
      
      await roleService.assignPermission('r1', 'p1');
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Error clearing permissions cache'), 'RPC Failed');
    });
  });
});

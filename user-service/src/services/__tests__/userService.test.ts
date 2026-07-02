import { UserService } from '../userService';
import { ErrorMessages } from '../../types';
import { Op } from 'sequelize';

describe('UserService', () => {
  let userService: UserService;
  let mockModels: any;

  const mockUser = {
    id: 'u1',
    name: 'John Doe',
    email: 'john@example.com',
    role_id: 'customer_role',
    toJSON: jest.fn().mockReturnValue({
      id: 'u1',
      name: 'John Doe',
      email: 'john@example.com',
      role_id: 'customer_role'
    }),
    update: jest.fn().mockResolvedValue(true),
    destroy: jest.fn().mockResolvedValue(true)
  };

  beforeEach(() => {
    mockModels = {
      User: {
        findOne: jest.fn(),
        findAll: jest.fn(),
        count: jest.fn()
      },
      Role: {
        findOne: jest.fn()
      }
    };
    userService = new UserService(mockModels as any);
    jest.clearAllMocks();
  });

  describe('getUserById', () => {
    test('should return user data if found', async () => {
      mockModels.User.findOne.mockResolvedValue(mockUser);
      const result = await userService.getUserById('u1');
      expect(result.id).toBe('u1');
      expect(mockModels.User.findOne).toHaveBeenCalledWith({ where: { id: 'u1' } });
    });

    test('should throw INVALID_REQUEST if id is missing', async () => {
      await expect(userService.getUserById('')).rejects.toThrow(ErrorMessages.INVALID_REQUEST);
    });

    test('should throw USER_NOT_FOUND if user does not exist', async () => {
      mockModels.User.findOne.mockResolvedValue(null);
      await expect(userService.getUserById('none')).rejects.toThrow(ErrorMessages.USER_NOT_FOUND);
    });
  });

  describe('updateUser', () => {
    test('should update own profile successfully', async () => {
      mockModels.User.findOne.mockResolvedValue(mockUser);
      const updateData = { name: 'New Name' };
      
      const result = await userService.updateUser('u1', updateData, 'u1');
      
      expect(mockUser.update).toHaveBeenCalledWith({ name: 'New Name' });
      expect(result.name).toBe('John Doe'); // toJSON returns 'John Doe' in mock
    });

    test('should allow admin to update other profiles', async () => {
      mockModels.User.findOne.mockResolvedValue(mockUser);
      const updateData = { phone_number: '123456' };
      
      await userService.updateUser('u1', updateData, 'admin_id', 'admin');
      
      expect(mockUser.update).toHaveBeenCalledWith({ phone_number: '123456' });
    });

    test('should throw error if non-admin tries to update other profile', async () => {
      await expect(userService.updateUser('u1', {}, 'u2', 'customer'))
        .rejects.toThrow('You can only update your own profile');
    });

    test('should throw USER_NOT_FOUND during update', async () => {
      mockModels.User.findOne.mockResolvedValue(null);
      await expect(userService.updateUser('u1', {}, 'u1'))
        .rejects.toThrow(ErrorMessages.USER_NOT_FOUND);
    });

    test('should handle all updateable fields', async () => {
      mockModels.User.findOne.mockResolvedValue(mockUser);
      const fullUpdate = {
        name: 'N',
        phone_number: 'P',
        address: 'A',
        gender: 'M',
        dob: '2000-01-01'
      };
      await userService.updateUser('u1', fullUpdate, 'u1');
      expect(mockUser.update).toHaveBeenCalledWith(fullUpdate);
    });
  });

  describe('getAllUsers', () => {
    test('should return paginated users without filters', async () => {
      mockModels.User.count.mockResolvedValue(1);
      mockModels.User.findAll.mockResolvedValue([mockUser]);

      const result = await userService.getAllUsers({ page: 1, size: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.paging.total).toBe(1);
      expect(mockModels.User.findAll).toHaveBeenCalledWith(expect.objectContaining({
        limit: 10,
        offset: 0
      }));
    });

    test('should apply search filters', async () => {
      mockModels.User.count.mockResolvedValue(0);
      mockModels.User.findAll.mockResolvedValue([]);

      await userService.getAllUsers({ page: 1, size: 10, search: 'test' });

      expect(mockModels.User.findAll).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          [Op.or]: expect.any(Array)
        })
      }));
    });

    test('should apply role filters', async () => {
      mockModels.User.count.mockResolvedValue(0);
      mockModels.User.findAll.mockResolvedValue([]);

      await userService.getAllUsers({ page: 1, size: 10, role: 'admin' });

      expect(mockModels.User.findAll).toHaveBeenCalledWith(expect.objectContaining({
        include: expect.arrayContaining([
          expect.objectContaining({ as: 'role' })
        ])
      }));
    });
  });

  describe('getAllStaffs', () => {
    test('should filter out customers', async () => {
      mockModels.User.count.mockResolvedValue(0);
      mockModels.User.findAll.mockResolvedValue([]);

      await userService.getAllStaffs({ page: 1, size: 10 });

      expect(mockModels.User.findAll).toHaveBeenCalledWith(expect.objectContaining({
        include: expect.arrayContaining([
          expect.objectContaining({
            as: 'role',
            where: expect.objectContaining({
              name: { [Op.ne]: 'customer' }
            })
          })
        ])
      }));
    });
  });

  describe('deleteUser', () => {
    test('should delete user successfully', async () => {
      mockModels.User.findOne.mockResolvedValue(mockUser);
      
      await userService.deleteUser('u2', 'u1'); // u1 deleting u2
      
      expect(mockUser.destroy).toHaveBeenCalled();
    });

    test('should throw error if deleting self', async () => {
      await expect(userService.deleteUser('u1', 'u1'))
        .rejects.toThrow('You cannot delete your own account');
    });

    test('should throw error if deleting admin', async () => {
      const adminUser = {
        ...mockUser,
        role_id: 'admin',
        toJSON: () => ({ role_id: 'admin' })
      };
      mockModels.User.findOne.mockResolvedValue(adminUser);
      
      await expect(userService.deleteUser('u2', 'u1'))
        .rejects.toThrow('Cannot delete admin accounts');
    });

    test('should throw USER_NOT_FOUND during delete', async () => {
      mockModels.User.findOne.mockResolvedValue(null);
      await expect(userService.deleteUser('u1', 'u2'))
        .rejects.toThrow(ErrorMessages.USER_NOT_FOUND);
    });

    test('should throw INVALID_REQUEST if id is empty during delete', async () => {
      await expect(userService.deleteUser('', 'u2'))
        .rejects.toThrow(ErrorMessages.INVALID_REQUEST);
    });
  });
});

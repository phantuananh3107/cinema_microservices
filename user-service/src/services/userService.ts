import { Op } from 'sequelize';
import { Models } from '../models/models.js';
import {
  ErrorMessages,
  IUpdateUserRequest,
  IUserResponse
} from '../types/index.js';

export interface IGetAllUsersFilters {
  page: number;
  size: number;
  role?: string;
  search?: string;
}

export interface IGetAllUsersResult {
  data: any[];
  paging: {
    page: number;
    size: number;
    total: number;
    total_pages: number;
  };
}

export class UserService {
  private models: Models;

  constructor(models: Models) {
    this.models = models;
  }

  public async getUserById(userId: string): Promise<IUserResponse> {
    if (!userId) {
      throw new Error(ErrorMessages.INVALID_REQUEST);
    }

    const user = await this.models.User.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new Error(ErrorMessages.USER_NOT_FOUND);
    }

    const { password, ...userData } = user.toJSON();
    return userData as IUserResponse;
  }

  public async updateUser(
    userId: string,
    updateData: IUpdateUserRequest,
    requestingUserId?: string,
    requestingUserRole?: string
  ): Promise<IUserResponse> {
    if (!userId) {
      throw new Error(ErrorMessages.INVALID_REQUEST);
    }

    if (requestingUserId && requestingUserId !== userId) {
      if (!requestingUserRole || !['admin', 'manager_staff'].includes(requestingUserRole)) {
        throw new Error('You can only update your own profile');
      }
    }

    const user = await this.models.User.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new Error(ErrorMessages.USER_NOT_FOUND);
    }

    const updateFields: any = {};
    if (updateData.name) updateFields.name = updateData.name;
    if (updateData.phone_number) updateFields.phone_number = updateData.phone_number;
    if (updateData.address) updateFields.address = updateData.address;
    if (updateData.gender) updateFields.gender = updateData.gender;
    if (updateData.dob) updateFields.dob = updateData.dob;

    await user.update(updateFields);

    const { password, ...userData } = user.toJSON();
    return userData as IUserResponse;
  }

  public async getAllUsers(filters: IGetAllUsersFilters): Promise<IGetAllUsersResult> {
    const { page = 1, size = 10, role, search } = filters;

    const whereClause: any = {};

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const roleWhereClause: any = {};
    if (role) {
      roleWhereClause.name = role;
    }

    const offset = (page - 1) * size;

    const totalCount = await this.models.User.count({
      where: whereClause,
      include: role ? [
        {
          model: this.models.Role,
          as: 'role',
          where: roleWhereClause,
          attributes: []
        }
      ] : []
    });
    const totalPages = Math.ceil(totalCount / size);

    const users = await this.models.User.findAll({
      where: whereClause,
      attributes: { exclude: ['password'] },
      include: [
        {
          model: this.models.Role,
          as: 'role',
          attributes: ['id', 'name', 'description'],
          where: role ? roleWhereClause : undefined
        }
      ],
      limit: size,
      offset: offset,
      order: [['created_at', 'DESC']]
    });

    return {
      data: users.map(u => u.toJSON()),
      paging: {
        page: page,
        size: size,
        total: totalCount,
        total_pages: totalPages
      }
    };
  }

  
  public async getAllStaffs(filters: IGetAllUsersFilters): Promise<IGetAllUsersResult> {
    const { page = 1, size = 10, role, search } = filters;

    const whereClause: any = {};

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const roleWhereClause: any = {
      name: { [Op.ne]: 'customer' }
    };

    if (role) {
      roleWhereClause.name = role;
    }

    const offset = (page - 1) * size;

    const totalCount = await this.models.User.count({
      where: whereClause,
      include: [
        {
          model: this.models.Role,
          as: 'role',
          where: roleWhereClause,
          attributes: []
        }
      ]
    });
    const totalPages = Math.ceil(totalCount / size);

    const users = await this.models.User.findAll({
      where: whereClause,
      attributes: { exclude: ['password'] },
      include: [
        {
          model: this.models.Role,
          as: 'role',
          attributes: ['id', 'name', 'description'],
          where: roleWhereClause
        }
      ],
      limit: size,
      offset: offset,
      order: [['created_at', 'DESC']]
    });

    return {
      data: users.map(u => u.toJSON()),
      paging: {
        page: page,
        size: size,
        total: totalCount,
        total_pages: totalPages
      }
    };
  }

 
  public async deleteUser(userId: string, requestingUserId: string): Promise<void> {
    if (!userId) {
      throw new Error(ErrorMessages.INVALID_REQUEST);
    }

    if (requestingUserId === userId) {
      throw new Error('You cannot delete your own account');
    }

    const user = await this.models.User.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new Error(ErrorMessages.USER_NOT_FOUND);
    }

    const userData = user.toJSON();
    if (userData.role_id === 'admin') {
      throw new Error('Cannot delete admin accounts');
    }

    await user.destroy();
  }
}

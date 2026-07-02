import { NextFunction, Request, Response } from 'express';
import { Models } from '../models/models.js';
import {
  HttpStatus,
  ErrorMessages,
  IApiResponse,
  IUserResponse,
  IUpdateUserRequest,
  IController
} from '../types/index.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { UserService } from '../services/userService.js';

export class UserController {
  private userService: UserService;

  constructor(models: Models) {
    this.userService = new UserService(models);
  }

  public getUserById: IController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;

      const userData = await this.userService.getUserById(userId);

      const response: IApiResponse<IUserResponse> = {
        success: true,
        message: ErrorMessages.GET_SUCCESS,
        data: userData,
        status: HttpStatus.OK
      };

      res.status(HttpStatus.OK).json(response);
    } catch (error: any) {
      if (error.message === ErrorMessages.INVALID_REQUEST) {
        const response: IApiResponse = {
          success: false,
          message: ErrorMessages.INVALID_REQUEST,
          status: HttpStatus.BAD_REQUEST
        };
        res.status(HttpStatus.BAD_REQUEST).json(response);
        return;
      }

      if (error.message === ErrorMessages.USER_NOT_FOUND) {
        const response: IApiResponse = {
          success: false,
          message: ErrorMessages.USER_NOT_FOUND,
          status: HttpStatus.NOT_FOUND
        };
        res.status(HttpStatus.NOT_FOUND).json(response);
        return;
      }

      next(error);
    }
  };

  public updateUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const updateData: IUpdateUserRequest = req.body;
      const authenticatedUser = req.user;

      const userData = await this.userService.updateUser(
        userId,
        updateData,
        authenticatedUser?.id,
        authenticatedUser?.role
      );

      const response: IApiResponse<IUserResponse> = {
        success: true,
        message: ErrorMessages.UPDATE_SUCCESS,
        data: userData,
        status: HttpStatus.OK
      };

      res.status(HttpStatus.OK).json(response);
    } catch (error: any) {
      if (error.message === ErrorMessages.INVALID_REQUEST) {
        const response: IApiResponse = {
          success: false,
          message: ErrorMessages.INVALID_REQUEST,
          status: HttpStatus.BAD_REQUEST
        };
        res.status(HttpStatus.BAD_REQUEST).json(response);
        return;
      }

      if (error.message === ErrorMessages.USER_NOT_FOUND) {
        const response: IApiResponse = {
          success: false,
          message: ErrorMessages.USER_NOT_FOUND,
          status: HttpStatus.NOT_FOUND
        };
        res.status(HttpStatus.NOT_FOUND).json(response);
        return;
      }

      if (error.message === 'You can only update your own profile') {
        const response: IApiResponse = {
          success: false,
          message: 'You can only update your own profile',
          status: HttpStatus.FORBIDDEN
        };
        res.status(HttpStatus.FORBIDDEN).json(response);
        return;
      }

      next(error);
    }
  };

  public getAllUsers = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authenticatedUser = req.user;

      if (!authenticatedUser) {
        const response: IApiResponse = {
          success: false,
          message: 'User not authenticated',
          status: HttpStatus.UNAUTHORIZED
        };
        res.status(HttpStatus.UNAUTHORIZED).json(response);
        return;
      }

      if (!['admin', 'manager_staff'].includes(authenticatedUser.role)) {
        const response: IApiResponse = {
          success: false,
          message: 'Access denied. Admin or manager role required',
          status: HttpStatus.FORBIDDEN
        };
        res.status(HttpStatus.FORBIDDEN).json(response);
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const size = parseInt(req.query.size as string) || 10;
      const role = req.query.role as string || '';
      const search = req.query.search as string || '';

      const result = await this.userService.getAllUsers({
        page,
        size,
        role,
        search
      });

      const response: IApiResponse<any> = {
        success: true,
        message: 'Users retrieved successfully',
        data: result,
        status: HttpStatus.OK
      };

      res.status(HttpStatus.OK).json(response);
    } catch (error) {
      next(error);
    }
  };

  public getAllStaffs = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authenticatedUser = req.user;

      if (!authenticatedUser) {
        const response: IApiResponse = {
          success: false,
          message: 'User not authenticated',
          status: HttpStatus.UNAUTHORIZED
        };
        res.status(HttpStatus.UNAUTHORIZED).json(response);
        return;
      }

      if (!['admin', 'manager_staff'].includes(authenticatedUser.role)) {
        const response: IApiResponse = {
          success: false,
          message: 'Access denied. Admin or manager role required',
          status: HttpStatus.FORBIDDEN
        };
        res.status(HttpStatus.FORBIDDEN).json(response);
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const size = parseInt(req.query.size as string) || 10;
      const role = req.query.role as string || '';
      const search = req.query.search as string || '';

      const result = await this.userService.getAllStaffs({
        page,
        size,
        role,
        search
      });

      const response: IApiResponse<any> = {
        success: true,
        message: 'Staff users retrieved successfully',
        data: result,
        status: HttpStatus.OK
      };

      res.status(HttpStatus.OK).json(response);
    } catch (error) {
      next(error);
    }
  };

  public deleteUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const authenticatedUser = req.user;

      if (!authenticatedUser) {
        const response: IApiResponse = {
          success: false,
          message: 'User not authenticated',
          status: HttpStatus.UNAUTHORIZED
        };
        res.status(HttpStatus.UNAUTHORIZED).json(response);
        return;
      }

      if (!['admin'].includes(authenticatedUser.role)) {
        const response: IApiResponse = {
          success: false,
          message: 'Access denied. Admin role required',
          status: HttpStatus.FORBIDDEN
        };
        res.status(HttpStatus.FORBIDDEN).json(response);
        return;
      }

      await this.userService.deleteUser(userId, authenticatedUser.id);

      const response: IApiResponse = {
        success: true,
        message: 'User deleted successfully',
        status: HttpStatus.OK
      };

      res.status(HttpStatus.OK).json(response);
    } catch (error: any) {
      if (error.message === ErrorMessages.INVALID_REQUEST) {
        const response: IApiResponse = {
          success: false,
          message: ErrorMessages.INVALID_REQUEST,
          status: HttpStatus.BAD_REQUEST
        };
        res.status(HttpStatus.BAD_REQUEST).json(response);
        return;
      }

      if (error.message === ErrorMessages.USER_NOT_FOUND) {
        const response: IApiResponse = {
          success: false,
          message: ErrorMessages.USER_NOT_FOUND,
          status: HttpStatus.NOT_FOUND
        };
        res.status(HttpStatus.NOT_FOUND).json(response);
        return;
      }

      if (error.message === 'You cannot delete your own account') {
        const response: IApiResponse = {
          success: false,
          message: 'You cannot delete your own account',
          status: HttpStatus.FORBIDDEN
        };
        res.status(HttpStatus.FORBIDDEN).json(response);
        return;
      }

      if (error.message === 'Cannot delete admin accounts') {
        const response: IApiResponse = {
          success: false,
          message: 'Cannot delete admin accounts',
          status: HttpStatus.FORBIDDEN
        };
        res.status(HttpStatus.FORBIDDEN).json(response);
        return;
      }

      next(error);
    }
  };
}

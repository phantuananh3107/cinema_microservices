import { NextFunction, Request, Response } from 'express';

export interface IUser {
  id: string;
  name: string;
  email: string;
  password: string;
  phone_number?: string;
  status: UserStatus;
  gender?: string;
  dob?: Date;
  role_id?: string;
  address?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface ICustomerProfile {
  id: string;
  user_id: string;
  total_payment_amount: number;
  point: number;
  onchain_wallet_address?: string;
}

export interface IUpdateUserRequest {
  name?: string;
  phone_number?: string;
  address?: string;
  gender?: string;
  dob?: string;
}

export interface IUserResponse {
  id: string;
  name: string;
  email: string;
  phone_number?: string;
  status: string;
  gender?: string;
  dob?: Date;
  role_id?: string;
  address?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface IApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  status: HttpStatus;
}

export interface IApiError extends Error {
  status?: number;
  code?: string;
}

export interface IController {
  (req: Request, res: Response, next: NextFunction): Promise<void>;
}

export interface IServerConfig {
  port: number;
  corsOrigin: string;
  jwtSecret: string;
  jwtExpiresIn: string;
}

export interface IDatabaseManager {
  testConnection(): Promise<boolean>;
  syncDatabase(): Promise<void>;
}

export interface IHealthCheck {
  status: string;
  timestamp: string;
  services: {
    database: string;
  };
  uptime: number;
  memory: NodeJS.MemoryUsage;
}

export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500
}

export enum UserStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED'
}

export enum ErrorMessages {
  USER_NOT_FOUND = 'User not found',
  INVALID_REQUEST = 'Invalid request data',
  UPDATE_SUCCESS = 'User profile updated successfully',
  GET_SUCCESS = 'User retrieved successfully',
  INTERNAL_ERROR = 'Internal server error'
}

export interface IPermission {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface IRole {
  id: string;
  name: string;
  description?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface IRoleWithPermissions extends IRole {
  permissions: IPermission[];
}

export interface IUpdateRolePermissionsRequest {
  permission_ids: string[]; // Array of permission IDs to assign
}

export interface IAssignPermissionRequest {
  permission_id: string;
}

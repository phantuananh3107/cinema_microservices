import { NextFunction, Request, Response } from 'express';

export interface IUser {
  id: string;
  name: string;
  email: string;
  password: string;
  phone_number?: string;
  status: UserStatus;
  role_id?: string;
  address?: string;
  updated_at?: Date;
}

export interface ICustomerProfile {
  id: string;
  user_id: string;
  total_payment_amount: number;
  point: number;
  onchain_wallet_address?: string;
}

export interface IRegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  address?: string;
}

export interface ILoginRequest {
  email: string;
  password: string;
}

export interface IVerifyOtpRequest {
  email: string;
  otp: string;
}

export interface IAuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    permissions?: string[];
  }
}

export interface IEmailVerifyMessage {
  user_id: string;
  to: string;
  verify_code: string;
  verify_url: string;
}

export interface IOtpData {
  otp: string;
  count: number;
  created_at: string;
}

export interface IOtpVerifyResult {
  success: boolean;
  message: string;
  attempts: number;
}

export interface IPermission {
  id: string;
  name: string;
  code: string;
  description?: string;
}

export interface IApiError extends Error {
  status?: number;
  isJoi?: boolean;
  details?: Array<{ message: string }>;
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
  syncDatabase(): Promise<boolean>;
}

export interface IRedisManager {
  isConnected(): Promise<boolean>;
  disconnect(): Promise<boolean>;
}

export interface IHealthCheck {
  status: string;
  timestamp: string;
  services: {
    database: string;
    redis: string;
  };
  uptime: number;
  memory: NodeJS.MemoryUsage;
}

export enum UserStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED'
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

export enum ErrorMessages {
  EMAIL_EXISTS = 'Email đã tồn tại trong hệ thống',
  INVALID_CREDENTIALS = 'Email hoặc mật khẩu không chính xác',
  REGISTRATION_SUCCESS = 'Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản',
  ACCOUNT_VERIFIED = 'Tài khoản đã được xác thực thành công',
  OTP_EXPIRED = 'Mã OTP đã hết hạn',
  OTP_MAX_ATTEMPTS = 'Bạn đã nhập sai OTP quá nhiều lần. Vui lòng thử lại sau',
  OTP_VERIFIED = 'OTP đã được xác thực thành công'
}
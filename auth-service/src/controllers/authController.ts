import Joi from 'joi';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {NextFunction, Request, Response} from 'express';

import { userClient } from '../services/userGrpcClient.js';
import {redisClient, redisPubSubClient} from '../config/redis.js';
import { PermissionService } from '../services/permissionService.js';
import { TokenService } from '../services/tokenService.js';
import {
  ErrorMessages,
  HttpStatus,
  IApiError,
  IAuthResponse,
  IController,
  IEmailVerifyMessage,
  ILoginRequest,
  IOtpData,
  IOtpVerifyResult,
  IRegisterRequest,
  IVerifyOtpRequest,
  UserStatus
} from '../types/index.js';

class AuthController {
  static readonly ALLOWED_DISCRIMINATOR = 'Customer';
  static readonly BCRYPT_SALT_ROUNDS = 10;
  static readonly OTP_MIN = 100000;
  static readonly OTP_MAX = 999999;
  static readonly VERIFY_BASE_URL = 'http://localhost:3000/verify';
  static readonly REDIS_TOPICS = {
    EMAIL_VERIFY: 'email_verify'
  } as const;

  static generateOTP(): string {
    return Math.floor(this.OTP_MIN + Math.random() * (this.OTP_MAX - this.OTP_MIN + 1)).toString();
  }

  static createVerifyUrl(email: string, code: string): string {
    return `${this.VERIFY_BASE_URL}?email=${encodeURIComponent(email)}&code=${code}`;
  }

  static createEmailVerifyMessage(userId: string, email: string, verifyCode: string, verifyUrl: string): IEmailVerifyMessage {
    return {
      user_id: userId,
      to: email,
      verify_code: verifyCode,
      verify_url: verifyUrl
    };
  }

  static async getRoleIdByName(roleName: string, cacheKey: string): Promise<string> {
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) return cached;

      const roleResult: any = await new Promise((resolve, reject) => {
        userClient.GetRoleByName({ name: roleName }, (err: any, resp: any) => {
          if (err) return reject(err);
          resolve(resp);
        });
      });

      if (!roleResult.found) {
        throw new Error(`${roleName} role not found in database`);
      }

      const roleId = roleResult.id;
      await redisClient.setEx(cacheKey, 3600, roleId);
      return roleId;
    } catch (error) {
      console.error(`Error getting role ID for ${roleName}:`, error);
      throw error;
    }
  }

  static async getManagerStaffRoleId(): Promise<string> {
    return this.getRoleIdByName('manager_staff', 'manager_staff_role_id');
  }

  static async getTicketStaffRoleId(): Promise<string> {
    return this.getRoleIdByName('ticket_staff', 'ticket_staff_role_id');
  }

  static async getCustomerRoleId(): Promise<string> {
    return this.getRoleIdByName('customer', 'customer_role_id');
  }

  static async saveOTPToCache(email: string, otp: string): Promise<void> {
    const OTP_CACHE_KEY = `otp:${email}`;
    const OTP_TTL = 300; 
    
    const otpData: IOtpData = {
      otp: otp,
      count: 0,
      created_at: new Date().toISOString()
    };
    
    await redisClient.setEx(OTP_CACHE_KEY, OTP_TTL, JSON.stringify(otpData));
  }

  static async verifyOTPFromCache(email: string, inputOtp: string): Promise<IOtpVerifyResult> {
    const OTP_CACHE_KEY = `otp:${email}`;
    const MAX_ATTEMPTS = 5;
    
    try {
      const cachedData = await redisClient.get(OTP_CACHE_KEY);
      
      if (!cachedData) {
        return {
          success: false,
          message: ErrorMessages.OTP_EXPIRED,
          attempts: 0
        };
      }
      
      const otpData: IOtpData = JSON.parse(cachedData);
      
      if (otpData.count >= MAX_ATTEMPTS) {
        return {
          success: false,
          message: ErrorMessages.OTP_MAX_ATTEMPTS,
          attempts: otpData.count
        };
      }
      
      otpData.count++;
      
      if (otpData.otp === inputOtp) {
        await redisClient.del(OTP_CACHE_KEY);
        return {
          success: true,
          message: ErrorMessages.OTP_VERIFIED,
          attempts: otpData.count
        };
      } else {
        const remainingTTL = await redisClient.ttl(OTP_CACHE_KEY);
        await redisClient.setEx(OTP_CACHE_KEY, remainingTTL, JSON.stringify(otpData));
        
        return {
          success: false,
          message: `Invalid OTP. ${MAX_ATTEMPTS - otpData.count} attempts remaining.`,
          attempts: otpData.count
        };
      }
      
    } catch (error) {
      console.error('Error verifying OTP from cache:', error);
      throw error;
    }
  }

  static registerSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    address: Joi.string().allow('', null)
  });

  static loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  });

  static verifyOtpSchema = Joi.object({
    email: Joi.string().email().required(),
    otp: Joi.string().length(6).required()
  });

  static resendOtpSchema = Joi.object({
    email: Joi.string().email().required()
  });

  static register: IController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await AuthController.registerSchema.validateAsync(req.body) as IRegisterRequest;
      const { email, password, firstName, lastName, address } = data;

      const existingUser: any = await new Promise((resolve, reject) => {
        userClient.GetUserByEmail({ email }, (err: any, resp: any) => {
          if (err) return reject(err);
          resolve(resp);
        });
      });

      if (existingUser.found) {
        res.status(HttpStatus.BAD_REQUEST).json({ message: ErrorMessages.EMAIL_EXISTS });
        return;
      }

      const customerRoleId = await AuthController.getCustomerRoleId();

      const hashed = await bcrypt.hash(password, AuthController.BCRYPT_SALT_ROUNDS);

      const name = `${firstName} ${lastName}`;
      let userId = '';
      await new Promise<void>((resolve, reject) => {
        userClient.EnsurePending({ email, name, password: hashed, role_id: customerRoleId, address }, (err: any, resp: any) => {
          if (err) return reject(err);
          userId = resp?.id || '';
          resolve();
        });
      });

      const verifyCode = AuthController.generateOTP();
      const verifyUrl = AuthController.createVerifyUrl(email, verifyCode);
      const msg = AuthController.createEmailVerifyMessage(userId, email, verifyCode, verifyUrl);

      await redisPubSubClient.publish(AuthController.REDIS_TOPICS.EMAIL_VERIFY, JSON.stringify(msg));

      await AuthController.saveOTPToCache(email, verifyCode);

      res.status(HttpStatus.CREATED).json({ message: ErrorMessages.REGISTRATION_SUCCESS });
    } catch (err) {
      console.error('Registration error:', err);
      
      const error = err as IApiError;
      if (error.isJoi) {
        res.status(HttpStatus.BAD_REQUEST).json({ message: error.details![0].message });
        return;
      }
      if (error.message === ErrorMessages.EMAIL_EXISTS) {
        res.status(HttpStatus.BAD_REQUEST).json({ message: ErrorMessages.EMAIL_EXISTS });
        return;
      }
      next(err);
    }
  };

  static login: IController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = await AuthController.loginSchema.validateAsync(req.body) as ILoginRequest;
      const userResp: any = await new Promise((resolve, reject) => {
        userClient.GetUserByEmail({ email }, (err: any, resp: any) => {
          if (err) return reject(err);
          resolve(resp);
        });
      });
      if (!userResp.found) {
        res.status(HttpStatus.BAD_REQUEST).json({ message: ErrorMessages.INVALID_CREDENTIALS });
        return;
      }

      const valid = await bcrypt.compare(password, userResp.user.password);
      if (!valid) {
        res.status(HttpStatus.BAD_REQUEST).json({ message: ErrorMessages.INVALID_CREDENTIALS });
        return;
      }

      if (userResp.user.status !== UserStatus.ACTIVE) {
        res.status(HttpStatus.BAD_REQUEST).json({ 
          message: 'Tài khoản chưa được kích hoạt. Vui lòng kiểm tra email để xác thực OTP.',
          requireVerification: true,
          email: email
        });
        return;
      }

      const userWithRoleResp: any = await new Promise((resolve, reject) => {
        userClient.GetUserWithRoleByEmail({ email }, (err: any, resp: any) => {
          if (err) return reject(err);
          resolve(resp);
        });
      });

      if (!userWithRoleResp.found) {
        res.status(HttpStatus.BAD_REQUEST).json({ message: ErrorMessages.INVALID_CREDENTIALS });
        return;
      }

      const userRole = userWithRoleResp.user.role_name || 'customer';
      const userRoleId = userWithRoleResp.user.role_id;

      if (userRole !== 'customer') {
        res.status(HttpStatus.FORBIDDEN).json({ message: 'Bạn không có quyền truy cập vào hệ thống.' });
        return;
      }

      let permissions: string[] = [];
      if (userRoleId) {
        try {
          const userPermissions = await PermissionService.getPermissionsByRoleId(userRoleId);
          permissions = userPermissions.map(p => p.code);
        } catch (error) {
          console.error('Error fetching permissions:', error);
        }
      }

      const token = jwt.sign(
        {
          userId: userResp.user.id,
          email: userResp.user.email,
          role: userRole,
          roleId: userRoleId,
          permissions: permissions
        },
        (process.env.JWT_SECRET || 'your-secret-key') as string,
      );

      const userInfo = {
        id: userResp.user.id,
        email: userResp.user.email,
        role: userRole,
        roleId: userRoleId,
        permissions: permissions,
        cachedAt: new Date().toISOString()
      };
      TokenService.cacheUserInfo(token, userInfo).catch((error: any) => {
        console.error('Failed to cache user info after login:', error);
      });

      const response: IAuthResponse = {
        token,
        user: {
          id: userResp.user.id,
          email: userResp.user.email,
          name: userResp.user.name,
          role: userRole,
          permissions: permissions
        }
      };

      res.json(response);
    } catch (err) {
      const error = err as IApiError;
      if (error.isJoi) {
        res.status(HttpStatus.BAD_REQUEST).json({ message: error.details![0].message });
        return;
      }
      next(err);
    }
  };

  static loginAdmin: IController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = await AuthController.loginSchema.validateAsync(req.body) as ILoginRequest;
      const userResp: any = await new Promise((resolve, reject) => {
        userClient.GetUserByEmail({ email }, (err: any, resp: any) => {
          if (err) return reject(err);
          resolve(resp);
        });
      });
      if (!userResp.found) {
        res.status(HttpStatus.BAD_REQUEST).json({ message: ErrorMessages.INVALID_CREDENTIALS });
        return;
      }

      const valid = await bcrypt.compare(password, userResp.user.password);
      if (!valid) {
        res.status(HttpStatus.BAD_REQUEST).json({ message: ErrorMessages.INVALID_CREDENTIALS });
        return;
      }

      let isFirstLogin = false;
      if (userResp.user.status === UserStatus.PENDING) {
        await new Promise<void>((resolve, reject) => {
          userClient.ActivateUser({ email }, (err: any, resp: any) => {
            if (err) return reject(err);
            resolve();
          });
        });
        isFirstLogin = true;
      } else if (userResp.user.status !== UserStatus.ACTIVE) {
        res.status(HttpStatus.BAD_REQUEST).json({
          message: 'Tài khoản chưa được kích hoạt. Vui lòng kiểm tra email để xác thực OTP.',
          requireVerification: true,
          email: email
        });
        return;
      }

      const userWithRoleResp: any = await new Promise((resolve, reject) => {
        userClient.GetUserWithRoleByEmail({ email }, (err: any, resp: any) => {
          if (err) return reject(err);
          resolve(resp);
        });
      });

      if (!userWithRoleResp.found) {
        res.status(HttpStatus.BAD_REQUEST).json({ message: ErrorMessages.INVALID_CREDENTIALS });
        return;
      }

      const userRole = userWithRoleResp.user.role_name;
      const userRoleId = userWithRoleResp.user.role_id;

      if (userRole !== 'admin' && userRole !== 'manager_staff' && userRole !== 'ticket_staff') {
        res.status(HttpStatus.FORBIDDEN).json({ message: 'Bạn không có quyền truy cập vào hệ thống' });
        return;
      }

      let permissions: string[] = [];
      if (userRoleId) {
        try {
          await PermissionService.clearPermissionsCache(userRoleId);
          const userPermissions = await PermissionService.getPermissionsByRoleId(userRoleId);
          permissions = userPermissions.map(p => p.code);
        } catch (error) {
          console.error('Error fetching permissions:', error);
        }
      }

      const token = jwt.sign(
        {
          userId: userResp.user.id,
          email: userResp.user.email,
          role: userRole,
          roleId: userRoleId,
          permissions: permissions
        },
        (process.env.JWT_SECRET || 'your-secret-key') as string,
      );

      const userInfo = {
        id: userResp.user.id,
        email: userResp.user.email,
        role: userRole,
        roleId: userRoleId,
        permissions: permissions,
        cachedAt: new Date().toISOString()
      };
      TokenService.cacheUserInfo(token, userInfo).catch((error: any) => {
        console.error('Failed to cache user info after login:', error);
      });

      const response: IAuthResponse = {
        token,
        user: {
          id: userResp.user.id,
          email: userResp.user.email,
          name: userResp.user.name,
          role: userRole,
          permissions: permissions
        }
      };

      if (isFirstLogin) {
        res.json({
          ...response,
          isFirstLogin: true,
          message: 'Đăng nhập thành công! Chào mừng bạn đến với hệ thống.'
        });
      } else {
        res.json(response);
      }
    } catch (err) {
      const error = err as IApiError;
      if (error.isJoi) {
        res.status(HttpStatus.BAD_REQUEST).json({ message: error.details![0].message });
        return;
      }
      next(err);
    }
  };

  static verifyOtp: IController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, otp } = await AuthController.verifyOtpSchema.validateAsync(req.body) as IVerifyOtpRequest;
      
      const result = await AuthController.verifyOTPFromCache(email, otp);
      
      if (result.success) {
        await new Promise<void>((resolve, reject) => {
          userClient.ActivateUser({ email }, (err: any, resp: any) => {
            if (err) return reject(err);
            resolve();
          });
        });
        res.status(HttpStatus.OK).json({ 
          message: ErrorMessages.ACCOUNT_VERIFIED,
          verified: true 
        });
      } else {
        res.status(HttpStatus.BAD_REQUEST).json({ 
          message: result.message,
          verified: false,
          attempts: result.attempts 
        });
      }
      
    } catch (err) {
      const error = err as IApiError;
      if (error.isJoi) {
        res.status(HttpStatus.BAD_REQUEST).json({ message: error.details![0].message });
        return;
      }
      next(err);
    }
  };

  static resendOtp: IController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email } = await AuthController.resendOtpSchema.validateAsync(req.body);
      
      const userResp: any = await new Promise((resolve, reject) => {
        userClient.GetUserByEmail({ email }, (err: any, resp: any) => {
          if (err) return reject(err);
          resolve(resp);
        });
      });

      if (!userResp.found) {
        res.status(HttpStatus.BAD_REQUEST).json({ message: 'Email không tồn tại trong hệ thống' });
        return;
      }

      if (userResp.user.status === UserStatus.ACTIVE) {
        res.status(HttpStatus.BAD_REQUEST).json({ message: 'Tài khoản đã được kích hoạt' });
        return;
      }

      const verifyCode = AuthController.generateOTP();
      const verifyUrl = AuthController.createVerifyUrl(email, verifyCode);
      const msg = AuthController.createEmailVerifyMessage(userResp.user.id, email, verifyCode, verifyUrl);

      await redisPubSubClient.publish(AuthController.REDIS_TOPICS.EMAIL_VERIFY, JSON.stringify(msg));
      await AuthController.saveOTPToCache(email, verifyCode);

      res.status(HttpStatus.OK).json({ message: 'OTP mới đã được gửi đến email của bạn' });
    } catch (err) {
      const error = err as IApiError;
      if (error.isJoi) {
        res.status(HttpStatus.BAD_REQUEST).json({ message: error.details![0].message });
        return;
      }
      next(err);
    }
  };

  static registerInternalUser: IController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const schema = Joi.object({
        email: Joi.string().email().required(),
        name: Joi.string().required(),
        address: Joi.string().allow('', null),
        role: Joi.string().valid('manager_staff', 'ticket_staff').required(),
        phone_number: Joi.string().allow('', null).optional(),
        gender: Joi.string().valid('male', 'female', 'other').allow(null).optional(),
        dob: Joi.date().allow(null).optional()
      });

      const { email, name, address, role, phone_number, gender, dob } = await schema.validateAsync(req.body);

      const existingUser: any = await new Promise((resolve, reject) => {
        userClient.GetUserByEmail({ email }, (err: any, resp: any) => {
          if (err) return reject(err);
          resolve(resp);
        });
      });

      if (existingUser.found) {
        res.status(HttpStatus.BAD_REQUEST).json({ message: ErrorMessages.EMAIL_EXISTS });
        return;
      }

      let roleId: string;
      if (role === 'manager_staff') {
        roleId = await AuthController.getManagerStaffRoleId();
      } else if (role === 'ticket_staff') {
        roleId = await AuthController.getTicketStaffRoleId();
      } else {
        res.status(HttpStatus.BAD_REQUEST).json({ message: 'Vai trò không hợp lệ' });
        return;
      }

      const generatedPassword = AuthController.generateRandomPassword();
      const hashed = await bcrypt.hash(generatedPassword, AuthController.BCRYPT_SALT_ROUNDS);

      const result: any = await new Promise((resolve, reject) => {
        userClient.CreateStaff({
          email,
          name,
          password: hashed,
          role_id: roleId,
          address: address || '',
          phone_number: phone_number || '',
          gender: gender || '',
          dob: dob ? (dob instanceof Date ? dob.toISOString() : new Date(dob).toISOString()) : ''
        }, (err: any, resp: any) => {
          if (err) {
            if (err.code === 6) { 
              return reject(new Error(ErrorMessages.EMAIL_EXISTS));
            }
            return reject(err);
          }
          resolve(resp);
        });
      });

      const staffWelcomeMessage = {
        user_id: result.id,
        to: email,
        name: name,
        email: email,
        password: generatedPassword,
        role: role === 'manager_staff' ? 'Quản lý rạp' : 'Nhân viên bán vé'
      };

      await redisPubSubClient.publish('staff_welcome', JSON.stringify(staffWelcomeMessage));

      res.status(HttpStatus.CREATED).json({
        message: 'Tạo tài khoản thành công. Email đăng nhập đã được gửi đến ' + email,
        user: {
          id: result.id,
          email,
          name,
          role: role,
          status: 'PENDING'
        }
      });
    } catch (err) {
      const error = err as IApiError;
      if (error.isJoi) {
        res.status(HttpStatus.BAD_REQUEST).json({ message: error.details![0].message });
        return;
      }
      if (error.message === ErrorMessages.EMAIL_EXISTS) {
        res.status(HttpStatus.BAD_REQUEST).json({ message: ErrorMessages.EMAIL_EXISTS });
        return;
      }
      next(err);
    }
  };

  static generateRandomPassword(): string {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }

}

export const register = AuthController.register.bind(AuthController);
export const login = AuthController.login.bind(AuthController);
export const verifyOtp = AuthController.verifyOtp.bind(AuthController);
export const resendOtp = AuthController.resendOtp.bind(AuthController);
export const loginAdmin = AuthController.loginAdmin.bind(AuthController);
export const registerInternalUser = AuthController.registerInternalUser.bind(AuthController);

export default AuthController;

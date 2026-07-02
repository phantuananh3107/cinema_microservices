import { NextFunction, Request, Response } from 'express';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { RedisManager } from '../config/redis.js';

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: string;
    permissions: string[];
  };
}

export interface CachedUserInfo {
  id: string;
  email: string;
  role: string;
  roleId: string;
  permissions: string[];
  cachedAt: string;
}

const TOKEN_CACHE_PREFIX = 'auth:token:';
const TOKEN_CACHE_TTL = 3600;

const getRedisClient = () => {
  return RedisManager.getInstance().getClient();
};

const getAuthGrpcAddress = () => process.env.AUTH_GRPC_ADDRESS || 'auth-service:50052';

let authClient: any = null;

const initAuthClient = () => {
  if (authClient) return authClient;

  try {
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

    authClient = new authService.AuthService(getAuthGrpcAddress(), grpc.credentials.createInsecure());

    return authClient;
  } catch (error) {
    console.error('Failed to initialize auth gRPC client:', error);
    return null;
  }
};

export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) {
    res.status(401).json({ 
      message: 'Access token is required',
      code: 'MISSING_TOKEN'
    });
    return;
  }

  const tokenKey = `${TOKEN_CACHE_PREFIX}${token}`;
  const redis = getRedisClient();

  redis.get(tokenKey)
    .then(cachedData => {
      if (cachedData) {
        try {
          const userInfo: CachedUserInfo = JSON.parse(cachedData);

          (req as AuthenticatedRequest).user = {
            id: userInfo.id,
            email: userInfo.email,
            role: userInfo.role,
            permissions: userInfo.permissions
          };

          console.log(`Token validated from cache: ${token.substring(0, 10)}...`);
          next();
        } catch (error) {
          console.error('Error parsing cached user data:', error);
          res.status(401).json({ 
            message: 'Invalid cached user data',
            code: 'INVALID_CACHED_DATA'
          });
        }
      } else {
        console.log(`Token not in cache, calling auth-service: ${token.substring(0, 10)}...`);
        callAuthService(token, req as AuthenticatedRequest, res, next);
      }
    })
    .catch(error => {
      console.error('Redis error during token validation:', error);
      callAuthService(token, req as AuthenticatedRequest, res, next);
    });
};

const callAuthService = (token: string, req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const client = initAuthClient();
  if (!client) {
    res.status(500).json({ 
      message: 'Auth service unavailable',
      code: 'AUTH_SERVICE_UNAVAILABLE'
    });
    return;
  }

  client.validate({ token }, (error: any, response: any) => {
    if (error) {
      console.error('Auth service error:', error);
      res.status(401).json({ 
        message: 'Token validation failed',
        code: 'TOKEN_VALIDATION_FAILED'
      });
      return;
    }

    if (response.status !== 200) {
      res.status(401).json({ 
        message: response.message || 'Token validation failed',
        code: 'INVALID_TOKEN'
      });
      return;
    }

    const userInfo: CachedUserInfo = {
      id: response.id,
      email: '',
      role: response.role,
      roleId: '',
      permissions: response.permissions || [],
      cachedAt: new Date().toISOString()
    };

    cacheUserInfo(token, userInfo).catch(err => {
      console.error('Failed to cache user info:', err);
    });

    req.user = {
      id: userInfo.id,
      email: userInfo.email,
      role: userInfo.role,
      permissions: userInfo.permissions
    };

    console.log(`Token validated by auth-service and cached: ${token.substring(0, 10)}...`);
    next();
  });
};

const cacheUserInfo = async (token: string, userInfo: CachedUserInfo): Promise<void> => {
  try {
    const redis = getRedisClient();
    const tokenKey = `${TOKEN_CACHE_PREFIX}${token}`;
    await redis.setEx(tokenKey, TOKEN_CACHE_TTL, JSON.stringify(userInfo));
    console.log(`Cached user info for token: ${token.substring(0, 10)}...`);
  } catch (error) {
    console.error('Error caching user info:', error);
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      res.status(401).json({
        message: 'User not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
      return;
    }

    console.log('User:', authReq.user);

    if (!allowedRoles.includes(authReq.user.role)) {
      res.status(403).json({
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
        code: 'INSUFFICIENT_ROLE'
      });
      return;
    }

    next();
  };
};

export const requirePermission = (requiredPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      res.status(401).json({
        message: 'User not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
      return;
    }

    const userPermissions = authReq.user.permissions || [];
    const hasPermission = requiredPermissions.every(permission =>
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      res.status(403).json({
        message: `Access denied. Required permissions: ${requiredPermissions.join(', ')}`,
        code: 'INSUFFICIENT_PERMISSION'
      });
      return;
    }

    next();
  };
};

export const validateToken = async (token: string): Promise<CachedUserInfo | null> => {
  try {
    const redis = getRedisClient();
    const tokenKey = `${TOKEN_CACHE_PREFIX}${token}`;
    const cachedData = await redis.get(tokenKey);

    if (!cachedData) {
      return null;
    }

    return JSON.parse(cachedData) as CachedUserInfo;
  } catch (error) {
    console.error('Error validating token from Redis:', error);
    return null;
  }
};

export default {
  authenticateToken,
  requireRole,
  requirePermission,
  validateToken
};
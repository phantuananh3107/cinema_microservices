import jwt, { JwtPayload } from 'jsonwebtoken';
import { PermissionService } from './permissionService.js';
import { redisClient } from '../config/redis.js';

export interface TokenValidationResult {
  status: number;
  message: string;
  id: string;
  role: string;
  permissions: string[];
}

export interface CachedUserInfo {
  id: string;
  email: string;
  role: string;
  roleId: string;
  permissions: string[];
  cachedAt: string;
}

export class TokenService {
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
  private static readonly REDIS_TOKEN_PREFIX = 'auth:token:';
  private static readonly TOKEN_CACHE_TTL = 3600;

  public static async cacheUserInfo(token: string, userInfo: CachedUserInfo): Promise<void> {
    try {
      const tokenKey = `${this.REDIS_TOKEN_PREFIX}${token}`;
      await redisClient.setEx(tokenKey, this.TOKEN_CACHE_TTL, JSON.stringify(userInfo));
      console.log(`Cached user info for token: ${token.substring(0, 10)}...`);
    } catch (error) {
      console.error('Error caching user info:', error);
    }
  }


  public static async getCachedUserInfo(token: string): Promise<CachedUserInfo | null> {
    try {
      const tokenKey = `${this.REDIS_TOKEN_PREFIX}${token}`;
      const cachedData = await redisClient.get(tokenKey);
      
      if (!cachedData) {
        return null;
      }
      
      return JSON.parse(cachedData) as CachedUserInfo;
    } catch (error) {
      console.error('Error getting cached user info:', error);
      return null;
    }
  }

  public static async removeCachedUserInfo(token: string): Promise<void> {
    try {
      const tokenKey = `${this.REDIS_TOKEN_PREFIX}${token}`;
      await redisClient.del(tokenKey);
      console.log(`Removed cached user info for token: ${token.substring(0, 10)}...`);
    } catch (error) {
      console.error('Error removing cached user info:', error);
    }
  }


  public static async verifyToken(token: string): Promise<TokenValidationResult> {
    try {
      if (!token) {
        return {
          status: 400,
          message: 'Token is required',
          id: '',
          role: '',
          permissions: []
        };
      }

      let decoded: any;
      try {
        decoded = jwt.verify(token, this.JWT_SECRET);
      } catch (error) {
        return {
          status: 401,
          message: 'Invalid or expired token',
          id: '',
          role: '',
          permissions: []
        };
      }

      const { userId, email, role, roleId, permissions } = decoded;

      let userPermissions: string[] = permissions || [];
      if (!userPermissions.length && roleId) {
        try {
          const dbPermissions = await PermissionService.getPermissionsByRoleId(roleId);
          userPermissions = dbPermissions.map(p => p.code);
        } catch (error) {
          console.error('Error fetching permissions:', error);
        }
      }

      const userInfo: CachedUserInfo = {
        id: userId,
        email: email,
        role: role || '',
        roleId: roleId || '',
        permissions: userPermissions,
        cachedAt: new Date().toISOString()
      };

      this.cacheUserInfo(token, userInfo).catch(error => {
        console.error('Failed to cache user info:', error);
      });

      return {
        status: 200,
        message: 'Token is valid',
        id: userId,
        role: role || '',
        permissions: userPermissions
      };

    } catch (error) {
      console.error('Token validation error:', error);
      return {
        status: 500,
        message: 'Internal server error',
        id: '',
        role: '',
        permissions: []
      };
    }
  }


  public static async verifyTokenFromCache(token: string): Promise<TokenValidationResult> {
    try {
      if (!token) {
        return {
          status: 400,
          message: 'Token is required',
          id: '',
          role: '',
          permissions: []
        };
      }

      const cachedUserInfo = await this.getCachedUserInfo(token);
      
      if (cachedUserInfo) {
        console.log(`Token validated from cache: ${token.substring(0, 10)}...`);
        return {
          status: 200,
          message: 'Token is valid (from cache)',
          id: cachedUserInfo.id,
          role: cachedUserInfo.role,
          permissions: cachedUserInfo.permissions
        };
      }

      console.log(`Token not in cache, verifying JWT: ${token.substring(0, 10)}...`);
      return await this.verifyToken(token);

    } catch (error) {
      console.error('Token cache validation error:', error);
      return {
        status: 500,
        message: 'Internal server error',
        id: '',
        role: '',
        permissions: []
      };
    }
  }

}

export default TokenService;

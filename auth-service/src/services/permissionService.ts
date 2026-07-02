import { redisClient } from '../config/redis.js';
import { userClient } from './userGrpcClient.js';

export interface Permission {
  id: string;
  name: string;
  code: string;
  description: string;
}

export class PermissionService {
  private static readonly CACHE_TTL = 1800;
  private static readonly CACHE_PREFIX = 'permissions:';

  static async getPermissionsByRoleId(roleId: string): Promise<Permission[]> {
    const cacheKey = `${this.CACHE_PREFIX}${roleId}`;
    
    try {
      const cachedPermissions = await redisClient.get(cacheKey);
      if (cachedPermissions) {
        console.log(`Permissions cache hit for role: ${roleId}`);
        return JSON.parse(cachedPermissions);
      }

      console.log(`Permissions cache miss for role: ${roleId}, fetching from user-service`);
      const permissions = await this.fetchPermissionsFromUserService(roleId);
      
      await redisClient.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(permissions));
      console.log(`Permissions cached for role: ${roleId}`);
      
      return permissions;
    } catch (error) {
      console.error('Error getting permissions:', error);
      throw error;
    }
  }

  private static async fetchPermissionsFromUserService(roleId: string): Promise<Permission[]> {
    return new Promise((resolve, reject) => {
      userClient.GetPermissionsByRoleId({ role_id: roleId }, (err: any, response: any) => {
        if (err) {
          console.error('Error fetching permissions from user-service:', err);
          return reject(err);
        }
        
        if (!response.success) {
          return reject(new Error(response.message || 'Failed to fetch permissions'));
        }
        
        resolve(response.permissions || []);
      });
    });
  }


  static async hasPermission(roleId: string, permissionCode: string): Promise<boolean> {
    try {
      const permissions = await this.getPermissionsByRoleId(roleId);
      return permissions.some(permission => permission.code === permissionCode);
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }


  static async clearPermissionsCache(roleId: string): Promise<void> {
    const cacheKey = `${this.CACHE_PREFIX}${roleId}`;
    await redisClient.del(cacheKey);
    console.log(`Permissions cache cleared for role: ${roleId}`);
  }

  static async clearAllPermissionsCache(): Promise<void> {
    const keys = await redisClient.keys(`${this.CACHE_PREFIX}*`);
    if (keys.length > 0) {
      await redisClient.del(keys);
      console.log(`Cleared ${keys.length} permission cache entries`);
    }
  }
}

export default PermissionService;

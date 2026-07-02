import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { HttpStatus } from '../types/index.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    roleId: string;
    permissions: string[];
  };
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) {
    res.status(HttpStatus.UNAUTHORIZED).json({ 
      message: 'Access token is required',
      code: 'MISSING_TOKEN'
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      roleId: decoded.roleId,
      permissions: decoded.permissions || []
    };
    next();
  } catch (error) {
    res.status(HttpStatus.UNAUTHORIZED).json({ 
      message: 'Invalid or expired token',
      code: 'INVALID_TOKEN'
    });
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(HttpStatus.UNAUTHORIZED).json({ 
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(HttpStatus.FORBIDDEN).json({ 
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
        code: 'INSUFFICIENT_ROLE',
        requiredRoles: allowedRoles,
        userRole: req.user.role
      });
      return;
    }

    next();
  };
};

export const requirePermission = (requiredPermission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(HttpStatus.UNAUTHORIZED).json({ 
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    if (!req.user.permissions.includes(requiredPermission)) {
      res.status(HttpStatus.FORBIDDEN).json({ 
        message: `Access denied. Required permission: ${requiredPermission}`,
        code: 'INSUFFICIENT_PERMISSION',
        requiredPermission,
        userPermissions: req.user.permissions
      });
      return;
    }

    next();
  };
};

export const requireAnyPermission = (requiredPermissions: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(HttpStatus.UNAUTHORIZED).json({ 
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    const hasPermission = requiredPermissions.some(permission => 
      req.user!.permissions.includes(permission)
    );

    if (!hasPermission) {
      res.status(HttpStatus.FORBIDDEN).json({ 
        message: `Access denied. Required one of permissions: ${requiredPermissions.join(', ')}`,
        code: 'INSUFFICIENT_PERMISSION',
        requiredPermissions,
        userPermissions: req.user.permissions
      });
      return;
    }

    next();
  };
};

export const requireAllPermissions = (requiredPermissions: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(HttpStatus.UNAUTHORIZED).json({ 
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    const hasAllPermissions = requiredPermissions.every(permission => 
      req.user!.permissions.includes(permission)
    );

    if (!hasAllPermissions) {
      res.status(HttpStatus.FORBIDDEN).json({ 
        message: `Access denied. Required all permissions: ${requiredPermissions.join(', ')}`,
        code: 'INSUFFICIENT_PERMISSION',
        requiredPermissions,
        userPermissions: req.user.permissions
      });
      return;
    }

    next();
  };
};

export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(HttpStatus.UNAUTHORIZED).json({ 
      message: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
    return;
  }

  if (req.user.role !== 'admin') {
    res.status(HttpStatus.FORBIDDEN).json({ 
      message: 'Admin access required',
      code: 'ADMIN_REQUIRED',
      userRole: req.user.role
    });
    return;
  }

  next();
};

export const requireStaff = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(HttpStatus.UNAUTHORIZED).json({ 
      message: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
    return;
  }

  const staffRoles = ['admin', 'manager_staff', 'ticket_staff'];
  if (!staffRoles.includes(req.user.role)) {
    res.status(HttpStatus.FORBIDDEN).json({ 
      message: 'Staff access required',
      code: 'STAFF_REQUIRED',
      userRole: req.user.role
    });
    return;
  }

  next();
};

export const requireCustomer = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(HttpStatus.UNAUTHORIZED).json({ 
      message: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
    return;
  }

  if (req.user.role !== 'customer') {
    res.status(HttpStatus.FORBIDDEN).json({ 
      message: 'Customer access required',
      code: 'CUSTOMER_REQUIRED',
      userRole: req.user.role
    });
    return;
  }

  next();
};

export default {
  authenticateToken,
  requireRole,
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireAdmin,
  requireStaff,
  requireCustomer
};

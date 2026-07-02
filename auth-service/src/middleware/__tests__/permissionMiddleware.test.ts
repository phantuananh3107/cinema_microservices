import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import {
  authenticateToken,
  requireRole,
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireAdmin,
  requireStaff,
  requireCustomer,
  type AuthenticatedRequest,
} from '../permissionMiddleware';

jest.mock('jsonwebtoken');

type MockResponse = {
  statusCode?: number;
  payload?: any;
  status: jest.Mock;
  json: jest.Mock;
};

const createMockResponse = (): MockResponse => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('permissionMiddleware', () => {
  let req: Partial<AuthenticatedRequest>;
  let res: MockResponse;
  let next: jest.Mock;

  beforeEach(() => {
    req = {
      headers: {},
    };
    res = createMockResponse();
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('authenticateToken', () => {
    // TC-NODE-AUTH-001
    test('should return 401 if no token is provided', () => {
      authenticateToken(req as AuthenticatedRequest, res as any, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'MISSING_TOKEN' }));
      expect(next).not.toHaveBeenCalled();
    });

    // TC-NODE-AUTH-002
    test('should return 401 if token is invalid', () => {
      req.headers!.authorization = 'Bearer invalid-token';
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      authenticateToken(req as AuthenticatedRequest, res as any, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'INVALID_TOKEN' }));
    });

    // TC-NODE-AUTH-003
    test('should call next and set req.user if token is valid', () => {
      const decoded = {
        userId: 'u1',
        email: 'test@example.com',
        role: 'admin',
        roleId: 'r1',
        permissions: ['p1']
      };
      req.headers!.authorization = 'Bearer valid-token';
      (jwt.verify as jest.Mock).mockReturnValue(decoded);

      authenticateToken(req as AuthenticatedRequest, res as any, next);
      expect(req.user).toEqual({
        id: 'u1',
        email: 'test@example.com',
        role: 'admin',
        roleId: 'r1',
        permissions: ['p1']
      });
      expect(next).toHaveBeenCalled();
    });

    test('should default permissions to empty array if missing in token', () => {
      const decoded = { userId: 'u1' };
      req.headers!.authorization = 'Bearer valid-token';
      (jwt.verify as jest.Mock).mockReturnValue(decoded);

      authenticateToken(req as AuthenticatedRequest, res as any, next);
      expect(req.user!.permissions).toEqual([]);
    });
  });

  describe('requireRole', () => {
    test('should return 401 if req.user is missing', () => {
      requireRole(['admin'])(req as AuthenticatedRequest, res as any, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'AUTH_REQUIRED' }));
    });

    // TC-NODE-AUTH-004
    test('should call next if user has allowed role', () => {
      req.user = { role: 'manager_staff', permissions: [] } as any;
      requireRole(['admin', 'manager_staff'])(req as AuthenticatedRequest, res as any, next);
      expect(next).toHaveBeenCalled();
    });

    // TC-NODE-AUTH-005
    test('should return 403 if user role is not allowed', () => {
      req.user = { role: 'customer', permissions: [] } as any;
      requireRole(['admin'])(req as AuthenticatedRequest, res as any, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
        code: 'INSUFFICIENT_ROLE',
        requiredRoles: ['admin'],
        userRole: 'customer'
      }));
    });
  });

  describe('requirePermission', () => {
    test('should return 401 if req.user is missing', () => {
      requirePermission('read')(req as AuthenticatedRequest, res as any, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    // TC-NODE-AUTH-006
    test('should return 403 if user lacks required permission', () => {
      req.user = { permissions: ['other'] } as any;
      requirePermission('user.read')(req as AuthenticatedRequest, res as any, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
        code: 'INSUFFICIENT_PERMISSION',
        requiredPermission: 'user.read'
      }));
    });

    test('should call next if user has required permission', () => {
      req.user = { permissions: ['user.read'] } as any;
      requirePermission('user.read')(req as AuthenticatedRequest, res as any, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('requireAnyPermission', () => {
    test('should return 401 if req.user is missing', () => {
      requireAnyPermission(['read'])(req as AuthenticatedRequest, res as any, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    // TC-NODE-AUTH-007
    test('should call next if user has at least one required permission', () => {
      req.user = { permissions: ['movie.read'] } as any;
      requireAnyPermission(['user.read', 'movie.read'])(req as AuthenticatedRequest, res as any, next);
      expect(next).toHaveBeenCalled();
    });

    test('should return 403 if user lacks all required permissions', () => {
      req.user = { permissions: ['other'] } as any;
      requireAnyPermission(['user.read'])(req as AuthenticatedRequest, res as any, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('requireAllPermissions', () => {
    test('should return 401 if req.user is missing', () => {
      requireAllPermissions(['read'])(req as AuthenticatedRequest, res as any, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    // TC-NODE-AUTH-008
    test('should return 403 if user lacks even one required permission', () => {
      req.user = { permissions: ['user.read'] } as any;
      requireAllPermissions(['user.read', 'user.update'])(req as AuthenticatedRequest, res as any, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    test('should call next if user has all required permissions', () => {
      req.user = { permissions: ['user.read', 'user.update'] } as any;
      requireAllPermissions(['user.read', 'user.update'])(req as AuthenticatedRequest, res as any, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('requireAdmin', () => {
    test('should return 401 if req.user is missing', () => {
      requireAdmin(req as AuthenticatedRequest, res as any, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    // TC-NODE-AUTH-009
    test('should call next if role is admin', () => {
      req.user = { role: 'admin' } as any;
      requireAdmin(req as AuthenticatedRequest, res as any, next);
      expect(next).toHaveBeenCalled();
    });

    test('should return 403 if role is not admin', () => {
      req.user = { role: 'customer' } as any;
      requireAdmin(req as AuthenticatedRequest, res as any, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'ADMIN_REQUIRED' }));
    });
  });

  describe('requireStaff', () => {
    test('should return 401 if req.user is missing', () => {
      requireStaff(req as AuthenticatedRequest, res as any, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    test.each(['admin', 'manager_staff', 'ticket_staff'])('should call next for staff role: %s', (role) => {
      req.user = { role } as any;
      requireStaff(req as AuthenticatedRequest, res as any, next);
      expect(next).toHaveBeenCalled();
    });

    test('should return 403 for non-staff roles', () => {
      req.user = { role: 'customer' } as any;
      requireStaff(req as AuthenticatedRequest, res as any, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'STAFF_REQUIRED' }));
    });
  });

  describe('requireCustomer', () => {
    test('should return 401 if req.user is missing', () => {
      requireCustomer(req as AuthenticatedRequest, res as any, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    test('should call next if role is customer', () => {
      req.user = { role: 'customer' } as any;
      requireCustomer(req as AuthenticatedRequest, res as any, next);
      expect(next).toHaveBeenCalled();
    });

    // TC-NODE-AUTH-010
    test('should return 403 if role is not customer', () => {
      req.user = { role: 'manager_staff' } as any;
      requireCustomer(req as AuthenticatedRequest, res as any, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'CUSTOMER_REQUIRED' }));
    });
  });
});

import express, { Router, Request, Response, NextFunction } from 'express';
import AuthController from '../controllers/authController.js';
import { authenticateToken, requireAdmin } from '../middleware/permissionMiddleware.js';
import { IController } from '../types/index.js';

class AuthRoutes {
  private router: Router;

  constructor() {
    this.router = express.Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.post('/register', this.handleAsync(AuthController.register));
    this.router.post('/login', this.handleAsync(AuthController.login));
    this.router.post('/admin/login', this.handleAsync(AuthController.loginAdmin));
    this.router.post('/verify-otp', this.handleAsync(AuthController.verifyOtp));
    this.router.post('/resend-otp', this.handleAsync(AuthController.resendOtp));
    this.router.post('/staff', authenticateToken, requireAdmin, this.handleAsync(AuthController.registerInternalUser));
  }

  private handleAsync(fn: IController) {
    return (req: Request, res: Response, next: NextFunction): void => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  public getRouter(): Router {
    return this.router;
  }
}

const authRoutes = new AuthRoutes();

export default authRoutes.getRouter();

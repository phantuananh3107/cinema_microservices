import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from 'http';

import DatabaseManager from './models/index.js';
import { RedisManager } from './config/redis.js';
import authRoutes from './routes/auth.js';
import { startAuthGrpcServer } from './transport/grpc/server.js';
import { IHealthCheck, IServerConfig, IApiError, IDatabaseManager, IRedisManager } from './types/index.js';

class AuthServer {
  private app: Application;
  private port: number;
  private databaseManager: IDatabaseManager | null = null;
  private redisManager: IRedisManager | null = null;
  private config: IServerConfig;

  constructor() {
    this.app = express();
    this.initializeEnvironment();
    this.config = this.loadConfiguration();
    this.port = this.config.port;
    
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeEnvironment(): void {
    dotenv.config();
    console.log('Environment variables loaded');
  }

  private loadConfiguration(): IServerConfig {
    return {
      port: parseInt(process.env.PORT || '3001'),
      corsOrigin: process.env.CORS_ORIGIN || '*',
      jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h'
    };
  }

  private initializeMiddleware(): void {
    this.app.use(cors({ 
      origin: this.config.corsOrigin, 
      credentials: true 
    }));

    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    this.app.use((req: Request, res: Response, next: NextFunction) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });

    console.log('Middleware initialized');
  }

  private initializeRoutes(): void {
    this.app.use('/api/v1/auth', authRoutes);

    this.app.get('/api/v1/health', this.healthCheck.bind(this));

    this.app.get('/', (req: Request, res: Response) => {
      res.json({ 
        message: 'Auth Service API',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        note: 'Token verification now available via gRPC only'
      });
    });

    console.log('Routes initialized');
  }

  private async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const dbStatus = this.databaseManager ? await this.databaseManager.testConnection() : false;
      const redisStatus = this.redisManager ? await this.redisManager.isConnected() : false;

      const health: IHealthCheck = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
          database: dbStatus ? 'connected' : 'disconnected',
          redis: redisStatus ? 'connected' : 'disconnected'
        },
        uptime: process.uptime(),
        memory: process.memoryUsage()
      };

      res.json(health);
    } catch (error) {
      console.error('Health check failed:', error);
      res.status(500).json({ 
        status: 'error', 
        message: (error as Error).message 
      });
    }
  }

  private initializeErrorHandling(): void {
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({ 
        message: `Route ${req.originalUrl} not found`,
        timestamp: new Date().toISOString()
      });
    });

    this.app.use((err: IApiError, req: Request, res: Response, next: NextFunction) => {
      console.error('Error occurred:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        timestamp: new Date().toISOString()
      });

      res.status(err.status || 500).json({ 
        message: err.message || 'Internal Server Error',
        timestamp: new Date().toISOString()
      });
    });

    console.log('Error handling initialized');
  }

  private async initializeDatabase(): Promise<boolean> {
    try {
      this.databaseManager = DatabaseManager.getInstance();
      const connected = await this.databaseManager.testConnection();
      
      if (connected) {
        const synced = await this.databaseManager.syncDatabase();
        if (synced) {
          console.log('Database initialized successfully');
          return true;
        } else {
          throw new Error('Database sync failed');
        }
      } else {
        throw new Error('Database connection failed');
      }
    } catch (error) {
      console.error('Database initialization failed:', error);
      return false;
    }
  }

  private async initializeRedis(): Promise<boolean> {
    try {
      this.redisManager = RedisManager.getInstance();
      const connected = await this.redisManager.isConnected();
      
      if (connected) {
        console.log('Redis initialized successfully');
        return true;
      } else {
        throw new Error('Redis connection failed');
      }
    } catch (error) {
      console.error('Redis initialization failed:', error);
      return false;
    }
  }

  public async start(): Promise<Server> {
    try {
      console.log('Starting Auth Service (HTTP + gRPC)...');

      const dbInitialized = await this.initializeDatabase();
      if (!dbInitialized) {
        throw new Error('Failed to initialize database');
      }

      const redisInitialized = await this.initializeRedis();
      if (!redisInitialized) {
        console.warn('Redis initialization failed, continuing without Redis cache');
      }

      const server = this.app.listen(this.port, () => {
        console.log(`🚀 Auth HTTP service running on port ${this.port}`);
        console.log(`🏥 Health check available at http://localhost:${this.port}/api/v1/health`);
        console.log(`📝 API documentation: http://localhost:${this.port}/`);
      });

      try {
        await startAuthGrpcServer();
        console.log(`🔌 Auth gRPC server started successfully`);
      } catch (error) {
        console.error('Failed to start gRPC server:', error);
      }

      this.setupGracefulShutdown(server);

      return server;
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  private setupGracefulShutdown(server: Server): void {
    const gracefulShutdown = async (signal: string): Promise<void> => {
      console.log(`Received ${signal}, starting graceful shutdown...`);
      
      server.close(async () => {
        console.log('HTTP server closed');

        if (this.databaseManager) {
          try {
            await DatabaseManager.getSequelize().close();
            console.log('Database connection closed');
          } catch (error) {
            console.error('Error closing database:', error);
          }
        }

        if (this.redisManager) {
          try {
            const disconnected = await this.redisManager.disconnect();
            if (disconnected) {
              console.log('Redis connections closed');
            }
          } catch (error) {
            console.error('Error closing Redis:', error);
          }
        }

        console.log('Graceful shutdown completed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    process.on('uncaughtException', (error: Error) => {
      console.error('Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason: any) => {
      console.error('Unhandled Rejection:', reason);
      process.exit(1);
    });
  }

  public getApp(): Application {
    return this.app;
  }

  public getConfig(): IServerConfig {
    return this.config;
  }
}

const authServer = new AuthServer();
authServer.start().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

export default AuthServer;
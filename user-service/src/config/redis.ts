import { createClient, RedisClientType } from 'redis';

export interface IRedisManager {
  connect(): Promise<boolean>;
  disconnect(): Promise<boolean>;
  isConnected(): Promise<boolean>;
  getClient(): RedisClientType;
}

class RedisManager implements IRedisManager {
  private static instance: RedisManager | null = null;
  private static redisClient: RedisClientType | null = null;

  constructor() {
    if (RedisManager.instance) {
      return RedisManager.instance;
    }

    RedisManager.instance = this;
    this.initializeClient();
  }

  static getInstance(): RedisManager {
    if (!RedisManager.instance) {
      new RedisManager();
    }
    return RedisManager.instance!;
  }

  private initializeClient(): void {
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = process.env.REDIS_PORT || '6379';
    const redisUrl = `redis://${redisHost}:${redisPort}`;

    console.log(`Initializing Redis client with host: ${redisHost}, port: ${redisPort}`);

    RedisManager.redisClient = createClient({ url: redisUrl });

    RedisManager.redisClient.on('error', (err: Error) => {
      console.error('Redis Client Error:', err);
    });

    RedisManager.redisClient.on('connect', () => {
      console.log('Redis client connected successfully');
    });
  }

  async connect(): Promise<boolean> {
    try {
      if (!RedisManager.redisClient) {
        console.error('Redis client not initialized');
        return false;
      }

      await RedisManager.redisClient.connect();
      console.log('Redis client connected');
      return true;
    } catch (error) {
      console.error('Failed to connect Redis client:', error);
      return false;
    }
  }

  async disconnect(): Promise<boolean> {
    try {
      if (RedisManager.redisClient && RedisManager.redisClient.isOpen) {
        await RedisManager.redisClient.quit();
        console.log('Redis client disconnected');
      }
      return true;
    } catch (error) {
      console.error('Failed to disconnect Redis client:', error);
      return false;
    }
  }

  getClient(): RedisClientType {
    if (!RedisManager.redisClient) {
      throw new Error('Redis client not initialized');
    }
    return RedisManager.redisClient;
  }

  async isConnected(): Promise<boolean> {
    try {
      if (!RedisManager.redisClient) {
        return false;
      }
      const result = await RedisManager.redisClient.ping();
      return result === 'PONG';
    } catch (error) {
      return false;
    }
  }
}

export { RedisManager };
export default RedisManager;

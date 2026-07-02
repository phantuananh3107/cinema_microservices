import { createClient, RedisClientType } from 'redis';
import { IRedisManager } from '../types/index.js';

class RedisManager implements IRedisManager {
  private static instance: RedisManager | null = null;
  private static redisClient: RedisClientType | null = null;
  private static redisPubSubClient: RedisClientType | null = null;

  constructor() {
    if (RedisManager.instance) {
      return RedisManager.instance;
    }
    
    RedisManager.instance = this;
    this.initializeClients();
  }

  static getInstance(): RedisManager {
    if (!RedisManager.instance) {
      new RedisManager();
    }
    return RedisManager.instance!;
  }

  private initializeClients(): void {
    RedisManager.redisClient = createClient({
      url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`
    });

    RedisManager.redisPubSubClient = createClient({
      url: process.env.REDIS_PUBSUB_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`
    });

    RedisManager.redisClient.on('error', (err: Error) => {
      console.error('Redis Client Error:', err);
    });

    RedisManager.redisPubSubClient.on('error', (err: Error) => {
      console.error('Redis PubSub Client Error:', err);
    });

    RedisManager.redisClient.on('connect', () => {
      console.log('Redis client connected successfully');
    });

    RedisManager.redisPubSubClient.on('connect', () => {
      console.log('Redis PubSub client connected successfully');
    });
  }

  async connect(): Promise<boolean> {
    try {
      await Promise.all([
        RedisManager.redisClient!.connect(),
        RedisManager.redisPubSubClient!.connect()
      ]);
      console.log('All Redis clients connected successfully');
      return true;
    } catch (error) {
      console.error('Failed to connect Redis clients:', error);
      return false;
    }
  }

  async disconnect(): Promise<boolean> {
    try {
      const disconnectPromises = [];
      
      if (RedisManager.redisClient && RedisManager.redisClient.isOpen) {
        disconnectPromises.push(RedisManager.redisClient.quit());
      }
      
      if (RedisManager.redisPubSubClient && RedisManager.redisPubSubClient.isOpen) {
        disconnectPromises.push(RedisManager.redisPubSubClient.quit());
      }
      
      if (disconnectPromises.length > 0) {
        await Promise.all(disconnectPromises);
      }
      
      console.log('All Redis clients disconnected');
      return true;
    } catch (error) {
      console.error('Failed to disconnect Redis clients:', error);
      return false;
    }
  }

  static getClient(): RedisClientType {
    if (!RedisManager.redisClient) {
      RedisManager.getInstance();
    }
    return RedisManager.redisClient!;
  }

  static getPubSubClient(): RedisClientType {
    if (!RedisManager.redisPubSubClient) {
      RedisManager.getInstance();
    }
    return RedisManager.redisPubSubClient!;
  }

  async isConnected(): Promise<boolean> {
    try {
      const result = await RedisManager.redisClient!.ping();
      return result === 'PONG';
    } catch (error) {
      return false;
    }
  }

  async flushAll(): Promise<boolean> {
    try {
      await RedisManager.redisClient!.flushAll();
      console.log('Redis cache cleared');
      return true;
    } catch (error) {
      console.error('Failed to flush Redis cache:', error);
      return false;
    }
  }
}

const redisManager = RedisManager.getInstance();
await redisManager.connect();

export const redisClient = RedisManager.getClient();
export const redisPubSubClient = RedisManager.getPubSubClient();
export { redisClient as default };
export { RedisManager }
import { Sequelize } from 'sequelize';
import { initModels, Models } from '../models/models.js';
import { IDatabaseManager } from '../types/index.js';

class DatabaseManager implements IDatabaseManager {
  private static instance: DatabaseManager | null = null;
  private sequelize: Sequelize;
  private models: Models;

  private constructor() {
    this.sequelize = new Sequelize({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'cinema_app',
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      dialect: 'postgres',
      logging: false
    });

    this.models = initModels(this.sequelize);
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  public async testConnection(): Promise<boolean> {
    try {
      await this.sequelize.authenticate();
      console.log('Database connection established successfully');
      return true;
    } catch (error) {
      console.error('Unable to connect to the database:', error);
      return false;
    }
  }

  public async syncDatabase(): Promise<void> {
    try {
      await this.sequelize.sync();
      console.log('Database synchronized successfully');
    } catch (error) {
      console.error('Error synchronizing database:', error);
      throw error;
    }
  }

  public getModels(): Models {
    return this.models;
  }

  public getSequelize(): Sequelize {
    return this.sequelize;
  }

  public static getSequelize(): Sequelize {
    return DatabaseManager.getInstance().sequelize;
  }
}

export default DatabaseManager;

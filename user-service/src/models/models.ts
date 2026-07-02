import { DataTypes, Model, ModelDefined, Sequelize } from 'sequelize';

export interface RoleAttributes {
  id: string;
  name: string;
  description?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface PermissionAttributes {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface RolePermissionAttributes {
  id: string;
  role_id: string;
  permission_id: string;
  created_at?: Date;
}

export interface UserAttributes {
  id: string;
  name: string;
  email: string;
  password: string;
  phone_number?: string | null;
  status: string;
  gender?: string | null;
  dob?: Date | null;
  role_id?: string | null;
  address?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface CustomerProfileAttributes {
  id: string;
  user_id: string;
  total_payment_amount: number;
  point: number;
  onchain_wallet_address?: string | null;
}

export interface StaffProfileAttributes {
  id: string;
  user_id: string;
  salary: number;
  position: string;
  department: string;
  hire_date: Date;
  is_active: boolean;
}

export type RoleModel = ModelDefined<RoleAttributes, Partial<RoleAttributes>>;
export type PermissionModel = ModelDefined<PermissionAttributes, Partial<PermissionAttributes>>;
export type RolePermissionModel = ModelDefined<RolePermissionAttributes, Partial<RolePermissionAttributes>>;
export type UserModel = ModelDefined<UserAttributes, Partial<UserAttributes>>;
export type CustomerProfileModel = ModelDefined<
  CustomerProfileAttributes,
  Partial<CustomerProfileAttributes>
>;
export type StaffProfileModel = ModelDefined<
  StaffProfileAttributes,
  Partial<StaffProfileAttributes>
>;

export interface Models {
  sequelize: Sequelize;
  Role: RoleModel;
  Permission: PermissionModel;
  RolePermission: RolePermissionModel;
  User: UserModel;
  CustomerProfile: CustomerProfileModel;
  StaffProfile: StaffProfileModel;
}

export function initModels(sequelize: Sequelize): Models {
  const Role = sequelize.define<Model<RoleAttributes, Partial<RoleAttributes>>>(
    'Role',
    {
      id: { type: DataTypes.STRING, primaryKey: true },
      name: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.STRING },
      created_at: { type: DataTypes.DATE },
      updated_at: { type: DataTypes.DATE }
    },
    { tableName: 'roles', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' }
  ) as RoleModel;

  const Permission = sequelize.define<Model<PermissionAttributes, Partial<PermissionAttributes>>>(
    'Permission',
    {
      id: { type: DataTypes.STRING, primaryKey: true },
      name: { type: DataTypes.STRING, allowNull: false },
      code: { type: DataTypes.STRING, allowNull: false, unique: true },
      description: { type: DataTypes.STRING },
      created_at: { type: DataTypes.DATE },
      updated_at: { type: DataTypes.DATE }
    },
    { tableName: 'permissions', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' }
  ) as PermissionModel;

  const RolePermission = sequelize.define<Model<RolePermissionAttributes, Partial<RolePermissionAttributes>>>(
    'RolePermission',
    {
      id: { type: DataTypes.STRING, primaryKey: true },
      role_id: { type: DataTypes.STRING, allowNull: false },
      permission_id: { type: DataTypes.STRING, allowNull: false },
      created_at: { type: DataTypes.DATE }
    },
    { tableName: 'role_permissions', timestamps: false }
  ) as RolePermissionModel;

  const User = sequelize.define<Model<UserAttributes, Partial<UserAttributes>>>(
    'User',
    {
      id: { type: DataTypes.STRING, primaryKey: true },
      name: { type: DataTypes.STRING, allowNull: false },
      email: { type: DataTypes.STRING, allowNull: false, unique: true },
      password: { type: DataTypes.STRING, allowNull: false },
      phone_number: { type: DataTypes.STRING },
      status: { type: DataTypes.STRING, allowNull: false },
      gender: { type: DataTypes.STRING },
      dob: { type: DataTypes.DATE },
      role_id: { type: DataTypes.STRING },
      address: { type: DataTypes.STRING },
      created_at: { type: DataTypes.DATE },
      updated_at: { type: DataTypes.DATE }
    },
    { tableName: 'users', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' }
  ) as UserModel;

  const CustomerProfile = sequelize.define<
    Model<CustomerProfileAttributes, Partial<CustomerProfileAttributes>>
  >(
    'CustomerProfile',
    {
      id: { type: DataTypes.STRING, primaryKey: true },
      user_id: { type: DataTypes.STRING, allowNull: false },
      total_payment_amount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      point: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      onchain_wallet_address: { type: DataTypes.STRING }
    },
    { tableName: 'customer_profile', timestamps: false }
  ) as CustomerProfileModel;

  const StaffProfile = sequelize.define<
    Model<StaffProfileAttributes, Partial<StaffProfileAttributes>>
  >(
    'StaffProfile',
    {
      id: { type: DataTypes.STRING, primaryKey: true },
      user_id: { type: DataTypes.STRING, allowNull: false },
      salary: { type: DataTypes.INTEGER, allowNull: false },
      position: { type: DataTypes.STRING, allowNull: false },
      department: { type: DataTypes.STRING, allowNull: false },
      hire_date: { type: DataTypes.DATE, allowNull: false },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
    },
    { tableName: 'staff_profile', timestamps: false }
  ) as StaffProfileModel;

  User.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });
  Role.hasMany(User, { foreignKey: 'role_id', as: 'users' });

  RolePermission.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });
  RolePermission.belongsTo(Permission, { foreignKey: 'permission_id', as: 'permission' });
  Role.hasMany(RolePermission, { foreignKey: 'role_id', as: 'rolePermissions' });
  Permission.hasMany(RolePermission, { foreignKey: 'permission_id', as: 'rolePermissions' });

  return { sequelize, Role, Permission, RolePermission, User, CustomerProfile, StaffProfile };
}



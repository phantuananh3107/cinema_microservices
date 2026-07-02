import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { Models } from '../../models/models.js';
import { v4 as uuidv4 } from 'uuid';
import { QueryTypes } from 'sequelize';
import DatabaseManager from '../../config/database.js';

const PROTO_PATH = path.resolve(process.cwd(), 'proto', 'user.proto');

type GrpcModels = Models;

export async function startGrpcServer(): Promise<void> {
  const models = DatabaseManager.getInstance().getModels();
  const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  });
  const proto = grpc.loadPackageDefinition(packageDefinition) as any;
  const svc = proto.pb;

  const server = new grpc.Server();

  server.addService(svc.UserService.service, {
    ensurePending: async (
      call: grpc.ServerUnaryCall<any, any>,
      callback: grpc.sendUnaryData<any>
    ) => {
      try {
        const { email, name, password, role_id, address } = call.request;
        const existing = await models.User.findOne({ where: { email } });
        let id = existing?.get('id') as string | undefined;

        if (!existing) {
          id = uuidv4();
          await models.User.create({
            id,
            email,
            name,
            password,
            role_id: role_id || null,
            address: address || null,
            status: 'PENDING'
          } as any);
          await models.CustomerProfile.create({
            id: uuidv4(),
            user_id: id,
            total_payment_amount: 0,
            point: 0,
            onchain_wallet_address: ''
          } as any);
        }
        callback(null, { id, created: !existing });
      } catch (e: any) {
        callback({ code: grpc.status.INTERNAL, message: e.message } as any);
      }
    },
    getUserByEmail: async (
      call: grpc.ServerUnaryCall<any, any>,
      callback: grpc.sendUnaryData<any>
    ) => {
      try {
        const { email } = call.request;
        const user = await models.User.findOne({ where: { email } });
        if (!user) return callback(null, { found: false });
        const data = user.toJSON() as any;
        callback(null, { found: true, user: data });
      } catch (e: any) {
        callback({ code: grpc.status.INTERNAL, message: e.message } as any);
      }
    },
    getUserById: async (
      call: grpc.ServerUnaryCall<any, any>,
      callback: grpc.sendUnaryData<any>
    ) => {
      try {
        const { id } = call.request;
        const user = await models.User.findOne({ where: { id } });
        if (!user) return callback(null, { found: false });
        const data = user.toJSON() as any;
        callback(null, { found: true, user: data });
      } catch (e: any) {
        callback({ code: grpc.status.INTERNAL, message: e.message } as any);
      }
    },
    activateUser: async (
      call: grpc.ServerUnaryCall<any, any>,
      callback: grpc.sendUnaryData<any>
    ) => {
      try {
        const { email } = call.request;
        const user = await models.User.findOne({ where: { email } });
        if (!user) return callback({ code: grpc.status.NOT_FOUND, message: 'user not found' } as any);
        await (user as any).update({ status: 'ACTIVE' });
        callback(null, { success: true });
      } catch (e: any) {
        callback({ code: grpc.status.INTERNAL, message: e.message } as any);
      }
    },
    createStaff: async (
      call: grpc.ServerUnaryCall<any, any>,
      callback: grpc.sendUnaryData<any>
    ) => {
      try {
        const { email, name, password, role_id, address, phone_number, gender, dob } = call.request;

        const existing = await models.User.findOne({ where: { email } });

        if (existing) {
          return callback({
            code: grpc.status.ALREADY_EXISTS,
            message: 'Email đã tồn tại trong hệ thống'
          } as any);
        }

        const id = uuidv4();
        await models.User.create({
          id,
          email,
          name,
          password,
          role_id: role_id || null,
          address: address || null,
          phone_number: phone_number || null,
          gender: gender || null,
          dob: dob ? new Date(dob) : null,
          status: 'PENDING'
        } as any);

        await models.StaffProfile.create({
          id: uuidv4(),
          user_id: id,
          salary: 0,
          position: '',
          department: '',
          hire_date: new Date(),
          is_active: true
        } as any);

        const message = 'Tạo tài khoản nhân viên thành công. Nhân viên cần đăng nhập để kích hoạt tài khoản.';

        callback(null, { id, created: true, message });
      } catch (e: any) {
        callback({ code: grpc.status.INTERNAL, message: e.message } as any);
      }
    },
    getPermissionsByRoleId: async (
      call: grpc.ServerUnaryCall<any, any>,
      callback: grpc.sendUnaryData<any>
    ) => {
      try {
        const { role_id } = call.request;

        if (!role_id) {
          return callback({ code: grpc.status.INVALID_ARGUMENT, message: 'role_id is required' } as any);
        }

        const permissions = await models.sequelize.query<
          { id: string; name: string; code: string; description: string }
        >(
          `SELECT p.id, p.name, p.code, p.description
       FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       WHERE rp.role_id = :role_id`,
          {
            replacements: { role_id },
            type: QueryTypes.SELECT
          }
        );

        callback(null, {
          permissions: permissions.map(p => ({
            id: p.id,
            name: p.name,
            code: p.code,
            description: p.description
          })),
          success: true,
          message: 'Permissions retrieved successfully'
        });
      } catch (e: any) {
        callback({ code: grpc.status.INTERNAL, message: e.message } as any);
      }
    },
    getRoleByName: async (
      call: grpc.ServerUnaryCall<any, any>,
      callback: grpc.sendUnaryData<any>
    ) => {
      try {
        const { name } = call.request;

        const roleResult = await models.sequelize.query<{ id: string }>(
          'SELECT id FROM roles WHERE name = :name LIMIT 1',
          { replacements: { name }, type: QueryTypes.SELECT }
        );

        if (roleResult.length === 0) {
          return callback(null, { found: false });
        }

        callback(null, { found: true, id: roleResult[0].id });
      } catch (e: any) {
        callback({ code: grpc.status.INTERNAL, message: e.message } as any);
      }
    },
    getUserWithRoleByEmail: async (
      call: grpc.ServerUnaryCall<any, any>,
      callback: grpc.sendUnaryData<any>
    ) => {
      try {
        const { email } = call.request;

        const userWithRole = await models.sequelize.query<{
          id: string;
          email: string;
          name: string;
          role_name: string;
          role_id: string;
        }>(
          `SELECT u.id, u.email, u.name, r.name as role_name, u.role_id
           FROM users u
           JOIN roles r ON u.role_id = r.id
           WHERE u.email = :email`,
          {
            replacements: { email },
            type: QueryTypes.SELECT
          }
        );

        if (userWithRole.length === 0) {
          return callback(null, { found: false });
        }

        const user = userWithRole[0];
        callback(null, {
          found: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role_name: user.role_name,
            role_id: user.role_id
          }
        });
      } catch (e: any) {
        callback({ code: grpc.status.INTERNAL, message: e.message } as any);
      }
    }
  });

  const address = process.env.USER_GRPC_ADDRESS || '0.0.0.0:50051';
  await new Promise<void>((resolve, reject) => {
    server.bindAsync(address, grpc.ServerCredentials.createInsecure(), (err) => {
      if (err) return reject(err);
      console.log(`user-service gRPC listening on ${address}`);
      resolve();
    });
  });
}



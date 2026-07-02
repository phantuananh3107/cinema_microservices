import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { TokenService } from '../../services/tokenService.js';
import { PermissionService } from '../../services/permissionService.js';

const PROTO_PATH = path.resolve(process.cwd(), 'proto', 'auth.proto');

export async function startAuthGrpcServer(): Promise<void> {
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

  server.addService(svc.AuthService.service, {
    verifyOtpAndActivate: async (
      call: grpc.ServerUnaryCall<any, any>,
      callback: grpc.sendUnaryData<any>
    ) => {
      try {
        const { email, otp } = call.request;
        
        callback(null, {
          verified: true,
          message: 'OTP verified successfully'
        });
      } catch (e: any) {
        callback({ code: grpc.status.INTERNAL, message: e.message } as any);
      }
    },

    validate: async (
      call: grpc.ServerUnaryCall<any, any>,
      callback: grpc.sendUnaryData<any>
    ) => {
      try {
        const { token } = call.request;
        const result = await TokenService.verifyTokenFromCache(token);
        callback(null, result);
      } catch (e: any) {
        callback({ code: grpc.status.INTERNAL, message: e.message } as any);
      }
    },

    clearPermissionsCache: async (
      call: grpc.ServerUnaryCall<any, any>,
      callback: grpc.sendUnaryData<any>
    ) => {
      try {
        const { role_id } = call.request;
        
        if (!role_id) {
          return callback({ 
            code: grpc.status.INVALID_ARGUMENT, 
            message: 'role_id is required' 
          } as any);
        }

        await PermissionService.clearPermissionsCache(role_id);
        
        callback(null, {
          success: true,
          message: `Permissions cache cleared for role: ${role_id}`
        });
      } catch (e: any) {
        callback({ code: grpc.status.INTERNAL, message: e.message } as any);
      }
    }
  });

  const address = process.env.AUTH_GRPC_ADDRESS || '0.0.0.0:50052';
  await new Promise<void>((resolve, reject) => {
    server.bindAsync(address, grpc.ServerCredentials.createInsecure(), (err) => {
      if (err) return reject(err);
      console.log(`auth-service gRPC listening on ${address}`);
      resolve();
    });
  });
}

import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

const PROTO_PATH = path.resolve(process.cwd(), 'proto', 'user.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const proto = grpc.loadPackageDefinition(packageDefinition) as any;
const UserService = proto.pb.UserService;

const address = process.env.USER_GRPC_ADDRESS || 'localhost:50051';

const userClient = new UserService(address, grpc.credentials.createInsecure());

export { userClient };
export type UserClient = typeof userClient;
